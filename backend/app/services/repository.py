from __future__ import annotations

import hashlib
import hmac
import re
from collections import Counter
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.errors import OwnershipError
from app.db.models import Assessment
from app.schemas.assessments import (
    AssessmentDetail,
    AssessmentList,
    AssessmentSummary,
    DashboardRegion,
    DashboardSummary,
)
from app.services.images import image_public_metadata

KENYA_COUNTIES = (
    "Baringo",
    "Bomet",
    "Bungoma",
    "Busia",
    "Elgeyo-Marakwet",
    "Embu",
    "Garissa",
    "Homa Bay",
    "Isiolo",
    "Kajiado",
    "Kakamega",
    "Kericho",
    "Kiambu",
    "Kilifi",
    "Kirinyaga",
    "Kisii",
    "Kisumu",
    "Kitui",
    "Kwale",
    "Laikipia",
    "Lamu",
    "Machakos",
    "Makueni",
    "Mandera",
    "Marsabit",
    "Meru",
    "Migori",
    "Mombasa",
    "Murang'a",
    "Nairobi",
    "Nakuru",
    "Nandi",
    "Narok",
    "Nyamira",
    "Nyandarua",
    "Nyeri",
    "Samburu",
    "Siaya",
    "Taita-Taveta",
    "Tana River",
    "Tharaka-Nithi",
    "Trans Nzoia",
    "Turkana",
    "Uasin Gishu",
    "Vihiga",
    "Wajir",
    "West Pokot",
)


def _region_words(value: str) -> str:
    return " ".join(re.sub(r"[^a-z0-9]+", " ", value.casefold()).split())


COUNTY_BY_WORDS = {_region_words(county): county for county in KENYA_COUNTIES}


def canonical_region(value: str | None) -> str:
    """Reduce free-form locations to a public, county-level bucket."""
    words = _region_words(value or "")
    padded = f" {words} "
    matches: list[tuple[int, int, str]] = []
    for county_words, county in COUNTY_BY_WORDS.items():
        position = padded.rfind(f" {county_words} ")
        if position >= 0:
            matches.append((position, len(county_words), county))
    if matches:
        # County names usually appear as the final, broadest segment (for
        # example ``Ruiru, Kiambu``). Longest wins when segments overlap.
        return max(matches)[2]
    return "Other/Unspecified"


def token_hash(token: str, settings: Settings) -> str:
    return hmac.new(
        settings.anonymous_token_salt.encode("utf-8"),
        token.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


async def owned_assessment(db: AsyncSession, assessment_id: str, owner_hash: str) -> Assessment:
    result = await db.execute(
        select(Assessment).where(
            Assessment.id == assessment_id,
            Assessment.token_hash == owner_hash,
        )
    )
    assessment = result.scalar_one_or_none()
    if assessment is None:
        raise OwnershipError()
    return assessment


def _leading(assessment: Assessment) -> tuple[str | None, str | None]:
    result = assessment.final_assessment or assessment.initial_assessment
    if not result:
        return None, None
    hypotheses = result.get("hypotheses", [])
    if not hypotheses:
        return None, result.get("urgency")
    return hypotheses[0].get("name"), result.get("urgency")


def to_detail(assessment: Assessment) -> AssessmentDetail:
    return AssessmentDetail.model_validate(
        {
            "id": assessment.id,
            "status": assessment.status,
            "crop": assessment.crop,
            "growth_stage": assessment.growth_stage,
            "region": assessment.region,
            "symptom_duration": assessment.symptom_duration,
            "watering_conditions": assessment.watering_conditions,
            "description": assessment.description,
            "language": assessment.language,
            "images": image_public_metadata(assessment.id, assessment.images),
            "image_quality": assessment.image_quality,
            "model_observation": assessment.model_observation,
            "initial_assessment": assessment.initial_assessment,
            "answers": assessment.answers,
            "final_assessment": assessment.final_assessment,
            "verification": assessment.verification,
            "provider_metadata": assessment.provider_metadata,
            "timing_metadata": assessment.timing_metadata,
            "created_at": assessment.created_at,
            "updated_at": assessment.updated_at,
            "completed_at": assessment.completed_at,
            "simulated": bool(assessment.demo_scenario),
        }
    )


async def list_owned(db: AsyncSession, owner_hash: str, limit: int, offset: int) -> AssessmentList:
    query = (
        select(Assessment)
        .where(Assessment.token_hash == owner_hash)
        .order_by(Assessment.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = list((await db.scalars(query)).all())
    total = int(
        await db.scalar(
            select(func.count()).select_from(Assessment).where(Assessment.token_hash == owner_hash)
        )
        or 0
    )
    items = []
    for assessment in rows:
        leading, urgency = _leading(assessment)
        items.append(
            AssessmentSummary(
                id=assessment.id,
                status=assessment.status,
                crop=assessment.crop,
                region=assessment.region,
                urgency=urgency,
                leading_hypothesis=leading,
                created_at=assessment.created_at,
                completed_at=assessment.completed_at,
                simulated=bool(assessment.demo_scenario),
            )
        )
    return AssessmentList(items=items, total=total)


async def dashboard_summary(db: AsyncSession, *, demo_mode: bool) -> DashboardSummary:
    since = datetime.now(UTC) - timedelta(days=7)
    conditions = [
        Assessment.status == "completed",
        Assessment.completed_at >= since,
    ]
    conditions.append(
        Assessment.demo_scenario.is_not(None)
        if demo_mode
        else Assessment.demo_scenario.is_(None)
    )
    rows = list((await db.scalars(select(Assessment).where(*conditions))).all())

    # A total is useful without revealing which crop, category, urgency, or
    # location belongs to a singleton/doubleton live report.
    if not demo_mode and len(rows) < 3:
        return DashboardSummary(
            reports_this_week=len(rows),
            most_affected_crop=None,
            most_common_category=None,
            reports_by_region=[],
            high_urgency_signals=0,
            disclaimer="Community-reported AI signals, not confirmed outbreak data.",
            simulated=False,
        )

    crops = Counter(row.crop for row in rows)
    regions = Counter(canonical_region(row.region) for row in rows)
    categories: Counter[str] = Counter()
    high = 0
    for row in rows:
        final = row.final_assessment or {}
        if final.get("urgency") == "high":
            high += 1
        hypotheses = final.get("hypotheses", [])
        if hypotheses and hypotheses[0].get("category"):
            categories[str(hypotheses[0]["category"])] += 1
    region_counts = regions.most_common(12)
    top_crop = crops.most_common(1)
    top_category = categories.most_common(1)
    if not demo_mode:
        region_counts = [(region, count) for region, count in region_counts if count >= 3]
        top_crop = [(value, count) for value, count in top_crop if count >= 3]
        top_category = [(value, count) for value, count in top_category if count >= 3]
        high = high if high >= 3 else 0
    return DashboardSummary(
        reports_this_week=len(rows),
        most_affected_crop=top_crop[0][0] if top_crop else None,
        most_common_category=top_category[0][0] if top_category else None,
        reports_by_region=[
            DashboardRegion(region=region, reports=count) for region, count in region_counts
        ],
        high_urgency_signals=high,
        disclaimer="Community-reported AI signals, not confirmed outbreak data.",
        simulated=demo_mode,
    )


async def reset_demo(db: AsyncSession, owner_hash: str) -> int:
    result = await db.execute(
        delete(Assessment).where(
            Assessment.token_hash == owner_hash,
            Assessment.demo_scenario.is_not(None),
        )
    )
    await db.commit()
    return int(result.rowcount or 0)  # type: ignore[attr-defined]
