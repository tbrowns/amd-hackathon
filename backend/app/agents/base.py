from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from app.schemas.assessments import (
    AnswerItem,
    DiagnosisPayload,
    FinalAssessment,
    ImageObservation,
    VerificationResult,
)


class AIProvider(ABC):
    name: str

    @abstractmethod
    async def observe_images(
        self, *, image_data_urls: list[str], crop: str, language: str
    ) -> ImageObservation: ...

    @abstractmethod
    async def diagnose(
        self,
        *,
        observation: ImageObservation,
        context: dict[str, Any],
        evidence: list[dict[str, Any]],
        language: str,
    ) -> DiagnosisPayload: ...

    @abstractmethod
    async def revise(
        self,
        *,
        initial: dict[str, Any],
        observation: dict[str, Any],
        answers: list[AnswerItem],
        context: dict[str, Any],
        evidence: list[dict[str, Any]],
        language: str,
    ) -> FinalAssessment: ...

    @abstractmethod
    async def verify(
        self,
        *,
        final: FinalAssessment,
        observation: dict[str, Any],
        evidence: list[dict[str, Any]],
        language: str,
    ) -> VerificationResult: ...
