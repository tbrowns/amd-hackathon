"use client";

import { Leaf, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/components/providers/language-provider";

export function AppFooter() {
  const { language, tr } = useLanguage();
  return (
    <footer className="mt-20 border-t border-forest/10 bg-[#f0eee4] print:hidden">
      <div className="page-shell grid gap-8 py-10 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2 font-display text-lg font-bold text-ink"><Leaf size={19} /> ShambaLens AI</div>
          <p className="mt-3 max-w-sm text-sm leading-6 text-ink/65">{tr("advisory")}. {tr("privacy")}</p>
        </div>
        <div>
          <p className="eyebrow">{language === "sw" ? "Chunguza" : "Explore"}</p>
          <div className="mt-3 grid gap-2 text-sm font-semibold text-ink/75">
            <Link href="/assessment" className="hover:text-forest">{tr("navCheck")}</Link>
            <Link href="/reports" className="hover:text-forest">{tr("navReports")}</Link>
            <Link href="/dashboard" className="hover:text-forest">{tr("navSignals")}</Link>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-forest"><ShieldCheck size={17} /> {language === "sw" ? "Usalama kwanza" : "Safety first"}</div>
          <p className="mt-3 text-sm leading-6 text-ink/65">
            {language === "sw" ? "Wasiliana na mtaalamu wa kilimo kwa dalili kali au ushauri wa kemikali." : "Consult a qualified agronomist for severe symptoms or chemical-treatment decisions."}
          </p>
        </div>
      </div>
      <div className="border-t border-forest/10 py-4 text-center text-xs text-ink/55">© {new Date().getFullYear()} ShambaLens AI · Nairobi, Kenya</div>
    </footer>
  );
}
