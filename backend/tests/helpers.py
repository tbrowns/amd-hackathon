from __future__ import annotations

import io

from PIL import Image, ImageDraw


def detailed_jpeg() -> bytes:
    image = Image.new("RGB", (900, 700), "#d9e6bd")
    draw = ImageDraw.Draw(image)
    for x in range(0, 900, 24):
        color = "#31572c" if (x // 24) % 2 else "#90a955"
        draw.rectangle((x, 0, x + 12, 700), fill=color)
    draw.ellipse((260, 160, 640, 540), fill="#5f3b22", outline="#fff5d6", width=8)
    buffer = io.BytesIO()
    image.save(buffer, "JPEG", quality=90, exif=b"Exif\x00\x00test-metadata")
    return buffer.getvalue()


def assessment_form(crop: str = "tomato", language: str = "en") -> dict[str, str]:
    return {
        "crop": crop,
        "growth_stage": "vegetative",
        "symptom_duration": "4 days",
        "watering_conditions": "soil has remained moist",
        "region": "Kiambu",
        "description": "Spots started on lower leaves",
        "language": language,
    }
