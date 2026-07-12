from __future__ import annotations

import re

from app.schemas.assessments import (
    ActionPlan,
    DiagnosisPayload,
    FinalAssessment,
    VerificationResult,
)

MAX_TRIAGE_CONFIDENCE = 0.9

CHEMICAL_PATTERN = re.compile(
    r"\b(?:pesticide|fungicide|insecticide|herbicide|mancozeb|metalaxyl|chlorothalonil|"
    r"imidacloprid|cypermethrin|glyphosate|copper\s+(?:hydroxide|oxychloride)|"
    r"active\s+ingredient|kiuatilifu|dawa\s+ya\s+kuua\s+(?:kuvu|wadudu|magugu))\b",
    re.IGNORECASE,
)
DOSAGE_PATTERN = re.compile(
    r"\b\d+(?:\.\d+)?\s*(?:ml|millilit(?:er|re)|mililita|g|gramu?|kg|kilo|"
    r"lit(?:er|re)|lita|l)\s*(?:/|per|kwa)\s*(?:l|lit(?:er|re)|lita|ha|hekta|acre|"
    r"ekari|plant|mmea|tank|tangi)\b",
    re.IGNORECASE,
)
MIXTURE_PATTERN = re.compile(
    r"\b(?:mix|combine|changanya)\b.{0,50}\b(?:chemical|spray|product|kemikali|dawa)\b",
    re.IGNORECASE,
)


SAFE_REFERRAL = (
    "If a chemical treatment may be needed, consult a qualified local agronomist and follow "
    "the legal product label and local regulations."
)
SAFE_REFERRAL_SW = (
    "Ikiwa tiba ya kemikali inaweza kuhitajika, wasiliana na mtaalamu wa kilimo "
    "aliyehitimu na ufuate lebo halali ya bidhaa pamoja na kanuni za eneo."
)

SAFE_ACTION_REPLACEMENTS = {
    "en": {
        "do_today": SAFE_REFERRAL,
        "monitor": "Record visible changes and seek qualified advice if symptoms worsen.",
        "avoid": "Avoid unverified treatments or mixtures.",
        "escalate_when": "Seek qualified help if symptoms spread or plants decline quickly.",
    },
    "sw": {
        "do_today": SAFE_REFERRAL_SW,
        "monitor": "Andika mabadiliko yanayoonekana na tafuta ushauri wa mtaalamu dalili zikizidi.",
        "avoid": "Epuka tiba au michanganyiko ambayo haijathibitishwa.",
        "escalate_when": "Tafuta msaada wa mtaalamu dalili zikienea au mimea ikidhoofika haraka.",
    },
}


def _unsafe_positive_action(value: str) -> bool:
    return bool(
        CHEMICAL_PATTERN.search(value)
        or DOSAGE_PATTERN.search(value)
        or MIXTURE_PATTERN.search(value)
    )


def _contains_unsafe_action(final: FinalAssessment) -> bool:
    action_values = final.action_plan.model_dump(mode="python")
    return any(
        _unsafe_positive_action(value)
        for field in ("do_today", "monitor", "avoid", "escalate_when")
        for value in action_values[field]
    ) or _unsafe_positive_action(final.expert_guidance)


def cap_diagnosis_confidence(diagnosis: DiagnosisPayload) -> DiagnosisPayload:
    """Apply the public triage ceiling before initial percentages are stored."""
    values = diagnosis.model_dump(mode="python")
    values["overall_confidence"] = min(diagnosis.overall_confidence, MAX_TRIAGE_CONFIDENCE)
    values["hypotheses"] = [
        {
            **item.model_dump(mode="python"),
            "confidence": min(item.confidence, MAX_TRIAGE_CONFIDENCE),
        }
        for item in diagnosis.hypotheses
    ]
    return DiagnosisPayload.model_validate(values)


def apply_action_guardrails(
    final: FinalAssessment, *, language: str = "en"
) -> tuple[FinalAssessment, bool, list[str]]:
    selected_language = "sw" if language == "sw" else "en"
    replacements = SAFE_ACTION_REPLACEMENTS[selected_language]
    removed = False
    issues: list[str] = []
    action_values = final.action_plan.model_dump(mode="python")
    for field in ("do_today", "monitor", "avoid", "escalate_when"):
        safe_values = []
        for value in action_values[field]:
            if _unsafe_positive_action(value):
                removed = True
            else:
                safe_values.append(value)
        if not safe_values:
            safe_values.append(replacements[field])
        action_values[field] = safe_values
    expert_guidance = final.expert_guidance
    if _unsafe_positive_action(expert_guidance):
        removed = True
        expert_guidance = SAFE_REFERRAL_SW if selected_language == "sw" else SAFE_REFERRAL
    if removed:
        issues.append(
            "Ushauri mahususi wa kemikali, mchanganyiko au kipimo uliondolewa."
            if selected_language == "sw"
            else "Specific chemical, mixture, or dosage advice was removed."
        )
        do_today = action_values["do_today"]
        referral = SAFE_REFERRAL_SW if selected_language == "sw" else SAFE_REFERRAL
        if referral not in do_today:
            if len(do_today) >= 8:
                do_today[-1] = referral
            else:
                do_today.append(referral)

    # ``model_copy(update=...)`` deliberately skips Pydantic validation. Rebuild
    # guarded structures so an appended referral can never exceed schema caps.
    action_plan = ActionPlan.model_validate(action_values)
    corrected_values = final.model_dump(mode="python")
    corrected_values["action_plan"] = action_plan
    corrected_values["expert_guidance"] = expert_guidance
    corrected = FinalAssessment.model_validate(corrected_values)

    confidence_capped = corrected.overall_confidence > MAX_TRIAGE_CONFIDENCE or any(
        item.confidence > MAX_TRIAGE_CONFIDENCE for item in corrected.hypotheses
    )
    if confidence_capped:
        removed = True
        issues.append(
            "Kiwango cha uhakika kilipunguzwa kwa sababu tathmini ya picha haiwezi "
            "kuthibitisha chanzo."
            if selected_language == "sw"
            else "Overall confidence was capped because image-based triage cannot confirm a cause."
        )
        corrected_values = corrected.model_dump(mode="python")
        corrected_values["overall_confidence"] = min(
            corrected.overall_confidence, MAX_TRIAGE_CONFIDENCE
        )
        corrected_values["hypotheses"] = [
            {
                **item.model_dump(mode="python"),
                "confidence": min(item.confidence, MAX_TRIAGE_CONFIDENCE),
            }
            for item in corrected.hypotheses
        ]
        corrected = FinalAssessment.model_validate(corrected_values)
    return corrected, removed, issues


def finalize_verification(
    proposed: FinalAssessment, verification: VerificationResult, *, language: str = "en"
) -> tuple[FinalAssessment, VerificationResult]:
    selected = verification.corrected_assessment or proposed
    if not verification.passed:
        requested_adjustment = verification.confidence_adjustment
        if verification.corrected_assessment is None and requested_adjustment == 0:
            requested_adjustment = -0.1
        if requested_adjustment < 0:
            previous_confidence = selected.overall_confidence
            selected_values = selected.model_dump(mode="python")
            selected_values["overall_confidence"] = max(
                0.0, previous_confidence + requested_adjustment
            )
            selected = FinalAssessment.model_validate(selected_values)
            applied_adjustment = round(selected.overall_confidence - previous_confidence, 6)
            verification_values = verification.model_dump(mode="python")
            verification_values["confidence_adjustment"] = applied_adjustment
            if verification.corrected_assessment is not None:
                verification_values["corrected_assessment"] = selected
            verification = VerificationResult.model_validate(verification_values)
    chemical_advice_removed = _contains_unsafe_action(selected)
    selected, changed, deterministic_issues = apply_action_guardrails(
        selected, language=language
    )
    if changed:
        verification_values = verification.model_dump(mode="python")
        verification_values.update(
            {
                "passed": False,
                "issues": list(dict.fromkeys(verification.issues + deterministic_issues))[:10],
                "corrected_assessment": selected,
                "chemical_advice_removed": verification.chemical_advice_removed
                or chemical_advice_removed,
            }
        )
        verification = VerificationResult.model_validate(verification_values)
    return selected, verification
