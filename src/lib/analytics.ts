/**
 * Executive analytics
 * ===================
 *
 * Derives every KPI shown on the executive dashboard from the underlying
 * records, so the numbers on the landing page can never drift away from the
 * detail pages they summarise.
 */

import * as data from "@/lib/data";
import { isOverdue, daysRemaining, sortBy } from "@/lib/utils";
import type {
  ActionItem,
  CapexEquipment,
  DocumentSubmission,
  Health,
  Milestone,
  OwnerAttentionItem,
  PaymentMilestone,
  ProcurementPackage,
  Risk,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Per-domain summaries                                                */
/* ------------------------------------------------------------------ */

export function submissionStats(rows: DocumentSubmission[]) {
  const overdueReview = rows.filter(
    (r) =>
      isOverdue(r.reviewDueDate) &&
      !["APPROVED", "APPROVED_WITH_COMMENT", "REJECTED", "SUPERSEDED"].includes(
        r.status,
      ),
  );
  return {
    total: rows.length,
    underReview: rows.filter((r) =>
      ["SUBMITTED", "UNDER_REVIEW"].includes(r.status),
    ).length,
    approved: rows.filter((r) =>
      ["APPROVED", "APPROVED_WITH_COMMENT"].includes(r.status),
    ).length,
    rejected: rows.filter((r) => r.status === "REJECTED").length,
    overdueReview: overdueReview.length,
    awaitingDaRevision: rows.filter((r) =>
      ["COMMENTED", "REVISION_REQUIRED"].includes(r.status),
    ).length,
    pendingOwnerReview: rows.filter(
      (r) =>
        ["SUBMITTED", "UNDER_REVIEW"].includes(r.status) &&
        r.submittedBy !== "QNITY",
    ).length,
    superseded: rows.filter((r) => r.status === "SUPERSEDED").length,
  };
}

export function actionStats(rows: ActionItem[]) {
  const open = rows.filter((r) => ["OPEN", "IN_PROGRESS", "OVERDUE"].includes(r.status));
  const overdue = rows.filter(
    (r) => r.status === "OVERDUE" || isOverdue(r.dueDate, r.status),
  );
  const dueThisWeek = open.filter((r) => {
    const d = daysRemaining(r.dueDate);
    return d !== null && d >= 0 && d <= 7;
  });
  return {
    total: rows.length,
    open: open.length,
    overdue: overdue.length,
    dueThisWeek: dueThisWeek.length,
    completed: rows.filter((r) => r.status === "COMPLETED").length,
    cancelled: rows.filter((r) => r.status === "CANCELLED").length,
  };
}

export function riskStats(rows: Risk[]) {
  const open = rows.filter((r) => r.status !== "CLOSED");
  return {
    total: rows.length,
    open: open.length,
    critical: open.filter((r) => r.level === "CRITICAL").length,
    high: open.filter((r) => r.level === "HIGH").length,
    escalated: open.filter((r) => r.escalationRequired).length,
    overdueMitigation: open.filter((r) => isOverdue(r.dueDate, r.status)).length,
  };
}

export function procurementStats(rows: ProcurementPackage[]) {
  const totalBudget = rows.reduce((sum, r) => sum + r.budget, 0);
  const committed = rows
    .filter((r) => r.poStatus === "ISSUED")
    .reduce((sum, r) => sum + r.budget, 0);
  return {
    total: rows.length,
    poIssued: rows.filter((r) => r.poStatus === "ISSUED").length,
    pendingApproval: rows.filter((r) => r.poStatus === "PENDING_APPROVAL").length,
    notStarted: rows.filter((r) => r.poStatus === "NOT_STARTED").length,
    delivered: rows.filter((r) => r.actualDeliveryDate !== null).length,
    atRisk: rows.filter((r) => ["HIGH", "CRITICAL"].includes(r.riskStatus)).length,
    totalBudget,
    committed,
    committedPercent: totalBudget ? (committed / totalBudget) * 100 : 0,
  };
}

const CAPEX_STAGES = [
  "rfqStatus",
  "technicalEvaluationStatus",
  "commercialEvaluationStatus",
  "poStatus",
  "manufacturingStatus",
  "shippingStatus",
  "deliveryStatus",
  "installationStatus",
  "commissioningStatus",
  "trainingStatus",
] as const;

/** Percentage of applicable stages completed for one equipment item. */
export function capexProgress(item: CapexEquipment): number {
  const applicable = CAPEX_STAGES.filter(
    (s) => item[s] !== "NOT_APPLICABLE",
  );
  if (!applicable.length) return 100;
  const done = applicable.filter((s) => item[s] === "COMPLETED").length;
  const partial = applicable.filter((s) => item[s] === "IN_PROGRESS").length;
  return ((done + partial * 0.5) / applicable.length) * 100;
}

export function capexStats(rows: CapexEquipment[]) {
  return {
    total: rows.length,
    totalBudget: rows.reduce((sum, r) => sum + r.budget, 0),
    poIssued: rows.filter((r) => r.poStatus === "COMPLETED").length,
    pendingRfq: rows.filter((r) =>
      ["NOT_STARTED", "IN_PROGRESS"].includes(r.rfqStatus),
    ).length,
    pendingTechnicalReview: rows.filter((r) =>
      ["NOT_STARTED", "IN_PROGRESS"].includes(r.technicalEvaluationStatus),
    ).length,
    longLead: rows.filter((r) => r.isLongLead).length,
    delayed: rows.filter(
      (r) => !r.actualDeliveryDate && isOverdue(r.targetDeliveryDate),
    ).length,
    readyForInstallation: rows.filter(
      (r) =>
        r.deliveryStatus === "COMPLETED" && r.installationStatus !== "COMPLETED",
    ).length,
    commissioned: rows.filter((r) => r.commissioningStatus === "COMPLETED").length,
    atRisk: rows.filter((r) => ["HIGH", "CRITICAL"].includes(r.riskLevel)).length,
    averageProgress:
      rows.reduce((sum, r) => sum + capexProgress(r), 0) / (rows.length || 1),
  };
}

export function paymentStats(rows: PaymentMilestone[]) {
  const totalValue = rows.reduce((sum, r) => sum + r.amount, 0);
  const paid = rows.filter((r) => r.status === "PAID");
  const paidValue = paid.reduce((sum, r) => sum + r.amount, 0);
  const pendingApproval = rows.filter((r) =>
    ["SUBMITTED", "UNDER_VERIFICATION"].includes(r.status),
  );
  const onHold = rows.filter((r) => r.status === "HOLD");
  const next = rows.find((r) =>
    ["PENDING_SUBMISSION", "SUBMITTED", "UNDER_VERIFICATION", "HOLD"].includes(
      r.status,
    ),
  );
  return {
    totalValue,
    paidValue,
    paidPercent: totalValue ? (paidValue / totalValue) * 100 : 0,
    remainingPercent: totalValue
      ? ((totalValue - paidValue) / totalValue) * 100
      : 0,
    pendingApprovalValue: pendingApproval.reduce((s, r) => s + r.amount, 0),
    pendingApprovalCount: pendingApproval.length,
    onHoldValue: onHold.reduce((s, r) => s + r.amount, 0),
    onHoldCount: onHold.length,
    next: next ?? null,
  };
}

export function milestoneStats(rows: Milestone[]) {
  return {
    total: rows.length,
    completed: rows.filter((r) => r.status === "COMPLETED").length,
    inProgress: rows.filter((r) => r.status === "IN_PROGRESS").length,
    delayed: rows.filter((r) => r.status === "DELAYED").length,
    atRisk: rows.filter((r) => r.status === "AT_RISK").length,
    notStarted: rows.filter((r) => r.status === "NOT_STARTED").length,
    cancelled: rows.filter((r) => r.status === "CANCELLED").length,
  };
}

export function attentionStats(rows: OwnerAttentionItem[]) {
  return {
    total: rows.length,
    open: rows.filter((r) => r.status !== "DECIDED").length,
    requiringApproval: rows.filter((r) =>
      r.category.toLowerCase().includes("approval"),
    ).length,
    overdue: rows.filter(
      (r) => r.status === "OVERDUE" || isOverdue(r.requestedDecisionDate, r.status),
    ).length,
    highImpact: rows.filter((r) => r.urgency === "RED").length,
  };
}

/* ------------------------------------------------------------------ */
/* Executive rollup                                                    */
/* ------------------------------------------------------------------ */

export interface ExecutiveSummary {
  health: Health;
  kpis: {
    overallProgress: number;
    designProgress: number;
    procurementProgress: number;
    constructionProgress: number;
    safetyScore: number;
    openRisks: number;
    overdueActions: number;
    pendingApprovals: number;
    pendingDaSubmissions: number;
    pendingOwnerReviews: number;
  };
  statuses: {
    safety: Health;
    risk: Health;
    milestone: Health;
    procurement: Health;
    capex: Health;
    payment: Health;
  };
  upcomingMilestones: Milestone[];
  topRisks: Risk[];
  topOverdueActions: ActionItem[];
  attentionItems: OwnerAttentionItem[];
}

function worst(...values: Health[]): Health {
  if (values.includes("RED")) return "RED";
  if (values.includes("YELLOW")) return "YELLOW";
  return "GREEN";
}

export async function getExecutiveSummary(): Promise<ExecutiveSummary> {
  const [
    project,
    milestones,
    risks,
    actions,
    submissions,
    procurement,
    capex,
    payments,
    attention,
    safetySummary,
  ] = await Promise.all([
    data.getProject(),
    data.getMilestones(),
    data.getRisks(),
    data.getActions(),
    data.getSubmissions(),
    data.getProcurement(),
    data.getCapex(),
    data.getPayments(),
    data.getAttentionItems(),
    data.getSafetySummary(),
  ]);

  const rStats = riskStats(risks);
  const aStats = actionStats(actions);
  const sStats = submissionStats(submissions);
  const pStats = procurementStats(procurement);
  const cStats = capexStats(capex);
  const payStats = paymentStats(payments);
  const mStats = milestoneStats(milestones);

  const safety: Health =
    safetySummary.safetyScore >= 95
      ? "GREEN"
      : safetySummary.safetyScore >= 90
        ? "YELLOW"
        : "RED";

  const risk: Health =
    rStats.critical > 0 ? "RED" : rStats.high > 2 ? "YELLOW" : "GREEN";

  const milestone: Health =
    mStats.delayed > 0 ? "RED" : mStats.atRisk > 0 ? "YELLOW" : "GREEN";

  const procurementHealth: Health =
    pStats.atRisk >= 3 ? "RED" : pStats.atRisk > 0 ? "YELLOW" : "GREEN";

  const capexHealth: Health =
    capex.some((c) => c.riskLevel === "CRITICAL")
      ? "RED"
      : cStats.atRisk > 0
        ? "YELLOW"
        : "GREEN";

  const payment: Health =
    payStats.onHoldCount > 0
      ? "RED"
      : payStats.pendingApprovalCount > 0
        ? "YELLOW"
        : "GREEN";

  const upcomingMilestones = sortBy(
    milestones.filter((m) => !["COMPLETED", "CANCELLED"].includes(m.status)),
    (m) => m.plannedDate,
  ).slice(0, 5);

  const topRisks = sortBy(
    risks.filter((r) => r.status !== "CLOSED"),
    (r) => r.likelihood * r.impact,
    "desc",
  ).slice(0, 5);

  const topOverdueActions = sortBy(
    actions.filter(
      (a) => a.status === "OVERDUE" || isOverdue(a.dueDate, a.status),
    ),
    (a) => a.dueDate,
  ).slice(0, 5);

  return {
    health: worst(
      project.health,
      risk,
      milestone,
      capexHealth,
      payment,
      procurementHealth,
    ),
    kpis: {
      overallProgress: project.overallProgress,
      designProgress: project.designProgress,
      procurementProgress: project.procurementProgress,
      constructionProgress: project.constructionProgress,
      safetyScore: safetySummary.safetyScore,
      openRisks: rStats.open,
      overdueActions: aStats.overdue,
      pendingApprovals:
        sStats.underReview + payStats.pendingApprovalCount + pStats.pendingApproval,
      pendingDaSubmissions: sStats.awaitingDaRevision,
      pendingOwnerReviews: sStats.pendingOwnerReview,
    },
    statuses: {
      safety,
      risk,
      milestone,
      procurement: procurementHealth,
      capex: capexHealth,
      payment,
    },
    upcomingMilestones,
    topRisks,
    topOverdueActions,
    attentionItems: sortBy(
      attention.filter((a) => a.status !== "DECIDED"),
      (a) => a.requestedDecisionDate,
    ),
  };
}
