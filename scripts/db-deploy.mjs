#!/usr/bin/env node
/**
 * Apply pending migrations to the configured database.
 *
 * `prisma migrate deploy` on its own fails hard when DATABASE_URL is absent,
 * which would break every mock-mode deployment the moment this is chained
 * into a build command. So the wrapper checks first and exits 0 with an
 * explanation instead — "no database configured" is a valid state for this
 * portal, not an error.
 *
 * Migrations run against DIRECT_URL when it is set, because a transaction
 * pooler (PgBouncer in the Vercel/Neon/Supabase default) cannot execute the
 * advisory locks and DDL that migrations need.
 */

import { spawnSync } from "node:child_process";

const url = process.env.DATABASE_URL?.trim();

if (!url) {
  console.log(
    "[db:deploy] DATABASE_URL is not set — skipping migrations.\n" +
      "            The portal runs on its built-in dataset (DATA_SOURCE=mock).",
  );
  process.exit(0);
}

if (!process.env.DIRECT_URL?.trim()) {
  // Not fatal: a plain PostgreSQL server has no pooler to bypass. Say it
  // anyway, because "migrations hang on Vercel" is otherwise a long evening.
  console.log(
    "[db:deploy] DIRECT_URL is not set — migrating through DATABASE_URL.\n" +
      "            If that points at a connection pooler, set DIRECT_URL to the\n" +
      "            direct (non-pooled) connection string.",
  );
  process.env.DIRECT_URL = url;
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error("[db:deploy] could not run prisma migrate deploy", result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
