import type { Permission, Role } from "@/lib/rbac";

/* ------------------------------------------------------------------ */
/* Shared vocabulary                                                   */
/* ------------------------------------------------------------------ */

/** Traffic light used across every executive view. */
export type Health = "GREEN" | "YELLOW" | "RED";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type Company =
  | "QNITY"
  | "SYME072"
  | "Design Alternative"
  | "Vendor"
  | "Other";

export type UserStatus = "ACTIVE" | "PENDING" | "DISABLED";

/* ------------------------------------------------------------------ */
/* Users & access                                                      */
/* ------------------------------------------------------------------ */

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  company: Company;
  jobTitle: string;
  status: UserStatus;
  isExternal: boolean;
  grants: Permission[];
  denials: Permission[];
  createdAt: string;
  lastLoginAt: string | null;
  avatarColor: string;
}

export interface AccessRequest {
  id: string;
  name: string;
  email: string;
  company: string;
  requestedRole: Role;
  justification: string;
  requestedAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  decidedBy: string | null;
  decidedAt: string | null;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorEmail: string;
  action:
    | "LOGIN"
    | "LOGOUT"
    | "CREATE"
    | "UPDATE"
    | "DELETE"
    | "APPROVE"
    | "REJECT"
    | "UPLOAD"
    | "DOWNLOAD"
    | "PERMISSION_CHANGE"
    | "ACCESS_DENIED";
  entity: string;
  entityId: string;
  summary: string;
  ipAddress: string;
}

/* ------------------------------------------------------------------ */
/* Project                                                             */
/* ------------------------------------------------------------------ */

export interface Project {
  id: string;
  name: string;
  code: string;
  location: string;
  owner: string;
  administrator: string;
  consultant: string;
  contractor: string;
  objective: string;
  scopeSummary: string[];
  stakeholders: { name: string; role: string; company: Company }[];
  startDate: string;
  targetCompletionDate: string;
  targetHandoverDate: string;
  currentPhase: string;
  status: string;
  health: Health;
  overallProgress: number;
  designProgress: number;
  procurementProgress: number;
  constructionProgress: number;
  safetyScore: number;
  contractValue: number;
  currency: string;
}

export type PhaseStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "DELAYED"
  | "AT_RISK";

/**
 * A schedule link between two phases, expressed as finish-to-start with a
 * lag. A negative lag is an overlap — which is how the CSL phases actually
 * run (construction starts before design is fully issued). Lags are set so
 * the network reproduces the approved baseline exactly, which is what lets
 * the critical path calculation be trusted.
 */
export interface PhaseDependency {
  phaseId: string;
  lagDays: number;
  /** Why the phases are linked — shown on the critical path panel. */
  note: string;
}

export interface ProjectPhase {
  id: string;
  sequence: number;
  name: string;
  plannedStart: string;
  plannedFinish: string;
  actualStart: string | null;
  actualFinish: string | null;
  status: PhaseStatus;
  progress: number;
  /**
   * Progress the approved baseline expects at the current data date.
   * Actual-versus-this is the schedule performance index, and it is the only
   * honest way to judge a phase whose planned curve is not linear.
   */
  plannedProgress: number;
  owner: string;
  keyDeliverables: string[];
  dependsOn: PhaseDependency[];
  delayReason: string | null;
  recoveryPlan: string | null;
}

/* ------------------------------------------------------------------ */
/* Milestones                                                          */
/* ------------------------------------------------------------------ */

export type MilestoneStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "DELAYED"
  | "AT_RISK"
  | "CANCELLED";

export interface Milestone {
  id: string;
  code: string;
  name: string;
  description: string;
  plannedDate: string;
  actualDate: string | null;
  /**
   * Date the project has formally committed to when it differs from the
   * baseline. Where this is null the forecast is derived from the slip of
   * the owning phase, so every open milestone still carries a forecast.
   */
  forecastDate: string | null;
  status: MilestoneStatus;
  owner: string;
  dependency: string | null;
  phase: string;
  remarks: string;
}

/* ------------------------------------------------------------------ */
/* Design                                                              */
/* ------------------------------------------------------------------ */

export type DesignReviewStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "COMMENTED"
  | "APPROVED"
  | "APPROVED_WITH_COMMENT"
  | "REJECTED";

export interface DesignPackage {
  id: string;
  documentName: string;
  packageType: string;
  discipline: string;
  revision: string;
  responsibleParty: Company;
  submittedDate: string | null;
  reviewStatus: DesignReviewStatus;
  ownerReviewComments: string;
  percentComplete: number;
  nextSubmissionDate: string | null;
  status: "ON_TRACK" | "WATCH" | "CRITICAL";
  pendingAction: string;
}

/* ------------------------------------------------------------------ */
/* Document submission tracker                                         */
/* ------------------------------------------------------------------ */

export type SubmissionStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "COMMENTED"
  | "REVISION_REQUIRED"
  | "APPROVED"
  | "APPROVED_WITH_COMMENT"
  | "REJECTED"
  | "SUPERSEDED";

export interface DocumentSubmission {
  id: string;
  code: string;
  title: string;
  documentType: string;
  submittedBy: Company;
  submittedDate: string;
  revision: string;
  status: SubmissionStatus;
  reviewer: string;
  reviewDueDate: string;
  reviewResult: string | null;
  commentStatus: "NONE" | "OPEN" | "CLOSED";
  approvalStatus: "PENDING" | "APPROVED" | "APPROVED_WITH_COMMENT" | "REJECTED";
  nextAction: string;
  responsiblePerson: string;
  attachmentUrl: string | null;
  versionHistory: {
    revision: string;
    date: string;
    status: SubmissionStatus;
    by: string;
    note: string;
  }[];
}

/* ------------------------------------------------------------------ */
/* Procurement                                                         */
/* ------------------------------------------------------------------ */

export const PROCUREMENT_STAGES = [
  "RFQ",
  "QUOTATION_RECEIVED",
  "TECHNICAL_REVIEW",
  "COMMERCIAL_REVIEW",
  "VENDOR_SELECTION",
  "PO_REQUEST",
  "PO_APPROVAL",
  "PO_ISSUED",
  "MANUFACTURING",
  "SHIPPING",
  "DELIVERY",
  "INSTALLATION",
  "COMMISSIONING",
] as const;

export type ProcurementStage = (typeof PROCUREMENT_STAGES)[number];

export interface ProcurementPackage {
  id: string;
  code: string;
  packageName: string;
  vendor: string | null;
  requester: string;
  buyer: string;
  budget: number;
  stage: ProcurementStage;
  poStatus: "NOT_STARTED" | "REQUESTED" | "PENDING_APPROVAL" | "ISSUED";
  poNumber: string | null;
  targetDeliveryDate: string;
  actualDeliveryDate: string | null;
  riskStatus: RiskLevel;
  remarks: string;
}

/* ------------------------------------------------------------------ */
/* CAPEX equipment                                                     */
/* ------------------------------------------------------------------ */

export type StageStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "DELAYED"
  | "NOT_APPLICABLE";

export interface CapexEquipment {
  id: string;
  code: string;
  name: string;
  category: string;
  vendor: string | null;
  budget: number;
  capexNumber: string;
  rfqStatus: StageStatus;
  technicalEvaluationStatus: StageStatus;
  commercialEvaluationStatus: StageStatus;
  poStatus: StageStatus;
  manufacturingStatus: StageStatus;
  shippingStatus: StageStatus;
  deliveryStatus: StageStatus;
  installationStatus: StageStatus;
  commissioningStatus: StageStatus;
  trainingStatus: StageStatus;
  owner: string;
  targetDeliveryDate: string;
  actualDeliveryDate: string | null;
  leadTimeWeeks: number;
  isLongLead: boolean;
  riskLevel: RiskLevel;
  remarks: string;
}

/* ------------------------------------------------------------------ */
/* Payment milestones                                                  */
/* ------------------------------------------------------------------ */

export type PaymentStatus =
  | "NOT_DUE"
  | "PENDING_SUBMISSION"
  | "SUBMITTED"
  | "UNDER_VERIFICATION"
  | "APPROVED"
  | "HOLD"
  | "PAID"
  | "REJECTED";

export interface PaymentChecklistItem {
  label: string;
  complete: boolean;
}

export interface PaymentMilestone {
  id: string;
  code: string;
  description: string;
  percentage: number;
  amount: number;
  linkedDeliverable: string;
  requiredEvidence: string[];
  requiredApproval: string;
  status: PaymentStatus;
  submittedDate: string | null;
  verifiedBy: string | null;
  approvedBy: string | null;
  readiness: number;
  checklist: PaymentChecklistItem[];
  remarks: string;
}

/* ------------------------------------------------------------------ */
/* Risk                                                                */
/* ------------------------------------------------------------------ */

export type RiskCategory =
  | "Schedule"
  | "Design"
  | "Procurement"
  | "Safety"
  | "Budget"
  | "Contractor performance"
  | "Equipment delivery"
  | "Compliance"
  | "Permit"
  | "Utility readiness";

export interface Risk {
  id: string;
  code: string;
  description: string;
  category: RiskCategory;
  owner: string;
  likelihood: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  level: RiskLevel;
  mitigationPlan: string;
  dueDate: string;
  status: "OPEN" | "MITIGATING" | "CLOSED" | "ESCALATED";
  escalationRequired: boolean;
  remarks: string;
}

/* ------------------------------------------------------------------ */
/* Safety                                                              */
/* ------------------------------------------------------------------ */

export type SafetyCategory =
  | "LTI"
  | "NEAR_MISS"
  | "FIRST_AID"
  | "OBSERVATION"
  | "INSPECTION"
  | "TOOLBOX_TALK"
  | "PERMIT_TO_WORK";

export interface SafetyReport {
  id: string;
  code: string;
  date: string;
  reportedBy: string;
  description: string;
  category: SafetyCategory;
  severity: "LOW" | "MEDIUM" | "HIGH";
  correctiveAction: string;
  owner: string;
  dueDate: string;
  status: "OPEN" | "IN_PROGRESS" | "CLOSED" | "OVERDUE";
  evidenceUrl: string | null;
}

export interface SafetyMonthlyStat {
  month: string;
  lti: number;
  nearMiss: number;
  firstAid: number;
  observations: number;
  toolboxTalks: number;
  manhours: number;
  safetyScore: number;
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

export type ActionStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "OVERDUE"
  | "CANCELLED";

export interface ActionItem {
  id: string;
  code: string;
  description: string;
  owner: string;
  company: Company;
  dueDate: string;
  priority: Priority;
  status: ActionStatus;
  sourceMeeting: string;
  relatedDocument: string | null;
  comment: string;
  lastUpdated: string;
}

/* ------------------------------------------------------------------ */
/* Owner attention                                                     */
/* ------------------------------------------------------------------ */

export type AttentionCategory =
  | "Contract approval"
  | "Budget approval"
  | "Payment milestone approval"
  | "Design approval"
  | "Safety decision"
  | "Procurement decision"
  | "Schedule recovery decision"
  | "Contractor performance issue"
  | "Change request"
  | "Long lead equipment issue";

export interface OwnerAttentionItem {
  id: string;
  code: string;
  topic: string;
  description: string;
  category: AttentionCategory;
  escalationReason: string;
  requiredDecision: string;
  recommendedAction: string;
  decisionOwner: string;
  requestedDecisionDate: string;
  impactIfDelayed: string;
  relatedRisk: string | null;
  relatedMilestone: string | null;
  status: "OPEN" | "IN_REVIEW" | "DECIDED" | "OVERDUE";
  urgency: Health;
  remarks: string;
}

/* ------------------------------------------------------------------ */
/* Gallery & documents                                                 */
/* ------------------------------------------------------------------ */

export interface GalleryPhoto {
  id: string;
  title: string;
  date: string;
  category: string;
  uploadedBy: string;
  description: string;
  location: string;
  tags: string[];
  /** Deterministic gradient seed used by the placeholder renderer. */
  seed: number;
}

export interface DocumentFolder {
  code: string;
  name: string;
}

export interface DocumentRecord {
  id: string;
  name: string;
  folder: string;
  category: string;
  revision: string;
  uploadedBy: string;
  uploadedAt: string;
  sizeKb: number;
  fileType: string;
  approvalStatus: "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "SUPERSEDED" | "REJECTED";
  isLatest: boolean;
  restrictedTo: Role[] | null;
  url: string | null;
  versions: { revision: string; uploadedAt: string; uploadedBy: string }[];
}

/* ------------------------------------------------------------------ */
/* Weekly report                                                       */
/* ------------------------------------------------------------------ */

export interface WeeklyReport {
  id: string;
  weekNumber: number;
  periodStart: string;
  periodEnd: string;
  publishedAt: string;
  preparedBy: string;
  overallStatus: Health;
  overallProgress: number;
  currentPhase: string;
  keyAchievements: string[];
  activitiesCompleted: string[];
  safetySummary: string;
  procurementSummary: string;
  capexSummary: string;
  topRisks: string[];
  openIssues: string[];
  managementAttention: string[];
  upcomingMilestones: string[];
  nextWeekFocus: string[];
  highlights: string[];
}
