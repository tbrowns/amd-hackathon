#!/usr/bin/env python3
"""Run measured ShambaLens assessment pipelines and emit machine-readable results."""

from __future__ import annotations

import argparse
import asyncio
import base64
import io
import json
import statistics
import sys
import time
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from PIL import Image, ImageDraw  # noqa: E402

from app.agents.groq import GroqProvider  # noqa: E402
from app.core.config import Settings  # noqa: E402
from app.fixtures.demo import SCENARIO_BY_CROP, DemoProvider  # noqa: E402
from app.schemas.assessments import AnswerItem  # noqa: E402
from app.services.retrieval import evidence_for_prompt, retrieve_evidence  # noqa: E402


def percentile(values: list[float], percentage: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = min(len(ordered) - 1, max(0, int(round((len(ordered) - 1) * percentage))))
    return ordered[index]


def synthetic_image(crop: str) -> str:
    colors = {"tomato": "#4f772d", "onion": "#7f9f48", "kale": "#31572c"}
    image = Image.new("RGB", (768, 768), "#dbe7c9")
    draw = ImageDraw.Draw(image)
    draw.ellipse((120, 180, 648, 600), fill=colors[crop])
    draw.ellipse((310, 300, 410, 400), fill="#71512d")
    buffer = io.BytesIO()
    image.save(buffer, "JPEG", quality=85)
    return "data:image/jpeg;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")


async def run_one(crop: str, settings: Settings) -> dict[str, Any]:
    provider = (
        DemoProvider(SCENARIO_BY_CROP[crop]) if settings.demo_mode else GroqProvider(settings)
    )
    context = {
        "crop": crop,
        "growth_stage": "vegetative",
        "region": "benchmark",
        "symptom_duration": "4 days",
        "watering_conditions": "moderate",
        "farmer_description": "Benchmark sample",
    }
    started = time.perf_counter()
    observation = await provider.observe_images(
        image_data_urls=[synthetic_image(crop)], crop=crop, language="en"
    )
    entries = retrieve_evidence(
        crop, observation.visible_symptoms + observation.distribution, context
    )
    diagnosis = await provider.diagnose(
        observation=observation,
        context=context,
        evidence=evidence_for_prompt(entries),
        language="en",
    )
    answers = [
        AnswerItem(question_id=item.id, answer=False) for item in diagnosis.follow_up_questions
    ]
    final = await provider.revise(
        initial=diagnosis.model_dump(mode="json"),
        observation=observation.model_dump(mode="json"),
        answers=answers,
        context=context,
        evidence=evidence_for_prompt(entries),
        language="en",
    )
    verification = await provider.verify(
        final=final,
        observation=observation.model_dump(mode="json"),
        evidence=evidence_for_prompt(entries),
        language="en",
    )
    return {
        "scenario": SCENARIO_BY_CROP[crop],
        "latency_ms": round((time.perf_counter() - started) * 1000, 2),
        "structured_output": True,
        "verification_corrected": not verification.passed,
    }


async def run(args: argparse.Namespace) -> dict[str, Any]:
    settings = Settings()
    crops = list(SCENARIO_BY_CROP) if args.scenario == "all" else [args.scenario]
    rows: list[dict[str, Any]] = []
    failures: list[dict[str, str]] = []
    for _ in range(args.runs):
        for crop in crops:
            try:
                rows.append(await run_one(crop, settings))
            except Exception as exc:  # benchmark must record per-scenario failures and continue
                failures.append({"scenario": SCENARIO_BY_CROP[crop], "error": type(exc).__name__})
    latencies = [float(row["latency_ms"]) for row in rows]
    total = len(rows) + len(failures)
    return {
        "mode": "demo" if settings.demo_mode else "live",
        "provider": "demo" if settings.demo_mode else settings.ai_provider,
        "models": {
            "vision": "deterministic-fixture" if settings.demo_mode else settings.groq_vision_model,
            "reasoning": "deterministic-fixture"
            if settings.demo_mode
            else settings.groq_reasoning_model,
            "verifier": "deterministic-fixture"
            if settings.demo_mode
            else settings.groq_verifier_model,
        },
        "number_of_assessments": total,
        "successful_assessments": len(rows),
        "mean_latency_ms": round(statistics.fmean(latencies), 2) if latencies else 0,
        "median_latency_ms": round(statistics.median(latencies), 2) if latencies else 0,
        "p95_latency_ms": round(percentile(latencies, 0.95), 2),
        "structured_output_rate": round(len(rows) / total, 4) if total else 0,
        "verification_correction_rate": (
            round(sum(bool(row["verification_corrected"]) for row in rows) / len(rows), 4)
            if rows
            else 0
        ),
        "runtime": {"execution": "Python API client", "hardware_claims": None},
        "runs": rows,
        "failures": failures,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scenario", choices=["all", *SCENARIO_BY_CROP], default="all")
    parser.add_argument("--runs", type=int, default=1)
    parser.add_argument("--output", type=Path, default=Path("benchmark-results.json"))
    args = parser.parse_args()
    if args.runs < 1:
        parser.error("--runs must be at least 1")
    result = asyncio.run(run(args))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(json.dumps(result, indent=2, ensure_ascii=False))
    if result["successful_assessments"] == 0:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
