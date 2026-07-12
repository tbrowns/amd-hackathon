from __future__ import annotations

from typing import Any


class AppError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: Any = None,
        *,
        retryable: bool = False,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        self.retryable = retryable


class ModelTimeoutError(AppError):
    def __init__(self) -> None:
        super().__init__(
            "model_timeout", "The AI service timed out. Please retry.", 504, retryable=True
        )


class ModelResponseError(AppError):
    def __init__(self, message: str = "The AI service returned an invalid response.") -> None:
        super().__init__("invalid_model_response", message, 502)


class ModelUnavailableError(AppError):
    def __init__(self, message: str = "The AI service is temporarily unavailable.") -> None:
        super().__init__("model_unavailable", message, 503, retryable=True)


class NotFoundError(AppError):
    def __init__(self, message: str = "Assessment not found.") -> None:
        super().__init__("not_found", message, 404)


class OwnershipError(AppError):
    def __init__(self) -> None:
        super().__init__("not_found", "Assessment not found.", 404)
