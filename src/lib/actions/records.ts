"use server";

/**
 * Server actions behind the admin edit forms.
 *
 * Every action re-derives the caller's permissions from the session — the
 * client is never trusted, and hiding a button is a courtesy, not a control.
 * Values are coerced strictly by the field schema in `lib/records.ts`, so
 * only declared keys of declared types ever reach the store.
 */

import { revalidatePath } from "next/cache";

import { currentUser, toAccessProfile } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { ENTITIES, isEntityKey, type EntityDef, type FieldDef } from "@/lib/records";
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
 * action's "last updated" is a function of the edit itself.
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

  const { clean, errors } = validate(entity, values);
  if (errors.length) {
    return {
      ok: false,
      message: `Please complete: ${errors.join(", ")}.`,
    };
  }

  const location = storeLocation();

  try {
    if (entity.singleton) {
      const existing = (await data.getProject()) as unknown as Record_;
      const next = applyDerived(entityKey, merge(existing, clean));
      await writeCollection(entity.collection, next);
    } else {
      const rows = await currentCollection(entityKey);
      let next: Record_[];
      let summaryVerb: string;

      if (id) {
        const index = rows.findIndex((r) => String(r.id) === id);
        if (index === -1) {
          return { ok: false, message: "That record no longer exists. Refresh and try again." };
        }
        next = [...rows];
        next[index] = applyDerived(entityKey, merge(rows[index], clean));
        summaryVerb = "Updated";
      } else {
        const code = String(clean[entity.codeKey ?? "code"] ?? "");
        if (code && rows.some((r) => String(r[entity.codeKey ?? "code"]) === code)) {
          return { ok: false, message: `${code} already exists. Use a different ID.` };
        }
        const created = applyDerived(entityKey, {
          ...clean,
          id: `${entityKey}-${Date.now().toString(36)}`,
        });
        next = [...rows, created];
        summaryVerb = "Created";
      }

      await writeCollection(entity.collection, next);

      await recordAudit({
        actorName: user.name,
        actorEmail: user.email,
        action: id ? "UPDATE" : "CREATE",
        entity: entity.label,
        entityId: id ?? String(clean[entity.codeKey ?? "code"] ?? ""),
        summary: `${summaryVerb} ${entity.label} ${clean[entity.codeKey ?? "code"] ?? ""} — ${String(clean[entity.titleKey] ?? "").slice(0, 80)}`,
      });

      revalidate(entity);
      return {
        ok: true,
        durable: location.durable,
        message: location.durable
          ? `${summaryVerb === "Created" ? "Created" : "Saved"}. The change is stored in data/${entity.collection}.json.`
          : `${summaryVerb === "Created" ? "Created" : "Saved"} — but this host has a read-only filesystem, so the change will be lost when the instance restarts.`,
      };
    }

    await recordAudit({
      actorName: user.name,
      actorEmail: user.email,
      action: "UPDATE",
      entity: entity.label,
      entityId: entity.collection,
      summary: `Updated ${entity.label}`,
    });

    revalidate(entity);
    return {
      ok: true,
      durable: location.durable,
      message: location.durable
        ? `Saved. The change is stored in data/${entity.collection}.json.`
        : "Saved — but this host has a read-only filesystem, so the change will be lost when the instance restarts.",
    };
  } catch (error) {
    console.error("[records] save failed", error);
    return { ok: false, message: "The change could not be saved. Check the server log." };
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

  try {
    const rows = await currentCollection(entityKey);
    const target = rows.find((r) => String(r.id) === id);
    if (!target) {
      return { ok: false, message: "That record no longer exists." };
    }

    await writeCollection(
      entity.collection,
      rows.filter((r) => String(r.id) !== id),
    );

    await recordAudit({
      actorName: user.name,
      actorEmail: user.email,
      action: "DELETE",
      entity: entity.label,
      entityId: id,
      summary: `Deleted ${entity.label} ${target[entity.codeKey ?? "code"] ?? id}`,
    });

    revalidate(entity);
    return {
      ok: true,
      durable: storeLocation().durable,
      message: `Deleted ${target[entity.codeKey ?? "code"] ?? "record"}.`,
    };
  } catch (error) {
    console.error("[records] delete failed", error);
    return { ok: false, message: "The record could not be deleted." };
  }
}

/** Discard every saved edit for a collection and return to the baseline. */
export async function resetEntity(entityKey: string): Promise<ActionResult> {
  const guard = await authorise(entityKey, "delete");
  if (!guard.ok) return { ok: false, message: guard.message };
  const { entity, user } = guard;

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

/** Whether this deployment can actually keep edits. Read by the pages. */
export async function storageStatus(): Promise<{ durable: boolean; reason: string }> {
  const { durable, reason } = storeLocation();
  return { durable, reason };
}

/** Which collections currently hold saved edits. Used by the admin panel. */
export async function customisedCollections(): Promise<string[]> {
  const out: string[] = [];
  for (const [key, entity] of Object.entries(ENTITIES)) {
    if ((await readCollection(entity.collection)) !== null) out.push(key);
  }
  return out;
}
