from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header

from app.core.config import Settings, get_settings
from app.core.errors import AppError
from app.services.firebase import verify_firebase_id_token


async def require_token(
    x_shamba_token: Annotated[str | None, Header(alias="X-Shamba-Token")] = None,
) -> str:
    if x_shamba_token is None:
        raise AppError(
            "anonymous_token_required",
            "X-Shamba-Token is required for private assessment access.",
            401,
        )
    token = x_shamba_token.strip()
    if len(token) < 16 or len(token) > 256:
        raise AppError(
            "invalid_anonymous_token",
            "X-Shamba-Token must contain 16 to 256 characters.",
            401,
        )
    return token


async def require_firebase_user(
    settings: Annotated[Settings, Depends(get_settings)],
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
) -> str:
    if authorization is None or not authorization.startswith("Bearer "):
        raise AppError(
            "firebase_token_required",
            "A Firebase bearer token is required for direct image uploads.",
            401,
        )
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise AppError(
            "firebase_token_required",
            "A Firebase bearer token is required for direct image uploads.",
            401,
        )
    return await verify_firebase_id_token(token, settings)
