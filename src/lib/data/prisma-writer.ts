/**
 * Prisma-backed writer
 * ====================
 *
 * The mirror image of `prisma-repository.ts`: that module maps PostgreSQL
 * rows onto domain shapes for reading, this one maps edited form values back
 * onto PostgreSQL rows. Loaded lazily by the record server actions, and only
 * when DATA_SOURCE=prisma, so a mock-mode deployment still needs no database.
 *
 * The form layer speaks one dialect and the database another, and the gap is
 * where a naive `data: values` would break:
 *
 *   - dates arrive as `2026-08-01`, columns want `DateTime`
 *   - money arrives as a JS number, columns are `Decimal(14,2)`
 *   - "cleared" arrives as null, but most text columns are `NOT NULL`
 *   - every row belongs to a project, which the form never mentions
 *
 * So each entity declares what its columns actually are, and `toRow()` is the
 * single place that translation happens.
 */

import { prisma } from "@/lib/db";
import { ENTITIES, type EntityDef, type EntityKey } from "@/lib/records";
import { errorSummary } from "@/lib/utils";

type Row = Record<string, unknown>;

/* ------------------------------------------------------------------ */
/* Column facts the form schema cannot know                            */
/* ------------------------------------------------------------------ */

/**
 * Columns that accept NULL. Anything else, when cleared in the form, is
 * omitted from the update rather than nulled — clearing an optional remark
 * should empty it, not violate a NOT NULL constraint.
 */
const NULLABLE: Record<EntityKey, ReadonlySet<string>> = {
  project: new Set(),
  milestones: new Set(["actualDate", "forecastDate", "dependency"]),
  risks: new Set(),
  actions: new Set(["relatedDocument"]),
  procurement: new Set(["vendor", "poNumber", "actualDeliveryDate"]),
};

/**
 * NOT NULL text columns. Clearing one in the form means "make it empty", so
 * it is written as "" — the editor cleared it on purpose, and silently
 * keeping the old text would be a lie about what was saved.
 *
 * `currency` is deliberately absent: it is a NOT NULL code with a default,
 * and an empty one would corrupt every money figure on the dashboard, so a
 * cleared currency keeps its previous value and is reported as unchanged.
 */
const TEXT_CLEARS_TO_EMPTY: Record<EntityKey, ReadonlySet<string>> = {
  project: new Set([
    "consultant",
    "contractor",
    "objective",
    "status",
    "currentPhase",
  ]),
  milestones: new Set(["description", "phase", "remarks"]),
  risks: new Set(["mitigationPlan", "remarks"]),
  actions: new Set(["sourceMeeting", "comment"]),
  procurement: new Set(["requester", "buyer", "remarks"]),
};

/** Columns typed `Int` rather than `Float`. */
const INTEGER: Record<EntityKey, ReadonlySet<string>> = {
  project: new Set(),
  milestones: new Set(),
  risks: new Set(["likelihood", "impact"]),
  actions: new Set(),
  procurement: new Set(),
};

/** The Prisma delegate for each editable entity. */
function delegate(key: EntityKey) {
  switch (key) {
    case "project":
      return prisma.project;
    case "milestones":
      return prisma.milestone;
    case "risks":
      return prisma.risk;
    case "actions":
      return prisma.actionItem;
    case "procurement":
      return prisma.procurementPackage;
  }
}

/* ------------------------------------------------------------------ */
/* Translation                                                         */
/* ------------------------------------------------------------------ */

const toDate = (value: unknown): Date | null => {
  const s = String(value ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  // Dates in this project are calendar dates, not instants. Pinning them to
  // UTC midnight keeps `2026-08-01` reading back as `2026-08-01` regardless
  // of the server's timezone.
  const date = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Build a Prisma `data` payload from validated form values.
 *
 * A value the editor left empty becomes NULL, or "", or is omitted entirely —
 * whichever the column can actually hold. Omitted keys keep whatever the row
 * already had, so a required date can never be blanked into an invalid row;
 * those keys are returned in `unchanged` so the caller can say so out loud
 * instead of reporting a save that silently did less than it claimed.
 */
function toRow(
  entityKey: EntityKey,
  entity: EntityDef,
  values: Row,
): { row: Row; unchanged: string[] } {
  const row: Row = {};
  const unchanged: string[] = [];
  const nullable = NULLABLE[entityKey];
  const emptyText = TEXT_CLEARS_TO_EMPTY[entityKey];
  const integer = INTEGER[entityKey];

  for (const field of entity.fields) {
    const raw = values[field.key];
    const cleared = raw === null || raw === undefined || raw === "";

    if (cleared) {
      if (nullable.has(field.key)) row[field.key] = null;
      else if (emptyText.has(field.key)) row[field.key] = "";
      else unchanged.push(field.label);
      continue;
    }

    switch (field.type) {
      case "date": {
        const date = toDate(raw);
        if (date) row[field.key] = date;
        else if (nullable.has(field.key)) row[field.key] = null;
        else unchanged.push(field.label);
        break;
      }
      case "number":
      case "percent": {
        const n = Number(raw);
        if (!Number.isFinite(n)) unchanged.push(field.label);
        else row[field.key] = integer.has(field.key) ? Math.round(n) : n;
        break;
      }
      case "currency": {
        const n = Number(raw);
        // Decimal(14,2): hand Prisma a fixed-point string so a float like
        // 12_500_000.005 cannot round its way into the ledger.
        if (!Number.isFinite(n)) unchanged.push(field.label);
        else row[field.key] = n.toFixed(2);
        break;
      }
      case "boolean":
        row[field.key] = Boolean(raw);
        break;
      default:
        row[field.key] = String(raw);
    }
  }

  // `level` is derived server-side from likelihood × impact, never entered.
  if (entityKey === "risks" && typeof values.level === "string") {
    row.level = values.level;
  }

  return { row, unchanged };
}

/* ------------------------------------------------------------------ */
/* Project scope                                                       */
/* ------------------------------------------------------------------ */

/**
 * Every editable row hangs off the project. The portal serves one project, so
 * the oldest row is it — the same rule `prisma-repository.currentProject()`
 * reads by, so writes and reads can never disagree about which project the
 * page is showing.
 */
async function projectId(): Promise<string> {
  const project = await prisma.project.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!project) {
    throw new Error(
      "No project row exists. Run `npm run seed` to load the baseline before editing.",
    );
  }
  return project.id;
}

/* ------------------------------------------------------------------ */
/* Errors worth naming                                                 */
/* ------------------------------------------------------------------ */

interface PrismaError {
  code?: string;
  meta?: { target?: string[] };
}

/** True when the failure is a unique-constraint violation. */
export const isDuplicate = (error: unknown): boolean =>
  (error as PrismaError)?.code === "P2002";

/** True when the row addressed by an update or delete is already gone. */
export const isMissingRow = (error: unknown): boolean =>
  (error as PrismaError)?.code === "P2025";

/**
 * Connection-level failures where the query itself was fine.
 *
 *   P1017  the server closed a connection the pool still believed in
 *   P2024  timed out waiting for a connection from the pool
 *
 * Both are what a serverless host or a database restart produces, and both
 * come good on the next attempt. Managed PostgreSQL restarts for patching,
 * so without this the first edit after every maintenance window fails in
 * front of whoever happened to be typing.
 */
const isStaleConnection = (error: unknown): boolean =>
  ["P1017", "P2024"].includes((error as PrismaError)?.code ?? "");

/** Run a write, retrying once through a stale pooled connection. */
async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isStaleConnection(error)) throw error;
    console.warn("[prisma] stale connection, retrying once", error);
    await new Promise((resolve) => setTimeout(resolve, 250));
    return operation();
  }
}

/* ------------------------------------------------------------------ */
/* Operations                                                          */
/* ------------------------------------------------------------------ */

export interface WriteResult {
  id: string;
  /** Labels of fields left as they were because the column cannot be empty. */
  unchanged: string[];
}

/** Update the single project row. Columns the form does not own are untouched. */
export async function updateProject(values: Row): Promise<WriteResult> {
  const { row, unchanged } = toRow("project", ENTITIES.project, values);
  return withRetry(async () => {
    const id = await projectId();
    await prisma.project.update({ where: { id }, data: row });
    return { id, unchanged };
  });
}

/** Update one row of a collection. */
export async function updateRecord(
  entityKey: Exclude<EntityKey, "project">,
  id: string,
  values: Row,
): Promise<WriteResult> {
  const { row, unchanged } = toRow(entityKey, ENTITIES[entityKey], values);
  return withRetry(async () => {
    await (delegate(entityKey) as { update: (a: unknown) => Promise<Row> }).update({
      where: { id },
      data: row,
    });
    return { id, unchanged };
  });
}

/** Insert one row into a collection, scoped to the current project. */
export async function createRecord(
  entityKey: Exclude<EntityKey, "project">,
  values: Row,
): Promise<WriteResult> {
  const { row, unchanged } = toRow(entityKey, ENTITIES[entityKey], values);
  return withRetry(async () => {
    const created = await (
      delegate(entityKey) as { create: (a: unknown) => Promise<{ id: string }> }
    ).create({ data: { ...row, projectId: await projectId() } });
    return { id: created.id, unchanged };
  });
}

/** Delete one row from a collection. */
export async function deleteRecord(
  entityKey: Exclude<EntityKey, "project">,
  id: string,
): Promise<void> {
  await withRetry(() =>
    (delegate(entityKey) as { delete: (a: unknown) => Promise<Row> }).delete({
      where: { id },
    }),
  );
}

/* ------------------------------------------------------------------ */
/* Health                                                              */
/* ------------------------------------------------------------------ */

export interface DatabaseStatus {
  connected: boolean;
  /** True once the baseline has been seeded — an empty database is not usable. */
  seeded: boolean;
  detail: string;
}

/**
 * Whether the database is actually reachable and populated.
 *
 * The read path falls back to the mock dataset when a query fails, which
 * keeps the dashboard up but means a broken connection looks exactly like a
 * working one. The admin panel calls this so the difference is visible before
 * somebody edits a record and wonders where it went.
 */
export async function databaseStatus(): Promise<DatabaseStatus> {
  try {
    const count = await withRetry(() => prisma.project.count());
    if (count === 0) {
      return {
        connected: true,
        seeded: false,
        detail:
          "Connected to PostgreSQL, but no project row exists yet. Run `npm run seed` to load the baseline.",
      };
    }
    return {
      connected: true,
      seeded: true,
      detail: "Connected to PostgreSQL. Every change is written to the database.",
    };
  } catch (error) {
    return {
      connected: false,
      seeded: false,
      detail: `PostgreSQL is unreachable, so pages are falling back to the built-in baseline and edits will fail: ${errorSummary(error)}`,
    };
  }
}
