#!/usr/bin/env node
/**
 * Build the copy-and-paste SQL bundle for Neon's SQL Editor.
 *
 *   npm run db:sql-bundle          (needs a local PostgreSQL, see below)
 *
 * Why this exists
 * ---------------
 * The documented setup is `npm run db:setup`, which needs Node, a checkout and
 * a terminal. Whoever administers this portal is a project manager, not a
 * developer, and asking them to install a toolchain to press "go" once is a
 * poor trade. These two files let them paste the schema and the baseline
 * straight into the Neon console from any device — an iPad included.
 *
 * The output is generated, never hand-edited:
 *
 *   01-schema.sql   every migration in prisma/migrations, in order, plus the
 *                   _prisma_migrations bookkeeping table
 *   02-data.sql     the seeded baseline as INSERT statements
 *
 * Regenerating (after changing the schema or the mock dataset):
 *
 *   export DATABASE_URL="postgresql://…/qnity_csl" DIRECT_URL="$DATABASE_URL"
 *   npm run db:deploy && npm run seed -- --force
 *   npm run db:sql-bundle
 *
 * The rows come from a real seeded database rather than being rendered from
 * the TypeScript, so what ships is exactly what `npm run seed` produces.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";

const OUT_DIR = "prisma/neon-setup";
const MIGRATIONS = "prisma/migrations";

/**
 * Insert order matters: Prisma's foreign keys are NOT DEFERRABLE, and the
 * roles Neon hands out are not superuser, so `--disable-triggers` is not an
 * option. Parents before children, therefore, by hand.
 */
const TABLE_ORDER = [
  "User",
  "Project",
  "AccessRequest",
  "AuditLog",
  "LoginEvent",
  "Stakeholder",
  "ProgressPoint",
  "ProjectPhase",
  "PhaseDependency",
  "Milestone",
  "DesignPackage",
  "DesignDisciplineStat",
  "DocumentSubmission",
  "SubmissionVersion",
  "ProcurementPackage",
  "CapexEquipment",
  "PaymentMilestone",
  "PaymentChecklistItem",
  "Risk",
  "SafetyReport",
  "SafetyMonthlyStat",
  "SafetySummary",
  "ActionItem",
  "OwnerAttentionItem",
  "Document",
  "DocumentVersion",
  "GalleryPhoto",
  "WeeklyReport",
  "_prisma_migrations",
];

const rawUrl = process.env.DATABASE_URL?.trim();
if (!rawUrl) {
  console.error("DATABASE_URL is not set — point it at a seeded database.");
  process.exit(1);
}

/**
 * Prisma accepts query parameters libpq has never heard of. Passing
 * `?schema=public` straight to pg_dump fails with "invalid URI query
 * parameter", so strip the Prisma-only ones.
 */
function forPgDump(value) {
  try {
    const u = new URL(value);
    for (const key of ["schema", "pgbouncer", "connection_limit", "pool_timeout"]) {
      u.searchParams.delete(key);
    }
    return u.toString();
  } catch {
    return value;
  }
}

const url = forPgDump(rawUrl);

/** pg_dump emits \restrict / \unrestrict psql meta-commands that the Neon
 *  web editor does not understand, and SET lines that are noise here. */
function clean(sql) {
  return sql
    .split("\n")
    .filter(
      (line) =>
        !/^\\(un)?restrict/.test(line) &&
        !/^SET /.test(line) &&
        !/^SELECT pg_catalog\.set_config/.test(line) &&
        !/^--/.test(line),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function dumpData(table) {
  const out = execFileSync(
    "pg_dump",
    [
      url,
      "--data-only",
      "--column-inserts",
      // Batching rows into one statement per table roughly halves the file.
      // That matters: this is pasted by hand into a browser editor, often on
      // a tablet, where a smaller payload is a more reliable one. Column
      // names are still emitted, so the inserts stay order-independent.
      "--rows-per-insert=200",
      "--no-owner",
      "--no-privileges",
      "--table",
      `public."${table}"`,
    ],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  return clean(out);
}

/**
 * Make the schema script safe to run twice.
 *
 * Prisma's migration SQL assumes it runs exactly once, against a database it
 * has bookkeeping for. Pasted into a console by hand there is no such
 * guarantee: a slow tab gets tapped twice, a paste gets truncated and
 * retried, someone re-runs "the first file" to be sure. The unguarded script
 * then stops at `type "Role" already exists`, halfway through, with no
 * indication of what to do next.
 *
 * So every statement is made idempotent. Re-running fills in whatever is
 * missing and skips whatever is not, which turns a confusing failure into a
 * no-op. Data is untouched either way — this file only ever creates.
 */
function idempotent(sql) {
  return (
    sql
      // CREATE TYPE has no IF NOT EXISTS, so catch the duplicate instead.
      .replace(
        /^CREATE TYPE (.+?);$/gms,
        (_, body) =>
          `DO $$ BEGIN\n    CREATE TYPE ${body};\nEXCEPTION WHEN duplicate_object THEN NULL;\nEND $$;`,
      )
      .replace(/^CREATE TABLE /gm, "CREATE TABLE IF NOT EXISTS ")
      .replace(/^CREATE UNIQUE INDEX /gm, "CREATE UNIQUE INDEX IF NOT EXISTS ")
      .replace(/^CREATE INDEX /gm, "CREATE INDEX IF NOT EXISTS ")
      // Same story for constraints: no IF NOT EXISTS, so guard the whole
      // statement. Foreign keys span two lines in Prisma's output.
      .replace(
        /^ALTER TABLE (.+?);$/gms,
        (_, body) =>
          `DO $$ BEGIN\n    ALTER TABLE ${body};\nEXCEPTION WHEN duplicate_object THEN NULL;\nEND $$;`,
      )
  );
}

mkdirSync(OUT_DIR, { recursive: true });

/* ------------------------------------------------------------------ */
/* 01 — schema                                                         */
/* ------------------------------------------------------------------ */

const migrationDirs = readdirSync(MIGRATIONS, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

let schema = `-- =====================================================================
-- QNITY CSL Laboratory Renovation 2026 — Project Dashboard Portal
-- STEP 1 of 2: create the schema
-- =====================================================================
--
-- Paste this whole file into the Neon SQL Editor and press Run.
-- Then run 02-data.sql. Order matters: this file creates the tables that
-- the second one fills.
--
-- Safe to run more than once: every statement is guarded, so a second run
-- fills in anything missing and skips the rest. It only ever creates —
-- your data is never touched.
--
-- Generated by scripts/build-neon-sql.mjs — do not edit by hand.
-- =====================================================================

`;

for (const dir of migrationDirs) {
  const file = path.join(MIGRATIONS, dir, "migration.sql");
  schema += `\n-- ---------------------------------------------------------------------\n`;
  schema += `-- migration: ${dir}\n`;
  schema += `-- ---------------------------------------------------------------------\n\n`;
  schema += `${idempotent(readFileSync(file, "utf8").trim())}\n`;
}

schema += `

-- ---------------------------------------------------------------------
-- Prisma's own bookkeeping table.
--
-- Created here so that a later \`npm run db:deploy\` from a developer
-- machine recognises these migrations as already applied instead of
-- trying to create every table a second time. The rows that mark them
-- applied are in 02-data.sql.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL,
    CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id)
);
`;

writeFileSync(path.join(OUT_DIR, "01-schema.sql"), schema);

/* ------------------------------------------------------------------ */
/* 02 — data                                                           */
/* ------------------------------------------------------------------ */

let data = `-- =====================================================================
-- QNITY CSL Laboratory Renovation 2026 — Project Dashboard Portal
-- STEP 2 of 2: load the baseline data
-- =====================================================================
--
-- Run 01-schema.sql first. Then paste this file into the Neon SQL Editor
-- and press Run.
--
-- This is the same dataset the portal serves in mock mode: the real
-- project structure, users, registers, charts and audit history. Every
-- row becomes editable in the portal once DATA_SOURCE=prisma is set.
--
-- The whole file is one transaction: if any statement fails, nothing is
-- written and you can fix the problem and paste it again.
--
-- Generated by scripts/build-neon-sql.mjs — do not edit by hand.
-- =====================================================================

BEGIN;

`;

let rowTotal = 0;
for (const table of TABLE_ORDER) {
  const body = dumpData(table);
  // With batching, one INSERT covers many rows — count the value tuples.
  const rows = (body.match(/^\t\(/gm) ?? []).length;
  rowTotal += rows;
  data += `\n-- ${table} (${rows} row${rows === 1 ? "" : "s"})\n`;
  data += rows ? `${body}\n` : `-- (empty)\n`;
}

data += `
COMMIT;

-- ---------------------------------------------------------------------
-- Done. ${rowTotal} rows loaded.
--
-- Next: set DATA_SOURCE=prisma, DATABASE_URL and DIRECT_URL in Vercel
-- (Production and Preview), then redeploy. See docs/VERCEL-POSTGRES.md.
-- ---------------------------------------------------------------------
`;

writeFileSync(path.join(OUT_DIR, "02-data.sql"), data);

console.log(`Wrote ${OUT_DIR}/01-schema.sql (${migrationDirs.length} migrations)`);
console.log(`Wrote ${OUT_DIR}/02-data.sql (${rowTotal} rows)`);
