"use server";

/**
 * Server actions behind the admin edit forms.
 *
 * Every action re-derives the caller's permissions from the session — the
 * client is never trusted, and hiding a button is a courtesy, not a control.
 * Values are coerced strictly by the field schema in `lib/records.ts`, so
 * only declared keys of declared types ever reach storage.
 *
 * Two backends sit behind the same actions:
 *
 *   DATA_SOURCE=prisma  -> PostgreSQL, one row per record
 *   DATA_SOURCE=mock    -> JSON files under data/, overlaying the baseline
 *
 * Permission checks, validation, derived fields and the audit trail are
 * shared: only the final write differs. That is deliberate — the rules about
 * who may change what must not be able to drift between the two.
 */

import { revalidatePath } from "next/cache";

import { currentUser, toAccessProfile } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { ENTITIES, isEntityKey, type EntityDef, type EntityKey, type FieldDef } from "@/lib/records";
import * as data from "@/lib/data";
import { readCollection, writeCollection, storeLocation, resetCollection } from "@/lib/data/store";
import { recordAudit } from "@/lib/audit";
import { riskLevelFromScore } from "@/lib/status";
import type { Risk } from "@/lib/types";

export interface ActionResult {
  ok: boolean;
  message: string;
  /** False when the host discarded the write (read-only filesystem). */
  durable?: boolean;
}

type Record_ = Record<string, unknown>;

const usingDatabase = () => data.dataSource() === "prisma";

/** Loaded lazily so a mock-mode deployment never imports the Prisma client. */
const writer = () => import("@/lib/data/prisma-writer");

/* ------------------------------------------------------------------ */
/* Coercion                                                            */
/* ------------------------------------------------------------------ */

function coerce(field: FieldDef, raw: unknown): unknown {
  if (field.type === "boolean") return raw === true || raw === "true" || raw === "on";

  const value = typeof raw === "string" ? raw.trim() : raw;

  if (value === "" || value === null || value === undefined) {
    // Required text falls back to an empty string; everything else becomes
    // null so "no actual date yet" stays distinguishable from "the epoch".
    return field.required ? "" : null;
  }

  switch (field.type) {
    case "number":
    case "percent":
    case "currency": {
      const n = Number(value);
      if (!Number.isFinite(n)) return null;
      const lo = field.min ?? (field.type === "percent" ? 0 : Number.NEGATIVE_INFINITY);
      const hi = field.max ?? (field.type === "percent" ? 100 : Number.POSITIVE_INFINITY);
      return Math.min(hi, Math.max(lo, n));
    }
    case "date": {
      // Inputs arrive as yyyy-mm-dd from <input type="date">.
      const s = String(value).slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
    }
    case "select": {
      const s = String(value);
      return field.options?.includes(s) ? s : null;
    }
    default:
      return String(value);
  }
}

function validate(entity: EntityDef, values: Record_): { clean: Record_; errors: string[] } {
  const clean: Record_ = {};
  const errors: string[] = [];

  for (const field of entity.fields) {
    const value = coerce(field, values[field.key]);
    if (field.required && (value === null || value === "")) {
      errors.push(field.label);
    }
    clean[field.key] = value;
  }
  return { clean, errors };
}

/** Fields the schema owns are authoritative; everything else is preserved. */
function merge(existing: Record_ | null, clean: Record_): Record_ {
  return { ...(existing ?? {}), ...clean };
}

/* ------------------------------------------------------------------ */
/* Derived fields                                                      */
/* ------------------------------------------------------------------ */

/**
 * A couple of fields must never be hand-entered, or the register starts
 * contradicting itself: a risk's level is a function of its score, and an
 * action's "last updated" is a function of the edit itself. (In the database
 * the latter is the `updatedAt` column, which Prisma maintains, so the
 * writer ignores the value computed here.)
 */
function applyDerived(entityKey: string, record: Record_): Record_ {
  if (entityKey === "risks") {
    const l = Number(record.likelihood) || 1;
    const i = Number(record.impact) || 1;
    record.level = riskLevelFromScore(l, i) satisfies Risk["level"];
  }
  if (entityKey === "actions") {
    record.lastUpdated = new Date().toISOString().slice(0, 10);
  }
  return record;
}

/* ------------------------------------------------------------------ */
/* Loading the current collection                                      */
/* ------------------------------------------------------------------ */

async function currentCollection(entityKey: string): Promise<Record_[]> {
  switch (entityKey) {
    case "milestones":
      return (await data.getMilestones()) as unknown as Record_[];
    case "risks":
      return (await data.getRisks()) as unknown as Record_[];
    case "actions":
      return (await data.getActions()) as unknown as Record_[];
    case "procurement":
      return (await data.getProcurement()) as unknown as Record_[];
    default:
      return [];
  }
}

/* ------------------------------------------------------------------ */
/* Guard                                                               */
/* ------------------------------------------------------------------ */

async function authorise(entityKey: string, action: "edit" | "create" | "delete") {
  if (!isEntityKey(entityKey)) {
    return { ok: false as const, message: "Unknown record type." };
  }
  const entity = ENTITIES[entityKey];
  const user = await currentUser();
  const profile = toAccessProfile(user);

  if (!user || !profile) {
    return { ok: false as const, message: "Your session has expired. Sign in again." };
  }
  if (!can(profile, `${entity.page}:${action}`)) {
    return {
      ok: false as const,
      message: `You do not have permission to ${action} ${entity.label}.`,
    };
  }
  return { ok: true as const, entity, user };
}

function revalidate(entity: EntityDef) {
  // The edited page, plus the dashboard whose KPIs are derived from it.
  revalidatePath(`/${entity.page === "project-info" ? "project-info" : entity.page}`);
  revalidatePath("/dashboard");
  if (entity.page === "milestones") revalidatePath("/phases");
  if (entity.page === "risks") revalidatePath("/owner-attention");
  // The audit trail gained an entry whichever record changed.
  revalidatePath("/admin");
}

/** "Saved." plus anything the write could not do, rather than a bare success. */
function withCaveat(message: string, unchanged: string[]): string {
  if (!unchanged.length) return message;
  return `${message} ${unchanged.join(", ")} ${
    unchanged.length === 1 ? "was" : "were"
  } left unchanged — the database requires a value there.`;
}

/* ------------------------------------------------------------------ */
/* Backends                                                            */
/* ------------------------------------------------------------------ */

interface WriteOutcome {
  ok: boolean;
  message: string;
  durable: boolean;
  /** The stored record's id, for the audit entry. */
  id: string;
}

/** PostgreSQL through Prisma. */
async function saveToDatabase(
  entityKey: EntityKey,
  entity: EntityDef,
  id: string | null,
  record: Record_,
): Promise<WriteOutcome> {
  const db = await writer();
  const codeKey = entity.codeKey ?? "code";
  const code = String(record[codeKey] ?? "");

  if (entity.singleton) {
    const { unchanged } = await db.updateProject(record);
    return {
      ok: true,
      durable: true,
      id: entity.collection,
      message: withCaveat("Saved to the project database.", unchanged),
    };
  }

  const collection = entityKey as Exclude<EntityKey, "project">;

  try {
    if (id) {
      const { unchanged } = await db.updateRecord(collection, id, record);
      return {
        ok: true,
        durable: true,
        id,
        message: withCaveat(`Saved ${code} to the project database.`, unchanged),
      };
    }
    const { id: created, unchanged } = await db.createRecord(collection, record);
    return {
      ok: true,
      durable: true,
      id: created,
      message: withCaveat(`Created ${code} in the project database.`, unchanged),
    };
  } catch (error) {
    if (db.isDuplicate(error)) {
      return {
        ok: false,
        durable: true,
        id: id ?? code,
        message: `${code} already exists. Use a different ID.`,
      };
    }
    if (db.isMissingRow(error)) {
      return {
        ok: false,
        durable: true,
        id: id ?? code,
        message: "That record no longer exists. Refresh and try again.",
      };
    }
    throw error;
  }
}

/** JSON files under data/, overlaying the built-in baseline. */
async function saveToFiles(
  entityKey: EntityKey,
  entity: EntityDef,
  id: string | null,
  record: Record_,
): Promise<WriteOutcome> {
  const { durable } = storeLocation();
  const codeKey = entity.codeKey ?? "code";
  const code = String(record[codeKey] ?? "");
  const note = durable
    ? `The change is stored in data/${entity.collection}.json.`
    : "but this host has a read-only filesystem, so the change will be lost when the instance restarts.";
  const say = (verb: string) =>
    durable ? `${verb}. ${note}` : `${verb} — ${note}`;

  if (entity.singleton) {
    const existing = (await data.getProject()) as unknown as Record_;
    await writeCollection(entity.collection, merge(existing, record));
    return { ok: true, durable, id: entity.collection, message: say("Saved") };
  }

  const rows = await currentCollection(entityKey);

  if (id) {
    const index = rows.findIndex((r) => String(r.id) === id);
    if (index === -1) {
      return {
        ok: false,
        durable,
        id,
        message: "That record no longer exists. Refresh and try again.",
      };
    }
    const next = [...rows];
    next[index] = merge(rows[index], record);
    await writeCollection(entity.collection, next);
    return { ok: true, durable, id, message: say("Saved") };
  }

  if (code && rows.some((r) => String(r[codeKey]) === code)) {
    return {
      ok: false,
      durable,
      id: code,
      message: `${code} already exists. Use a different ID.`,
    };
  }
  const newId = `${entityKey}-${Date.now().toString(36)}`;
  await writeCollection(entity.collection, [...rows, { ...record, id: newId }]);
  return { ok: true, durable, id: newId, message: say("Created") };
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

/** Create or update one record. `id` is null when creating. */
export async function saveRecord(
  entityKey: string,
  id: string | null,
  values: Record<string, unknown>,
): Promise<ActionResult> {
  const guard = await authorise(entityKey, id ? "edit" : "create");
  if (!guard.ok) return { ok: false, message: guard.message };
  const { entity, user } = guard;
  const key = entityKey as EntityKey;

  const { clean, errors } = validate(entity, values);
  if (errors.length) {
    return { ok: false, message: `Please complete: ${errors.join(", ")}.` };
  }
  const record = applyDerived(key, clean);

  try {
    const outcome = usingDatabase()
      ? await saveToDatabase(key, entity, id, record)
      : await saveToFiles(key, entity, id, record);

    if (!outcome.ok) return { ok: false, message: outcome.message };

    const codeKey = entity.codeKey ?? "code";
    const label = String(record[codeKey] ?? entity.collection);
    const title = String(record[entity.titleKey] ?? "").slice(0, 80);

    await recordAudit({
      actorName: user.name,
      actorEmail: user.email,
      action: id || entity.singleton ? "UPDATE" : "CREATE",
      entity: entity.label,
      entityId: outcome.id,
      summary: entity.singleton
        ? `Updated ${entity.label}`
        : `${id ? "Updated" : "Created"} ${entity.label} ${label}${title ? ` — ${title}` : ""}`,
    });

    revalidate(entity);
    return { ok: true, durable: outcome.durable, message: outcome.message };
  } catch (error) {
    console.error("[records] save failed", error);
    return { ok: false, message: writeFailure(error) };
  }
}

/** Remove one record from a collection. */
export async function deleteRecord(
  entityKey: string,
  id: string,
): Promise<ActionResult> {
  const guard = await authorise(entityKey, "delete");
  if (!guard.ok) return { ok: false, message: guard.message };
  const { entity, user } = guard;

  if (entity.singleton) {
    return { ok: false, message: "The project record cannot be deleted." };
  }

  const codeKey = entity.codeKey ?? "code";

  try {
    const rows = await currentCollection(entityKey);
    const target = rows.find((r) => String(r.id) === id);
    if (!target) {
      return { ok: false, message: "That record no longer exists." };
    }
    const label = String(target[codeKey] ?? id);

    let durable = true;
    if (usingDatabase()) {
      const db = await writer();
      try {
        await db.deleteRecord(entityKey as Exclude<EntityKey, "project">, id);
      } catch (error) {
        if (db.isMissingRow(error)) {
          return { ok: false, message: "That record no longer exists." };
        }
        throw error;
      }
    } else {
      durable = storeLocation().durable;
      await writeCollection(
        entity.collection,
        rows.filter((r) => String(r.id) !== id),
      );
    }

    await recordAudit({
      actorName: user.name,
      actorEmail: user.email,
      action: "DELETE",
      entity: entity.label,
      entityId: id,
      summary: `Deleted ${entity.label} ${label}`,
    });

    revalidate(entity);
    return { ok: true, durable, message: `Deleted ${label}.` };
  } catch (error) {
    console.error("[records] delete failed", error);
    return { ok: false, message: writeFailure(error) };
  }
}

/**
 * Discard every saved edit for a collection and return to the baseline.
 *
 * This belongs to the JSON store, where the baseline still exists underneath
 * the overlay. In the database the seed *is* the data, so there is nothing to
 * fall back to and re-seeding is a deliberate command-line act.
 */
export async function resetEntity(entityKey: string): Promise<ActionResult> {
  const guard = await authorise(entityKey, "delete");
  if (!guard.ok) return { ok: false, message: guard.message };
  const { entity, user } = guard;

  if (usingDatabase()) {
    return {
      ok: false,
      message:
        "Records are stored in PostgreSQL, so there is no baseline to revert to. Re-run `npm run seed` to reload the shipped dataset — it replaces the whole project graph.",
    };
  }

  try {
    await resetCollection(entity.collection);
    await recordAudit({
      actorName: user.name,
      actorEmail: user.email,
      action: "DELETE",
      entity: entity.label,
      entityId: entity.collection,
      summary: `Reset ${entity.collection} to the built-in baseline`,
    });
    revalidate(entity);
    return { ok: true, message: `${entity.collection} reset to the built-in baseline.` };
  } catch (error) {
    console.error("[records] reset failed", error);
    return { ok: false, message: "The reset could not be completed." };
  }
}

/* ------------------------------------------------------------------ */
/* Status, for the pages and the admin panel                           */
/* ------------------------------------------------------------------ */

export interface StorageStatus {
  /** Whether a saved change actually survives a restart. */
  durable: boolean;
  reason: string;
  source: data.DataSource;
}

/** Where this deployment keeps edits, and whether it can keep them at all. */
export async function storageStatus(): Promise<StorageStatus> {
  if (usingDatabase()) {
    const { databaseStatus } = await writer();
    const status = await databaseStatus();
    return {
      durable: status.connected && status.seeded,
      reason: status.detail,
      source: "prisma",
    };
  }
  const { durable, reason } = storeLocation();
  return { durable, reason, source: "mock" };
}

/**
 * Which collections currently hold saved edits. Meaningful only for the JSON
 * store — with a database every collection is live, so the admin panel shows
 * the connection instead of a per-collection overlay.
 */
export async function customisedCollections(): Promise<string[]> {
  if (usingDatabase()) return [];
  const out: string[] = [];
  for (const [key, entity] of Object.entries(ENTITIES)) {
    if ((await readCollection(entity.collection)) !== null) out.push(key);
  }
  return out;
}

/* ------------------------------------------------------------------ */

/** A failed write must say which layer failed, not just "something broke". */
function writeFailure(error: unknown): string {
  if (usingDatabase()) {
    const detail = error instanceof Error ? error.message.split("\n")[0] : "";
    return `The change could not be written to the database${detail ? `: ${detail}` : "."}`;
  }
  return "The change could not be saved. Check the server log.";
}
