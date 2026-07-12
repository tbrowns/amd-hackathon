from __future__ import annotations

import asyncio
import base64
import io
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import UploadFile
from PIL import Image, ImageFilter, ImageStat, UnidentifiedImageError

from app.core.config import Settings
from app.core.errors import AppError
from app.schemas.assessments import ImageQuality

FORMAT_MIME = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}
DATA_URL_PREFIX_BYTES = len("data:image/jpeg;base64,")
MAX_GROQ_BASE64_IMAGE_BYTES = 3_750_000


def _base64_data_url_size(raw_size: int) -> int:
    return DATA_URL_PREFIX_BYTES + 4 * ((raw_size + 2) // 3)


def _bounded_jpeg(image: Image.Image) -> tuple[Image.Image, bytes]:
    """Encode below Groq's inline-image cap while preserving useful detail."""
    working = image
    while True:
        for quality in (88, 82, 76, 70, 64):
            buffer = io.BytesIO()
            working.save(buffer, "JPEG", quality=quality, optimize=True)
            encoded = buffer.getvalue()
            if _base64_data_url_size(len(encoded)) <= MAX_GROQ_BASE64_IMAGE_BYTES:
                return working, encoded
        width, height = working.size
        next_size = (max(512, int(width * 0.85)), max(512, int(height * 0.85)))
        if next_size == working.size:
            # A 512px JPEG cannot practically reach this limit, but keep a
            # deterministic final fallback if an encoder behaves unexpectedly.
            buffer = io.BytesIO()
            working.save(buffer, "JPEG", quality=50, optimize=True)
            encoded = buffer.getvalue()
            if _base64_data_url_size(len(encoded)) > MAX_GROQ_BASE64_IMAGE_BYTES:
                raise AppError(
                    "image_encoding_too_large", "The image cannot be encoded safely.", 413
                )
            return working, encoded
        working = working.resize(next_size, Image.Resampling.LANCZOS)


async def _read_limited(upload: UploadFile, limit: int) -> bytes:
    chunks: list[bytes] = []
    total = 0
    while chunk := await upload.read(min(1024 * 1024, limit + 1 - total)):
        total += len(chunk)
        if total > limit:
            raise AppError(
                "upload_too_large",
                "An image exceeds the configured upload limit.",
                413,
                {"max_bytes": limit},
            )
        chunks.append(chunk)
    if not chunks:
        raise AppError("empty_upload", "Uploaded images cannot be empty.", 422)
    return b"".join(chunks)


def _normalize_image(raw: bytes, destination: Path, settings: Settings) -> dict[str, Any]:
    try:
        with Image.open(io.BytesIO(raw)) as probe:
            image_format = probe.format
            if image_format not in FORMAT_MIME:
                raise AppError(
                    "unsupported_image", "Only JPEG, PNG, and WebP images are accepted.", 415
                )
            probe.verify()
        with Image.open(io.BytesIO(raw)) as opened:
            if opened.width * opened.height > settings.max_image_pixels:
                raise AppError(
                    "unsafe_image_dimensions",
                    "The image dimensions are too large to process safely.",
                    413,
                )
            if opened.width < 32 or opened.height < 32:
                raise AppError("image_too_small", "The image dimensions are too small.", 422)
            opened.load()
            normalized = opened.convert("RGB")
            normalized.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
            destination.parent.mkdir(parents=True, exist_ok=True)
            normalized, encoded = _bounded_jpeg(normalized)
            width, height = normalized.size
            thumbnail = normalized.copy()
            thumbnail.thumbnail((768, 768))
            gray = thumbnail.convert("L")
            brightness = float(ImageStat.Stat(gray).mean[0])
            edge_variance = float(ImageStat.Stat(gray.filter(ImageFilter.FIND_EDGES)).var[0])
            # Re-encoding removes EXIF, ICC, comments, and other unneeded metadata.
            destination.write_bytes(encoded)
    except (UnidentifiedImageError, OSError, SyntaxError) as exc:
        raise AppError("invalid_image", "The uploaded file is not a valid image.", 415) from exc
    except Image.DecompressionBombError as exc:
        raise AppError("unsafe_image_dimensions", "The image dimensions are unsafe.", 413) from exc

    size = destination.stat().st_size
    return {
        "content_type": "image/jpeg",
        "width": width,
        "height": height,
        "size_bytes": size,
        "brightness": round(brightness, 2),
        "edge_variance": round(edge_variance, 2),
    }


async def store_images(uploads: list[UploadFile], settings: Settings) -> list[dict[str, Any]]:
    if not uploads:
        raise AppError("images_required", "Upload at least one crop image.", 422)
    if len(uploads) > 3:
        raise AppError("too_many_images", "Upload no more than three images.", 422)

    stored: list[dict[str, Any]] = []
    try:
        for upload in uploads:
            raw = await _read_limited(upload, settings.upload_limit_bytes)
            image_id = str(uuid4())
            filename = f"{image_id}.jpg"
            destination = settings.upload_dir.resolve() / filename
            details = await asyncio.to_thread(_normalize_image, raw, destination, settings)
            stored.append({"id": image_id, "filename": filename, **details})
    except (AppError, OSError):
        for image in stored:
            (settings.upload_dir.resolve() / image["filename"]).unlink(missing_ok=True)
        raise
    return stored


def local_quality(
    images: list[dict[str, Any]], settings: Settings, language: str = "en"
) -> ImageQuality:
    swahili = language == "sw"
    observations: list[str] = []
    instructions: list[str] = []
    clarity_scores: list[float] = []
    lighting_ok = True
    undersized = False
    for image in images:
        blur = float(image["edge_variance"])
        brightness = float(image["brightness"])
        clarity_scores.append(min(1.0, blur / max(settings.image_blur_threshold * 2, 1)))
        if blur < settings.image_blur_threshold:
            observations.append(
                "Angalau picha moja inaweza kuwa na ukungu au haijalenga vizuri."
                if swahili
                else "At least one image may be blurred or out of focus."
            )
            instructions.append(
                "Shikilia kamera bila kutikisika na ulenga jani lililoathirika."
                if swahili
                else "Hold the camera steady and focus on the affected leaf."
            )
        if brightness < settings.image_dark_threshold:
            lighting_ok = False
            observations.append(
                "Angalau picha moja ni nyeusi sana."
                if swahili
                else "At least one image is too dark."
            )
            instructions.append(
                "Piga picha tena katika mwanga mkali wa asili usio wa moja kwa moja."
                if swahili
                else "Retake the image in bright, indirect natural light."
            )
        elif brightness > settings.image_bright_threshold:
            lighting_ok = False
            observations.append(
                "Angalau picha moja ina mwanga kupita kiasi."
                if swahili
                else "At least one image is overexposed."
            )
            instructions.append(
                "Ondoka kwenye jua kali la moja kwa moja na epuka mwako kwenye jani."
                if swahili
                else "Move out of harsh direct sun and avoid glare on the leaf."
            )
        if min(int(image["width"]), int(image["height"])) < settings.image_min_dimension:
            undersized = True
            observations.append(
                "Angalau picha moja haina maelezo ya kutosha."
                if swahili
                else "At least one image has limited detail."
            )
            instructions.append(
                "Sogea karibu na ujaze picha kwa eneo lililoathirika."
                if swahili
                else "Move closer and fill the frame with the affected area."
            )
    clarity = round(sum(clarity_scores) / len(clarity_scores), 3)
    severe = clarity < 0.2 or not lighting_ok or undersized
    caution = clarity < 0.5
    status = "retake_required" if severe else "caution" if caution else "good"
    if status == "retake_required" and not instructions:
        instructions.append(
            "Piga picha tena kwa mwanga mzuri huku eneo lililoathirika likiwa limelengwa vizuri."
            if swahili
            else "Retake a well-lit, sharply focused image of the affected area."
        )
    if not observations:
        observations.append(
            "Usalama wa faili, mwanga, vipimo na ulengaji vimefaulu ukaguzi wa kifaa."
            if swahili
            else "File safety, lighting, dimensions, and sharpness passed local checks."
        )
    return ImageQuality(
        status=status,
        plant_visible=True,
        crop_relevant=True,
        affected_area_visible=True,
        clarity_score=clarity,
        lighting_acceptable=lighting_ok,
        observations=list(dict.fromkeys(observations)),
        retake_instructions=list(dict.fromkeys(instructions)),
    )


def merge_quality(local: ImageQuality, model: ImageQuality) -> ImageQuality:
    order = {"good": 0, "caution": 1, "retake_required": 2}
    status = max((local.status, model.status), key=order.__getitem__)
    return ImageQuality(
        status=status,
        plant_visible=model.plant_visible,
        crop_relevant=model.crop_relevant,
        affected_area_visible=model.affected_area_visible,
        clarity_score=min(local.clarity_score, model.clarity_score),
        lighting_acceptable=local.lighting_acceptable and model.lighting_acceptable,
        observations=list(dict.fromkeys(local.observations + model.observations))[:8],
        retake_instructions=list(
            dict.fromkeys(local.retake_instructions + model.retake_instructions)
        )[:5],
    )


def image_data_urls(images: list[dict[str, Any]], settings: Settings) -> list[str]:
    values: list[str] = []
    for image in images:
        path = settings.upload_dir.resolve() / image["filename"]
        encoded = base64.b64encode(path.read_bytes()).decode("ascii")
        values.append(f"data:image/jpeg;base64,{encoded}")
    return values


def image_public_metadata(assessment_id: str, images: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "id": image["id"],
            "content_type": image["content_type"],
            "width": image["width"],
            "height": image["height"],
            "size_bytes": image["size_bytes"],
            "url": f"/api/v1/assessments/{assessment_id}/images/{image['id']}",
        }
        for image in images
    ]
