from __future__ import annotations

from typing import Annotated

from fastapi import Header

from app.core.errors import AppError


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
