"use client";

import { AlertCircle, CheckCircle2, HelpCircle, MinusCircle } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { confidenceLabel, confidencePercent, humanize } from "@/lib/format";
import type { Hypothesis } from "@/lib/types";

export function HypothesisCard({ hypothesis, rank }: { hypothesis: Hypothesis; rank: number }) {
  const { language } = useLanguage();
  const sw = language === "sw";
  return (
    <article className={`overflow-hidden rounded-2xl border bg-white ${rank === 1 ? "border-leaf/35 shadow-soft" : "border-forest/12"}`}>
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-extrabold ${rank === 1 ? "bg-forest text-white" : "bg-oat text-forest"}`}>{rank}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="font-display text-xl font-bold text-ink sm:text-2xl">{hypothesis.name}</h3><p className="mt-1 text-xs font-bold uppercase tracking-[.12em] text-leaf">{humanize(hypothesis.category)} · {humanize(hypothesis.severity)} {sw ? "ukali" : "severity"}</p></div>
              <div className="text-right"><p className="text-xs font-extrabold text-forest">{confidenceLabel(hypothesis.confidence, language)}</p><p className="mt-0.5 text-[11px] font-semibold text-ink/42">{confidencePercent(hypothesis.confidence)}</p></div>
            </div>
            <div className="mt-4 confidence-track"><div className="confidence-fill" style={{ width: confidencePercent(hypothesis.confidence) }} /></div>
          </div>
        </div>
      </div>
      <details className="group border-t border-forest/10">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-bold text-forest hover:bg-oat/60 sm:px-6">
          {sw ? "Angalia ushahidi" : "Review the evidence"}
          <span className="text-lg transition group-open:rotate-45">+</span>
        </summary>
        <div className="grid gap-4 border-t border-forest/8 bg-[#fafaf6] p-5 sm:grid-cols-3 sm:p-6">
          <EvidenceList icon={CheckCircle2} title={sw ? "Kinachounga mkono" : "Evidence for"} items={hypothesis.supporting_evidence} tone="positive" empty={sw ? "Hakuna ushahidi maalum" : "No specific support recorded"} />
          <EvidenceList icon={MinusCircle} title={sw ? "Kinachopinga" : "Evidence against"} items={hypothesis.contradicting_evidence} tone="negative" empty={sw ? "Hakuna ushahidi wa kupinga" : "No contradiction recorded"} />
          <EvidenceList icon={HelpCircle} title={sw ? "Bado hakijulikani" : "Still missing"} items={hypothesis.missing_information} tone="unknown" empty={sw ? "Hakuna taarifa iliyokosekana" : "No missing evidence recorded"} />
        </div>
      </details>
    </article>
  );
}

function EvidenceList({ icon: Icon, title, items, tone, empty }: { icon: typeof AlertCircle; title: string; items: string[]; tone: "positive" | "negative" | "unknown"; empty: string }) {
  const colors = { positive: "text-leaf bg-[#eff6e7]", negative: "text-clay bg-[#fff1eb]", unknown: "text-[#8a6716] bg-[#fff7dc]" };
  return <div><div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.1em] text-ink/65"><span className={`grid h-7 w-7 place-items-center rounded-full ${colors[tone]}`}><Icon size={15} /></span>{title}</div><ul className="mt-3 grid gap-2">{items.length ? items.map((item) => <li key={item} className="text-xs leading-5 text-ink/62">{item}</li>) : <li className="text-xs italic leading-5 text-ink/40">{empty}</li>}</ul></div>;
}
