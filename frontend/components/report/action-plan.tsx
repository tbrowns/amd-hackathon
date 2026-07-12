"use client";

import { AlertTriangle, Ban, CalendarClock, CircleCheck } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import type { ActionPlan as ActionPlanType } from "@/lib/types";

export function ActionPlan({ plan }: { plan: ActionPlanType }) {
  const { language } = useLanguage();
  const sw = language === "sw";
  const groups = [
    { key: "do_today" as const, icon: CircleCheck, title: sw ? "Fanya leo" : "Do today", subtitle: sw ? "Hatua salama za kuanza sasa" : "Low-risk steps to start now", className: "border-leaf/25 bg-[#f1f7ec] text-forest" },
    { key: "monitor" as const, icon: CalendarClock, title: sw ? "Fuatilia siku zijazo" : "Monitor next", subtitle: sw ? "Mabadiliko ya kuangalia" : "Changes to watch for", className: "border-[#b99b3b]/25 bg-[#fff9e8] text-[#856613]" },
    { key: "avoid" as const, icon: Ban, title: sw ? "Epuka kufanya" : "Avoid doing", subtitle: sw ? "Zuia madhara zaidi" : "Prevent avoidable harm", className: "border-clay/20 bg-[#fff4ef] text-clay" },
    { key: "escalate_when" as const, icon: AlertTriangle, title: sw ? "Tafuta mtaalamu ikiwa" : "Escalate when", subtitle: sw ? "Ishara zinazohitaji msaada" : "Warning signs needing help", className: "border-[#7b4b72]/20 bg-[#faf2f8] text-[#714566]" },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {groups.map(({ key, icon: Icon, title, subtitle, className }) => (
        <section key={key} className={`rounded-2xl border p-5 ${className}`}>
          <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/70"><Icon size={20} /></span><div><h3 className="font-display text-lg font-bold text-ink">{title}</h3><p className="mt-0.5 text-[11px] font-semibold text-ink/48">{subtitle}</p></div></div>
          <ul className="mt-4 grid gap-3">
            {(plan[key]?.length ? plan[key] : [sw ? "Hakuna hatua maalum iliyotolewa." : "No specific item was provided."]).map((item) => <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-ink/70"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-50" />{item}</li>)}
          </ul>
        </section>
      ))}
    </div>
  );
}
