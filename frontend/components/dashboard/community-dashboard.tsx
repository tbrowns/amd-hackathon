"use client";

import { AlertTriangle, BarChart3, FlaskConical, Info, Leaf, LoaderCircle, Map, ShieldAlert, Sprout } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { ErrorPanel } from "@/components/ui/error-panel";
import { PageIntro } from "@/components/ui/page-intro";
import { getDashboardSummary } from "@/lib/api";
import { humanize } from "@/lib/format";
import { cropNames } from "@/lib/i18n";
import type { DashboardSummary } from "@/lib/types";

export function CommunityDashboard() {
  const { language } = useLanguage();
  const sw = language === "sw";
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<unknown>(null);
  const load = () => {
    setError(null);
    getDashboardSummary().then(setSummary).catch(setError);
  };
  useEffect(() => {
    getDashboardSummary().then(setSummary).catch(setError);
  }, []);
  const maximum = useMemo(() => Math.max(1, ...(summary?.reports_by_region.map((item) => item.reports) ?? [1])), [summary]);

  return (
    <div className="min-h-[70vh] bg-[linear-gradient(180deg,#edf1df_0,#fbfaf6_30rem)] py-14 sm:py-20">
      <div className="page-shell">
        <PageIntro eyebrow={sw ? "Maarifa yanayolinda faragha" : "Privacy-conscious intelligence"} title={sw ? "Ishara za afya ya mazao katika jamii" : "Community crop-health signals"} description={sw ? "Muhtasari mpana kutoka ripoti zilizokamilika unaweza kusaidia kuona mifumo — bila kuonyesha picha, majina, au maeneo kamili." : "Coarse summaries from completed reports can help surface patterns — without exposing photos, names or exact locations."} />
        <div className="mt-7 flex items-start gap-3 rounded-2xl border border-[#b99b3b]/25 bg-[#fff9e8] p-4 text-sm leading-6 text-ink/65"><Info className="mt-0.5 shrink-0 text-[#8a6716]" size={19} /><div><strong className="text-ink">{sw ? "Ishara za AI zilizoripotiwa na jamii, si data iliyothibitishwa ya mlipuko." : "Community-reported AI signals, not confirmed outbreak data."}</strong><span className="block text-xs">{sw ? "Uthibitisho wa wataalamu na uchunguzi wa shamba unahitajika kabla ya maamuzi ya umma." : "Expert confirmation and field surveillance are required before public-health or farm-policy decisions."}</span></div></div>

        {error != null && <div className="mt-8"><ErrorPanel error={error} onRetry={load} /></div>}
        {!error && !summary && <div className="grid place-items-center py-24" role="status"><LoaderCircle className="animate-spin text-leaf" size={30} /><p className="mt-3 text-sm text-ink/50">{sw ? "Inakusanya muhtasari…" : "Loading anonymized summary…"}</p></div>}
        {summary && (
          <div className="mt-8">
            {summary.simulated && <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[#dbc66b]/40 bg-[#fff3cd] p-4 text-sm font-semibold leading-6 text-[#6b5319]" role="status"><FlaskConical className="mt-0.5 shrink-0" size={19} /><div><strong>{sw ? "Data ya onyesho iliyoigizwa" : "Simulated dashboard data"}</strong><span className="block text-xs font-medium">{sw ? "Nambari hizi ni za kuonyesha kiolesura pekee; si ripoti halisi za jamii." : "These fixture counts demonstrate the interface only; they are not real community reports."}</span></div></div>}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat icon={BarChart3} label={sw ? "Ripoti wiki hii" : "Reports this week"} value={String(summary.reports_this_week)} detail={summary.simulated ? (sw ? "Imeigizwa" : "Simulated") : (sw ? "Zilizokamilika" : "Completed only")} />
              <Stat icon={Sprout} label={sw ? "Zao linaloonekana zaidi" : "Most affected crop"} value={summary.most_affected_crop ? cropNames[language][summary.most_affected_crop] ?? humanize(summary.most_affected_crop) : "—"} detail={sw ? "Kutoka makundi ya AI" : "From AI groupings"} />
              <Stat icon={Leaf} label={sw ? "Kundi linaloongoza" : "Leading category"} value={summary.most_common_category ? humanize(summary.most_common_category) : "—"} detail={sw ? "Uwezekano, si uthibitisho" : "Suspected, not confirmed"} />
              <Stat icon={ShieldAlert} label={sw ? "Ishara za haraka" : "High-urgency signals"} value={String(summary.high_urgency_signals)} detail={sw ? "Zinahitaji ukaguzi" : "Require closer review"} urgent={summary.high_urgency_signals > 0} />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
              <section className="card p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">{sw ? "Usambazaji mpana" : "Coarse distribution"}</p><h2 className="mt-2 font-display text-2xl font-bold text-ink">{sw ? "Ripoti kwa kaunti au eneo" : "Reports by county or region"}</h2></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-oat text-leaf"><Map size={19} /></span></div>
                {summary.reports_by_region.length ? <div className="mt-7 grid gap-5">{summary.reports_by_region.map((item) => <div key={item.region}><div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="font-bold text-ink">{item.region || (sw ? "Eneo halikutolewa" : "Region not provided")}</span><span className="font-mono text-xs font-bold text-ink/45">{item.reports}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-oat"><div className="h-full rounded-full bg-gradient-to-r from-moss to-leaf" style={{ width: `${Math.max(5, (item.reports / maximum) * 100)}%` }} /></div></div>)}</div> : <div className="mt-8 rounded-2xl border border-dashed border-forest/15 py-12 text-center text-sm text-ink/48">{sw ? "Hakuna data ya eneo ya kuonyesha bado." : "No regional data to display yet."}</div>}
              </section>
              <aside className="rounded-3xl bg-forest p-7 text-white">
                <AlertTriangle className="text-[#dce9a7]" size={25} />
                <h2 className="mt-5 font-display text-2xl font-bold">{sw ? "Tumia kwa uangalifu" : "Interpret with care"}</h2>
                <p className="mt-3 text-sm leading-6 text-white/68">{summary.disclaimer}</p>
                <div className="mt-6 border-t border-white/12 pt-5 text-xs leading-5 text-white/55"><strong className="text-white/80">{sw ? "Haijumuishwi:" : "Never included:"}</strong> {sw ? "picha, majina, mawasiliano, anwani kamili au GPS." : "photos, names, contact details, exact addresses or GPS coordinates."}</div>
              </aside>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, detail, urgent = false }: { icon: typeof BarChart3; label: string; value: string; detail: string; urgent?: boolean }) { return <article className="soft-card p-5"><span className={`grid h-10 w-10 place-items-center rounded-xl ${urgent ? "bg-clay/10 text-clay" : "bg-oat text-leaf"}`}><Icon size={19} /></span><p className="mt-4 text-[10px] font-extrabold uppercase tracking-[.12em] text-ink/42">{label}</p><p className="mt-2 font-display text-2xl font-bold leading-7 text-ink">{value}</p><p className="mt-2 text-[11px] font-semibold text-ink/42">{detail}</p></article>; }
