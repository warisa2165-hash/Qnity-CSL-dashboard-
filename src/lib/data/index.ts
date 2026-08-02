/**
 * Data access layer
 * =================
 *
 * Every page and API route in the portal reads project data through this
 * module — never directly from the mock files and never directly from
 * Prisma. That indirection is what makes the "mock first, real data later"
 * requirement work:
 *
 *   DATA_SOURCE=mock    (default)  -> the built-in QNITY dataset
 *   DATA_SOURCE=prisma            -> PostgreSQL through Prisma
 *
 * To connect real project data (Excel import, SharePoint sync, Power BI
 * dataset or manual admin input), populate the database and flip
 * DATA_SOURCE. No page component has to change — see
 * docs/DATA-INTEGRATION.md.
 */

import * as mock from "./mock";
import type {
  AccessRequest,
  ActionItem,
  AuditLog,
  CapexEquipment,
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

export type DataSource = "mock" | "prisma";

export function dataSource(): DataSource {
  return process.env.DATA_SOURCE === "prisma" ? "prisma" : "mock";
}

/**
 * In mock mode the five editable collections are overlaid with whatever the
 * JSON file store holds, so an administrator's saved changes are what every
 * page reads. The import is dynamic because `store.ts` touches `node:fs`,
 * which must never be pulled into an edge bundle.
 */
async function fromStore<T>(
  collection: import("./store").Collection,
): Promise<T | null> {
  if (dataSource() !== "mock") return null;
  try {
    const { readCollection } = await import("./store");
    return await readCollection<T>(collection);
  } catch (error) {
    console.error(`[data] store unavailable for ${collection}`, error);
    return null;
  }
}

/** Baseline first, then any saved override. */
async function overlay<T>(
  collection: import("./store").Collection,
  key: keyof PrismaRepository,
  baseline: T,
): Promise<T> {
  const saved = await fromStore<T>(collection);
  if (saved !== null) return saved;
  return resolve(key, baseline);
}

/**
 * When DATA_SOURCE=prisma the repository loads `./prisma-repository`, which
 * maps the Prisma models onto exactly the same shapes returned here. The
 * import is dynamic so a mock-mode deployment never needs a DATABASE_URL.
 */
async function fromPrisma<K extends keyof PrismaRepository>(
  key: K,
): Promise<ReturnType<PrismaRepository[K]> | null> {
  try {
    const repo = (await import("./prisma-repository")) as {
      repository: PrismaRepository;
    };
    return repo.repository[key]() as ReturnType<PrismaRepository[K]>;
  } catch {
    // Database unavailable — fall back to the mock dataset rather than
    // rendering an empty executive dashboard.
    return null;
  }
}

interface PrismaRepository {
  getProject(): Promise<Project>;
  getPhases(): Promise<ProjectPhase[]>;
  getMilestones(): Promise<Milestone[]>;
  getDesignPackages(): Promise<DesignPackage[]>;
  getSubmissions(): Promise<DocumentSubmission[]>;
  getProcurement(): Promise<ProcurementPackage[]>;
  getCapex(): Promise<CapexEquipment[]>;
  getPayments(): Promise<PaymentMilestone[]>;
  getRisks(): Promise<Risk[]>;
  getSafetyReports(): Promise<SafetyReport[]>;
  getActions(): Promise<ActionItem[]>;
  getAttentionItems(): Promise<OwnerAttentionItem[]>;
  getGallery(): Promise<GalleryPhoto[]>;
  getDocuments(): Promise<DocumentRecord[]>;
  getWeeklyReports(): Promise<WeeklyReport[]>;
  getUsers(): Promise<User[]>;
  getAccessRequests(): Promise<AccessRequest[]>;
  getAuditLogs(): Promise<AuditLog[]>;
}

async function resolve<T>(
  key: keyof PrismaRepository,
  mockValue: T,
): Promise<T> {
  if (dataSource() === "prisma") {
    const live = await fromPrisma(key);
    if (live) return live as T;
  }
  return mockValue;
}

/* ------------------------------------------------------------------ */
/* Public repository                                                   */
/* ------------------------------------------------------------------ */

export const getProject = () => overlay("project", "getProject", mock.project);
export const getPhases = () => resolve("getPhases", mock.phases);
export const getMilestones = () =>
  overlay("milestones", "getMilestones", mock.milestones);
export const getDesignPackages = () =>
  resolve("getDesignPackages", mock.designPackages);
export const getSubmissions = () => resolve("getSubmissions", mock.submissions);
export const getProcurement = () =>
  overlay("procurement", "getProcurement", mock.procurementPackages);
export const getCapex = () => resolve("getCapex", mock.capexEquipment);
export const getPayments = () => resolve("getPayments", mock.paymentMilestones);
export const getRisks = () => overlay("risks", "getRisks", mock.risks);
export const getSafetyReports = () =>
  resolve("getSafetyReports", mock.safetyReports);
export const getActions = () => overlay("actions", "getActions", mock.actionItems);
export const getAttentionItems = () =>
  resolve("getAttentionItems", mock.attentionItems);
export const getGallery = () => resolve("getGallery", mock.galleryPhotos);
export const getDocuments = () => resolve("getDocuments", mock.documents);
export const getWeeklyReports = () =>
  resolve("getWeeklyReports", mock.weeklyReports);
export const getUsers = () => resolve("getUsers", mock.users);
export const getAccessRequests = () =>
  resolve("getAccessRequests", mock.accessRequests);
export const getAuditLogs = () => resolve("getAuditLogs", mock.auditLogs);

/* Static reference data — identical in both modes. */
export const progressCurve = mock.progressCurve;
export const designByDiscipline = mock.designByDiscipline;
export const safetyMonthly = mock.safetyMonthly;
export const safetySummary = mock.safetySummary;
export const documentFolders = mock.documentFolders;
export const galleryCategories = mock.galleryCategories;
