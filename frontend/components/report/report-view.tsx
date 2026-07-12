"use client";

import { AlertTriangle, ArrowRight, CalendarDays, Check, Clipboard, FileText, Info, Leaf, MapPin, Printer, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ActionPlan } from "@/components/report/action-plan";
import { HypothesisCard } from "@/components/report/hypothesis-card";
import { ProtectedImage } from "@/components/report/protected-image";
import { ProvenancePanel } from "@/components/report/provenance-panel";
import { ProgressSteps } from "@/components/assessment/progress-steps";
import { useLanguage } from "@/components/providers/language-provider";
import { ErrorPanel } from "@/components/ui/error-panel";
import { getAssessment } from "@/lib/api";
import { cropNames } from "@/lib/i18n";
import { confidenceLabel, confidencePercent, formatDate, humanize, urgencyLabel } from "@/lib/format";
import type { Assessment } from "@/lib/types";

export function ReportView({ assessmentId }: { assessmentId: string }) {
  const router = useRouter();
  const replaceRoute = router.replace;
  const { language } = useLanguage();
  const sw = language === "sw";
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [copied, setCopied] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const load = () => {
    setError(null);
    getAssessment(assessmentId)
      .then((value) => {
        if (!value.final_assessment && value.status !== "completed") { replaceRoute(`/assessment/${assessmentId}`); return; }
        setAssessment(value);
      })
      .catch(setError);
  };
  useEffect(() => {
    let active = true;
    getAssessment(assessmentId)
      .then((value) => {
        if (!active) return;
        if (!value.final_assessment && value.status !== "completed") {
          replaceRoute(`/assessment/${assessmentId}`);
          return;
        }
        setAssessment(value);
      })
      .catch((reason) => active && setError(reason));
    return () => {
      active = false;
    };
  }, [assessmentId, replaceRoute]);

  const summary = useMemo(() => {
    if (!assessment?.final_assessment) return "";
    const result = assessment.final_assessment;
    const leading = result.hypotheses[0];
    const today = result.action_plan.do_today.slice(0, 2).join("; ");
    const simulatedPrefix = assessment.simulated || result.simulated || assessment.provider_metadata.simulated === true
      ? assessment.language === "sw" ? "RIPOTI YA ONYESHO ILIYOIGIZWA. " : "SIMULATED DEMO REPORT. "
      : "";
    if (assessment.language === "sw") {
      return `${simulatedPrefix}ShambaLens ${assessment.id.slice(0, 8)} — ${cropNames.sw[assessment.crop] ?? humanize(assessment.crop)}. ${result.observation_summary} Uwezekano unaoongoza: ${leading?.name ?? "bado haijawa wazi"} (${confidenceLabel(leading?.confidence ?? result.overall_confidence, "sw")}). Fanya leo: ${today}. Huu ni ushauri wa awali wa mazao, si utambuzi wa uhakika.`;
    }
    return `${simulatedPrefix}ShambaLens ${assessment.id.slice(0, 8)} — ${cropNames.en[assessment.crop] ?? humanize(assessment.crop)}. ${result.observation_summary} Leading possibility: ${leading?.name ?? "unclear"} (${confidenceLabel(leading?.confidence ?? result.overall_confidence, "en")}). Do today: ${today}. This is advisory crop triage, not a definitive diagnosis.`;
  }, [assessment]);

  const copySummary = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  if (error) return <div className="page-shell py-16"><ErrorPanel error={error} onRetry={load} /></div>;
  if (!assessment?.final_assessment) return <ReportSkeleton />;

  const result = assessment.final_assessment;
  const leading = result.hypotheses[0];
  const initial = assessment.initial_assessment;
  const simulated = assessment.simulated || result.simulated || assessment.provider_metadata.simulated === true;
  const selectedImage = assessment.images[selectedImageIndex] ?? assessment.images[0];

  return (
    <div className="bg-[linear-gradient(180deg,#edf1df_0,#fbfaf6_34rem)] py-10 sm:py-14">
      <div className="page-shell">
        <div className="print-hidden mx-auto mb-9 max-w-4xl"><ProgressSteps current="plan" /></div>
        <article className="mx-auto max-w-6xl" aria-labelledby="report-title">
          {simulated && <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-[#dbc66b]/40 bg-[#fff3cd] px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-[#6b5319]"><Sparkles size={15} />{sw ? "Onyesho la kuigiza — si uchanganuzi wa moja kwa moja" : "Simulated demo — not live AI analysis"}</div>}

          <header className="card overflow-hidden">
            <div className="grid lg:grid-cols-[.8fr_1.2fr]">
              <div className="relative min-h-64 overflow-hidden bg-oat lg:min-h-[430px]">
                {selectedImage ? <ProtectedImage assessmentId={assessment.id} image={selectedImage} alt={`${assessment.crop} assessment photo ${selectedImageIndex + 1}`} priority={selectedImageIndex === 0} /> : <div className="grid h-full place-items-center text-leaf"><Leaf size={72} strokeWidth={1.2} /></div>}
                {assessment.images.length > 1 && <div className="print-hidden absolute inset-x-0 bottom-0 flex gap-2 bg-gradient-to-t from-ink/80 via-ink/45 to-transparent px-4 pb-4 pt-12">{assessment.images.map((image, index) => <button key={image.id} type="button" onClick={() => setSelectedImageIndex(index)} aria-label={`${sw ? "Fungua picha ya zao" : "View crop photo"} ${index + 1}`} aria-pressed={selectedImageIndex === index} className={`relative h-14 w-16 overflow-hidden rounded-lg border-2 bg-oat shadow-sm ${selectedImageIndex === index ? "border-white ring-2 ring-leaf" : "border-white/60 opacity-80 hover:opacity-100"}`}><ProtectedImage assessmentId={assessment.id} image={image} alt="" /></button>)}</div>}
              </div>
              <div className="p-6 sm:p-9 lg:p-11">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f0d0] px-3 py-1.5 text-xs font-bold text-forest"><ShieldCheck size={14} />{sw ? "Mpango umekaguliwa" : "Verified plan"}</span>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${result.urgency === "high" ? "bg-clay/10 text-clay" : result.urgency === "moderate" ? "bg-[#fff3cd] text-[#7c5c12]" : "bg-oat text-forest"}`}>{urgencyLabel(result.urgency, language)}</span>
                  {result.requires_expert && <span className="rounded-full bg-clay/10 px-3 py-1.5 text-xs font-bold text-clay">{sw ? "Mtaalamu anapendekezwa" : "Expert review advised"}</span>}
                </div>
                <p className="eyebrow mt-7">{sw ? "Uwezekano unaoongoza" : "Leading explanation"}</p>
                <h1 id="report-title" className="mt-3 text-balance font-display text-4xl font-bold leading-[1.04] tracking-[-.045em] text-ink sm:text-5xl">{result.most_likely_explanation || leading?.name || (sw ? "Bado haijawa wazi" : "Still uncertain")}</h1>
                <p className="mt-5 text-base leading-7 text-ink/67">{result.observation_summary}</p>
                <div className="mt-7 rounded-2xl bg-[#f2f0e4] p-4">
                  <div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-ink/42">{sw ? "Uhakika wa jumla" : "Overall confidence"}</p><p className="mt-1 font-display text-xl font-bold text-forest">{confidenceLabel(result.overall_confidence, language)}</p></div><span className="text-sm font-bold text-ink/48">{confidencePercent(result.overall_confidence)}</span></div>
                  <div className="mt-3 confidence-track"><div className="confidence-fill" style={{ width: confidencePercent(result.overall_confidence) }} /></div>
                </div>
                <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-ink/52"><span className="inline-flex items-center gap-1.5"><Leaf size={14} className="text-leaf" />{cropNames[language][assessment.crop] ?? humanize(assessment.crop)}</span>{assessment.region && <span className="inline-flex items-center gap-1.5"><MapPin size={14} className="text-leaf" />{assessment.region}</span>}<span className="inline-flex items-center gap-1.5"><CalendarDays size={14} className="text-leaf" />{formatDate(assessment.completed_at ?? assessment.created_at, language)}</span></div>
              </div>
            </div>
          </header>

          <div className="print-hidden mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => window.print()} className="button-secondary text-sm"><Printer size={17} />{sw ? "Chapisha / hifadhi PDF" : "Print / save PDF"}</button>
            <button type="button" onClick={copySummary} className="button-secondary text-sm">{copied ? <Check size={17} /> : <Clipboard size={17} />}{copied ? (sw ? "Imenakiliwa" : "Copied") : (sw ? "Nakili muhtasari" : "Copy summary")}</button>
            <Link href="/assessment" className="button-quiet text-sm"><RotateCcw size={17} />{sw ? "Anza nyingine" : "Start another"}</Link>
          </div>

          <div className="report-grid mt-8 grid gap-7 lg:grid-cols-[1fr_320px] lg:items-start">
            <div className="space-y-8">
              {initial && <section className="soft-card p-5 sm:p-6" aria-labelledby="initial-assessment-heading">
                <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">{sw ? "Kabla ya majibu yako" : "Before your answers"}</p><h2 id="initial-assessment-heading" className="mt-2 font-display text-2xl font-bold text-ink">{sw ? "Uchunguzi wa awali" : "Initial assessment"}</h2></div><div className="text-right"><p className="text-[10px] font-extrabold uppercase tracking-wider text-ink/40">{sw ? "Uhakika wa awali" : "Initial confidence"}</p><p className="mt-1 text-sm font-bold text-forest">{confidenceLabel(initial.overall_confidence, language)} · {confidencePercent(initial.overall_confidence)}</p></div></div>
                <ol className="mt-5 grid gap-2 sm:grid-cols-3">{initial.hypotheses.map((hypothesis, index) => <li key={`${hypothesis.name}-${index}`} className="rounded-xl bg-oat p-3"><span className="text-[10px] font-extrabold text-leaf">#{index + 1}</span><p className="mt-1 text-sm font-bold text-ink">{hypothesis.name}</p><p className="mt-1 text-[11px] font-semibold text-ink/45">{confidencePercent(hypothesis.confidence)}</p></li>)}</ol>
              </section>}

              <section aria-labelledby="differential-heading">
                <div className="mb-4"><p className="eyebrow">{sw ? "Uchunguzi tofauti" : "Differential diagnosis"}</p><h2 id="differential-heading" className="mt-2 font-display text-3xl font-bold tracking-[-.03em] text-ink">{sw ? "Sababu zinazowezekana" : "Plausible causes"}</h2><p className="mt-2 text-sm leading-6 text-ink/58">{sw ? "Mpangilio huu ni wa uwezekano, si uthibitisho wa maabara." : "This ranking reflects plausibility, not laboratory confirmation."}</p></div>
                <div className="grid gap-3">{result.hypotheses.map((hypothesis, index) => <HypothesisCard key={`${hypothesis.name}-${index}`} hypothesis={hypothesis} rank={index + 1} />)}</div>
              </section>

              <section aria-labelledby="uncertainty-heading" className="rounded-3xl border border-[#b99b3b]/25 bg-[#fff9e8] p-6 sm:p-7">
                <div className="flex items-start gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-[#866413]"><Info size={21} /></span><div><h2 id="uncertainty-heading" className="font-display text-2xl font-bold text-ink">{sw ? "Kile ambacho bado hakijulikani" : "What remains uncertain"}</h2><p className="mt-2 text-sm leading-6 text-ink/68">{result.uncertainty_message}</p><p className="mt-3 border-t border-[#b99b3b]/15 pt-3 text-xs leading-5 text-ink/56"><strong>{sw ? "Kilichobadilika:" : "What changed:"}</strong> {result.what_changed}</p><p className="mt-1 text-xs leading-5 text-ink/56"><strong>{sw ? "Jibu lenye athari zaidi:" : "Most influential answer:"}</strong> {result.greatest_effect}</p></div></div>
              </section>

              <section aria-labelledby="plan-heading"><div className="mb-4"><p className="eyebrow">{sw ? "Hatua zinazofuata" : "Prioritized action plan"}</p><h2 id="plan-heading" className="mt-2 font-display text-3xl font-bold tracking-[-.03em] text-ink">{sw ? "Mpango salama na wa vitendo" : "A safe, practical plan"}</h2></div><ActionPlan plan={result.action_plan} /></section>

              {!!result.warning_signs?.length && <section className="rounded-2xl border border-clay/20 bg-[#fff4ef] p-6"><h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink"><AlertTriangle className="text-clay" size={20} />{sw ? "Ishara za tahadhari" : "Warning signs"}</h2><ul className="mt-4 grid gap-2">{result.warning_signs.map((warning) => <li key={warning} className="flex items-start gap-2 text-sm leading-6 text-ink/68"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />{warning}</li>)}</ul></section>}

              <section className="rounded-2xl border border-leaf/20 bg-[#f1f7ec] p-6"><h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink"><ShieldCheck className="text-leaf" size={20} />{sw ? "Mwongozo wa mtaalamu" : "Expert guidance"}</h2><p className="mt-3 text-sm leading-6 text-ink/68">{result.expert_guidance}</p></section>

              <section className="soft-card p-6"><h2 className="font-display text-xl font-bold text-ink">{sw ? "Vyanzo vya ushahidi" : "Evidence references"}</h2><p className="mt-2 text-xs leading-5 text-ink/52">{sw ? "Msingi wa maarifa ni wa mwongozo na si kamili." : "The local knowledge base is curated for triage and is not exhaustive."}</p><div className="mt-4 grid gap-2">{result.sources.length ? result.sources.map((source) => <div key={source} className="rounded-xl bg-oat p-3 text-sm font-semibold text-ink/68">{source}</div>) : <p className="text-sm italic text-ink/45">{sw ? "Hakuna marejeo yaliyorudishwa." : "No references were returned."}</p>}</div></section>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-28">
              <section className="soft-card p-5"><h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink"><FileText size={18} className="text-leaf" />{sw ? "Maelezo ya ripoti" : "Report details"}</h2><dl className="mt-4 grid gap-3 text-xs"><Detail label={sw ? "Kitambulisho" : "Assessment ID"} value={assessment.id} mono /><Detail label={sw ? "Hatua ya ukuaji" : "Growth stage"} value={humanize(assessment.growth_stage)} /><Detail label={sw ? "Muda wa dalili" : "Symptom duration"} value={assessment.symptom_duration} /><Detail label={sw ? "Hali ya maji" : "Water conditions"} value={assessment.watering_conditions} />{assessment.description && <Detail label={sw ? "Maelezo ya mkulima" : "Farmer description"} value={assessment.description} />}</dl></section>
              {!!assessment.answers?.length && <section className="soft-card p-5"><h2 className="font-display text-lg font-bold text-ink">{sw ? "Majibu yako" : "Your answers"}</h2><dl className="mt-4 grid gap-4">{assessment.answers.map((answer, index) => <div key={`${answer.question_id}-${index}`}><dt className="text-xs leading-5 text-ink/48">{assessment.initial_assessment?.follow_up_questions.find((q) => q.id === answer.question_id)?.text ?? `${sw ? "Swali" : "Question"} ${index + 1}`}</dt><dd className="mt-1 text-sm font-bold text-ink">{typeof answer.answer === "boolean" ? answer.answer ? (sw ? "Ndiyo" : "Yes") : (sw ? "Hapana" : "No") : answer.answer === "unknown" ? (sw ? "Sina uhakika" : "Not sure") : answer.answer}</dd></div>)}</dl></section>}
              <ProvenancePanel assessment={assessment} />
              <section className="rounded-2xl bg-forest p-5 text-white"><ShieldCheck size={21} className="text-[#dce9a7]" /><h2 className="mt-3 font-display text-lg font-bold">{sw ? "Kumbuka mipaka" : "Remember the limits"}</h2><p className="mt-2 text-xs leading-5 text-white/68">{result.limitations_notice || (sw ? "AI inaweza kukosea. Wasiliana na mtaalamu kwa dalili kali, zinazoenea haraka, au kabla ya kutumia kemikali." : "AI can be wrong. Consult a qualified local professional for severe, fast-spreading symptoms or before using chemical controls.")}</p><Link href="/about" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#dce9a7]">{sw ? "Soma kuhusu usalama" : "Read about safety"}<ArrowRight size={13} /></Link></section>
            </aside>
          </div>
        </article>
      </div>
    </div>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div><dt className="font-bold uppercase tracking-wider text-ink/38">{label}</dt><dd className={`mt-1 break-words leading-5 text-ink/70 ${mono ? "font-mono text-[10px]" : "text-xs font-semibold"}`}>{value}</dd></div>; }
function ReportSkeleton() { return <div className="page-shell animate-pulse py-16"><div className="mx-auto max-w-6xl"><div className="h-[420px] rounded-4xl bg-forest/10" /><div className="mt-8 grid gap-4 lg:grid-cols-[1fr_320px]"><div className="space-y-4">{[1,2,3].map((item) => <div key={item} className="h-36 rounded-2xl bg-forest/8" />)}</div><div className="h-64 rounded-2xl bg-forest/8" /></div></div></div>; }
