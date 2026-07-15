from __future__ import annotations

from typing import Any

import httpx
import pytest

import app.api.router as router_module
import app.services.images as image_service
from app.api.dependencies import require_firebase_user
from app.core.config import Settings, get_settings
from app.core.errors import AppError
from app.main import app
from app.schemas.assessments import StorageImageReference
from app.services.images import store_firebase_images
from tests.helpers import detailed_jpeg


def firebase_settings() -> Settings:
    return Settings(
        image_storage="firebase",
        firebase_project_id="shamba-ai-fe407",
        firebase_storage_bucket="shamba-ai-fe407.firebasestorage.app",
        demo_mode=True,
        max_upload_mb=8,
    )


def storage_reference(uid: str = "firebase-user-1") -> StorageImageReference:
    return StorageImageReference(
        object_path=(
            f"users/{uid}/uploads/2e70e1d4-9195-44f2-a454-71b8fc07d333/"
            "0f9e58ce-3872-4317-8e0a-8c84fb73062c.jpg"
        ),
        content_type="image/jpeg",
        size_bytes=len(detailed_jpeg()),
    )


@pytest.mark.asyncio
async def test_firebase_upload_is_normalized_and_moved_to_private_assessment_path(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    uploaded: list[tuple[str, bytes, str]] = []

    async def fake_download(*_: object, **__: object) -> bytes:
        return detailed_jpeg()

    async def fake_upload(
        object_path: str,
        raw: bytes,
        _: Settings,
        *,
        content_type: str,
    ) -> None:
        uploaded.append((object_path, raw, content_type))

    monkeypatch.setattr(image_service, "download_firebase_object", fake_download)
    monkeypatch.setattr(image_service, "upload_firebase_object", fake_upload)

    stored = await store_firebase_images(
        [storage_reference()], "firebase-user-1", "assessment-1", firebase_settings()
    )

    assert stored[0]["storage_provider"] == "firebase"
    assert stored[0]["object_path"].startswith(
        "users/firebase-user-1/assessments/assessment-1/"
    )
    assert stored[0]["content_type"] == "image/jpeg"
    assert uploaded[0][0] == stored[0]["object_path"]
    assert uploaded[0][2] == "image/jpeg"
    assert uploaded[0][1].startswith(b"\xff\xd8\xff")
    assert b"Exif" not in uploaded[0][1]


@pytest.mark.asyncio
async def test_firebase_upload_rejects_another_users_path() -> None:
    with pytest.raises(AppError) as caught:
        await store_firebase_images(
            [storage_reference("different-user")],
            "firebase-user-1",
            "assessment-1",
            firebase_settings(),
        )
    assert caught.value.code == "invalid_storage_path"


@pytest.mark.asyncio
async def test_storage_assessment_endpoint_persists_only_sanitized_metadata(
    client: httpx.AsyncClient,
    token_headers: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = firebase_settings()
    sanitized = {
        "id": "sanitized-image-id",
        "storage_provider": "firebase",
        "object_path": "users/firebase-user-1/assessments/assessment-id/sanitized.jpg",
        "content_type": "image/jpeg",
        "width": 900,
        "height": 700,
        "size_bytes": 25_000,
        "brightness": 120.0,
        "edge_variance": 90.0,
    }
    deleted_uploads: list[str] = []

    async def fake_store(*_: object, **__: object) -> list[dict[str, Any]]:
        return [sanitized]

    async def fake_delete(
        references: list[StorageImageReference], *_: object, **__: object
    ) -> None:
        deleted_uploads.extend(item.object_path for item in references)

    async def firebase_user() -> str:
        return "firebase-user-1"

    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[require_firebase_user] = firebase_user
    monkeypatch.setattr(router_module, "store_firebase_images", fake_store)
    monkeypatch.setattr(router_module, "delete_firebase_uploads", fake_delete)
    try:
        response = await client.post(
            "/api/v1/assessments/from-storage",
            headers=token_headers,
            json={
                "crop": "tomato",
                "growth_stage": "vegetative",
                "symptom_duration": "4 days",
                "watering_conditions": "soil has remained moist",
                "region": "Kiambu",
                "description": "Spots started on lower leaves",
                "language": "en",
                "images": [storage_reference().model_dump(mode="json")],
            },
        )
    finally:
        app.dependency_overrides.pop(get_settings, None)
        app.dependency_overrides.pop(require_firebase_user, None)

    assert response.status_code == 201, response.text
    assert response.json()["images"][0]["id"] == "sanitized-image-id"
    assert response.json()["provider_metadata"]["image_storage"] == "firebase"
    assert deleted_uploads == [storage_reference().object_path]
