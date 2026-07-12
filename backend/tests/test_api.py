from __future__ import annotations

import io

import httpx
import pytest
from PIL import Image

from app.core.config import Settings, get_settings
from app.main import app
from tests.helpers import assessment_form, detailed_jpeg


async def create_assessment(
    client: httpx.AsyncClient,
    headers: dict[str, str],
    *,
    crop: str = "tomato",
    language: str = "en",
) -> dict[str, object]:
    response = await client.post(
        "/api/v1/assessments",
        headers=headers,
        data=assessment_form(crop, language),
        files={"images": ("../../unsafe-name.jpg", detailed_jpeg(), "image/jpeg")},
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.mark.asyncio
async def test_health_and_runtime(client: httpx.AsyncClient) -> None:
    health = await client.get("/health")
    runtime = await client.get("/api/v1/system/runtime")
    assert health.json() == {"status": "ok"}
    assert runtime.status_code == 200
    assert runtime.json()["execution_mode"] == "demo"
    assert runtime.json()["database"] == "sqlite"
    assert "amd" not in runtime.text.lower()


@pytest.mark.asyncio
async def test_missing_token_uses_standard_error_envelope(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/v1/assessments")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "anonymous_token_required"
    assert response.json()["error"]["request_id"]
    assert response.json()["error"]["retryable"] is False


@pytest.mark.asyncio
async def test_framework_404_and_405_use_standard_error_envelope(
    client: httpx.AsyncClient,
) -> None:
    missing = await client.get("/api/v1/does-not-exist")
    wrong_method = await client.delete("/health")
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "not_found"
    assert missing.json()["error"]["request_id"]
    assert wrong_method.status_code == 405
    assert wrong_method.json()["error"]["code"] == "method_not_allowed"
    assert wrong_method.json()["error"]["request_id"]


@pytest.mark.asyncio
async def test_validation_errors_with_value_context_are_json_serializable(
    client: httpx.AsyncClient, token_headers: dict[str, str]
) -> None:
    response = await client.post(
        "/api/v1/assessments/not-used/answers",
        headers=token_headers,
        json={
            "answers": [
                {"question_id": "duplicate", "answer": True},
                {"question_id": "duplicate", "answer": False},
            ]
        },
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert response.json()["error"]["details"]


@pytest.mark.asyncio
async def test_invalid_and_oversized_uploads(
    client: httpx.AsyncClient, token_headers: dict[str, str]
) -> None:
    invalid = await client.post(
        "/api/v1/assessments",
        headers=token_headers,
        data=assessment_form(),
        files={"images": ("leaf.jpg", b"not-an-image", "image/jpeg")},
    )
    assert invalid.status_code == 415
    assert invalid.json()["error"]["code"] == "invalid_image"

    oversized = await client.post(
        "/api/v1/assessments",
        headers=token_headers,
        data=assessment_form(),
        files={"images": ("leaf.png", b"x" * (1024 * 1024 + 1), "image/png")},
    )
    assert oversized.status_code == 413
    assert oversized.json()["error"]["code"] == "upload_too_large"


@pytest.mark.asyncio
async def test_local_quality_gate_stops_before_diagnosis(
    client: httpx.AsyncClient, token_headers: dict[str, str]
) -> None:
    live_settings = Settings(demo_mode=False, groq_api_key="gsk_not_called")
    app.dependency_overrides[get_settings] = lambda: live_settings
    try:
        image = Image.new("RGB", (640, 640), "black")
        buffer = io.BytesIO()
        image.save(buffer, "JPEG")
        created = await client.post(
            "/api/v1/assessments",
            headers=token_headers,
            data=assessment_form(),
            files={"images": ("dark.jpg", buffer.getvalue(), "image/jpeg")},
        )
        result = await client.post(
            f"/api/v1/assessments/{created.json()['id']}/analyze", headers=token_headers
        )
        body = result.json()
        assert body["status"] == "retake_required"
        assert body["initial_assessment"] is None
        assert body["image_quality"]["retake_instructions"]
    finally:
        app.dependency_overrides.pop(get_settings, None)


@pytest.mark.asyncio
async def test_demo_assessment_full_flow_is_scoped_and_deterministic(
    client: httpx.AsyncClient, token_headers: dict[str, str]
) -> None:
    created = await create_assessment(client, token_headers)
    assessment_id = str(created["id"])
    assert created["status"] == "created"
    assert created["simulated"] is True

    image_url = str(created["images"][0]["url"])  # type: ignore[index]
    private_image = await client.get(image_url, headers=token_headers)
    assert private_image.status_code == 200
    assert private_image.headers["content-type"] == "image/jpeg"
    denied_image = await client.get(
        image_url, headers={"X-Shamba-Token": "different-browser-token-2"}
    )
    assert denied_image.status_code == 404

    analyzed = await client.post(
        f"/api/v1/assessments/{assessment_id}/analyze", headers=token_headers
    )
    assert analyzed.status_code == 200, analyzed.text
    initial = analyzed.json()
    assert initial["status"] == "questions_ready"
    assert initial["initial_assessment"]["simulated"] is True
    assert len(initial["initial_assessment"]["hypotheses"]) == 3
    assert len(initial["initial_assessment"]["follow_up_questions"]) <= 3
    assert initial["provider_metadata"]["reasoner_received_images"] is False

    questions = initial["initial_assessment"]["follow_up_questions"]
    answers = [
        {"question_id": question["id"], "answer": question["id"] == "target_rings"}
        for question in questions
    ]
    completed = await client.post(
        f"/api/v1/assessments/{assessment_id}/answers",
        headers=token_headers,
        json={"answers": answers},
    )
    assert completed.status_code == 200, completed.text
    report = completed.json()
    assert report["status"] == "completed"
    assert report["final_assessment"]["overall_confidence"] > 0.63
    assert report["verification"]["passed"] is True
    assert report["timing_metadata"]["verification_ms"] >= 0

    retrieved = await client.get(
        f"/api/v1/assessments/{assessment_id}", headers=token_headers
    )
    listed = await client.get("/api/v1/assessments", headers=token_headers)
    assert retrieved.json()["final_assessment"] == report["final_assessment"]
    assert listed.json()["total"] == 1
    assert listed.json()["items"][0]["id"] == assessment_id

    dashboard = await client.get("/api/v1/dashboard/summary")
    assert dashboard.json()["reports_this_week"] == 1
    assert dashboard.json()["simulated"] is True
    assert dashboard.json()["disclaimer"].startswith("Community-reported")


@pytest.mark.asyncio
async def test_swahili_demo_and_answer_validation(
    client: httpx.AsyncClient, token_headers: dict[str, str]
) -> None:
    created = await create_assessment(client, token_headers, crop="kale", language="sw")
    assessment_id = str(created["id"])
    analyzed = await client.post(
        f"/api/v1/assessments/{assessment_id}/analyze", headers=token_headers
    )
    assert analyzed.status_code == 200
    assert "Mashimo" in analyzed.json()["initial_assessment"]["observation_summary"]
    invalid = await client.post(
        f"/api/v1/assessments/{assessment_id}/answers",
        headers=token_headers,
        json={"answers": [{"question_id": "not_asked", "answer": True}]},
    )
    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == "unknown_question"


@pytest.mark.asyncio
async def test_demo_reset_is_owner_scoped(
    client: httpx.AsyncClient, token_headers: dict[str, str]
) -> None:
    await create_assessment(client, token_headers)
    await create_assessment(
        client, {"X-Shamba-Token": "another-browser-token-0002"}, crop="onion"
    )
    reset = await client.post("/api/v1/demo/reset", headers=token_headers)
    assert reset.json()["deleted"] == 1
    own = await client.get("/api/v1/assessments", headers=token_headers)
    other = await client.get(
        "/api/v1/assessments",
        headers={"X-Shamba-Token": "another-browser-token-0002"},
    )
    assert own.json()["total"] == 0
    assert other.json()["total"] == 1
