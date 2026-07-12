from __future__ import annotations

from app.fixtures.demo import _diagnosis
from app.schemas.assessments import ActionPlan, FinalAssessment, VerificationResult
from app.services.safety import (
    SAFE_REFERRAL_SW,
    cap_diagnosis_confidence,
    finalize_verification,
)


def unsafe_final() -> FinalAssessment:
    diagnosis = _diagnosis("tomato", False)
    return FinalAssessment(
        observation_summary=diagnosis.observation_summary,
        hypotheses=diagnosis.hypotheses,
        most_likely_explanation="Early blight is plausible.",
        overall_confidence=0.98,
        urgency="moderate",
        uncertainty_message="Not confirmed.",
        what_changed="The answer supported the leader.",
        greatest_effect="Target rings.",
        action_plan=ActionPlan(
            do_today=["Mix 20 ml/litre mancozeb fungicide and spray every plant."],
            monitor=["Monitor new spots."],
            avoid=["Avoid overhead watering."],
            escalate_when=["The disease spreads rapidly."],
        ),
        warning_signs=["Rapid spread"],
        expert_guidance="Ask an agronomist.",
        requires_expert=False,
        sources=["Curated source"],
        limitations_notice="AI can be wrong.",
        simulated=False,
    )


def test_guardrail_removes_chemical_dose_and_caps_confidence() -> None:
    proposed = unsafe_final()
    verification = VerificationResult(
        passed=True,
        issues=[],
        corrected_assessment=None,
        confidence_adjustment=0,
        chemical_advice_removed=False,
    )
    corrected, result = finalize_verification(proposed, verification)
    assert "mancozeb" not in str(corrected.action_plan).lower()
    assert corrected.overall_confidence == 0.9
    assert result.passed is False
    assert result.chemical_advice_removed is True
    assert result.corrected_assessment is not None


def test_initial_and_final_hypotheses_are_independently_capped() -> None:
    diagnosis = _diagnosis("tomato", False)
    diagnosis_values = diagnosis.model_dump(mode="python")
    diagnosis_values["overall_confidence"] = 1.0
    diagnosis_values["hypotheses"][0]["confidence"] = 1.0
    capped = cap_diagnosis_confidence(type(diagnosis).model_validate(diagnosis_values))
    assert capped.overall_confidence == 0.9
    assert capped.hypotheses[0].confidence == 0.9

    final_values = unsafe_final().model_dump(mode="python")
    final_values["overall_confidence"] = 0.8
    final_values["hypotheses"][0]["confidence"] = 1.0
    proposed = FinalAssessment.model_validate(final_values)
    corrected, _ = finalize_verification(
        proposed,
        VerificationResult(
            passed=True,
            issues=[],
            corrected_assessment=None,
            confidence_adjustment=0,
            chemical_advice_removed=False,
        ),
    )
    assert corrected.overall_confidence == 0.8
    assert corrected.hypotheses[0].confidence == 0.9


def test_guardrail_scans_every_action_field_and_revalidates_list_caps() -> None:
    values = unsafe_final().model_dump(mode="python")
    values["overall_confidence"] = 0.8
    values["action_plan"] = {
        "do_today": [f"Remove affected leaf {index}." for index in range(8)],
        "monitor": ["Apply pesticide and monitor the result."],
        "avoid": ["Mix a chemical product before watering."],
        "escalate_when": ["Use fungicide when the spots spread."],
    }
    values["expert_guidance"] = "Apply 20 ml/litre of product."
    proposed = FinalAssessment.model_validate(values)
    corrected, result = finalize_verification(
        proposed,
        VerificationResult(
            passed=True,
            issues=[],
            corrected_assessment=None,
            confidence_adjustment=0,
            chemical_advice_removed=False,
        ),
    )
    assert len(corrected.action_plan.do_today) == 8
    assert all(
        len(getattr(corrected.action_plan, field)) <= 8
        for field in ("do_today", "monitor", "avoid", "escalate_when")
    )
    assert "fungicide" not in str(corrected.action_plan).lower()
    assert "20 ml" not in corrected.expert_guidance.lower()
    assert result.chemical_advice_removed is True
    FinalAssessment.model_validate(corrected.model_dump(mode="python"))


def test_swahili_guardrail_corrections_remain_in_swahili() -> None:
    corrected, result = finalize_verification(
        unsafe_final(),
        VerificationResult(
            passed=True,
            issues=[],
            corrected_assessment=None,
            confidence_adjustment=0,
            chemical_advice_removed=False,
        ),
        language="sw",
    )
    assert SAFE_REFERRAL_SW in corrected.action_plan.do_today
    assert any("uliondolewa" in issue for issue in result.issues)
    assert all("Specific chemical" not in issue for issue in result.issues)
    assert result.chemical_advice_removed is True


def test_negative_confidence_adjustment_is_applied_and_normalized() -> None:
    values = unsafe_final().model_dump(mode="python")
    values["overall_confidence"] = 0.05
    values["action_plan"]["do_today"] = ["Remove badly affected fallen leaves."]
    proposed = FinalAssessment.model_validate(values)
    corrected, result = finalize_verification(
        proposed,
        VerificationResult(
            passed=False,
            issues=["Confidence was too high."],
            corrected_assessment=None,
            confidence_adjustment=-0.2,
            chemical_advice_removed=False,
        ),
    )
    assert corrected.overall_confidence == 0
    assert result.confidence_adjustment == -0.05
