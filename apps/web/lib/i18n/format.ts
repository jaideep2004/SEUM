/**
 * Locale-aware formatting. Arabic uses `ar-SA-u-nu-latn`: Arabic month/day
 * names with Western digits (0-9) — the Saudi business-dashboard standard.
 */
import type { Lang } from "./dictionaries";

export function localeOf(lang: Lang): string {
  return lang === "ar" ? "ar-SA-u-nu-latn" : "en-US";
}

export function formatDate(value: string | number | Date | null | undefined, lang: Lang): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(localeOf(lang), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(value: string | number | Date | null | undefined, lang: Lang): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(localeOf(lang), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatNumber(value: number | null | undefined, lang: Lang, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat(localeOf(lang), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value));
}

/** Money with SAR suffix (e.g. `1,250 ر.س` / `SAR 1,250`). */
export function formatCurrency(value: number | null | undefined, lang: Lang, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  const n = new Intl.NumberFormat(localeOf(lang), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value));
  return lang === "ar" ? `${n} ر.س` : `SAR ${n}`;
}
