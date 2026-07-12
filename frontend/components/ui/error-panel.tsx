"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useLanguage } from "@/components/providers/language-provider";

export function ErrorPanel({ error, onRetry, compact = false }: { error: unknown; onRetry?: () => void; compact?: boolean }) {
  const { language, tr } = useLanguage();
  const message = error instanceof Error ? error.message : language === "sw" ? "Hitilafu isiyotarajiwa imetokea." : "An unexpected error occurred.";
  const requestId = error instanceof ApiError ? error.requestId : undefined;
  return (
    <div className={`rounded-2xl border border-clay/25 bg-[#fff7f3] ${compact ? "p-4" : "p-6"}`} role="alert">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-clay/10 text-clay"><AlertTriangle size={20} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold text-ink">{tr("errorTitle")}</h2>
          <p className="mt-1 text-sm leading-6 text-ink/70">{message}</p>
          {requestId && <p className="mt-2 break-all font-mono text-[11px] text-ink/45">Request {requestId}</p>}
          {onRetry && (
            <button type="button" onClick={onRetry} className="button-secondary mt-4 min-h-10 px-4 text-sm">
              <RefreshCw size={16} /> {tr("retry")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
