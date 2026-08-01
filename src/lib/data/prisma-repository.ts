/**
 * Prisma-backed repository
 * ========================
 *
 * Maps the PostgreSQL models onto exactly the same domain shapes the mock
 * dataset returns, so pages are identical in both modes. Loaded lazily by
 * `lib/data/index.ts` only when DATA_SOURCE=prisma.
 */

import { prisma } from "@/lib/db";
import type { Permission, Role } from "@/lib/rbac";
import type {
  AccessRequest,
  ActionItem,
  AuditLog,
  CapexEquipment,
  Company,
  DesignPackage,
  DocumentRecord,
  DocumentSubmission,
  GalleryPhoto,
  Milestone,
  OwnerAttentionItem,
  PaymentMilestone,
  ProcurementPackage,
  Project,
  ProjectPhase,
  Risk,
  SafetyReport,
  User,
  WeeklyReport,
} from "@/lib/types";

/** `2026-08-01T00:00:00Z` -> `2026-08-01` */
const d = (value: Date | null | undefined): string | null =>
  value ? value.toISOString().slice(0, 10) : null;

const dReq = (value: Date): string => value.toISOString().slice(0, 10);

const num = (value: unknown): number => Number(value ?? 0);

async function currentProject() {
  const project = await prisma.project.findFirst({
    orderBy: { createdAt: "asc" },
    include: { stakeholders: true },
  });
  if (!project) throw new Error("No project row found — run `npm run seed`.");
  return project;
}

export const repository = {
  async getProject(): Promise<Project> {
    const p = await currentProject();
    return {
      id: p.id,
      name: p.name,
      code: p.code,
      location: p.location,
      owner: p.owner,
      administrator: p.administrator,
      consultant: p.consultant,
      contractor: p.contractor,
      objective: p.objective,
      scopeSummary: p.scopeSummary,
      stakeholders: p.stakeholders.map((s) => ({
        name: s.name,
        role: s.role,
        company: s.company as Company,
      })),
      startDate: dReq(p.startDate),
      targetCompletionDate: dReq(p.targetCompletionDate),
      targetHandoverDate: dReq(p.targetHandoverDate),
      currentPhase: p.currentPhase,
      status: p.status,
      health: p.health,
      overallProgress: p.overallProgress,
      designProgress: p.designProgress,
      procurementProgress: p.procurementProgress,
      constructionProgress: p.constructionProgress,
      safetyScore: p.safetyScore,
      contractValue: num(p.contractValue),
      currency: p.currency,
    };
  },

  async getPhases(): Promise<ProjectPhase[]> {
    const rows = await prisma.projectPhase.findMany({
      orderBy: { sequence: "asc" },
      include: { dependsOn: true },
    });
    return rows.map((r) => ({
      id: r.id,
      sequence: r.sequence,
      name: r.name,
      plannedStart: dReq(r.plannedStart),
      plannedFinish: dReq(r.plannedFinish),
      actualStart: d(r.actualStart),
      actualFinish: d(r.actualFinish),
      status: r.status,
      progress: r.progress,
      plannedProgress: r.plannedProgress,
      owner: r.owner,
      keyDeliverables: r.keyDeliverables,
      dependsOn: r.dependsOn.map((d) => ({
        phaseId: d.predecessorId,
        lagDays: d.lagDays,
        note: d.note,
      })),
      delayReason: r.delayReason,
      recoveryPlan: r.recoveryPlan,
    }));
  },

  async getMilestones(): Promise<Milestone[]> {
    const rows = await prisma.milestone.findMany({
      orderBy: { plannedDate: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      plannedDate: dReq(r.plannedDate),
      actualDate: d(r.actualDate),
      forecastDate: d(r.forecastDate),
      status: r.status,
      owner: r.owner,
      dependency: r.dependency,
      phase: r.phase,
      remarks: r.remarks,
    }));
  },

  async getDesignPackages(): Promise<DesignPackage[]> {
    const rows = await prisma.designPackage.findMany({
      orderBy: { documentName: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      documentName: r.documentName,
      packageType: r.packageType,
      discipline: r.discipline,
      revision: r.revision,
      responsibleParty: r.responsibleParty as Company,
      submittedDate: d(r.submittedDate),
      reviewStatus: r.reviewStatus,
      ownerReviewComments: r.ownerReviewComments,
      percentComplete: r.percentComplete,
      nextSubmissionDate: d(r.nextSubmissionDate),
      status: r.status as DesignPackage["status"],
      pendingAction: r.pendingAction,
    }));
  },

  async getSubmissions(): Promise<DocumentSubmission[]> {
    const rows = await prisma.documentSubmission.findMany({
      orderBy: { submittedDate: "desc" },
      include: { versions: { orderBy: { date: "asc" } } },
    });
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      title: r.title,
      documentType: r.documentType,
      submittedBy: r.submittedBy as Company,
      submittedDate: dReq(r.submittedDate),
      revision: r.revision,
      status: r.status,
      reviewer: r.reviewer,
      reviewDueDate: dReq(r.reviewDueDate),
      reviewResult: r.reviewResult,
      commentStatus: r.commentStatus as DocumentSubmission["commentStatus"],
      approvalStatus: r.approvalStatus,
      nextAction: r.nextAction,
      responsiblePerson: r.responsiblePerson,
      attachmentUrl: r.attachmentUrl,
      versionHistory: r.versions.map((v) => ({
        revision: v.revision,
        date: dReq(v.date),
        status: v.status,
        by: v.by,
        note: v.note,
      })),
    }));
  },

  async getProcurement(): Promise<ProcurementPackage[]> {
    const rows = await prisma.procurementPackage.findMany({
      orderBy: { code: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      packageName: r.packageName,
      vendor: r.vendor,
      requester: r.requester,
      buyer: r.buyer,
      budget: num(r.budget),
      stage: r.stage,
      poStatus: r.poStatus,
      poNumber: r.poNumber,
      targetDeliveryDate: dReq(r.targetDeliveryDate),
      actualDeliveryDate: d(r.actualDeliveryDate),
      riskStatus: r.riskStatus,
      remarks: r.remarks,
    }));
  },

  async getCapex(): Promise<CapexEquipment[]> {
    const rows = await prisma.capexEquipment.findMany({
      orderBy: { code: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      category: r.category,
      vendor: r.vendor,
      budget: num(r.budget),
      capexNumber: r.capexNumber,
      rfqStatus: r.rfqStatus,
      technicalEvaluationStatus: r.technicalEvaluationStatus,
      commercialEvaluationStatus: r.commercialEvaluationStatus,
      poStatus: r.poStatus,
      manufacturingStatus: r.manufacturingStatus,
      shippingStatus: r.shippingStatus,
      deliveryStatus: r.deliveryStatus,
      installationStatus: r.installationStatus,
      commissioningStatus: r.commissioningStatus,
      trainingStatus: r.trainingStatus,
      owner: r.owner,
      targetDeliveryDate: dReq(r.targetDeliveryDate),
      actualDeliveryDate: d(r.actualDeliveryDate),
      leadTimeWeeks: r.leadTimeWeeks,
      isLongLead: r.isLongLead,
      riskLevel: r.riskLevel,
      remarks: r.remarks,
    }));
  },

  async getPayments(): Promise<PaymentMilestone[]> {
    const rows = await prisma.paymentMilestone.findMany({
      orderBy: { code: "asc" },
      include: { checklist: { orderBy: { sequence: "asc" } } },
    });
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      description: r.description,
      percentage: r.percentage,
      amount: num(r.amount),
      linkedDeliverable: r.linkedDeliverable,
      requiredEvidence: r.requiredEvidence,
      requiredApproval: r.requiredApproval,
      status: r.status,
      submittedDate: d(r.submittedDate),
      verifiedBy: r.verifiedBy,
      approvedBy: r.approvedBy,
      readiness: r.readiness,
      checklist: r.checklist.map((c) => ({
        label: c.label,
        complete: c.complete,
      })),
      remarks: r.remarks,
    }));
  },

  async getRisks(): Promise<Risk[]> {
    const rows = await prisma.risk.findMany({ orderBy: { code: "asc" } });
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      description: r.description,
      category: r.category as Risk["category"],
      owner: r.owner,
      likelihood: r.likelihood as Risk["likelihood"],
      impact: r.impact as Risk["impact"],
      level: r.level,
      mitigationPlan: r.mitigationPlan,
      dueDate: dReq(r.dueDate),
      status: r.status,
      escalationRequired: r.escalationRequired,
      remarks: r.remarks,
    }));
  },

  async getSafetyReports(): Promise<SafetyReport[]> {
    const rows = await prisma.safetyReport.findMany({
      orderBy: { date: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      date: dReq(r.date),
      reportedBy: r.reportedBy,
      description: r.description,
      category: r.category,
      severity: r.severity as SafetyReport["severity"],
      correctiveAction: r.correctiveAction,
      owner: r.owner,
      dueDate: dReq(r.dueDate),
      status: r.status,
      evidenceUrl: r.evidenceUrl,
    }));
  },

  async getActions(): Promise<ActionItem[]> {
    const rows = await prisma.actionItem.findMany({
      orderBy: { dueDate: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      description: r.description,
      owner: r.owner,
      company: r.company as Company,
      dueDate: dReq(r.dueDate),
      priority: r.priority,
      status: r.status,
      sourceMeeting: r.sourceMeeting,
      relatedDocument: r.relatedDocument,
      comment: r.comment,
      lastUpdated: dReq(r.updatedAt),
    }));
  },

  async getAttentionItems(): Promise<OwnerAttentionItem[]> {
    const rows = await prisma.ownerAttentionItem.findMany({
      orderBy: { requestedDecisionDate: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      topic: r.topic,
      description: r.description,
      category: r.category as OwnerAttentionItem["category"],
      escalationReason: r.escalationReason,
      requiredDecision: r.requiredDecision,
      recommendedAction: r.recommendedAction,
      decisionOwner: r.decisionOwner,
      requestedDecisionDate: dReq(r.requestedDecisionDate),
      impactIfDelayed: r.impactIfDelayed,
      relatedRisk: r.relatedRisk,
      relatedMilestone: r.relatedMilestone,
      status: r.status,
      urgency: r.urgency,
      remarks: r.remarks,
    }));
  },

  async getGallery(): Promise<GalleryPhoto[]> {
    const rows = await prisma.galleryPhoto.findMany({
      orderBy: { date: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      date: dReq(r.date),
      category: r.category,
      uploadedBy: r.uploadedByName,
      description: r.description,
      location: r.location,
      tags: r.tags,
      seed: r.seed,
    }));
  },

  async getDocuments(): Promise<DocumentRecord[]> {
    const rows = await prisma.document.findMany({
      orderBy: { uploadedAt: "desc" },
      include: { versions: { orderBy: { uploadedAt: "asc" } } },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      folder: r.folder,
      category: r.category,
      revision: r.revision,
      uploadedBy: r.uploadedByName,
      uploadedAt: dReq(r.uploadedAt),
      sizeKb: r.sizeKb,
      fileType: r.fileType,
      approvalStatus: r.approvalStatus,
      isLatest: r.isLatest,
      restrictedTo: r.restrictedTo.length ? (r.restrictedTo as Role[]) : null,
      url: r.url,
      versions: r.versions.map((v) => ({
        revision: v.revision,
        uploadedAt: dReq(v.uploadedAt),
        uploadedBy: v.uploadedBy,
      })),
    }));
  },

  async getWeeklyReports(): Promise<WeeklyReport[]> {
    const rows = await prisma.weeklyReport.findMany({
      orderBy: { weekNumber: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      weekNumber: r.weekNumber,
      periodStart: dReq(r.periodStart),
      periodEnd: dReq(r.periodEnd),
      publishedAt: dReq(r.publishedAt),
      preparedBy: r.preparedBy,
      overallStatus: r.overallStatus,
      overallProgress: r.overallProgress,
      currentPhase: r.currentPhase,
      keyAchievements: r.keyAchievements,
      activitiesCompleted: r.activitiesCompleted,
      safetySummary: r.safetySummary,
      procurementSummary: r.procurementSummary,
      capexSummary: r.capexSummary,
      topRisks: r.topRisks,
      openIssues: r.openIssues,
      managementAttention: r.managementAttention,
      upcomingMilestones: r.upcomingMilestones,
      nextWeekFocus: r.nextWeekFocus,
      highlights: r.highlights,
    }));
  },

  async getUsers(): Promise<User[]> {
    const rows = await prisma.user.findMany({ orderBy: { name: "asc" } });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role,
      company: r.company as Company,
      jobTitle: r.jobTitle,
      status: r.status,
      isExternal: r.isExternal,
      grants: r.grants as Permission[],
      denials: r.denials as Permission[],
      createdAt: r.createdAt.toISOString(),
      lastLoginAt: r.lastLoginAt ? r.lastLoginAt.toISOString() : null,
      avatarColor: r.avatarColor,
    }));
  },

  async getAccessRequests(): Promise<AccessRequest[]> {
    const rows = await prisma.accessRequest.findMany({
      orderBy: { requestedAt: "desc" },
      include: { decidedBy: true },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      company: r.company,
      requestedRole: r.requestedRole,
      justification: r.justification,
      requestedAt: r.requestedAt.toISOString(),
      status: r.status,
      decidedBy: r.decidedBy?.name ?? null,
      decidedAt: r.decidedAt ? r.decidedAt.toISOString() : null,
    }));
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    const rows = await prisma.auditLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 500,
    });
    return rows.map((r) => ({
      id: r.id,
      timestamp: r.timestamp.toISOString(),
      actorName: r.actorName,
      actorEmail: r.actorEmail,
      action: r.action,
      entity: r.entity,
      entityId: r.entityId,
      summary: r.summary,
      ipAddress: r.ipAddress,
    }));
  },
};
