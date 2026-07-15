from __future__ import annotations

import asyncio
import json
from typing import Any

from firebase_admin import App, auth, credentials, get_app, initialize_app, storage
from google.api_core.exceptions import GoogleAPIError, NotFound

from app.core.config import Settings
from app.core.errors import AppError

FIREBASE_APP_NAME = "shambalens"


def _firebase_app(settings: Settings) -> App:
    if settings.image_storage != "firebase":
        raise AppError(
            "firebase_storage_disabled",
            "Firebase image storage is not enabled for this deployment.",
            503,
        )
    try:
        return get_app(FIREBASE_APP_NAME)
    except ValueError:
        pass

    try:
        service_account_secret = settings.firebase_service_account_json
        if service_account_secret and service_account_secret.get_secret_value().strip():
            service_account = json.loads(
                service_account_secret.get_secret_value()
            )
            credential = credentials.Certificate(service_account)
        else:
            credential = credentials.ApplicationDefault()
        return initialize_app(
            credential,
            {
                "projectId": settings.firebase_project_id,
                "storageBucket": settings.firebase_storage_bucket,
            },
            name=FIREBASE_APP_NAME,
        )
    except Exception as exc:
        raise AppError(
            "firebase_configuration_error",
            "Firebase Admin credentials are missing or invalid.",
            503,
        ) from exc


async def verify_firebase_id_token(token: str, settings: Settings) -> str:
    def verify() -> str:
        try:
            decoded: dict[str, Any] = auth.verify_id_token(
                token, app=_firebase_app(settings), check_revoked=False
            )
        except Exception as exc:
            raise AppError(
                "invalid_firebase_token",
                "The Firebase identity token is invalid or expired.",
                401,
            ) from exc
        uid = decoded.get("uid")
        if not isinstance(uid, str) or not uid:
            raise AppError(
                "invalid_firebase_token",
                "The Firebase identity token does not identify a user.",
                401,
            )
        return uid

    return await asyncio.to_thread(verify)


async def download_firebase_object(
    object_path: str,
    settings: Settings,
    *,
    max_bytes: int,
    missing_status: int = 422,
) -> bytes:
    def download() -> bytes:
        try:
            blob = storage.bucket(app=_firebase_app(settings)).blob(object_path)
            blob.reload()
            if blob.size is None or blob.size <= 0:
                raise AppError("empty_upload", "An uploaded image is empty.", 422)
            if blob.size > max_bytes:
                raise AppError(
                    "upload_too_large",
                    "An image exceeds the configured upload limit.",
                    413,
                    {"max_bytes": max_bytes},
                )
            raw = blob.download_as_bytes()
            if len(raw) > max_bytes:
                raise AppError(
                    "upload_too_large",
                    "An image exceeds the configured upload limit.",
                    413,
                    {"max_bytes": max_bytes},
                )
            return raw
        except AppError:
            raise
        except NotFound as exc:
            raise AppError(
                "uploaded_image_not_found",
                "An uploaded image could not be found.",
                missing_status,
            ) from exc
        except GoogleAPIError as exc:
            raise AppError(
                "firebase_storage_unavailable",
                "Image storage is temporarily unavailable.",
                503,
                retryable=True,
            ) from exc

    return await asyncio.to_thread(download)


async def upload_firebase_object(
    object_path: str, raw: bytes, settings: Settings, *, content_type: str
) -> None:
    def upload() -> None:
        try:
            blob = storage.bucket(app=_firebase_app(settings)).blob(object_path)
            blob.cache_control = "private, max-age=300"
            blob.upload_from_string(raw, content_type=content_type)
        except GoogleAPIError as exc:
            raise AppError(
                "firebase_storage_unavailable",
                "Image storage is temporarily unavailable.",
                503,
                retryable=True,
            ) from exc

    await asyncio.to_thread(upload)


async def delete_firebase_object(
    object_path: str, settings: Settings, *, ignore_missing: bool = True
) -> None:
    def delete() -> None:
        try:
            storage.bucket(app=_firebase_app(settings)).blob(object_path).delete()
        except NotFound:
            if not ignore_missing:
                raise
        except GoogleAPIError:
            if not ignore_missing:
                raise

    await asyncio.to_thread(delete)
