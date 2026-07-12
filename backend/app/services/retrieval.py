from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict

TOKEN_RE = re.compile(r"[a-z0-9]+")


class KnowledgeEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    crop: str
    problem_name: str
    category: str
    visual_signs: list[str]
    distribution: list[str]
    conditions: list[str]
    distinguishing_features: list[str]
    low_risk_actions: list[str]
    escalation_signs: list[str]
    source_title: str
    source_reference: str


def _tokens(value: str) -> set[str]:
    return set(TOKEN_RE.findall(value.lower()))


@lru_cache
def load_knowledge_base() -> tuple[KnowledgeEntry, ...]:
    path = Path(__file__).resolve().parents[1] / "knowledge" / "crop_problems.json"
    raw = json.loads(path.read_text(encoding="utf-8"))
    return tuple(KnowledgeEntry.model_validate(item) for item in raw)


def retrieve_evidence(
    crop: str,
    observations: list[str],
    context: dict[str, Any],
    *,
    limit: int = 6,
) -> list[KnowledgeEntry]:
    query = " ".join(observations + [str(value) for value in context.values() if value])
    query_tokens = _tokens(query)
    candidates: list[tuple[int, KnowledgeEntry]] = []
    for entry in load_knowledge_base():
        if entry.crop != crop:
            continue
        corpus = " ".join(
            [
                entry.problem_name,
                entry.category,
                *entry.visual_signs,
                *entry.distribution,
                *entry.conditions,
                *entry.distinguishing_features,
            ]
        )
        overlap = len(query_tokens & _tokens(corpus))
        # Keep every crop entry eligible when farmer context is sparse.
        candidates.append((overlap, entry))
    candidates.sort(key=lambda item: (-item[0], item[1].problem_name))
    return [entry for _, entry in candidates[:limit]]


def evidence_for_prompt(entries: list[KnowledgeEntry]) -> list[dict[str, Any]]:
    return [entry.model_dump() for entry in entries]


def source_labels(entries: list[KnowledgeEntry]) -> list[str]:
    return [f"{entry.source_title} — {entry.source_reference}" for entry in entries]
