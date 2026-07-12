"use client";

import { CheckCircle2, Cpu, Eye, FlaskConical, Gauge, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { useRuntime } from "@/components/providers/runtime-provider";
import { humanize, latency } from "@/lib/format";
import type { Assessment } from "@/lib/types";

export function ProvenancePanel({ assessment }: { assessment: Assessment }) {
  const { language } = useLanguage();
  const { runtime } = useRuntime();
  const sw = language === "sw";
  const provider = assessment.provider_metadata?.provider ?? runtime?.ai_provider ?? "groq";
  const vision = assessment.provider_metadata?.vision_model ?? runtime?.vision_model;
  const reasoning = assessment.provider_metadata?.reasoning_model ?? runtime?.reasoning_model;
  const verifier = assessment.provider_metadata?.verifier_model ?? runtime?.verifier_model;
  const timing = assessment.timing_metadata ?? runtime?.last_stage_latencies_ms ?? {};
  const simulated = assessment.simulated || assessment.provider_metadata.simulated === true;
  const verification = assessment.verification;

  return (
    <details className="soft-card overflow-hidden print-hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 hover:bg-oat/50">
        <span className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-oat text-forest"><Cpu size={19} /></span><span><span className="block text-sm font-bold text-ink">{sw ? "Mfumo na asili ya AI" : "AI system & provenance"}</span><span className="mt-0.5 block text-xs text-ink/48">{simulated ? (sw ? "Matokeo ya onyesho yaliyoigizwa" : "Simulated demo result") : `${humanize(provider)} · ${sw ? "uchanganuzi wa hatua nyingi" : "multi-stage inference"}`}</span></span></span>
        <span className="text-xl text-forest">+</span>
      </summary>
      <div className="border-t border-forest/10 bg-[#fafaf6] p-5">
        {simulated && <div className="mb-4 flex items-start gap-2 rounded-xl bg-[#fff3cd] p-3 text-xs font-semibold leading-5 text-[#6b5319]"><FlaskConical className="mt-0.5 shrink-0" size={16} />{sw ? "Hii ni ripoti ya kuigiza. Hakuna dai kwamba miundo ya AI ilichanganua picha hii." : "This is a simulated fixture report. It does not claim that live AI models analyzed this image."}</div>}
        <div className="grid gap-3 sm:grid-cols-3">
          <ModelRole icon={Eye} title={sw ? "Uchunguzi wa picha" : "Image observation"} model={vision} detail={sw ? "Hutoa dalili zinazoonekana pekee" : "Extracts observable symptoms only"} />
          <ModelRole icon={Cpu} title={sw ? "Uchambuzi" : "Reasoning"} model={reasoning} detail={sw ? "Hutumia maandishi ya uchunguzi; haioni picha" : "Uses text observations; does not see images"} />
          <ModelRole icon={ShieldCheck} title={sw ? "Ukaguzi wa pili" : "Independent check"} model={verifier} detail={sw ? "Hukagua usalama na uthabiti" : "Checks safety and consistency"} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label={sw ? "Mtoa huduma" : "Provider"} value={humanize(provider)} />
          <Metric label={sw ? "Uchunguzi" : "Observation"} value={latency(timing.vision_ms ?? timing.local_image_checks_ms)} />
          <Metric label={sw ? "Uchambuzi" : "Reasoning"} value={latency(timing.reasoning_ms)} />
          <Metric label={sw ? "Ukaguzi" : "Verification"} value={latency(timing.verification_ms)} />
        </div>
        <div className={`mt-4 flex items-center gap-2 text-xs font-semibold ${verification?.passed ? "text-leaf" : "text-clay"}`}><CheckCircle2 size={15} />{verification ? verification.passed ? (sw ? "Ukaguzi wa kujitegemea umepita" : "Independent verification passed") : (sw ? "Ukaguzi ulirekebisha mpango" : "Verification adjusted the plan") : (sw ? "Hali ya ukaguzi haikurudishwa" : "Verification status was not returned")}</div>
        {verification && (verification.chemical_advice_removed || verification.confidence_adjustment < 0 || verification.issues.length > 0) && (
          <div className="mt-3 rounded-xl border border-forest/10 bg-white p-3 text-[11px] leading-5 text-ink/58">
            {verification.chemical_advice_removed && <p>{sw ? "Ushauri usio salama wa kemikali uliondolewa." : "Unsafe chemical advice was removed."}</p>}
            {verification.confidence_adjustment < 0 && <p>{sw ? "Ukaguzi ulipunguza kiwango cha uhakika." : "The verifier reduced the reported confidence."}</p>}
            {verification.issues.map((issue) => <p key={issue}>{issue}</p>)}
          </div>
        )}
      </div>
    </details>
  );
}

function ModelRole({ icon: Icon, title, model, detail }: { icon: typeof Eye; title: string; model?: string | null; detail: string }) {
  return <div className="rounded-xl border border-forest/10 bg-white p-4"><Icon size={18} className="text-leaf" /><p className="mt-3 text-xs font-bold text-ink">{title}</p><p className="mt-1 break-words font-mono text-[10px] leading-4 text-ink/45">{model ?? "Not reported"}</p><p className="mt-2 text-[11px] leading-4 text-ink/52">{detail}</p></div>;
}
function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-oat p-3"><p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-ink/42"><Gauge size={11} />{label}</p><p className="mt-1 text-xs font-bold text-ink">{value}</p></div>;
}
