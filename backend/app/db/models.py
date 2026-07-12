from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import JSON, DateTime, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def utcnow() -> datetime:
    return datetime.now(UTC)


class Assessment(Base):
    __tablename__ = "assessments"
    __table_args__ = (Index("ix_assessments_created_at", "created_at"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    token_hash: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(32), default="created")
    crop: Mapped[str] = mapped_column(String(32))
    growth_stage: Mapped[str] = mapped_column(String(80))
    region: Mapped[str | None] = mapped_column(String(120))
    symptom_duration: Mapped[str] = mapped_column(String(120))
    watering_conditions: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    language: Mapped[str] = mapped_column(String(8), default="en")
    demo_scenario: Mapped[str | None] = mapped_column(String(64))
    images: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    image_quality: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    model_observation: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    initial_assessment: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    answers: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON)
    final_assessment: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    verification: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    provider_metadata: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    timing_metadata: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
