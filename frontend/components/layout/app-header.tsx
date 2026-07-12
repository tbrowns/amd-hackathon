"use client";

import { BarChart3, ClipboardList, Languages, Leaf, Menu, ScanSearch, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";

const links = [
  { href: "/assessment", key: "navCheck" as const, icon: ScanSearch },
  { href: "/reports", key: "navReports" as const, icon: ClipboardList },
  { href: "/dashboard", key: "navSignals" as const, icon: BarChart3 },
  { href: "/about", key: "navSafety" as const, icon: ShieldCheck },
];

export function AppHeader() {
  const { language, setLanguage, tr } = useLanguage();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-forest/10 bg-[#fbfaf6]/90 backdrop-blur-xl print:hidden">
      <div className="page-shell flex h-[74px] items-center justify-between gap-4">
        <Link href="/" className="group flex items-center gap-2.5" aria-label="ShambaLens home">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-forest text-white shadow-soft transition-transform group-hover:-rotate-3">
            <Leaf size={21} strokeWidth={2.4} aria-hidden="true" />
          </span>
          <span>
            <span className="block font-display text-[1.22rem] font-bold leading-none tracking-[-0.03em] text-ink">ShambaLens</span>
            <span className="mt-1 block text-[0.61rem] font-bold uppercase tracking-[0.2em] text-leaf">Evidence first</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {links.map(({ href, key, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link key={href} href={href} className={`nav-link ${active ? "nav-link-active" : ""}`} aria-current={active ? "page" : undefined}>
                <Icon size={16} aria-hidden="true" />
                {tr(key)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden rounded-full border border-forest/15 bg-white p-1 sm:flex" aria-label={tr("language")}>
            <Languages className="ml-2 mr-1 self-center text-leaf" size={15} aria-hidden="true" />
            {(["en", "sw"] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLanguage(code)}
                className={`rounded-full px-2.5 py-1.5 text-xs font-bold transition ${language === code ? "bg-forest text-white" : "text-forest hover:bg-oat"}`}
                aria-pressed={language === code}
              >
                {code === "en" ? "EN" : "SW"}
              </button>
            ))}
          </div>
          <Link href="/assessment" className="button-primary hidden min-h-10 px-4 text-sm md:inline-flex">
            <ScanSearch size={17} aria-hidden="true" />
            {tr("navCheck")}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="grid h-11 w-11 place-items-center rounded-xl border border-forest/15 bg-white text-forest lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-forest/10 bg-[#fbfaf6] p-4 lg:hidden">
          <nav className="page-shell grid gap-1" aria-label="Mobile navigation">
            {links.map(({ href, key, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 font-semibold text-ink hover:bg-white"
              >
                <Icon size={18} className="text-leaf" aria-hidden="true" />
                {tr(key)}
              </Link>
            ))}
            <div className="mt-2 flex items-center justify-between rounded-xl bg-white px-3 py-2">
              <span className="text-sm font-semibold text-ink">{tr("language")}</span>
              <div className="flex gap-1">
                {(["en", "sw"] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLanguage(code)}
                    className={`rounded-lg px-3 py-2 text-xs font-bold ${language === code ? "bg-forest text-white" : "bg-oat text-forest"}`}
                  >
                    {code === "en" ? "English" : "Kiswahili"}
                  </button>
                ))}
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
