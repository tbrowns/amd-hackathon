"use client";

import { FlaskConical } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { useRuntime } from "@/components/providers/runtime-provider";

export function DemoBanner() {
  const { runtime } = useRuntime();
  const { tr } = useLanguage();
  if (runtime?.execution_mode !== "demo") return null;
  return (
    <div className="bg-[#fff3cd] px-4 py-2 text-center text-xs font-bold text-[#6b5319] print:hidden" role="status">
      <span className="inline-flex items-center gap-2"><FlaskConical size={14} aria-hidden="true" />{tr("demoBanner")}</span>
    </div>
  );
}
