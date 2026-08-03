# Vercel + PostgreSQL — the durable deployment

Takes the portal from the built-in dataset (`DATA_SOURCE=mock`) to a real
PostgreSQL database on Vercel, where **create, edit and delete persist** and
survive redeploys, cold starts and instance recycling.

This is the deployment that can carry the project of record. For the
mock-only UAT site, see [`DEPLOY-VERCEL.md`](DEPLOY-VERCEL.md); for
self-hosting on a VM or Azure, [`DEPLOYMENT.md`](DEPLOYMENT.md).

**Time required:** about 30 minutes, most of it waiting for a database to
provision.

---

## What changes, and what does not

| | `DATA_SOURCE=mock` | `DATA_SOURCE=prisma` |
|---|---|---|
| Reads | Built-in dataset + `data/*.json` overlay | PostgreSQL |
| Edits to the five registers | JSON files — lost on Vercel when the instance recycles | Rows in PostgreSQL, permanent |
| Invite user, change role, approve access request | Validated and audited, then discarded | Persisted |
| Audit trail | Seeded history; new entries go to the function log | Every entry written to `AuditLog` |
| Roles, permissions, per-user grants and denials | From the built-in user list | From the `User` table — **same rules, same code** |

Nothing about the RBAC model changes. `lib/rbac.ts` is the only authority on
who may do what in both modes, the server actions re-check permissions on
every call, and per-user `grants`/`denials` move into the database columns of
the same name. The seed carries the existing users across unchanged.

---

## 1. Provision a database

Any PostgreSQL 14+ will do. Two things matter on a serverless host:

- **Connection pooling.** Every Vercel function invocation opens its own
  connection. Without a pooler in front, a busy dashboard exhausts
  `max_connections` and requests start failing with *"too many clients"*.
- **A direct connection for migrations.** A transaction pooler (PgBouncer)
  cannot run the advisory locks and DDL that `prisma migrate` needs, so
  migrations must bypass it.

That is why this project's schema declares two URLs:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooled — used by the running app
  directUrl = env("DIRECT_URL")     // direct — used by migrations only
}
```

### Option A — Neon (recommended)

Vercel Marketplace → **Neon**, or [neon.tech](https://neon.tech) directly.
The free tier is enough for this portal. Neon's dashboard gives you both
strings; take the **Pooled connection** for `DATABASE_URL` and the **Direct
connection** for `DIRECT_URL`. The pooled host contains `-pooler`:

```
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/qnity_csl?sslmode=require"
DIRECT_URL="postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/qnity_csl?sslmode=require"
```

Pick the region closest to Thailand Science Park — `ap-southeast-1`
(Singapore) — to match `vercel.json`, which already pins functions to `sin1`.

### Option B — Supabase

Project → **Connect**. Use the **Transaction pooler** string (port `6543`)
for `DATABASE_URL`, adding `?pgbouncer=true`, and the **Direct connection**
(port `5432`) for `DIRECT_URL`:

```
DATABASE_URL="postgresql://postgres.xxx:pass@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxx:pass@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
```

The `?pgbouncer=true` flag is not decoration — without it Prisma uses
prepared statements that a transaction pooler cannot keep, and queries fail
intermittently with *"prepared statement `s0` already exists"*.

### Option C — a plain PostgreSQL server

No pooler to bypass, so **set both variables to the same string**:

```
DATABASE_URL="postgresql://qnity:pass@db.internal:5432/qnity_csl?schema=public"
DIRECT_URL="postgresql://qnity:pass@db.internal:5432/qnity_csl?schema=public"
```

Consider PgBouncer in front once more than a handful of people use the
portal concurrently.

---

## 2. Create the schema and load the baseline

Run this **from your machine**, once, before the first deploy. Migrations are
deliberately not part of the Vercel build — see
[Why migrations are not in the build](#why-migrations-are-not-in-the-build).

```bash
git clone https://github.com/warisa2165-hash/Qnity-CSL-dashboard-.git
cd Qnity-CSL-dashboard-
npm install

export DATABASE_URL="…pooled…"
export DIRECT_URL="…direct…"

npm run db:deploy    # applies prisma/migrations — creates every table
npm run seed         # loads the QNITY 2026 baseline: users, project, registers
```

`npm run db:setup` runs both in one step.

Expected output from the seed:

```
  ✓ 11 users
  ✓ 4 access requests
  ✓ project QN-CSL-2026
  ✓ 6 phases, 6 schedule links
  ✓ 13 milestones
  …
Seed complete. Set DATA_SOURCE=prisma to serve this data.
```

**Re-running the seed is destructive.** It clears the project graph and the
user table, then rewrites them — that is what makes it repeatable. Once real
project data is in the database, never run it again; use the portal, or SQL.

> **Working from the QNITY baseline is a choice, not a requirement.** If you
> would rather start from your own registers, seed first, then edit in the
> portal or import CSV — the seed's job is to give the dashboard a coherent
> starting state so no page renders empty.

---

## 3. Set the environment variables in Vercel

**Project → Settings → Environment Variables.** Tick **Production** and
**Preview** for each, so preview deployments behave the same.

### Required

| Variable | Value | If unset |
|---|---|---|
| `AUTH_SECRET` | `openssl rand -base64 32` | Sign-in cannot work; every attempt lands on `/login?error=Configuration`. |
| `DATA_SOURCE` | `prisma` | Defaults to `mock` — the database is ignored entirely and you will wonder why edits vanish. |
| `DATABASE_URL` | pooled string from step 1 | Every page falls back to the built-in dataset and every edit fails. |

### Required if your database has a pooler

| Variable | Value | Notes |
|---|---|---|
| `DIRECT_URL` | direct string from step 1 | Only migrations use it. Set it anyway so a future `db:deploy` from any machine works. With no pooler, set it to the same value as `DATABASE_URL`. |

### Strongly recommended

| Variable | Value | Why |
|---|---|---|
| `ENABLE_DEMO_LOGIN` | `false` | **This is the step that closes the shared-password door.** With real data behind it, the demo role-switcher must be off. Only the exact string `false` disables it. |
| `AUTH_MICROSOFT_ENTRA_ID_ID` / `_SECRET` / `_ISSUER` | from your app registration | With demo login off, Entra ID is the only way in. See [`DEPLOYMENT.md`](DEPLOYMENT.md) for the registration walkthrough. |
| `AUTH_URL` | `https://your-domain` | Required once Entra ID is on, because the OAuth redirect URI must match a fixed domain. |

### Optional

| Variable | Default |
|---|---|
| `PRIMARY_ADMIN_EMAIL` | `warisa.kantifong@qnity.com` — always resolved to ADMIN, so the portal owner cannot be locked out |
| `INTERNAL_EMAIL_DOMAINS` | `qnity.com` |

> An environment change does not rebuild the site. After editing one:
> **Deployments → ⋯ → Redeploy**.

---

## 4. Deploy

Nothing in the build command changes — `prisma generate && next build` is
already correct, and `prisma generate` needs no database connection.

Push to the tracked branch, or **Deployments → Redeploy**. First build is
two to four minutes.

---

## 5. Verify

Sign in as the administrator and check, in this order:

- [ ] **Admin Panel → Data management** shows *Record storage (PostgreSQL)*
      and **"Connected to PostgreSQL. Every change is written to the
      database."** Each register is listed against its table, badged
      **Live**. If it says anything else, stop here — the message names the
      fault.
- [ ] **Risk Management** shows the amber-free notice *"Changes are written
      to the project PostgreSQL database and are visible to everyone
      immediately."* — not the JSON-store wording.
- [ ] **New risk** → save → the row appears. **Reload the page**: it is still
      there. Redeploy the project: it is *still* there. That last step is the
      one that was impossible in mock mode.
- [ ] Set a risk to likelihood 5 × impact 5 and save — **Level** must read
      *Critical*. It is recomputed server-side, never taken from the form.
- [ ] Delete the test risk. It disappears from the register.
- [ ] **Admin Panel → Audit trail** lists your create, update and delete,
      with your name against each. These rows are now in the `AuditLog`
      table, not the function log.
- [ ] **Admin Panel → User management** → change someone's role → reload.
      The change stuck.
- [ ] Sign in as a leadership account: **no** *New risk* button, **no** edit
      pencils. Same rules as before, now sourced from the `User` table.

---

## 6. Day-two operations

### Changing the schema

```bash
# 1. edit prisma/schema.prisma
npm run prisma:migrate -- --name add_something   # creates the migration locally
git add prisma/migrations && git commit && git push
npm run db:deploy                                # apply to production
```

Apply the migration **before** the deploy that needs it. A deploy whose code
expects a column the database does not have will fail at runtime; the reverse
(a column nothing reads yet) is harmless.

### Backups

Whoever hosts the database owns this. Neon and Supabase both keep automatic
point-in-time backups on paid tiers — check the retention window matches the
project's tolerance for lost updates. For a manual snapshot before anything
risky:

```bash
pg_dump "$DIRECT_URL" --no-owner --format=custom --file=qnity-$(date +%F).dump
pg_restore --dbname="$DIRECT_URL" --clean --no-owner qnity-2026-08-03.dump
```

Take one before every migration until you trust the process.

### Exporting for Power BI

Point the dataset at the same database, read-only. The registers are ordinary
tables — `Risk`, `Milestone`, `ProcurementPackage`, `ActionItem` — and every
enum is stored as its UPPER_SNAKE string.

---

## Why migrations are not in the build

It is tempting to write `prisma migrate deploy && next build`. Resist:

- **Vercel builds run concurrently.** Two deploys racing the same migration
  can deadlock on the advisory lock, and a preview branch can migrate the
  production database.
- **A failed migration would break the build**, so a schema problem becomes a
  total outage rather than a degraded page.
- **Preview deployments share the production database** unless you give them
  their own, so a preview build would migrate production.

`npm run db:deploy` is therefore a deliberate act from a machine you control.
The wrapper (`scripts/db-deploy.mjs`) exits cleanly when `DATABASE_URL` is
absent, so it is still safe to chain into a self-hosted deploy script where
those three objections do not apply.

---

## What happens when the database is unreachable

Designed for, and verified by stopping PostgreSQL mid-session:

| | Behaviour |
|---|---|
| Dashboard and registers | Fall back to the built-in dataset so the portal stays readable, with a banner on every editable page: *"Database unavailable … The figures on this page are the built-in baseline, not live project data."* |
| Admin Panel | *Record storage (PostgreSQL)* turns red and names the connection error. |
| Saving a record | **Fails loudly.** The dialog stays open with your work intact and says the change could not be written. A write never silently falls back — an edit made against fallback data would be a phantom. |
| Signing in | **Fails closed.** User and audit reads do *not* fall back: authenticating people against the shipped demo accounts because the database blipped would turn an outage into an access-control failure. Sessions already issued keep working, because they are JWTs. |
| Recovery | Automatic. The first write through a connection the pool lost is retried once (Prisma `P1017`/`P2024`), so a database restart or maintenance window does not surface as a failed save. |

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Pages show data but edits vanish after redeploy | `DATA_SOURCE` is not exactly `prisma`. Check the Admin Panel's *Current data source* line — it prints the live value. |
| *"Can't reach database server"* in the function log (`P1001`) | Wrong host, or the database blocks Vercel's egress. Neon and Supabase allow it by default; a self-hosted server needs the firewall opened or a tunnel. |
| *"too many clients already"* | `DATABASE_URL` points at the direct connection, not the pooler. Swap it; keep the direct one in `DIRECT_URL`. |
| *"prepared statement `s0` already exists"* | Transaction pooler without `?pgbouncer=true` on `DATABASE_URL`. |
| Migration hangs or times out | It is running through the pooler. Set `DIRECT_URL` to the direct connection. |
| Admin Panel says *"no project row exists yet"* | The schema is there but `npm run seed` has not run. Editing is blocked until it does — every record hangs off the project row. |
| *"… already exists. Use a different ID."* | The register enforces a unique code per project (`@@unique([projectId, code])`). Genuinely a duplicate. |
| *"That record no longer exists. Refresh and try again."* | Somebody else deleted the row while the dialog was open. |
| A save reports fields *"left unchanged — the database requires a value there"* | You cleared a field whose column is `NOT NULL` with no sensible empty value, such as a required date. The rest of the save succeeded; give that field a value if you meant to change it. |
| Sign-in fails for everyone right after switching | Users now come from the `User` table. Run `npm run seed`, or invite the accounts from the Admin Panel. `PRIMARY_ADMIN_EMAIL` is always resolved to ADMIN, which is your way back in. |
| Build fails with *"@prisma/client did not initialize yet"* | The build command lost its `prisma generate` prefix. |
| Build fails on `DIRECT_URL` | `prisma generate` does not need it, so this is a migration command running in the build. Take it out — see above. |
