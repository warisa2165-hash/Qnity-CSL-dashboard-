#!/usr/bin/env node
/**
 * Diagnose the production database connection.
 *
 *   npm run db:check
 *
 * Answers, in order, the questions that actually go wrong when converting a
 * deployment from the built-in dataset to PostgreSQL:
 *
 *   1. Is DATA_SOURCE actually set to prisma? (Everything else can be
 *      perfect and the portal will still serve mock data without it.)
 *   2. Are the two connection strings present, and is the pooled/direct pair
 *      the right way round?
 *   3. Does the database answer?
 *   4. Has the schema been migrated?
 *   5. Has the baseline been seeded?
 *
 * Exits non-zero on anything that would stop the portal working, so it can
 * gate a deploy script.
 */

import { PrismaClient } from "@prisma/client";

const ok = (m) => console.log(`  ✓ ${m}`);
const warn = (m) => console.log(`  ! ${m}`);
const bad = (m) => console.log(`  ✗ ${m}`);

let failures = 0;
let warnings = 0;
const fail = (m) => {
  bad(m);
  failures++;
};
const caution = (m) => {
  warn(m);
  warnings++;
};

/** Never print a password, even into a private CI log. */
function describe(url) {
  try {
    const u = new URL(url);
    const host = u.hostname;
    const db = u.pathname.replace(/^\//, "") || "(none)";
    return `${u.protocol}//${u.username ? "***:***@" : ""}${host}:${u.port || "5432"}/${db}${u.search}`;
  } catch {
    return "(unparseable)";
  }
}

/**
 * Prisma error messages open with a blank line, so `split("\n")[0]` is the
 * empty string — the reason a diagnostic can end up printing nothing at all.
 */
const firstLine = (error) =>
  String(error?.message ?? error)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^Invalid `.*` invocation:?$/.test(line))[0] ??
  "unknown error";

const isPooled = (url) =>
  /-pooler\./.test(url) || /pgbouncer=true/.test(url) || /:6543\b/.test(url);

console.log("\nQNITY CSL portal — database check\n");

/* ---------------------------------------------------------------- */
console.log("Configuration");

const source = process.env.DATA_SOURCE ?? "(unset)";
if (source === "prisma") {
  ok("DATA_SOURCE=prisma — the portal reads and writes PostgreSQL");
} else {
  caution(
    `DATA_SOURCE=${source} — the portal will serve the built-in dataset and ignore this database. Set DATA_SOURCE=prisma.`,
  );
}

const databaseUrl = process.env.DATABASE_URL?.trim();
const directUrl = process.env.DIRECT_URL?.trim();

if (!databaseUrl) {
  fail("DATABASE_URL is not set — nothing to check.");
  console.log("");
  process.exit(1);
}
ok(`DATABASE_URL → ${describe(databaseUrl)}`);

if (!directUrl) {
  if (isPooled(databaseUrl)) {
    fail(
      "DIRECT_URL is not set, but DATABASE_URL looks pooled. Migrations will hang — set DIRECT_URL to the direct connection string.",
    );
  } else {
    caution(
      "DIRECT_URL is not set. Fine for a server with no pooler; set it to the same value to be explicit.",
    );
  }
} else {
  ok(`DIRECT_URL   → ${describe(directUrl)}`);
  if (isPooled(directUrl)) {
    fail(
      "DIRECT_URL looks pooled (-pooler / :6543 / pgbouncer=true). Migrations cannot run through a transaction pooler — use the direct string.",
    );
  }
  if (!isPooled(databaseUrl) && directUrl !== databaseUrl) {
    caution(
      "DATABASE_URL does not look pooled. On a serverless host, point it at the pooled connection or concurrent invocations will exhaust max_connections.",
    );
  }
}

if (/neon\.tech/.test(databaseUrl) && !/sslmode=/.test(databaseUrl)) {
  caution("Neon connection without sslmode — append ?sslmode=require.");
}

/* ---------------------------------------------------------------- */
console.log("\nConnection");

// Silent: this script reports every failure itself, and Prisma's own error
// logging would bury a clean diagnosis under a stack trace.
const prisma = new PrismaClient({ log: [] });
let connected = false;

try {
  const started = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  const ms = Date.now() - started;
  connected = true;
  ok(`answered in ${ms} ms`);
  if (ms > 2000) {
    caution(
      "Slow first response. Neon auto-suspends idle databases; the first query after a pause pays the resume cost. Subsequent queries should be fast.",
    );
  }
  const [{ version }] = await prisma.$queryRaw`SELECT version()`;
  ok(version.split(",")[0]);
} catch (error) {
  fail(`cannot reach the database: ${firstLine(error)}`);
}

/* ---------------------------------------------------------------- */
let schemaOk = false;

if (connected) {
  console.log("\nSchema");
  try {
    const rows = await prisma.$queryRaw`
      SELECT migration_name, finished_at, rolled_back_at
      FROM _prisma_migrations ORDER BY started_at`;
    const applied = rows.filter((r) => r.finished_at && !r.rolled_back_at);
    const broken = rows.filter((r) => r.rolled_back_at || !r.finished_at);
    ok(`${applied.length} migration(s) applied`);
    for (const r of applied) console.log(`      ${r.migration_name}`);
    if (broken.length) {
      fail(
        `${broken.length} migration(s) failed or rolled back — run \`npx prisma migrate status\`.`,
      );
    }
    schemaOk = applied.length > 0 && broken.length === 0;
  } catch {
    fail(
      "no _prisma_migrations table — the schema has never been migrated. Run `npm run db:deploy`.",
    );
  }

  /* -------------------------------------------------------------- */
  // Counting rows in tables that do not exist yields a wall of Prisma errors
  // that says nothing the schema check has not already said.
  console.log("\nData");
  if (!schemaOk) {
    warn("skipped — migrate the schema first");
  } else {
    try {
      const [
        projects,
        users,
        risks,
        milestones,
        actions,
        procurement,
        audits,
        curve,
        disciplines,
        summary,
      ] = await Promise.all([
        prisma.project.count(),
        prisma.user.count(),
        prisma.risk.count(),
        prisma.milestone.count(),
        prisma.actionItem.count(),
        prisma.procurementPackage.count(),
        prisma.auditLog.count(),
        prisma.progressPoint.count(),
        prisma.designDisciplineStat.count(),
        prisma.safetySummary.count(),
      ]);

      if (projects === 0) {
        fail(
          "no project row — editing is blocked until the baseline is loaded. Run `npm run seed`.",
        );
      } else {
        ok(`${projects} project, ${users} users`);
        ok(
          `${milestones} milestones · ${risks} risks · ${actions} actions · ${procurement} procurement packages`,
        );
        ok(`${audits} audit entries`);
        if (users === 0) {
          fail("no users — nobody can sign in. Run `npm run seed`.");
        }
        // The charts fail quietly rather than loudly: a missing rollup makes
        // the dashboard fall back to built-in figures that look plausible.
        if (curve === 0 || disciplines === 0 || summary === 0) {
          caution(
            `chart data incomplete (S-curve ${curve}, disciplines ${disciplines}, safety summary ${summary}) — those panels will show built-in figures. Re-run \`npm run seed\`.`,
          );
        } else {
          ok(
            `${curve} S-curve points · ${disciplines} discipline stats · safety summary present`,
          );
        }
      }
    } catch (error) {
      fail(`could not read counts: ${firstLine(error)}`);
    }
  }
}

await prisma.$disconnect();

/* ---------------------------------------------------------------- */
console.log("");
if (failures) {
  console.log(
    `${failures} problem(s)${warnings ? ` and ${warnings} warning(s)` : ""} — the portal will not work correctly.\n`,
  );
  process.exit(1);
}
console.log(
  warnings
    ? `Usable, with ${warnings} warning(s) above.\n`
    : "All checks passed. The portal is ready to serve live data.\n",
);
