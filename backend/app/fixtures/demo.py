from __future__ import annotations

from typing import Any

from app.agents.base import AIProvider
from app.schemas.assessments import (
    ActionPlan,
    AnswerItem,
    DiagnosisPayload,
    FinalAssessment,
    FollowUpQuestion,
    Hypothesis,
    ImageObservation,
    ImageQuality,
    VerificationResult,
)

SCENARIO_BY_CROP = {
    "tomato": "tomato_leaf_spots",
    "onion": "onion_leaf_discoloration",
    "kale": "kale_pest_damage",
}


def _hypothesis(
    name: str,
    category: str,
    confidence: float,
    supporting: list[str],
    against: list[str],
    missing: list[str],
    severity: str = "moderate",
) -> Hypothesis:
    return Hypothesis(
        name=name,
        category=category,
        confidence=confidence,
        supporting_evidence=supporting,
        contradicting_evidence=against,
        missing_information=missing,
        severity=severity,
    )


def _quality() -> ImageQuality:
    return ImageQuality(
        status="good",
        plant_visible=True,
        crop_relevant=True,
        affected_area_visible=True,
        clarity_score=0.84,
        lighting_acceptable=True,
        observations=["The affected leaves are visible with enough detail for cautious triage."],
        retake_instructions=[],
    )


def _observation(crop: str, sw: bool) -> ImageObservation:
    if crop == "tomato":
        return ImageObservation(
            image_quality=_quality(),
            crop_guess="tomato",
            observation_summary=(
                "Majani ya chini yana madoa ya kahawia yenye njano pembeni."
                if sw
                else "Lower leaves show several brown spots with surrounding yellow tissue."
            ),
            visible_symptoms=[
                "Madoa makavu ya kahawia" if sw else "Dry brown leaf spots",
                "Njano karibu na madoa" if sw else "Yellowing around several spots",
            ],
            distribution=["Majani ya chini yanaonekana" if sw else "Visible on older lower leaves"],
        )
    if crop == "onion":
        return ImageObservation(
            image_quality=_quality(),
            crop_guess="onion",
            observation_summary=(
                "Majani yana mikwaruzo ya fedha na ncha zilizokauka."
                if sw
                else "Leaves show silvery streaking and dry tips."
            ),
            visible_symptoms=[
                "Mikwaruzo ya fedha" if sw else "Silvery streaks",
                "Ncha za majani zimekauka" if sw else "Dry leaf tips",
            ],
            distribution=["Majani kadhaa" if sw else "Several leaves are affected"],
        )
    return ImageObservation(
        image_quality=_quality(),
        crop_guess="kale",
        observation_summary=(
            "Majani yana mashimo yasiyo ya duara na kingo zilizotafunwa."
            if sw
            else "Leaves show irregular holes and chewed margins."
        ),
        visible_symptoms=[
            "Mashimo yasiyo ya duara" if sw else "Irregular holes",
            "Kingo zilizotafunwa" if sw else "Chewed leaf margins",
        ],
        distribution=["Majani mapya na ya kati" if sw else "Young and middle leaves"],
    )


def _diagnosis(crop: str, sw: bool) -> DiagnosisPayload:
    if crop == "tomato":
        hypotheses = [
            _hypothesis(
                "Early blight",
                "ugonjwa wa kuvu" if sw else "fungal disease",
                0.63,
                [
                    "Madoa ya kahawia na njano kwenye majani ya chini"
                    if sw
                    else "Brown, yellow-edged spots occur on lower leaves"
                ],
                [
                    "Duara za ndani hazionekani wazi"
                    if sw
                    else "Concentric rings are not clearly visible"
                ],
                [
                    "Kama madoa yana duara kama shabaha"
                    if sw
                    else "Whether spots have target-like rings"
                ],
            ),
            _hypothesis(
                "Bacterial spot",
                "ugonjwa wa bakteria" if sw else "bacterial disease",
                0.23,
                ["Madoa mengi madogo yanawezekana" if sw else "Multiple small lesions could fit"],
                [
                    "Madoa hayaonekani yenye maji"
                    if sw
                    else "Lesions do not look distinctly water-soaked"
                ],
                [
                    "Kama mvua ilinyesha hivi karibuni"
                    if sw
                    else "Recent rain and greasy lesion texture"
                ],
            ),
            _hypothesis(
                "Nitrogen deficiency",
                "upungufu wa virutubisho" if sw else "nutrient deficiency",
                0.14,
                ["Majani ya chini yana njano" if sw else "Older leaves are yellowing"],
                [
                    "Madoa mahususi hayafanani na upungufu wa kawaida"
                    if sw
                    else "Distinct spots argue against uniform deficiency"
                ],
                [
                    "Kama njano ni sawa kwenye jani lote"
                    if sw
                    else "Whether yellowing is uniform across each leaf"
                ],
                "low",
            ),
        ]
        questions = [
            FollowUpQuestion(
                id="target_rings",
                text="Je, madoa yana duara kama shabaha?"
                if sw
                else "Do the spots have concentric target-like rings?",
                input_type="yes_no",
                options=[],
                explanation="Hii hutofautisha early blight na sababu nyingine."
                if sw
                else "This helps distinguish early blight from other causes.",
                distinguishes=["Early blight", "Bacterial spot"],
            ),
            FollowUpQuestion(
                id="lower_first",
                text="Je, dalili zilianza kwenye majani ya chini?"
                if sw
                else "Did symptoms begin on the lower leaves?",
                input_type="yes_no",
                options=[],
                explanation="Mahali pa kuanzia hutenganisha ugonjwa na msongo."
                if sw
                else "The starting position helps separate disease from stress.",
                distinguishes=["Early blight", "Nitrogen deficiency"],
            ),
        ]
        summary = (
            "Madoa ya kahawia yanaonekana kwenye majani ya chini."
            if sw
            else "Brown spots with surrounding yellowing are visible on lower leaves."
        )
    elif crop == "onion":
        hypotheses = [
            _hypothesis(
                "Onion thrips damage",
                "mdudu" if sw else "common pest",
                0.61,
                ["Mikwaruzo ya fedha" if sw else "Silvery streaks fit rasping damage"],
                ["Wadudu hawaonekani wazi" if sw else "No insects are clearly visible"],
                ["Ukaguzi ndani ya mikunjo" if sw else "Inspection inside leaf folds"],
            ),
            _hypothesis(
                "Purple blotch",
                "ugonjwa wa kuvu" if sw else "fungal disease",
                0.24,
                ["Ncha za majani zimekauka" if sw else "Leaf dieback can occur"],
                [
                    "Vidonda vya zambarau havionekani"
                    if sw
                    else "Purple oval lesions are not visible"
                ],
                ["Kama kuna vidonda vya zambarau" if sw else "Presence of purple oval lesions"],
            ),
            _hypothesis(
                "Water stress",
                "msongo wa mazingira" if sw else "environmental stress",
                0.15,
                [
                    "Ncha kavu zinaweza kufuata ukame"
                    if sw
                    else "Dry tips can follow uneven moisture"
                ],
                [
                    "Mikwaruzo ya fedha ni maalum zaidi"
                    if sw
                    else "Silvery streaks are more specific for feeding"
                ],
                ["Unyevu chini ya udongo" if sw else "Moisture below the soil surface"],
                "low",
            ),
        ]
        questions = [
            FollowUpQuestion(
                id="thrips_seen",
                text="Je, unaona wadudu wadogo ndani ya mikunjo ya jani?"
                if sw
                else "Can you see tiny slender insects inside the leaf folds?",
                input_type="yes_no",
                options=[],
                explanation="Hii hutenganisha thrips na ugonjwa wa kuvu."
                if sw
                else "This separates thrips feeding from fungal disease.",
                distinguishes=["Onion thrips damage", "Purple blotch"],
            ),
            FollowUpQuestion(
                id="purple_lesions",
                text="Je, kuna vidonda vya mviringo vya zambarau?"
                if sw
                else "Are there oval purple lesions on the leaves?",
                input_type="yes_no",
                options=[],
                explanation="Vidonda vya zambarau huunga mkono purple blotch."
                if sw
                else "Purple lesions would support purple blotch.",
                distinguishes=["Purple blotch", "Water stress"],
            ),
        ]
        summary = (
            "Mikwaruzo ya fedha na ncha kavu zinaonekana."
            if sw
            else "Silvery streaks and dry leaf tips are visible."
        )
    else:
        hypotheses = [
            _hypothesis(
                "Caterpillar feeding damage",
                "mdudu" if sw else "common pest",
                0.68,
                ["Mashimo na kingo zilizotafunwa" if sw else "Irregular holes and chewed margins"],
                ["Kiwavi hakionekani wazi" if sw else "No larva is clearly visible"],
                [
                    "Mayai, viwavi au kinyesi chini ya jani"
                    if sw
                    else "Eggs, larvae, or droppings under leaves"
                ],
            ),
            _hypothesis(
                "Aphid feeding",
                "mdudu" if sw else "common pest",
                0.18,
                [
                    "Wadudu wanaweza kuharibu majani mapya"
                    if sw
                    else "Pests can damage young growth"
                ],
                [
                    "Mashimo si dalili ya kawaida ya aphid"
                    if sw
                    else "Holes are not typical aphid damage"
                ],
                ["Makundi ya wadudu na utomvu" if sw else "Colonies and sticky honeydew"],
            ),
            _hypothesis(
                "Black rot",
                "ugonjwa wa bakteria" if sw else "bacterial disease",
                0.14,
                ["Sehemu kavu zinaweza kutokea" if sw else "Dead leaf tissue may occur"],
                [
                    "Hakuna alama ya V yenye mishipa meusi"
                    if sw
                    else "No V-shaped yellow lesion or dark veins"
                ],
                ["Mabadiliko ya mishipa ya jani" if sw else "Changes in leaf veins"],
            ),
        ]
        questions = [
            FollowUpQuestion(
                id="larvae_seen",
                text="Je, unaona viwavi, mayai au kinyesi chini ya majani?"
                if sw
                else "Can you see larvae, eggs, or droppings under the leaves?",
                input_type="yes_no",
                options=[],
                explanation="Hii huthibitisha uharibifu wa kiwavi."
                if sw
                else "This helps confirm caterpillar feeding.",
                distinguishes=["Caterpillar feeding damage", "Black rot"],
            ),
            FollowUpQuestion(
                id="v_lesions",
                text="Je, kuna sehemu za njano zenye umbo la V kutoka kingoni?"
                if sw
                else "Are there V-shaped yellow areas starting at leaf edges?",
                input_type="yes_no",
                options=[],
                explanation="Umbo la V hutofautisha black rot."
                if sw
                else "A V pattern helps distinguish black rot.",
                distinguishes=["Black rot", "Caterpillar feeding damage"],
            ),
        ]
        summary = (
            "Mashimo yasiyo ya duara yanaonyesha uharibifu wa kutafunwa."
            if sw
            else "Irregular holes and chewed edges indicate feeding damage."
        )
    return DiagnosisPayload(
        observation_summary=summary,
        hypotheses=hypotheses,
        follow_up_questions=questions,
        overall_confidence=max(item.confidence for item in hypotheses),
        urgency="moderate",
        uncertainty_message="Picha na majibu hayawezi kuthibitisha sababu pekee."
        if sw
        else "Images and answers alone cannot confirm the cause.",
        requires_expert=False,
    )


def _answer_is_yes(answers: list[AnswerItem], question_id: str) -> bool:
    for answer in answers:
        if answer.question_id == question_id:
            return answer.answer is True or str(answer.answer).strip().lower() in {
                "yes",
                "true",
                "ndiyo",
            }
    return False


class DemoProvider(AIProvider):
    name = "demo"

    def __init__(self, scenario: str | None = None) -> None:
        self.scenario = scenario

    async def observe_images(
        self, *, image_data_urls: list[str], crop: str, language: str
    ) -> ImageObservation:
        return _observation(crop, language == "sw")

    async def diagnose(
        self,
        *,
        observation: ImageObservation,
        context: dict[str, Any],
        evidence: list[dict[str, Any]],
        language: str,
    ) -> DiagnosisPayload:
        return _diagnosis(str(context["crop"]), language == "sw")

    async def revise(
        self,
        *,
        initial: dict[str, Any],
        observation: dict[str, Any],
        answers: list[AnswerItem],
        context: dict[str, Any],
        evidence: list[dict[str, Any]],
        language: str,
    ) -> FinalAssessment:
        crop = str(context["crop"])
        sw = language == "sw"
        diagnosis = _diagnosis(crop, sw)
        trigger = {"tomato": "target_rings", "onion": "thrips_seen", "kale": "larvae_seen"}[crop]
        confirmed = _answer_is_yes(answers, trigger)
        leading = diagnosis.hypotheses[0].model_copy(
            update={"confidence": 0.78 if confirmed else 0.52}
        )
        other_confidences = (0.14, 0.08) if confirmed else (0.29, 0.19)
        hypotheses = [
            leading,
            diagnosis.hypotheses[1].model_copy(update={"confidence": other_confidences[0]}),
            diagnosis.hypotheses[2].model_copy(update={"confidence": other_confidences[1]}),
        ]
        if crop == "tomato":
            today = [
                "Ondoa majani yaliyoathirika sana na osha mikono."
                if sw
                else "Remove badly affected fallen leaves and wash your hands afterward.",
                "Mwagilia kwenye udongo, si kwenye majani."
                if sw
                else "Water at soil level and keep leaves dry.",
            ]
            monitor = [
                "Angalia kama madoa mapya yanapanda juu ya mmea."
                if sw
                else "Check whether new spots move upward over the next three days."
            ]
        elif crop == "onion":
            today = [
                "Kagua ndani ya mikunjo ya majani na tenganisha mimea iliyoathirika sana."
                if sw
                else "Inspect inner leaf folds and separate badly affected plants.",
                "Weka unyevu sawa bila kulowesha udongo kupita kiasi."
                if sw
                else "Keep moisture even without waterlogging the soil.",
            ]
            monitor = [
                "Hesabu mimea mipya yenye mikwaruzo ya fedha."
                if sw
                else "Count new plants showing silvery streaking over three days."
            ]
        else:
            today = [
                "Kagua pande zote za majani na ondoa viwavi au mayai kwa mkono."
                if sw
                else "Inspect both leaf surfaces and hand-remove visible larvae or eggs.",
                "Tumia wavu wa wadudu kulinda mimea isiyoathirika."
                if sw
                else "Use insect netting to protect unaffected plants.",
            ]
            monitor = [
                "Angalia mashimo mapya na uharibifu wa kitovu cha mmea."
                if sw
                else "Watch for fresh holes or damage to the growing point."
            ]
        sources = [f"{item['source_title']} — {item['source_reference']}" for item in evidence[:4]]
        return FinalAssessment(
            observation_summary=diagnosis.observation_summary,
            hypotheses=hypotheses,
            most_likely_explanation=(
                f"Dalili zinafanana zaidi na {leading.name}, lakini ukaguzi unaweza kuhitajika."
                if sw
                else f"The evidence fits {leading.name} best; field inspection may still be needed."
            ),
            overall_confidence=leading.confidence,
            urgency="moderate",
            uncertainty_message="Hii ni tathmini ya awali, si utambuzi uliothibitishwa."
            if sw
            else "This is a triage assessment, not a confirmed diagnosis.",
            what_changed=(
                "Jibu liliunga mkono zaidi sababu inayoongoza."
                if confirmed and sw
                else "The answer strengthened the leading explanation."
                if confirmed
                else "Jibu halikuthibitisha alama kuu, kwa hivyo uhakika umepunguzwa."
                if sw
                else "The answer did not confirm the key feature, so confidence was lowered."
            ),
            greatest_effect=(
                "Jibu kuhusu alama inayotofautisha sababu kuu."
                if sw
                else "The answer about the leading hypothesis's distinguishing feature."
            ),
            action_plan=ActionPlan(
                do_today=today,
                monitor=monitor,
                avoid=[
                    "Usitumie kemikali bila ushauri wa mtaalamu na lebo halali."
                    if sw
                    else "Avoid chemicals without qualified advice and a legal product label."
                ],
                escalate_when=[
                    "Dalili zinaenea haraka, mmea unaanguka, au mimea mingi inaathirika."
                    if sw
                    else "Symptoms spread fast, plants collapse, or nearby plants are affected."
                ],
            ),
            warning_signs=[
                "Kuenea haraka kwenye mimea ya karibu" if sw else "Rapid spread to nearby plants",
                "Kunyauka kusikopungua wakati wa baridi"
                if sw
                else "Wilting that persists during cool hours",
            ],
            expert_guidance="Wasiliana na afisa wa ugani ikiwa dalili zinaongezeka."
            if sw
            else "Contact an extension officer or qualified agronomist if symptoms worsen.",
            requires_expert=False,
            sources=sources or ["ShambaLens local curated knowledge base"],
            limitations_notice="AI inaweza kukosea; picha na maelezo hayawezi kuthibitisha ugonjwa."
            if sw
            else "AI can be wrong; images and context cannot confirm a disease.",
            simulated=True,
        )

    async def verify(
        self,
        *,
        final: FinalAssessment,
        observation: dict[str, Any],
        evidence: list[dict[str, Any]],
        language: str,
    ) -> VerificationResult:
        return VerificationResult(
            passed=True,
            issues=[],
            corrected_assessment=None,
            confidence_adjustment=0,
            chemical_advice_removed=False,
        )
