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
  DesignDisciplineStat,
  DesignPackage,
  DocumentRecord,
  DocumentSubmission,
  GalleryPhoto,
  Milestone,
  OwnerAttentionItem,
  PaymentMilestone,
  ProcurementPackage,
  ProgressPoint,
  Project,
  ProjectPhase,
  Risk,
  SafetyMonthlyStat,
  SafetyReport,
  SafetySummary,
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
    // `return await` is load-bearing: returning the promise unawaited hands
    // it to the caller *outside* this try block, so a query rejection would
    // escape the catch below and 500 the page instead of falling back.
    return (await repo.repository[key]()) as ReturnType<PrismaRepository[K]>;
  } catch (error) {
    // Database unavailable — fall back to the built-in dataset rather than
    // rendering an empty executive dashboard. This is a real failure, not a
    // mode: log it loudly, because the page it produces looks perfectly
    // healthy. The admin panel reports the connection state for the same
    // reason (see `databaseStatus()`), and writes never fall back — an edit
    // made against fallback data fails rather than appearing to succeed.
    console.error(`[data] ${key} could not be read from PostgreSQL`, error);
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
  getProgressCurve(): Promise<ProgressPoint[]>;
  getDesignByDiscipline(): Promise<DesignDisciplineStat[]>;
  getSafetyMonthly(): Promise<SafetyMonthlyStat[]>;
  getSafetySummary(): Promise<SafetySummary>;
}

/**
 * Collections that must never fall back to the built-in dataset.
 *
 * Project data falling back keeps an executive dashboard readable through a
 * database blip, which is a fair trade. Identity data is different: signing
 * people in against the shipped demo accounts — whose password is published
 * in this repository — because PostgreSQL was briefly unreachable would turn
 * an outage into an access-control failure. These fail closed instead, and
 * the audit trail refuses to show entries it cannot vouch for.
 */
const NEVER_FALL_BACK: ReadonlySet<keyof PrismaRepository> = new Set([
  "getUsers",
  "getAccessRequests",
  "getAuditLogs",
]);

async function resolve<T>(
  key: keyof PrismaRepository,
  mockValue: T,
): Promise<T> {
  if (dataSource() === "prisma") {
    const live = await fromPrisma(key);
    if (live) return live as T;
    if (NEVER_FALL_BACK.has(key)) return [] as unknown as T;
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

/*
 * Charts and rollups.
 *
 * These were static exports of the mock module, which meant a
 * DATA_SOURCE=prisma deployment served invented numbers on the executive
 * S-curve, the design chart and every safety KPI while the registers beside
 * them showed live data. They are ordinary getters now, so they follow the
 * data source like everything else.
 */
export const getProgressCurve = () =>
  resolve("getProgressCurve", mock.progressCurve as ProgressPoint[]);
export const getDesignByDiscipline = () =>
  resolve("getDesignByDiscipline", mock.designByDiscipline);
export const getSafetyMonthly = () =>
  resolve("getSafetyMonthly", mock.safetyMonthly);
export const getSafetySummary = () =>
  resolve("getSafetySummary", mock.safetySummary);

/*
 * Genuinely static: these are taxonomy, not project data. The folder list and
 * the gallery's category list describe how the portal is organised, are
 * identical in both modes, and have no meaningful "live" value to read.
 */
export const documentFolders = mock.documentFolders;
export const galleryCategories = mock.galleryCategories;
