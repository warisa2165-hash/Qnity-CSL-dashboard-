-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'LEADERSHIP', 'PROJECT_TEAM', 'CONSULTANT', 'CONTRACTOR');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'PENDING', 'DISABLED');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'UPLOAD', 'DOWNLOAD', 'PERMISSION_CHANGE', 'ACCESS_DENIED');

-- CreateEnum
CREATE TYPE "Health" AS ENUM ('GREEN', 'YELLOW', 'RED');

-- CreateEnum
CREATE TYPE "PhaseStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'AT_RISK');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'AT_RISK', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DesignReviewStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'COMMENTED', 'APPROVED', 'APPROVED_WITH_COMMENT', 'REJECTED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'COMMENTED', 'REVISION_REQUIRED', 'APPROVED', 'APPROVED_WITH_COMMENT', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'APPROVED_WITH_COMMENT', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProcurementStage" AS ENUM ('RFQ', 'QUOTATION_RECEIVED', 'TECHNICAL_REVIEW', 'COMMERCIAL_REVIEW', 'VENDOR_SELECTION', 'PO_REQUEST', 'PO_APPROVAL', 'PO_ISSUED', 'MANUFACTURING', 'SHIPPING', 'DELIVERY', 'INSTALLATION', 'COMMISSIONING');

-- CreateEnum
CREATE TYPE "PoStatus" AS ENUM ('NOT_STARTED', 'REQUESTED', 'PENDING_APPROVAL', 'ISSUED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "StageStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('NOT_DUE', 'PENDING_SUBMISSION', 'SUBMITTED', 'UNDER_VERIFICATION', 'APPROVED', 'HOLD', 'PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "RiskStatus" AS ENUM ('OPEN', 'MITIGATING', 'CLOSED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "SafetyCategory" AS ENUM ('LTI', 'NEAR_MISS', 'FIRST_AID', 'OBSERVATION', 'INSPECTION', 'TOOLBOX_TALK', 'PERMIT_TO_WORK');

-- CreateEnum
CREATE TYPE "SafetyStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AttentionStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'DECIDED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "DocApprovalStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'SUPERSEDED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "entraOid" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'LEADERSHIP',
    "company" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL DEFAULT '',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "isExternal" BOOLEAN NOT NULL DEFAULT false,
    "avatarColor" TEXT NOT NULL DEFAULT '#0078D4',
    "grants" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "denials" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT NOT NULL DEFAULT '',
    "userAgent" TEXT NOT NULL DEFAULT '',
    "provider" TEXT NOT NULL DEFAULT 'microsoft-entra-id',
    "succeeded" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LoginEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "requestedRole" "Role" NOT NULL DEFAULT 'LEADERSHIP',
    "justification" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,

    CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "administrator" TEXT NOT NULL,
    "consultant" TEXT NOT NULL,
    "contractor" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "scopeSummary" TEXT[],
    "startDate" TIMESTAMP(3) NOT NULL,
    "targetCompletionDate" TIMESTAMP(3) NOT NULL,
    "targetHandoverDate" TIMESTAMP(3) NOT NULL,
    "currentPhase" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "health" "Health" NOT NULL DEFAULT 'GREEN',
    "overallProgress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "designProgress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "procurementProgress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "constructionProgress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "safetyScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "contractValue" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stakeholder" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "company" TEXT NOT NULL,

    CONSTRAINT "Stakeholder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressPoint" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "planned" DOUBLE PRECISION NOT NULL,
    "actual" DOUBLE PRECISION,

    CONSTRAINT "ProgressPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectPhase" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "plannedStart" TIMESTAMP(3) NOT NULL,
    "plannedFinish" TIMESTAMP(3) NOT NULL,
    "actualStart" TIMESTAMP(3),
    "actualFinish" TIMESTAMP(3),
    "status" "PhaseStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "plannedProgress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "owner" TEXT NOT NULL,
    "keyDeliverables" TEXT[],
    "delayReason" TEXT,
    "recoveryPlan" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhaseDependency" (
    "id" TEXT NOT NULL,
    "successorId" TEXT NOT NULL,
    "predecessorId" TEXT NOT NULL,
    "lagDays" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "PhaseDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "plannedDate" TIMESTAMP(3) NOT NULL,
    "actualDate" TIMESTAMP(3),
    "forecastDate" TIMESTAMP(3),
    "status" "MilestoneStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "owner" TEXT NOT NULL,
    "dependency" TEXT,
    "phase" TEXT NOT NULL,
    "remarks" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignPackage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "packageType" TEXT NOT NULL,
    "discipline" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    "responsibleParty" TEXT NOT NULL,
    "submittedDate" TIMESTAMP(3),
    "reviewStatus" "DesignReviewStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "ownerReviewComments" TEXT NOT NULL DEFAULT '',
    "percentComplete" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nextSubmissionDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ON_TRACK',
    "pendingAction" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentSubmission" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "submittedDate" TIMESTAMP(3) NOT NULL,
    "revision" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewer" TEXT NOT NULL,
    "reviewDueDate" TIMESTAMP(3) NOT NULL,
    "reviewResult" TEXT,
    "commentStatus" TEXT NOT NULL DEFAULT 'NONE',
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "nextAction" TEXT NOT NULL DEFAULT '',
    "responsiblePerson" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionVersion" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "SubmissionStatus" NOT NULL,
    "by" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "SubmissionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementPackage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "vendor" TEXT,
    "requester" TEXT NOT NULL,
    "buyer" TEXT NOT NULL,
    "budget" DECIMAL(14,2) NOT NULL,
    "stage" "ProcurementStage" NOT NULL DEFAULT 'RFQ',
    "poStatus" "PoStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "poNumber" TEXT,
    "targetDeliveryDate" TIMESTAMP(3) NOT NULL,
    "actualDeliveryDate" TIMESTAMP(3),
    "riskStatus" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "remarks" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcurementPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapexEquipment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "vendor" TEXT,
    "budget" DECIMAL(14,2) NOT NULL,
    "capexNumber" TEXT NOT NULL,
    "rfqStatus" "StageStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "technicalEvaluationStatus" "StageStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "commercialEvaluationStatus" "StageStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "poStatus" "StageStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "manufacturingStatus" "StageStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "shippingStatus" "StageStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "deliveryStatus" "StageStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "installationStatus" "StageStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "commissioningStatus" "StageStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "trainingStatus" "StageStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "owner" TEXT NOT NULL,
    "targetDeliveryDate" TIMESTAMP(3) NOT NULL,
    "actualDeliveryDate" TIMESTAMP(3),
    "leadTimeWeeks" INTEGER NOT NULL DEFAULT 0,
    "isLongLead" BOOLEAN NOT NULL DEFAULT false,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "remarks" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapexEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "linkedDeliverable" TEXT NOT NULL,
    "requiredEvidence" TEXT[],
    "requiredApproval" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'NOT_DUE',
    "submittedDate" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "approvedBy" TEXT,
    "readiness" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remarks" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentChecklistItem" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "complete" BOOLEAN NOT NULL DEFAULT false,
    "sequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PaymentChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Risk" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "likelihood" INTEGER NOT NULL,
    "impact" INTEGER NOT NULL,
    "level" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "mitigationPlan" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "RiskStatus" NOT NULL DEFAULT 'OPEN',
    "escalationRequired" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Risk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyReport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reportedBy" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "SafetyCategory" NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'LOW',
    "correctiveAction" TEXT NOT NULL DEFAULT '',
    "owner" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "SafetyStatus" NOT NULL DEFAULT 'OPEN',
    "evidenceUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyMonthlyStat" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "lti" INTEGER NOT NULL DEFAULT 0,
    "nearMiss" INTEGER NOT NULL DEFAULT 0,
    "firstAid" INTEGER NOT NULL DEFAULT 0,
    "observations" INTEGER NOT NULL DEFAULT 0,
    "toolboxTalks" INTEGER NOT NULL DEFAULT 0,
    "manhours" INTEGER NOT NULL DEFAULT 0,
    "safetyScore" DOUBLE PRECISION NOT NULL DEFAULT 100,

    CONSTRAINT "SafetyMonthlyStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "ActionStatus" NOT NULL DEFAULT 'OPEN',
    "sourceMeeting" TEXT NOT NULL DEFAULT '',
    "relatedDocument" TEXT,
    "comment" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerAttentionItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "escalationReason" TEXT NOT NULL,
    "requiredDecision" TEXT NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "decisionOwner" TEXT NOT NULL,
    "requestedDecisionDate" TIMESTAMP(3) NOT NULL,
    "impactIfDelayed" TEXT NOT NULL,
    "relatedRisk" TEXT,
    "relatedMilestone" TEXT,
    "status" "AttentionStatus" NOT NULL DEFAULT 'OPEN',
    "urgency" "Health" NOT NULL DEFAULT 'YELLOW',
    "remarks" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerAttentionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    "uploadedById" TEXT,
    "uploadedByName" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sizeKb" INTEGER NOT NULL DEFAULT 0,
    "fileType" TEXT NOT NULL DEFAULT 'PDF',
    "approvalStatus" "DocApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "restrictedTo" "Role"[] DEFAULT ARRAY[]::"Role"[],
    "url" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL,
    "url" TEXT,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryPhoto" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "uploadedById" TEXT,
    "uploadedByName" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[],
    "url" TEXT,
    "seed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GalleryPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyReport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "preparedBy" TEXT NOT NULL,
    "overallStatus" "Health" NOT NULL DEFAULT 'GREEN',
    "overallProgress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentPhase" TEXT NOT NULL,
    "keyAchievements" TEXT[],
    "activitiesCompleted" TEXT[],
    "safetySummary" TEXT NOT NULL DEFAULT '',
    "procurementSummary" TEXT NOT NULL DEFAULT '',
    "capexSummary" TEXT NOT NULL DEFAULT '',
    "topRisks" TEXT[],
    "openIssues" TEXT[],
    "managementAttention" TEXT[],
    "upcomingMilestones" TEXT[],
    "nextWeekFocus" TEXT[],
    "highlights" TEXT[],

    CONSTRAINT "WeeklyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_entraOid_key" ON "User"("entraOid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "LoginEvent_userId_timestamp_idx" ON "LoginEvent"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "AccessRequest_status_requestedAt_idx" ON "AccessRequest"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_code_key" ON "Project"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressPoint_projectId_sequence_key" ON "ProgressPoint"("projectId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPhase_projectId_sequence_key" ON "ProjectPhase"("projectId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "PhaseDependency_successorId_predecessorId_key" ON "PhaseDependency"("successorId", "predecessorId");

-- CreateIndex
CREATE INDEX "Milestone_status_plannedDate_idx" ON "Milestone"("status", "plannedDate");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_projectId_code_key" ON "Milestone"("projectId", "code");

-- CreateIndex
CREATE INDEX "DesignPackage_projectId_discipline_idx" ON "DesignPackage"("projectId", "discipline");

-- CreateIndex
CREATE INDEX "DocumentSubmission_status_reviewDueDate_idx" ON "DocumentSubmission"("status", "reviewDueDate");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentSubmission_projectId_code_key" ON "DocumentSubmission"("projectId", "code");

-- CreateIndex
CREATE INDEX "SubmissionVersion_submissionId_date_idx" ON "SubmissionVersion"("submissionId", "date");

-- CreateIndex
CREATE INDEX "ProcurementPackage_stage_idx" ON "ProcurementPackage"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "ProcurementPackage_projectId_code_key" ON "ProcurementPackage"("projectId", "code");

-- CreateIndex
CREATE INDEX "CapexEquipment_riskLevel_idx" ON "CapexEquipment"("riskLevel");

-- CreateIndex
CREATE UNIQUE INDEX "CapexEquipment_projectId_code_key" ON "CapexEquipment"("projectId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMilestone_projectId_code_key" ON "PaymentMilestone"("projectId", "code");

-- CreateIndex
CREATE INDEX "Risk_level_status_idx" ON "Risk"("level", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Risk_projectId_code_key" ON "Risk"("projectId", "code");

-- CreateIndex
CREATE INDEX "SafetyReport_date_idx" ON "SafetyReport"("date");

-- CreateIndex
CREATE UNIQUE INDEX "SafetyReport_projectId_code_key" ON "SafetyReport"("projectId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "SafetyMonthlyStat_sequence_key" ON "SafetyMonthlyStat"("sequence");

-- CreateIndex
CREATE INDEX "ActionItem_status_dueDate_idx" ON "ActionItem"("status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "ActionItem_projectId_code_key" ON "ActionItem"("projectId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerAttentionItem_projectId_code_key" ON "OwnerAttentionItem"("projectId", "code");

-- CreateIndex
CREATE INDEX "Document_projectId_folder_idx" ON "Document"("projectId", "folder");

-- CreateIndex
CREATE INDEX "DocumentVersion_documentId_uploadedAt_idx" ON "DocumentVersion"("documentId", "uploadedAt");

-- CreateIndex
CREATE INDEX "GalleryPhoto_projectId_category_idx" ON "GalleryPhoto"("projectId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReport_projectId_weekNumber_key" ON "WeeklyReport"("projectId", "weekNumber");

-- AddForeignKey
ALTER TABLE "LoginEvent" ADD CONSTRAINT "LoginEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stakeholder" ADD CONSTRAINT "Stakeholder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressPoint" ADD CONSTRAINT "ProgressPoint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPhase" ADD CONSTRAINT "ProjectPhase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhaseDependency" ADD CONSTRAINT "PhaseDependency_successorId_fkey" FOREIGN KEY ("successorId") REFERENCES "ProjectPhase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhaseDependency" ADD CONSTRAINT "PhaseDependency_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "ProjectPhase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignPackage" ADD CONSTRAINT "DesignPackage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSubmission" ADD CONSTRAINT "DocumentSubmission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionVersion" ADD CONSTRAINT "SubmissionVersion_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "DocumentSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementPackage" ADD CONSTRAINT "ProcurementPackage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapexEquipment" ADD CONSTRAINT "CapexEquipment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMilestone" ADD CONSTRAINT "PaymentMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentChecklistItem" ADD CONSTRAINT "PaymentChecklistItem_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "PaymentMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyReport" ADD CONSTRAINT "SafetyReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerAttentionItem" ADD CONSTRAINT "OwnerAttentionItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryPhoto" ADD CONSTRAINT "GalleryPhoto_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryPhoto" ADD CONSTRAINT "GalleryPhoto_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyReport" ADD CONSTRAINT "WeeklyReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

