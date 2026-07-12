from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import require_token
from app.core.config import Settings, get_settings
from app.core.errors import AppError
from app.db.models import Assessment
from app.db.session import get_db
from app.schemas.assessments import (
    AnswerSubmission,
    AssessmentDetail,
    AssessmentList,
    Crop,
    DashboardSummary,
    Language,
    RuntimeInfo,
)
from app.services.images import store_images
from app.services.pipeline import (
    LAST_STAGE_LATENCIES_MS,
    analyze_assessment,
    default_demo_scenario,
    revise_assessment,
)
from app.services.repository import (
    dashboard_summary,
    list_owned,
    owned_assessment,
    reset_demo,
    to_detail,
    token_hash,
)

router = APIRouter()


@router.get("/health", tags=["system"])
async def health(db: Annotated[AsyncSession, Depends(get_db)]) -> dict[str, str]:
    await db.execute(text("SELECT 1"))
    return {"status": "ok"}


@router.get("/api/v1/system/runtime", response_model=RuntimeInfo, tags=["system"])
async def runtime(settings: Annotated[Settings, Depends(get_settings)]) -> RuntimeInfo:
    url = settings.async_database_url
    database = (
        "postgresql"
        if url.startswith("postgresql")
        else "sqlite"
        if url.startswith("sqlite")
        else "other"
    )
    return RuntimeInfo(
        ai_provider="demo" if settings.demo_mode else settings.ai_provider,
        execution_mode="demo" if settings.demo_mode else "live",
        vision_model="deterministic-fixture" if settings.demo_mode else settings.groq_vision_model,
        reasoning_model="deterministic-fixture"
        if settings.demo_mode
        else settings.groq_reasoning_model,
        verifier_model="deterministic-fixture"
        if settings.demo_mode
        else settings.groq_verifier_model,
        last_stage_latencies_ms=dict(LAST_STAGE_LATENCIES_MS),
        database=database,
    )


@router.post(
    "/api/v1/assessments",
    response_model=AssessmentDetail,
    status_code=201,
    tags=["assessments"],
)
async def create_assessment(
    token: Annotated[str, Depends(require_token)],
    db: Annotated[AsyncSession, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
    crop: Annotated[str, Form()],
    growth_stage: Annotated[str, Form(min_length=1, max_length=80)],
    symptom_duration: Annotated[str, Form(min_length=1, max_length=120)],
    watering_conditions: Annotated[str, Form(min_length=1, max_length=200)],
    images: Annotated[list[UploadFile], File()],
    language: Annotated[str, Form()] = "en",
    region: Annotated[str | None, Form(max_length=120)] = None,
    description: Annotated[str | None, Form(max_length=2000)] = None,
    demo_scenario: Annotated[str | None, Form(max_length=64)] = None,
) -> AssessmentDetail:
    try:
        crop_value = Crop(crop.lower()).value
        language_value = Language(language.lower()).value
    except ValueError as exc:
        raise AppError(
            "invalid_context",
            "Crop must be tomato, onion, or kale and language must be en or sw.",
            422,
        ) from exc
    selected_scenario = default_demo_scenario(crop_value, settings, demo_scenario)
    stored = await store_images(images, settings)
    assessment = Assessment(
        token_hash=token_hash(token, settings),
        crop=crop_value,
        growth_stage=growth_stage.strip(),
        region=region.strip() if region and region.strip() else None,
        symptom_duration=symptom_duration.strip(),
        watering_conditions=watering_conditions.strip(),
        description=description.strip() if description and description.strip() else None,
        language=language_value,
        demo_scenario=selected_scenario,
        images=stored,
        provider_metadata={},
        timing_metadata={},
    )
    db.add(assessment)
    try:
        await db.commit()
    except SQLAlchemyError:
        await db.rollback()
        for image in stored:
            (settings.upload_dir.resolve() / image["filename"]).unlink(missing_ok=True)
        raise
    await db.refresh(assessment)
    return to_detail(assessment)


@router.post(
    "/api/v1/assessments/{assessment_id}/analyze",
    response_model=AssessmentDetail,
    tags=["assessments"],
)
async def analyze(
    assessment_id: str,
    token: Annotated[str, Depends(require_token)],
    db: Annotated[AsyncSession, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AssessmentDetail:
    assessment = await owned_assessment(db, assessment_id, token_hash(token, settings))
    return to_detail(await analyze_assessment(assessment, db, settings))


@router.post(
    "/api/v1/assessments/{assessment_id}/answers",
    response_model=AssessmentDetail,
    tags=["assessments"],
)
async def submit_answers(
    assessment_id: str,
    submission: AnswerSubmission,
    token: Annotated[str, Depends(require_token)],
    db: Annotated[AsyncSession, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AssessmentDetail:
    assessment = await owned_assessment(db, assessment_id, token_hash(token, settings))
    return to_detail(await revise_assessment(assessment, submission.answers, db, settings))


@router.get(
    "/api/v1/assessments/{assessment_id}",
    response_model=AssessmentDetail,
    tags=["assessments"],
)
async def get_assessment(
    assessment_id: str,
    token: Annotated[str, Depends(require_token)],
    db: Annotated[AsyncSession, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AssessmentDetail:
    return to_detail(await owned_assessment(db, assessment_id, token_hash(token, settings)))


@router.get("/api/v1/assessments", response_model=AssessmentList, tags=["assessments"])
async def get_assessments(
    token: Annotated[str, Depends(require_token)],
    db: Annotated[AsyncSession, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> AssessmentList:
    return await list_owned(db, token_hash(token, settings), limit, offset)


@router.get(
    "/api/v1/assessments/{assessment_id}/images/{image_id}",
    tags=["assessments"],
)
async def get_assessment_image(
    assessment_id: str,
    image_id: str,
    token: Annotated[str, Depends(require_token)],
    db: Annotated[AsyncSession, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> FileResponse:
    assessment = await owned_assessment(db, assessment_id, token_hash(token, settings))
    image = next((item for item in assessment.images if item.get("id") == image_id), None)
    if image is None:
        raise AppError("not_found", "Image not found.", 404)
    upload_root = settings.upload_dir.resolve()
    path = (upload_root / str(image["filename"])).resolve()
    if path.parent != upload_root or not path.is_file():
        raise AppError("not_found", "Image not found.", 404)
    return FileResponse(
        path, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=300"}
    )


@router.get("/api/v1/dashboard/summary", response_model=DashboardSummary, tags=["dashboard"])
async def get_dashboard(
    db: Annotated[AsyncSession, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> DashboardSummary:
    return await dashboard_summary(db, demo_mode=settings.demo_mode)


@router.post("/api/v1/demo/reset", tags=["demo"])
async def reset_demo_data(
    token: Annotated[str, Depends(require_token)],
    db: Annotated[AsyncSession, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, Any]:
    if not settings.demo_mode:
        raise AppError("demo_mode_disabled", "Demo reset is available only in demo mode.", 404)
    deleted = await reset_demo(db, token_hash(token, settings))
    return {"deleted": deleted, "simulated": True}
