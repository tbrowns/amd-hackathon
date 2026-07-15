from __future__ import annotations

from typing import NoReturn

import pytest

from app.core.config import Settings
from app.core.errors import AppError, ModelTimeoutError
from app.db.models import Assessment
from app.db.session import SessionLocal
from app.fixtures.demo import _diagnosis, _observation
from app.schemas.assessments import AnswerItem, ImageQuality
from app.services import pipeline


class FailingProvider:
    def __init__(self, error: AppError) -> None:
        self.error = error

    async def observe_images(self, **_: object) -> NoReturn:
        raise self.error

    async def revise(self, **_: object) -> NoReturn:
        raise self.error


def assessment(*, status: str = "created") -> Assessment:
    return Assessment(
        token_hash="a" * 64,
        status=status,
        crop="tomato",
        growth_stage="vegetative",
        region="Kiambu",
        symptom_duration="4 days",
        watering_conditions="wet",
        language="en",
        demo_scenario=None,
        images=[{"filename": "not-read.jpg"}],
        provider_metadata={},
        timing_metadata={},
    )


def good_quality() -> ImageQuality:
    return ImageQuality(
        status="good",
        plant_visible=True,
        crop_relevant=True,
        affected_area_visible=True,
        clarity_score=0.8,
        lighting_acceptable=True,
        observations=["The leaf is visible."],
        retake_instructions=[],
    )


@pytest.mark.asyncio
async def test_analysis_timeout_restores_retryable_state(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    item = assessment()
    provider = FailingProvider(ModelTimeoutError())
    monkeypatch.setattr(pipeline, "provider_for", lambda *_: provider)
    monkeypatch.setattr(pipeline, "local_quality", lambda *_: good_quality())
    async def fake_image_data_urls(*_: object) -> list[str]:
        return ["data:image/jpeg;base64,eA=="]

    monkeypatch.setattr(pipeline, "image_data_urls", fake_image_data_urls)
    async with SessionLocal() as db:
        db.add(item)
        await db.commit()
        with pytest.raises(ModelTimeoutError):
            await pipeline.analyze_assessment(
                item,
                db,
                Settings(demo_mode=False, groq_api_key="gsk_test"),
            )
        await db.refresh(item)
    assert item.status == "created"


@pytest.mark.asyncio
async def test_revision_rate_limit_restores_questions_state(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    item = assessment(status="questions_ready")
    item.initial_assessment = _diagnosis("tomato", False).model_dump(mode="json")
    item.model_observation = _observation("tomato", False).model_dump(mode="json")
    provider = FailingProvider(
        AppError(
            "model_rate_limited",
            "The AI service is busy. Please retry shortly.",
            503,
            retryable=True,
        )
    )
    monkeypatch.setattr(pipeline, "provider_for", lambda *_: provider)
    async with SessionLocal() as db:
        db.add(item)
        await db.commit()
        with pytest.raises(AppError, match="busy"):
            await pipeline.revise_assessment(
                item,
                [AnswerItem(question_id="target_rings", answer=True)],
                db,
                Settings(demo_mode=False, groq_api_key="gsk_test"),
            )
        await db.refresh(item)
    assert item.status == "questions_ready"
