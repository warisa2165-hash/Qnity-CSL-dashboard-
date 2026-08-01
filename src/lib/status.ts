import type { Health, RiskLevel } from "@/lib/types";

/**
 * Single source of truth for how a status string is rendered anywhere in
 * the portal. Every table badge, KPI card and chart series resolves its
 * colour through here so the traffic-light language stays consistent.
 */

export type Tone =
  | "success"
  | "warning"
  | "critical"
  | "info"
  | "neutral"
  | "muted";

export const TONE_CLASSES: Record<Tone, string> = {
  success:
    "bg-success/10 text-success border-success/25 dark:bg-success/15 dark:text-emerald-300 dark:border-emerald-400/30",
  warning:
    "bg-warning/15 text-amber-700 border-warning/35 dark:bg-warning/15 dark:text-amber-300 dark:border-amber-400/30",
  critical:
    "bg-destructive/10 text-destructive border-destructive/25 dark:bg-destructive/15 dark:text-red-300 dark:border-red-400/30",
  info: "bg-primary/10 text-primary border-primary/25 dark:bg-primary/15 dark:text-sky-300 dark:border-sky-400/30",
  neutral:
    "bg-muted text-foreground/70 border-border dark:bg-muted dark:text-foreground/70",
  muted:
    "bg-muted/60 text-muted-foreground border-border/60 line-through decoration-1",
};

export const TONE_HEX: Record<Tone, string> = {
  success: "#107C10",
  warning: "#FFB900",
  critical: "#D13438",
  info: "#0078D4",
  neutral: "#605E5C",
  muted: "#A19F9D",
};

export const TONE_DOT: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  critical: "bg-destructive",
  info: "bg-primary",
  neutral: "bg-qnity-gray",
  muted: "bg-muted-foreground/40",
};

/** Status -> tone. Keys are normalised to UPPER_SNAKE before lookup. */
const STATUS_TONE: Record<string, Tone> = {
  // Health / generic
  GREEN: "success",
  YELLOW: "warning",
  RED: "critical",
  ON_TRACK: "success",
  WATCH: "warning",
  CRITICAL: "critical",

  // Progress-style statuses
  NOT_STARTED: "neutral",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  DELAYED: "critical",
  AT_RISK: "warning",
  CANCELLED: "muted",
  NOT_APPLICABLE: "muted",

  // Review / submission
  DRAFT: "neutral",
  SUBMITTED: "info",
  UNDER_REVIEW: "info",
  COMMENTED: "warning",
  REVISION_REQUIRED: "warning",
  APPROVED: "success",
  APPROVED_WITH_COMMENT: "success",
  REJECTED: "critical",
  SUPERSEDED: "muted",
  PENDING: "warning",

  // Procurement / PO
  REQUESTED: "info",
  PENDING_APPROVAL: "warning",
  ISSUED: "success",

  // Payment
  NOT_DUE: "neutral",
  PENDING_SUBMISSION: "warning",
  UNDER_VERIFICATION: "info",
  HOLD: "critical",
  PAID: "success",

  // Risk / action
  OPEN: "warning",
  MITIGATING: "info",
  CLOSED: "success",
  ESCALATED: "critical",
  OVERDUE: "critical",
  IN_REVIEW: "info",
  DECIDED: "success",

  // Risk levels & priority
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "critical",

  // Users
  ACTIVE: "success",
  DISABLED: "muted",
};

export function toneFor(status: string | null | undefined): Tone {
  if (!status) return "neutral";
  const key = status.toUpperCase().replace(/[\s-]+/g, "_");
  return STATUS_TONE[key] ?? "neutral";
}

export function healthTone(health: Health): Tone {
  return health === "GREEN" ? "success" : health === "YELLOW" ? "warning" : "critical";
}

export const HEALTH_LABEL: Record<Health, string> = {
  GREEN: "On Track",
  YELLOW: "On Track with Watch Items",
  RED: "Critical / Management Attention Required",
};

export const HEALTH_SHORT: Record<Health, string> = {
  GREEN: "On Track",
  YELLOW: "Watch",
  RED: "Critical",
};

/** Progress bar colour driven by planned-vs-actual, not by raw value. */
export function progressTone(actual: number, planned?: number): Tone {
  if (planned === undefined) {
    if (actual >= 90) return "success";
    if (actual >= 50) return "info";
    return "warning";
  }
  const gap = planned - actual;
  if (gap <= 2) return "success";
  if (gap <= 10) return "warning";
  return "critical";
}

/** 5x5 likelihood x impact scoring used by the risk heat map. */
export function riskLevelFromScore(
  likelihood: number,
  impact: number,
): RiskLevel {
  const score = likelihood * impact;
  if (score >= 20) return "CRITICAL";
  if (score >= 12) return "HIGH";
  if (score >= 6) return "MEDIUM";
  return "LOW";
}

export function riskTone(level: RiskLevel): Tone {
  switch (level) {
    case "CRITICAL":
      return "critical";
    case "HIGH":
      return "critical";
    case "MEDIUM":
      return "warning";
    default:
      return "success";
  }
}

export const RISK_CELL_CLASS: Record<RiskLevel, string> = {
  LOW: "bg-success/15 text-success",
  MEDIUM: "bg-warning/25 text-amber-700 dark:text-amber-300",
  HIGH: "bg-destructive/20 text-destructive",
  CRITICAL: "bg-destructive/70 text-white",
};

/** Chart palette derived from the QNITY corporate colours. */
export const CHART_COLORS = [
  "#0078D4",
  "#107C10",
  "#FFB900",
  "#D13438",
  "#8764B8",
  "#00B7C3",
  "#605E5C",
  "#106EBE",
  "#498205",
  "#CA5010",
];
