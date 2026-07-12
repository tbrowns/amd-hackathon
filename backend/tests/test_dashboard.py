from __future__ import annotations

from datetime import UTC, datetime

import pytest

from app.db.models import Assessment
from app.db.session import SessionLocal
from app.services.repository import canonical_region, dashboard_summary


def completed(*, demo: bool, region: str = "Kiambu") -> Assessment:
    final = {
        "urgency": "high",
        "hypotheses": [{"name": "Early blight", "category": "fungal disease"}],
    }
    return Assessment(
        token_hash="a" * 64,
        status="completed",
        crop="tomato",
        growth_stage="vegetative",
        region=region,
        symptom_duration="4 days",
        watering_conditions="wet",
        language="en",
        demo_scenario="tomato_leaf_spots" if demo else None,
        images=[],
        final_assessment=final,
        provider_metadata={},
        timing_metadata={},
        completed_at=datetime.now(UTC),
    )


@pytest.mark.asyncio
async def test_dashboard_keeps_live_and_demo_aggregates_separate() -> None:
    async with SessionLocal() as db:
        db.add_all([completed(demo=True), completed(demo=False)])
        await db.commit()
        live = await dashboard_summary(db, demo_mode=False)
        demo = await dashboard_summary(db, demo_mode=True)
    assert live.reports_this_week == 1
    assert live.simulated is False
    assert live.most_affected_crop is None
    assert live.most_common_category is None
    assert live.reports_by_region == []
    assert live.high_urgency_signals == 0
    assert demo.reports_this_week == 1
    assert demo.simulated is True
    assert demo.most_affected_crop == "tomato"
    assert demo.reports_by_region[0].region == "Kiambu"
    assert demo.reports_by_region[0].reports == 1
    assert demo.high_urgency_signals == 1


def test_regions_are_reduced_to_counties() -> None:
    assert canonical_region("Ruiru, Kiambu County, Kenya") == "Kiambu"
    assert canonical_region("Embu Road, Nairobi") == "Nairobi"
    assert canonical_region("Plot 17, Tiny Village") == "Other/Unspecified"
    assert canonical_region(None) == "Other/Unspecified"


@pytest.mark.asyncio
async def test_live_region_buckets_require_three_reports() -> None:
    async with SessionLocal() as db:
        db.add_all(
            [
                completed(demo=False, region="Kiambu"),
                completed(demo=False, region="Ruiru, Kiambu County"),
                completed(demo=False, region="Kiambu, Kenya"),
                completed(demo=False, region="Plot 17, Tiny Village"),
            ]
        )
        await db.commit()
        result = await dashboard_summary(db, demo_mode=False)
    assert result.reports_this_week == 4
    assert result.most_affected_crop == "tomato"
    assert [(item.region, item.reports) for item in result.reports_by_region] == [
        ("Kiambu", 3)
    ]
    assert result.high_urgency_signals == 4


@pytest.mark.asyncio
async def test_live_dashboard_suppresses_sparse_non_region_buckets() -> None:
    rows = [
        completed(demo=False, region="Kiambu"),
        completed(demo=False, region="Nakuru"),
        completed(demo=False, region="Embu"),
    ]
    rows[1].crop = "onion"
    rows[1].final_assessment = {
        "urgency": "low",
        "hypotheses": [{"name": "Thrips", "category": "pest"}],
    }
    rows[2].crop = "kale"
    rows[2].final_assessment = {
        "urgency": "low",
        "hypotheses": [{"name": "Water stress", "category": "water stress"}],
    }
    async with SessionLocal() as db:
        db.add_all(rows)
        await db.commit()
        result = await dashboard_summary(db, demo_mode=False)
    assert result.reports_this_week == 3
    assert result.most_affected_crop is None
    assert result.most_common_category is None
    assert result.reports_by_region == []
    assert result.high_urgency_signals == 0
