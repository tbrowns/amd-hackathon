"use client";

import { AlertTriangle, CheckCircle2, Eye, Info, XCircle } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { confidenceLabel, confidencePercent, humanize, urgencyLabel } from "@/lib/format";
import type { Assessment, ImageQuality } from "@/lib/types";

export function QualityNotice({ quality }: { quality: ImageQuality }) {
  const { language } = useLanguage();
  const sw = language === "sw";
  const caution = quality.status === "caution";
  return (
    <div className={`rounded-2xl border p-4 ${caution ? "border-sun/35 bg-[#fff9e8]" : "border-leaf/20 bg-[#f1f7ec]"}`}>
      <div className="flex items-start gap-3">
        {caution ? <AlertTriangle className="mt-0.5 shrink-0 text-[#9b6a10]" size={19} /> : <CheckCircle2 className="mt-0.5 shrink-0 text-leaf" size={19} />}
        <div><p className="text-sm font-bold text-ink">{caution ? (sw ? "Tutachanganua kwa tahadhari" : "Analyzing with caution") : (sw ? "Picha inafaa kuchanganuliwa" : "Photo is good enough to analyze")}</p>{quality.observations.length > 0 && <p className="mt-1 text-xs leading-5 text-ink/58">{quality.observations.join(" · ")}</p>}</div>
      </div>
    </div>
  );
}

export function InitialSummary({ assessment }: { assessment: Assessment }) {
  const { language } = useLanguage();
  const sw = language === "sw";
  const result = assessment.initial_assessment;
  if (!result) return null;
  const visionObservation = assessment.model_observation;
  return (
    <div className="space-y-5">
      {assessment.image_quality && <QualityNotice quality={assessment.image_quality} />}
      {visionObservation && <div className="rounded-2xl bg-[#eef2e6] p-5">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.15em] text-forest"><Eye size={16} />{sw ? "Ushahidi unaoonekana kutoka mfumo wa picha" : "Visible evidence from the vision stage"}</div>
        <p className="mt-3 text-sm leading-6 text-ink/72">{visionObservation.observation_summary}</p>
        {!!visionObservation.visible_symptoms.length && <ul className="mt-3 grid gap-1 text-xs leading-5 text-ink/58">{visionObservation.visible_symptoms.map((symptom) => <li key={symptom}>• {symptom}</li>)}</ul>}
      </div>}
      <div className="rounded-xl border border-forest/10 bg-white p-4 text-xs leading-5 text-ink/60"><strong className="text-ink">{sw ? "Muhtasari wa uchambuzi wa maandishi:" : "Text-only reasoning summary:"}</strong> {result.observation_summary}</div>
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="eyebrow">{sw ? "Uchunguzi wa awali" : "Initial differential"}</p><h2 className="mt-2 font-display text-2xl font-bold text-ink">{sw ? "Visababishi vinavyowezekana" : "Plausible causes"}</h2></div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${result.urgency === "high" ? "bg-clay/10 text-clay" : "bg-oat text-forest"}`}>{urgencyLabel(result.urgency, language)}</span>
        </div>
        <div className="mt-4 grid gap-3">
          {result.hypotheses.map((hypothesis, index) => (
            <article key={`${hypothesis.name}-${index}`} className="rounded-2xl border border-forest/12 bg-white p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-forest text-xs font-bold text-white">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-display text-lg font-bold text-ink">{hypothesis.name}</h3><p className="mt-0.5 text-xs font-semibold text-leaf">{humanize(hypothesis.category)}</p></div><span className="text-right text-xs font-bold text-ink/60">{confidenceLabel(hypothesis.confidence, language)}<span className="ml-1 text-ink/35">({confidencePercent(hypothesis.confidence)})</span></span></div>
                  <div className="mt-3 confidence-track"><div className="confidence-fill" style={{ width: confidencePercent(hypothesis.confidence) }} /></div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="flex items-start gap-2 rounded-xl border border-forest/10 bg-white p-4 text-xs leading-5 text-ink/60"><Info className="mt-0.5 shrink-0 text-leaf" size={16} /><span>{result.uncertainty_message}</span></div>
    </div>
  );
}

export function RetakePanel({ quality, onRetake }: { quality: ImageQuality; onRetake: () => void }) {
  const { language } = useLanguage();
  const sw = language === "sw";
  return (
    <div className="card p-6 sm:p-9">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-clay/10 text-clay"><XCircle size={28} /></span>
      <p className="eyebrow mt-6 text-clay">{sw ? "Picha nyingine inahitajika" : "Retake required"}</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-[-.03em] text-ink">{sw ? "Hatujaweza kuona dalili vizuri." : "We can’t see enough to assess safely."}</h1>
      <p className="mt-3 max-w-2xl leading-7 text-ink/62">{sw ? "Hatujaendesha uchunguzi kamili. Jaribu maelekezo haya ili kupata matokeo bora:" : "We stopped before a full diagnosis. Try these specific instructions for a more useful result:"}</p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {(quality.retake_instructions.length ? quality.retake_instructions : [sw ? "Sogea karibu na jani lililoathirika." : "Move closer to the affected leaf.", sw ? "Piga picha katika mwanga wa asili." : "Retake the image in natural light."]).map((instruction) => (
          <li key={instruction} className="flex items-start gap-3 rounded-xl bg-[#fff7f3] p-4 text-sm font-semibold leading-6 text-ink/75"><AlertTriangle size={18} className="mt-0.5 shrink-0 text-clay" />{instruction}</li>
        ))}
      </ul>
      {quality.observations.length > 0 && <p className="mt-5 text-xs leading-5 text-ink/48">{quality.observations.join(" · ")}</p>}
      <button type="button" onClick={onRetake} className="button-primary mt-7">{sw ? "Piga picha nyingine" : "Retake photos"}</button>
    </div>
  );
}
