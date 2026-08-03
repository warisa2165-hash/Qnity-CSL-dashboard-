import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

/** The "today" the mock dataset is built around. */
export const PROJECT_TODAY = new Date("2026-08-01T00:00:00Z");

export function today(): Date {
  return process.env.NODE_ENV === "test" ? PROJECT_TODAY : new Date();
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function daysBetween(from: string | Date, to: string | Date): number {
  const a = typeof from === "string" ? new Date(from) : from;
  const b = typeof to === "string" ? new Date(to) : to;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Negative = overdue by N days. */
export function daysRemaining(due: string | Date | null): number | null {
  if (!due) return null;
  return daysBetween(today(), due);
}

export function isOverdue(
  due: string | null,
  status?: string | null,
): boolean {
  if (!due) return false;
  const closed = ["COMPLETED", "CLOSED", "CANCELLED", "APPROVED", "PAID"];
  if (status && closed.includes(status)) return false;
  return new Date(due).getTime() < today().getTime();
}

/* ------------------------------------------------------------------ */
/* Numbers                                                             */
/* ------------------------------------------------------------------ */

export function formatCurrency(
  value: number | null | undefined,
  currency = "THB",
  compact = false,
): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
}

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function percent(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`;
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

/** `UNDER_REVIEW` -> `Under Review` */
export function humanize(value: string | null | undefined): string {
  if (!value) return "—";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

export function groupBy<T, K extends string | number>(
  items: T[],
  key: (item: T) => K,
): Record<K, T[]> {
  return items.reduce(
    (acc, item) => {
      const k = key(item);
      (acc[k] ||= []).push(item);
      return acc;
    },
    {} as Record<K, T[]>,
  );
}

export function countBy<T, K extends string>(
  items: T[],
  key: (item: T) => K,
): Record<K, number> {
  return items.reduce(
    (acc, item) => {
      const k = key(item);
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    },
    {} as Record<K, number>,
  );
}

export function sortBy<T>(
  items: T[],
  key: (item: T) => number | string,
  direction: "asc" | "desc" = "asc",
): T[] {
  const sorted = [...items].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    if (ka === kb) return 0;
    return ka > kb ? 1 : -1;
  });
  return direction === "asc" ? sorted : sorted.reverse();
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

/**
 * The useful sentence out of a database error.
 *
 * Prisma messages open with a blank line and an `Invalid `prisma.x()`
 * invocation:` preamble, so naively taking the first line yields "" and a
 * diagnostic that trails off into nothing. What an operator needs is the line
 * after that — "Can't reach database server at `host:5432`".
 */
export function errorSummary(error: unknown): string {
  const lines = String(error instanceof Error ? error.message : error)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^Invalid `.*` invocation:?$/.test(line));
  return lines[0] ?? "unknown error";
}
