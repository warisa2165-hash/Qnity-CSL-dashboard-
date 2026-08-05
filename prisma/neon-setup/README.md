# Neon setup without a toolchain

Two SQL files that set up the database by pasting them into the **Neon SQL
Editor** — no Node.js, no terminal, no checkout. Works from any device,
including an iPad.

| File | What it does |
|---|---|
| `01-schema.sql` | Creates all 26 tables, enums, indexes and foreign keys |
| `02-data.sql` | Loads the QNITY 2026 baseline — 346 rows |

Rows are batched into one `INSERT` per table, which keeps the second file
around 110 KB rather than 170 KB — it is pasted by hand into a browser, often
on a tablet, and a smaller payload is a more reliable one.

This is the alternative to `npm run db:setup`. The result is identical: after
running both, `npx prisma migrate status` reports *"Database schema is up to
date"*, so a developer can still use the normal tooling later.

---

## How to run them

> Neon's onboarding leaves a sample `playing_with_neon` table behind. It is
> harmless and unrelated; `DROP TABLE IF EXISTS playing_with_neon;` clears it.

1. Neon Console → your project → **SQL Editor** (left menu), then **+** for a
   new empty query tab.
2. Open `01-schema.sql`, copy **everything**, paste, press **Run**.
   Expect it to finish with no red errors.
3. Clear the editor. Open `02-data.sql`, copy everything, paste, **Run**.
   It ends with `COMMIT`.
4. Check it worked — paste this and Run:

   ```sql
   SELECT
     (SELECT count(*) FROM "User")        AS users,        --  expect 11
     (SELECT count(*) FROM "Project")     AS projects,     --  expect 1
     (SELECT count(*) FROM "Risk")        AS risks,        --  expect 15
     (SELECT count(*) FROM "Milestone")   AS milestones,   --  expect 13
     (SELECT count(*) FROM "ActionItem")  AS actions,      --  expect 24
     (SELECT count(*) FROM "AuditLog")    AS audit_events; --  expect 18
   ```

Then set `DATA_SOURCE=prisma`, `DATABASE_URL` and `DIRECT_URL` in Vercel for
**both Production and Preview**, and redeploy. Full walkthrough:
[`../../docs/VERCEL-POSTGRES.md`](../../docs/VERCEL-POSTGRES.md).

---

## If something goes wrong

| Message | What it means |
|---|---|
| `relation "..." already exists` | `01-schema.sql` has already been run. Skip to step 3. |
| `duplicate key value violates unique constraint` | `02-data.sql` has already been run. The database is loaded; check with the query above. |
| Anything else during `02-data.sql` | Nothing was written — the whole file is one transaction. Fix the cause and paste it again. |

**To start completely over**, run this first — it destroys everything in the
database:

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

---

## Regenerating these files

They are generated, never hand-edited. After changing `prisma/schema.prisma`
or the mock dataset, on a machine with Node and PostgreSQL:

```bash
export DATABASE_URL="postgresql://…/qnity_csl"
export DIRECT_URL="$DATABASE_URL"
npm run db:deploy && npm run seed -- --force
npm run db:sql-bundle
```

The rows are dumped from a real seeded database rather than rendered from the
TypeScript, so what ships here is exactly what `npm run seed` produces.
