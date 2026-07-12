import type { Language, Urgency } from "@/lib/types";

export function confidenceLabel(value: number, language: Language): string {
  if (language === "sw") {
    if (value < 0.4) return "Uhakika mdogo";
    if (value < 0.75) return "Uhakika wa wastani";
    return "Uhakika mkubwa";
  }
  if (value < 0.4) return "Low confidence";
  if (value < 0.75) return "Moderate confidence";
  return "High confidence";
}

export function confidencePercent(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

export function urgencyLabel(value: Urgency | string, language: Language): string {
  const labels: Record<Language, Record<string, string>> = {
    en: { low: "Low urgency", moderate: "Monitor closely", high: "High urgency" },
    sw: { low: "Haraka ndogo", moderate: "Fuatilia kwa karibu", high: "Hatua ya haraka" },
  };
  return labels[language][value] ?? value;
}

export function formatDate(value: string | undefined, language: Language, options?: Intl.DateTimeFormatOptions): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === "sw" ? "sw-KE" : "en-KE", {
    dateStyle: "medium",
    timeStyle: options?.timeStyle,
    ...options,
  }).format(date);
}

export function humanize(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function latency(value: number | undefined): string {
  if (value === undefined) return "Not measured yet";
  if (value < 1_000) return `${Math.round(value)} ms`;
  return `${(value / 1_000).toFixed(1)} s`;
}
