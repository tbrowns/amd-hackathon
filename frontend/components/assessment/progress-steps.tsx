"use client";

import { Camera, Check, ClipboardCheck, HelpCircle, Sprout } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";

export type WizardStage = "photo" | "context" | "questions" | "plan";

export function ProgressSteps({ current }: { current: WizardStage }) {
  const { language } = useLanguage();
  const stages = [
    { id: "photo", label: language === "sw" ? "Picha" : "Photo", icon: Camera },
    { id: "context", label: language === "sw" ? "Maelezo" : "Context", icon: Sprout },
    { id: "questions", label: language === "sw" ? "Maswali" : "Questions", icon: HelpCircle },
    { id: "plan", label: language === "sw" ? "Mpango" : "Verified plan", icon: ClipboardCheck },
  ] as const;
  const currentIndex = stages.findIndex((stage) => stage.id === current);

  return (
    <ol className="grid grid-cols-4" aria-label={language === "sw" ? "Hatua za ukaguzi" : "Assessment progress"}>
      {stages.map((stage, index) => {
        const Icon = stage.icon;
        const complete = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={stage.id} className="relative flex flex-col items-center text-center">
            {index > 0 && <span className={`absolute right-1/2 top-4 h-px w-full ${index <= currentIndex ? "bg-leaf" : "bg-forest/15"}`} aria-hidden="true" />}
            <span className={`relative z-10 grid h-9 w-9 place-items-center rounded-full border-2 transition ${complete ? "border-leaf bg-leaf text-white" : active ? "border-forest bg-forest text-white shadow-[0_0_0_5px_rgba(23,92,58,.1)]" : "border-[#d8ded6] bg-[#fbfaf6] text-ink/35"}`} aria-current={active ? "step" : undefined}>
              {complete ? <Check size={16} strokeWidth={3} /> : <Icon size={16} />}
            </span>
            <span className={`mt-2 text-[10px] font-bold sm:text-xs ${active || complete ? "text-forest" : "text-ink/40"}`}>{stage.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
