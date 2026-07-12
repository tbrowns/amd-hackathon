from __future__ import annotations

import logging
import time
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.base import AIProvider
from app.agents.groq import GroqProvider
from app.core.config import Settings
from app.core.errors import AppError
from app.db.models import Assessment
from app.fixtures.demo import SCENARIO_BY_CROP, DemoProvider
from app.schemas.assessments import (
    AnswerItem,
    AssessmentResult,
    ImageObservation,
)
from app.services.images import image_data_urls, local_quality, merge_quality
from app.services.retrieval import evidence_for_prompt, retrieve_evidence, source_labels
from app.services.safety import cap_diagnosis_confidence, finalize_verification

LAST_STAGE_LATENCIES_MS: dict[str, float] = {}
logger = logging.getLogger(__name__)


def _elapsed_ms(started: float) -> float:
    return round((time.perf_counter() - started) * 1000, 2)


def _context(assessment: Assessment) -> dict[str, Any]:
    return {
        "crop": assessment.crop,
        "growth_stage": assessment.growth_stage,
        "region": assessment.region,
        "symptom_duration": assessment.symptom_duration,
        "watering_conditions": assessment.watering_conditions,
        "farmer_description": assessment.description,
    }


def provider_for(assessment: Assessment, settings: Settings) -> AIProvider:
    if settings.demo_mode:
        return DemoProvider(assessment.demo_scenario)
    if settings.ai_provider.lower() == "groq":
        return GroqProvider(settings)
    raise AppError(
        "unsupported_ai_provider",
        f"AI provider '{settings.ai_provider}' is not configured.",
        503,
    )


async def analyze_assessment(
    assessment: Assessment, db: AsyncSession, settings: Settings
) -> Assessment:
    if assessment.status in {"questions_ready", "completed", "retake_required"}:
        return assessment
    if assessment.status not in {"created", "failed"}:
        raise AppError("invalid_assessment_state", "This assessment cannot be analyzed now.", 409)

    assessment.status = "analyzing"
    await db.commit()
    timings = dict(assessment.timing_metadata or {})
    try:
        started = time.perf_counter()
        local = local_quality(assessment.images, settings, assessment.language)
        timings["local_image_checks_ms"] = _elapsed_ms(started)
        if local.status == "retake_required" and not settings.demo_mode:
            assessment.image_quality = local.model_dump(mode="json")
            assessment.status = "retake_required"
            assessment.timing_metadata = timings
            await db.commit()
            await db.refresh(assessment)
            LAST_STAGE_LATENCIES_MS.update(timings)
            return assessment

        provider = provider_for(assessment, settings)
        started = time.perf_counter()
        observation = await provider.observe_images(
            image_data_urls=image_data_urls(assessment.images, settings),
            crop=assessment.crop,
            language=assessment.language,
        )
        timings["vision_ms"] = _elapsed_ms(started)
        quality = (
            observation.image_quality
            if settings.demo_mode
            else merge_quality(local, observation.image_quality)
        )
        observation = observation.model_copy(update={"image_quality": quality})
        assessment.image_quality = quality.model_dump(mode="json")
        assessment.model_observation = observation.model_dump(mode="json")
        if quality.status == "retake_required":
            assessment.status = "retake_required"
            assessment.timing_metadata = timings
            assessment.provider_metadata = _provider_metadata(settings)
            await db.commit()
            await db.refresh(assessment)
            LAST_STAGE_LATENCIES_MS.update(timings)
            return assessment

        entries = retrieve_evidence(
            assessment.crop,
            observation.visible_symptoms + observation.distribution,
            _context(assessment),
        )
        started = time.perf_counter()
        diagnosis = await provider.diagnose(
            observation=observation,
            context=_context(assessment),
            evidence=evidence_for_prompt(entries),
            language=assessment.language,
        )
        diagnosis = cap_diagnosis_confidence(diagnosis)
        timings["reasoning_ms"] = _elapsed_ms(started)
        initial = AssessmentResult(
            **diagnosis.model_dump(),
            image_quality=quality,
            sources=source_labels(entries),
            simulated=settings.demo_mode,
        )
        assessment.initial_assessment = initial.model_dump(mode="json")
        assessment.status = "questions_ready"
        assessment.provider_metadata = _provider_metadata(settings)
        assessment.timing_metadata = timings
        await db.commit()
        await db.refresh(assessment)
        LAST_STAGE_LATENCIES_MS.update(timings)
        return assessment
    except AppError as exc:
        assessment.status = "created" if exc.retryable else "failed"
        assessment.timing_metadata = timings
        await db.commit()
        raise
    except Exception:
        logger.exception(
            "Unexpected assessment analysis failure",
            extra={"assessment_id": assessment.id},
        )
        await db.rollback()
        try:
            assessment.status = "failed"
            assessment.timing_metadata = timings
            await db.commit()
        except SQLAlchemyError:
            await db.rollback()
            logger.exception("Could not persist failed analysis state")
        raise


def _provider_metadata(settings: Settings) -> dict[str, Any]:
    if settings.demo_mode:
        return {
            "provider": "demo",
            "vision_model": "deterministic-fixture",
            "reasoning_model": "deterministic-fixture",
            "verifier_model": "deterministic-fixture",
            "reasoner_received_images": False,
            "simulated": True,
        }
    return {
        "provider": settings.ai_provider,
        "vision_model": settings.groq_vision_model,
        "reasoning_model": settings.groq_reasoning_model,
        "verifier_model": settings.groq_verifier_model,
        "reasoner_received_images": False,
        "simulated": False,
    }


def _validate_answers(assessment: Assessment, answers: list[AnswerItem]) -> None:
    if not assessment.initial_assessment:
        raise AppError(
            "analysis_required", "Analyze the assessment before answering questions.", 409
        )
    questions = {
        item["id"]: item for item in assessment.initial_assessment.get("follow_up_questions", [])
    }
    unknown = [answer.question_id for answer in answers if answer.question_id not in questions]
    if unknown:
        raise AppError(
            "unknown_question",
            "An answer does not match this assessment's questions.",
            422,
            {"question_ids": unknown},
        )
    for answer in answers:
        question = questions[answer.question_id]
        if question["input_type"] == "multiple_choice" and answer.answer not in question["options"]:
            raise AppError(
                "invalid_answer_option",
                "A selected answer is not one of the available options.",
                422,
                {"question_id": answer.question_id},
            )


async def revise_assessment(
    assessment: Assessment,
    answers: list[AnswerItem],
    db: AsyncSession,
    settings: Settings,
) -> Assessment:
    if assessment.status == "completed":
        return assessment
    if assessment.status != "questions_ready":
        raise AppError("invalid_assessment_state", "This assessment is not ready for answers.", 409)
    _validate_answers(assessment, answers)
    timings = dict(assessment.timing_metadata or {})
    try:
        observation = ImageObservation.model_validate(assessment.model_observation)
        entries = retrieve_evidence(
            assessment.crop,
            observation.visible_symptoms + observation.distribution,
            _context(assessment),
        )
        provider = provider_for(assessment, settings)
        started = time.perf_counter()
        final = await provider.revise(
            initial=assessment.initial_assessment or {},
            observation=observation.model_dump(mode="json"),
            answers=answers,
            context=_context(assessment),
            evidence=evidence_for_prompt(entries),
            language=assessment.language,
        )
        timings["revision_ms"] = _elapsed_ms(started)
        final = final.model_copy(
            update={"sources": source_labels(entries), "simulated": settings.demo_mode}
        )

        started = time.perf_counter()
        verification = await provider.verify(
            final=final,
            observation=observation.model_dump(mode="json"),
            evidence=evidence_for_prompt(entries),
            language=assessment.language,
        )
        timings["verification_ms"] = _elapsed_ms(started)
        final, verification = finalize_verification(
            final, verification, language=assessment.language
        )
        final = final.model_copy(
            update={"sources": source_labels(entries), "simulated": settings.demo_mode}
        )
        if verification.corrected_assessment is not None:
            verification = verification.model_copy(update={"corrected_assessment": final})

        assessment.answers = [answer.model_dump(mode="json") for answer in answers]
        assessment.final_assessment = final.model_dump(mode="json")
        assessment.verification = verification.model_dump(mode="json")
        assessment.provider_metadata = _provider_metadata(settings)
        assessment.timing_metadata = timings
        assessment.status = "completed"
        assessment.completed_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(assessment)
        LAST_STAGE_LATENCIES_MS.update(timings)
        return assessment
    except AppError as exc:
        assessment.status = "questions_ready" if exc.retryable else "failed"
        assessment.timing_metadata = timings
        await db.commit()
        raise
    except Exception:
        logger.exception(
            "Unexpected assessment revision failure",
            extra={"assessment_id": assessment.id},
        )
        await db.rollback()
        try:
            assessment.status = "failed"
            assessment.timing_metadata = timings
            await db.commit()
        except SQLAlchemyError:
            await db.rollback()
            logger.exception("Could not persist failed revision state")
        raise


def default_demo_scenario(crop: str, settings: Settings, requested: str | None) -> str | None:
    if not settings.demo_mode:
        if requested:
            raise AppError(
                "demo_mode_disabled",
                "demo_scenario may only be used when DEMO_MODE=true.",
                422,
            )
        return None
    expected = SCENARIO_BY_CROP[crop]
    if requested and requested != expected:
        raise AppError(
            "invalid_demo_scenario",
            f"The demo scenario for {crop} is '{expected}'.",
            422,
        )
    return expected
