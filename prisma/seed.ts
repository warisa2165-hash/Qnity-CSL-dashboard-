/**
 * Seeds PostgreSQL with the QNITY CSL Laboratory Renovation 2026 baseline —
 * the same dataset the portal serves in mock mode.
 *
 *   npm run db:deploy     # create the schema first
 *   npm run seed          # load the baseline
 *
 * The script clears the project graph and the user table before writing, so
 * the seed is the single source of truth for the baseline. That makes it
 * repeatable during setup and catastrophic afterwards: once the portal has
 * carried a week of real edits, re-running it destroys them.
 *
 * So it refuses to run against a database that already holds data. Override
 * only when you genuinely mean to discard what is there:
 *
 *   npm run seed -- --force        (or SEED_FORCE=1 npm run seed)
 */

import { PrismaClient } from "@prisma/client";

import { users, accessRequests } from "../src/lib/data/mock/users";
import { project, phases, progressCurve } from "../src/lib/data/mock/project";
import { milestones } from "../src/lib/data/mock/milestones";
import { designPackages, designByDiscipline } from "../src/lib/data/mock/design";
import { submissions } from "../src/lib/data/mock/submissions";
import { procurementPackages } from "../src/lib/data/mock/procurement";
import { capexEquipment } from "../src/lib/data/mock/capex";
import { paymentMilestones } from "../src/lib/data/mock/payments";
import { risks } from "../src/lib/data/mock/risks";
import {
  safetyReports,
  safetyMonthly,
  safetySummary,
} from "../src/lib/data/mock/safety";
import { actionItems } from "../src/lib/data/mock/actions";
import { attentionItems } from "../src/lib/data/mock/attention";
import { galleryPhotos } from "../src/lib/data/mock/gallery";
import { documents } from "../src/lib/data/mock/documents";
import { weeklyReports } from "../src/lib/data/mock/weekly";
import { auditLogs } from "../src/lib/data/mock/audit";

const prisma = new PrismaClient();

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
const optionalDate = (value: string | null) => (value ? date(value) : null);

const forced =
  process.argv.includes("--force") || process.env.SEED_FORCE === "1";

/**
 * Refuse to overwrite a database that is already in use.
 *
 * The check counts the two things that only exist once somebody has set this
 * portal up: a project row and portal users. An empty database — the case the
 * documented setup covers — passes straight through.
 */
async function guardExistingData() {
  const [projects, users, audits] = await Promise.all([
    prisma.project.count(),
    prisma.user.count(),
    prisma.auditLog.count(),
  ]);

  if (projects === 0 && users === 0) return;

  if (!forced) {
    console.error(
      [
        "",
        "Refusing to seed: this database already holds data.",
        "",
        `  projects: ${projects}    users: ${users}    audit entries: ${audits}`,
        "",
        "Seeding deletes the whole project graph and every user, then rewrites",
        "the baseline. If this is the production database, that discards real",
        "project records and the audit trail that documents them.",
        "",
        "If you are sure, take a backup first:",
        "",
        '  pg_dump "$DIRECT_URL" --no-owner --format=custom --file=before-seed.dump',
        "",
        "then re-run with:",
        "",
        "  npm run seed -- --force",
        "",
      ].join("\n"),
    );
    process.exit(1);
  }

  console.warn(
    `⚠  --force: discarding ${projects} project(s), ${users} user(s) and ${audits} audit entries.`,
  );
}

async function main() {
  console.log("Seeding QNITY CSL Laboratory Renovation 2026 baseline…");
  await guardExistingData();

  /* ---------------------------------------------------------------- */
  /* Reset                                                             */
  /* ---------------------------------------------------------------- */
  await prisma.auditLog.deleteMany();
  await prisma.loginEvent.deleteMany();
  await prisma.accessRequest.deleteMany();
  await prisma.project.deleteMany(); // cascades to the whole project graph
  await prisma.safetyMonthlyStat.deleteMany();
  await prisma.user.deleteMany();

  /* ---------------------------------------------------------------- */
  /* Users                                                             */
  /* ---------------------------------------------------------------- */
  const userIdByEmail = new Map<string, string>();
  for (const u of users) {
    const created = await prisma.user.create({
      data: {
        email: u.email.toLowerCase(),
        name: u.name,
        role: u.role,
        company: u.company,
        jobTitle: u.jobTitle,
        status: u.status,
        isExternal: u.isExternal,
        avatarColor: u.avatarColor,
        grants: u.grants,
        denials: u.denials,
        createdAt: new Date(u.createdAt),
        lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt) : null,
      },
    });
    userIdByEmail.set(u.email.toLowerCase(), created.id);
  }
  console.log(`  ✓ ${users.length} users`);

  const adminId = userIdByEmail.get("warisa.kantifong@qnity.com") ?? null;

  for (const r of accessRequests) {
    await prisma.accessRequest.create({
      data: {
        name: r.name,
        email: r.email.toLowerCase(),
        company: r.company,
        requestedRole: r.requestedRole,
        justification: r.justification,
        status: r.status,
        requestedAt: new Date(r.requestedAt),
        decidedAt: r.decidedAt ? new Date(r.decidedAt) : null,
        decidedById: r.decidedBy ? adminId : null,
      },
    });
  }
  console.log(`  ✓ ${accessRequests.length} access requests`);

  /* ---------------------------------------------------------------- */
  /* Project                                                           */
  /* ---------------------------------------------------------------- */
  const created = await prisma.project.create({
    data: {
      code: project.code,
      name: project.name,
      location: project.location,
      owner: project.owner,
      administrator: project.administrator,
      consultant: project.consultant,
      contractor: project.contractor,
      objective: project.objective,
      scopeSummary: project.scopeSummary,
      startDate: date(project.startDate),
      targetCompletionDate: date(project.targetCompletionDate),
      targetHandoverDate: date(project.targetHandoverDate),
      currentPhase: project.currentPhase,
      status: project.status,
      health: project.health,
      overallProgress: project.overallProgress,
      designProgress: project.designProgress,
      procurementProgress: project.procurementProgress,
      constructionProgress: project.constructionProgress,
      safetyScore: project.safetyScore,
      contractValue: project.contractValue,
      currency: project.currency,
      stakeholders: {
        create: project.stakeholders.map((s) => ({
          name: s.name,
          role: s.role,
          company: s.company,
        })),
      },
      progressPoints: {
        create: progressCurve.map((p, i) => ({
          month: p.month,
          sequence: i,
          planned: p.planned,
          actual: p.actual,
        })),
      },
    },
  });
  const projectId = created.id;
  console.log(`  ✓ project ${project.code}`);

  /* ---------------------------------------------------------------- */
  /* Delivery                                                          */
  /* ---------------------------------------------------------------- */
  // Phases first, then the dependency links, so every predecessor exists.
  const phaseIdByMockId = new Map<string, string>();
  for (const p of phases) {
    const created = await prisma.projectPhase.create({
      data: {
        projectId,
        sequence: p.sequence,
        name: p.name,
        plannedStart: date(p.plannedStart),
        plannedFinish: date(p.plannedFinish),
        actualStart: optionalDate(p.actualStart),
        actualFinish: optionalDate(p.actualFinish),
        status: p.status,
        progress: p.progress,
        plannedProgress: p.plannedProgress,
        owner: p.owner,
        keyDeliverables: p.keyDeliverables,
        delayReason: p.delayReason,
        recoveryPlan: p.recoveryPlan,
      },
    });
    phaseIdByMockId.set(p.id, created.id);
  }

  let links = 0;
  for (const p of phases) {
    for (const dep of p.dependsOn) {
      const successorId = phaseIdByMockId.get(p.id);
      const predecessorId = phaseIdByMockId.get(dep.phaseId);
      if (!successorId || !predecessorId) continue;
      await prisma.phaseDependency.create({
        data: { successorId, predecessorId, lagDays: dep.lagDays, note: dep.note },
      });
      links += 1;
    }
  }
  console.log(`  ✓ ${phases.length} phases, ${links} schedule links`);

  await prisma.milestone.createMany({
    data: milestones.map((m) => ({
      projectId,
      code: m.code,
      name: m.name,
      description: m.description,
      plannedDate: date(m.plannedDate),
      actualDate: optionalDate(m.actualDate),
      forecastDate: optionalDate(m.forecastDate),
      status: m.status,
      owner: m.owner,
      dependency: m.dependency,
      phase: m.phase,
      remarks: m.remarks,
    })),
  });
  console.log(`  ✓ ${milestones.length} milestones`);

  await prisma.designPackage.createMany({
    data: designPackages.map((p) => ({
      projectId,
      documentName: p.documentName,
      packageType: p.packageType,
      discipline: p.discipline,
      revision: p.revision,
      responsibleParty: p.responsibleParty,
      submittedDate: optionalDate(p.submittedDate),
      reviewStatus: p.reviewStatus,
      ownerReviewComments: p.ownerReviewComments,
      percentComplete: p.percentComplete,
      nextSubmissionDate: optionalDate(p.nextSubmissionDate),
      status: p.status,
      pendingAction: p.pendingAction,
    })),
  });
  await prisma.designDisciplineStat.createMany({
    data: designByDiscipline.map((d, i) => ({
      projectId,
      discipline: d.discipline,
      sequence: i,
      planned: d.planned,
      actual: d.actual,
    })),
  });
  console.log(
    `  ✓ ${designPackages.length} design packages, ${designByDiscipline.length} discipline stats`,
  );

  for (const s of submissions) {
    await prisma.documentSubmission.create({
      data: {
        projectId,
        code: s.code,
        title: s.title,
        documentType: s.documentType,
        submittedBy: s.submittedBy,
        submittedDate: date(s.submittedDate),
        revision: s.revision,
        status: s.status,
        reviewer: s.reviewer,
        reviewDueDate: date(s.reviewDueDate),
        reviewResult: s.reviewResult,
        commentStatus: s.commentStatus,
        approvalStatus: s.approvalStatus,
        nextAction: s.nextAction,
        responsiblePerson: s.responsiblePerson,
        attachmentUrl: s.attachmentUrl,
        versions: {
          create: s.versionHistory.map((v) => ({
            revision: v.revision,
            date: date(v.date),
            status: v.status,
            by: v.by,
            note: v.note,
          })),
        },
      },
    });
  }
  console.log(`  ✓ ${submissions.length} document submissions`);

  /* ---------------------------------------------------------------- */
  /* Commercial                                                        */
  /* ---------------------------------------------------------------- */
  await prisma.procurementPackage.createMany({
    data: procurementPackages.map((p) => ({
      projectId,
      code: p.code,
      packageName: p.packageName,
      vendor: p.vendor,
      requester: p.requester,
      buyer: p.buyer,
      budget: p.budget,
      stage: p.stage,
      poStatus: p.poStatus,
      poNumber: p.poNumber,
      targetDeliveryDate: date(p.targetDeliveryDate),
      actualDeliveryDate: optionalDate(p.actualDeliveryDate),
      riskStatus: p.riskStatus,
      remarks: p.remarks,
    })),
  });
  console.log(`  ✓ ${procurementPackages.length} procurement packages`);

  await prisma.capexEquipment.createMany({
    data: capexEquipment.map((e) => ({
      projectId,
      code: e.code,
      name: e.name,
      category: e.category,
      vendor: e.vendor,
      budget: e.budget,
      capexNumber: e.capexNumber,
      rfqStatus: e.rfqStatus,
      technicalEvaluationStatus: e.technicalEvaluationStatus,
      commercialEvaluationStatus: e.commercialEvaluationStatus,
      poStatus: e.poStatus,
      manufacturingStatus: e.manufacturingStatus,
      shippingStatus: e.shippingStatus,
      deliveryStatus: e.deliveryStatus,
      installationStatus: e.installationStatus,
      commissioningStatus: e.commissioningStatus,
      trainingStatus: e.trainingStatus,
      owner: e.owner,
      targetDeliveryDate: date(e.targetDeliveryDate),
      actualDeliveryDate: optionalDate(e.actualDeliveryDate),
      leadTimeWeeks: e.leadTimeWeeks,
      isLongLead: e.isLongLead,
      riskLevel: e.riskLevel,
      remarks: e.remarks,
    })),
  });
  console.log(`  ✓ ${capexEquipment.length} CAPEX equipment items`);

  for (const p of paymentMilestones) {
    await prisma.paymentMilestone.create({
      data: {
        projectId,
        code: p.code,
        description: p.description,
        percentage: p.percentage,
        amount: p.amount,
        linkedDeliverable: p.linkedDeliverable,
        requiredEvidence: p.requiredEvidence,
        requiredApproval: p.requiredApproval,
        status: p.status,
        submittedDate: optionalDate(p.submittedDate),
        verifiedBy: p.verifiedBy,
        approvedBy: p.approvedBy,
        readiness: p.readiness,
        remarks: p.remarks,
        checklist: {
          create: p.checklist.map((c, i) => ({
            label: c.label,
            complete: c.complete,
            sequence: i,
          })),
        },
      },
    });
  }
  console.log(`  ✓ ${paymentMilestones.length} payment milestones`);

  /* ---------------------------------------------------------------- */
  /* Governance                                                        */
  /* ---------------------------------------------------------------- */
  await prisma.risk.createMany({
    data: risks.map((r) => ({
      projectId,
      code: r.code,
      description: r.description,
      category: r.category,
      owner: r.owner,
      likelihood: r.likelihood,
      impact: r.impact,
      level: r.level,
      mitigationPlan: r.mitigationPlan,
      dueDate: date(r.dueDate),
      status: r.status,
      escalationRequired: r.escalationRequired,
      remarks: r.remarks,
    })),
  });
  console.log(`  ✓ ${risks.length} risks`);

  await prisma.safetyReport.createMany({
    data: safetyReports.map((s) => ({
      projectId,
      code: s.code,
      date: date(s.date),
      reportedBy: s.reportedBy,
      description: s.description,
      category: s.category,
      severity: s.severity,
      correctiveAction: s.correctiveAction,
      owner: s.owner,
      dueDate: date(s.dueDate),
      status: s.status,
      evidenceUrl: s.evidenceUrl,
    })),
  });
  await prisma.safetyMonthlyStat.createMany({
    data: safetyMonthly.map((m, i) => ({ ...m, sequence: i })),
  });
  await prisma.safetySummary.create({
    data: { projectId, ...safetySummary },
  });
  console.log(
    `  ✓ ${safetyReports.length} safety reports, ${safetyMonthly.length} monthly stats, 1 safety summary`,
  );

  await prisma.actionItem.createMany({
    data: actionItems.map((a) => ({
      projectId,
      code: a.code,
      description: a.description,
      owner: a.owner,
      company: a.company,
      dueDate: date(a.dueDate),
      priority: a.priority,
      status: a.status,
      sourceMeeting: a.sourceMeeting,
      relatedDocument: a.relatedDocument,
      comment: a.comment,
    })),
  });
  console.log(`  ✓ ${actionItems.length} actions`);

  await prisma.ownerAttentionItem.createMany({
    data: attentionItems.map((a) => ({
      projectId,
      code: a.code,
      topic: a.topic,
      description: a.description,
      category: a.category,
      escalationReason: a.escalationReason,
      requiredDecision: a.requiredDecision,
      recommendedAction: a.recommendedAction,
      decisionOwner: a.decisionOwner,
      requestedDecisionDate: date(a.requestedDecisionDate),
      impactIfDelayed: a.impactIfDelayed,
      relatedRisk: a.relatedRisk,
      relatedMilestone: a.relatedMilestone,
      status: a.status,
      urgency: a.urgency,
      remarks: a.remarks,
    })),
  });
  console.log(`  ✓ ${attentionItems.length} owner attention items`);

  /* ---------------------------------------------------------------- */
  /* Resources                                                         */
  /* ---------------------------------------------------------------- */
  for (const doc of documents) {
    await prisma.document.create({
      data: {
        projectId,
        name: doc.name,
        folder: doc.folder,
        category: doc.category,
        revision: doc.revision,
        uploadedByName: doc.uploadedBy,
        uploadedAt: date(doc.uploadedAt),
        sizeKb: doc.sizeKb,
        fileType: doc.fileType,
        approvalStatus: doc.approvalStatus,
        isLatest: doc.isLatest,
        restrictedTo: doc.restrictedTo ?? [],
        url: doc.url,
        versions: {
          create: doc.versions.map((v) => ({
            revision: v.revision,
            uploadedAt: date(v.uploadedAt),
            uploadedBy: v.uploadedBy,
          })),
        },
      },
    });
  }
  console.log(`  ✓ ${documents.length} documents`);

  await prisma.galleryPhoto.createMany({
    data: galleryPhotos.map((p) => ({
      projectId,
      title: p.title,
      date: date(p.date),
      category: p.category,
      uploadedByName: p.uploadedBy,
      description: p.description,
      location: p.location,
      tags: p.tags,
      seed: p.seed,
    })),
  });
  console.log(`  ✓ ${galleryPhotos.length} gallery photos`);

  await prisma.weeklyReport.createMany({
    data: weeklyReports.map((r) => ({
      projectId,
      weekNumber: r.weekNumber,
      periodStart: date(r.periodStart),
      periodEnd: date(r.periodEnd),
      publishedAt: date(r.publishedAt),
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
    })),
  });
  console.log(`  ✓ ${weeklyReports.length} weekly reports`);

  await prisma.auditLog.createMany({
    data: auditLogs.map((l) => ({
      timestamp: new Date(l.timestamp),
      actorId: userIdByEmail.get(l.actorEmail.toLowerCase()) ?? null,
      actorName: l.actorName,
      actorEmail: l.actorEmail,
      action: l.action,
      entity: l.entity,
      entityId: l.entityId,
      summary: l.summary,
      ipAddress: l.ipAddress,
    })),
  });
  console.log(`  ✓ ${auditLogs.length} audit log entries`);

  console.log("\nSeed complete. Set DATA_SOURCE=prisma to serve this data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
