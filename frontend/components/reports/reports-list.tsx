"use client";

import { ArrowRight, CalendarDays, ClipboardList, FlaskConical, LoaderCircle, MapPin, Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { ErrorPanel } from "@/components/ui/error-panel";
import { PageIntro } from "@/components/ui/page-intro";
import { listAssessments } from "@/lib/api";
import { formatDate, humanize, urgencyLabel } from "@/lib/format";
import { cropNames } from "@/lib/i18n";
import type { AssessmentSummary } from "@/lib/types";

type Filter = "all" | "completed" | "in_progress";

export function ReportsList() {
  const { language } = useLanguage();
  const sw = language === "sw";
  const [reports, setReports] = useState<AssessmentSummary[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const load = () => {
    setError(null);
    listAssessments().then(setReports).catch(setError);
  };
  useEffect(() => {
    listAssessments().then(setReports).catch(setError);
  }, []);

  const filtered = useMemo(() => (reports ?? []).filter((report) => {
    if (filter === "completed") return report.status === "completed";
    if (filter === "in_progress") return report.status !== "completed";
    return true;
  }), [filter, reports]);

  return (
    <div className="min-h-[70vh] py-14 sm:py-20">
      <div className="page-shell">
        <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <PageIntro eyebrow={sw ? "Historia yako binafsi" : "Your private history"} title={sw ? "Ripoti za mazao" : "Crop reports"} description={sw ? "Rudi kwenye ukaguzi uliokamilika au endelea ulipoishia. Ripoti hizi zinaonekana kwenye kivinjari hiki pekee." : "Reopen completed assessments or continue where you stopped. These reports are scoped to this browser only."} />
          <Link href="/assessment" className="button-primary shrink-0"><Plus size={18} />{sw ? "Ukaguzi mpya" : "New assessment"}</Link>
        </div>

        {error != null && <div className="mt-10"><ErrorPanel error={error} onRetry={load} /></div>}
        {!error && reports === null && <div className="mt-16 grid place-items-center py-16" role="status"><LoaderCircle className="animate-spin text-leaf" size={30} /><p className="mt-3 text-sm text-ink/50">{sw ? "Inapakia ripoti…" : "Loading reports…"}</p></div>}
        {reports && (
          <>
            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-b border-forest/10 pb-5">
              <div className="flex rounded-xl bg-oat p-1">
                {([{"id":"all","en":"All","sw":"Zote"},{"id":"completed","en":"Completed","sw":"Zimekamilika"},{"id":"in_progress","en":"In progress","sw":"Zinaendelea"}] as const).map((item) => <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={`rounded-lg px-3 py-2 text-xs font-bold ${filter === item.id ? "bg-white text-forest shadow-sm" : "text-ink/50 hover:text-forest"}`}>{sw ? item.sw : item.en}</button>)}
              </div>
              <p className="text-xs font-semibold text-ink/42">{reports.length} {sw ? "ripoti kwenye kivinjari hiki" : "reports in this browser"}</p>
            </div>

            {filtered.length === 0 ? (
              <div className="mt-10 rounded-3xl border border-dashed border-forest/20 bg-oat/40 px-6 py-16 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-leaf shadow-soft"><ClipboardList size={27} /></span>
                <h2 className="mt-5 font-display text-2xl font-bold text-ink">{sw ? "Hakuna ripoti hapa bado" : "No reports here yet"}</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink/55">{sw ? "Ukaguzi unaokamilisha utaonekana hapa bila kuunda akaunti." : "Assessments you complete will appear here without creating an account."}</p>
                <Link href="/assessment" className="button-primary mt-6">{sw ? "Kagua zao" : "Check a crop"}<ArrowRight size={17} /></Link>
              </div>
            ) : (
              <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((report) => <ReportCard key={report.id} report={report} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ReportCard({ report }: { report: AssessmentSummary }) {
  const { language } = useLanguage();
  const sw = language === "sw";
  const completed = report.status === "completed";
  return (
    <Link href={completed ? `/report/${report.id}` : `/assessment/${report.id}`} className="group soft-card flex min-h-[280px] flex-col overflow-hidden transition hover:-translate-y-1 hover:border-leaf/30 hover:shadow-card">
      <div className={`h-2 ${report.crop === "tomato" ? "bg-clay" : report.crop === "onion" ? "bg-sun" : "bg-leaf"}`} />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-oat text-2xl" aria-hidden="true">{report.crop === "tomato" ? "🍅" : report.crop === "onion" ? "🧅" : "🥬"}</span>
          <div className="flex flex-wrap justify-end gap-1.5">{report.simulated && <span className="inline-flex items-center gap-1 rounded-full bg-[#fff3cd] px-2 py-1 text-[9px] font-extrabold uppercase text-[#715713]"><FlaskConical size={11} />Demo</span>}<span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-extrabold uppercase ${completed ? "bg-[#e8f0d0] text-forest" : "bg-oat text-ink/50"}`}>{completed && <ShieldCheck size={11} />}{completed ? (sw ? "Imekamilika" : "Completed") : (sw ? "Endelea" : "In progress")}</span></div>
        </div>
        <p className="eyebrow mt-5">{cropNames[language][report.crop] ?? humanize(report.crop)}</p>
        <h2 className="mt-2 line-clamp-2 font-display text-2xl font-bold leading-7 text-ink">{report.leading_hypothesis ?? (sw ? "Ukaguzi haujakamilika" : "Assessment not completed")}</h2>
        {report.urgency && <p className="mt-2 text-xs font-semibold text-leaf">{urgencyLabel(report.urgency, language)}</p>}
        <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-6 text-[11px] font-semibold text-ink/45"><span className="inline-flex items-center gap-1"><CalendarDays size={13} />{formatDate(report.created_at, language, { dateStyle: "medium" })}</span>{report.region && <span className="inline-flex items-center gap-1"><MapPin size={13} />{report.region}</span>}</div>
        <div className="mt-4 flex items-center justify-between border-t border-forest/8 pt-4 text-xs font-bold text-forest"><span>{completed ? (sw ? "Fungua ripoti" : "Open report") : (sw ? "Endelea na ukaguzi" : "Continue assessment")}</span><ArrowRight className="transition group-hover:translate-x-1" size={16} /></div>
      </div>
    </Link>
  );
}
