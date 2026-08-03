# Production mode — Neon PostgreSQL on Vercel

Converts the portal from its built-in dataset (`DATA_SOURCE=mock`) to
**Neon PostgreSQL**, where create, edit and delete persist and the audit
trail is written to the database. This is the deployment that can carry the
project of record.

Mock-only UAT instead: [`DEPLOY-VERCEL.md`](DEPLOY-VERCEL.md).
Self-hosting on a VM or Azure: [`DEPLOYMENT.md`](DEPLOYMENT.md).

**Time required:** about 30 minutes. No code changes — the application
already contains both paths.

---

## What conversion changes

| | Before (`mock`) | After (`prisma`) |
|---|---|---|
| Reads | Built-in dataset + `data/*.json` overlay | Neon PostgreSQL |
| Edits to the five registers | JSON files — lost when Vercel recycles the instance | Rows in PostgreSQL, permanent |
| Invite user, change role, approve access request | Validated and audited, then discarded | Persisted |
| Audit trail | Seeded history; new entries go to the function log | Every entry written to `AuditLog` |
| Roles, permissions, per-user grants and denials | Built-in user list | `User` table — **same rules, same code** |
| Demo sign-in | On | **Off by default** — see [step 5](#5-close-the-demo-door) |

Nothing about the access model changes. `lib/rbac.ts` remains the only
authority on who may do what, the server actions re-check permissions on
every call, and per-user `grants`/`denials` move into the `User` columns of
the same name. The seed carries the existing eleven accounts across intact.

---

## 1. Create the Neon database

[neon.tech](https://neon.tech) → **New Project**, or add Neon from the
Vercel Marketplace (Vercel → Integrations → Neon), which sets `DATABASE_URL`
in the project for you — you will still add `DIRECT_URL` by hand.

- **Region:** `ap-southeast-1` (Singapore) — nearest Thailand Science Park,
  and it matches the `sin1` function region already pinned in `vercel.json`.
  A mismatched region adds a round trip to every query.
- **Postgres version:** 16 or later.
- **Database name:** `qnity_csl`.

The free tier is sufficient for this portal's data volume; the paid tier is
worth it for the longer point-in-time restore window once real data lands.

### Two connection strings, not one

Neon Console → **Connect**. Copy both forms:

```bash
# POOLED — what the running app uses. Host contains "-pooler".
DATABASE_URL="postgresql://USER:PASS@ep-xxxx-pooler.ap-southeast-1.aws.neon.tech/qnity_csl?sslmode=require"

# DIRECT — what migrations use. Same host WITHOUT "-pooler".
DIRECT_URL="postgresql://USER:PASS@ep-xxxx.ap-southeast-1.aws.neon.tech/qnity_csl?sslmode=require"
```

Both are needed, for opposite reasons:

- Every Vercel invocation opens its own connection. Without the **pooler**,
  a busy dashboard exhausts the connection limit and requests fail with
  *"too many clients already"*.
- Prisma's migration engine needs advisory locks and DDL that a transaction
  pooler cannot carry, so a migration through the pooled string **hangs**.

That is why `prisma/schema.prisma` declares both:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooled — the running app
  directUrl = env("DIRECT_URL")     // direct — migrations only
}
```

Keep `sslmode=require`; Neon refuses unencrypted connections. If the console
hands you `channel_binding=require`, keep that too.

> **Getting these the wrong way round is the single most common mistake.**
> `npm run db:check` detects it and says so.

---

## 2. Create the schema and seed the baseline

Run **from your own machine**, once, before the first production deploy.
Migrations are deliberately not part of the Vercel build — see
[why](#why-migrations-are-not-in-the-build).

```bash
git clone https://github.com/warisa2165-hash/Qnity-CSL-dashboard-.git
cd Qnity-CSL-dashboard-
npm install

export DATABASE_URL="…pooled…"
export DIRECT_URL="…direct…"

npm run db:deploy    # applies prisma/migrations — creates every table
npm run seed         # loads the QNITY 2026 baseline
```

`npm run db:setup` runs both in one step.

The seed writes the same dataset the portal serves in mock mode — the real
project structure, not placeholder rows:

```
  ✓ 11 users                    ✓ 14 procurement packages
  ✓ 4 access requests           ✓ 12 CAPEX equipment items
  ✓ project QN-CSL-2026         ✓ 5 payment milestones
  ✓ 6 phases, 6 schedule links  ✓ 15 risks
  ✓ 13 milestones               ✓ 12 safety reports
  ✓ 14 design packages          ✓ 24 actions
  ✓ 18 document submissions     ✓ 8 owner attention items
  ✓ 20 documents                ✓ 12 gallery photos
  ✓ 2 weekly reports            ✓ 18 audit log entries
```

Those become ordinary editable rows. Correct them in the portal, or import
CSV over them — the seed's job is to give every page a coherent starting
state so nothing renders empty on day one.

### The seed is destructive, and refuses to prove it twice

`npm run seed` clears the project graph and the user table before writing.
That is what makes it repeatable during setup and catastrophic afterwards,
so it **refuses to run against a database that already holds data**:

```
Refusing to seed: this database already holds data.

  projects: 1    users: 11    audit entries: 342
```

If you genuinely mean to discard what is there, back up first, then
`npm run seed -- --force`.

---

## 3. Verify before you deploy

```bash
DATA_SOURCE=prisma npm run db:check
```

```
Configuration
  ✓ DATA_SOURCE=prisma — the portal reads and writes PostgreSQL
  ✓ DATABASE_URL → postgresql://***:***@ep-xxxx-pooler.…/qnity_csl?sslmode=require
  ✓ DIRECT_URL   → postgresql://***:***@ep-xxxx.…/qnity_csl?sslmode=require

Connection
  ✓ answered in 93 ms
  ✓ PostgreSQL 16.13

Schema
  ✓ 1 migration(s) applied
      20260803000000_init

Data
  ✓ 1 project, 11 users
  ✓ 13 milestones · 15 risks · 24 actions · 14 procurement packages
  ✓ 18 audit entries

All checks passed. The portal is ready to serve live data.
```

It exits non-zero on anything that would stop the portal working, so it can
gate a deploy script. Passwords are masked, so the output is safe to paste
into a ticket.

---

## 4. Set the Vercel environment variables

**Project → Settings → Environment Variables**, ticking **Production** and
**Preview** for each. Full annotated template:
[`.env.production.example`](../.env.production.example).

### Required

| Variable | Value | If unset |
|---|---|---|
| `DATA_SOURCE` | `prisma` | Defaults to `mock`. The portal serves its built-in dataset and ignores the database — pages render, edits appear to work, nothing is written. |
| `DATABASE_URL` | pooled string | Every page falls back to the built-in dataset and every edit fails. |
| `DIRECT_URL` | direct string | Migrations hang. The running app does not need it, so this fails later rather than sooner. |
| `AUTH_SECRET` | `openssl rand -base64 32` | Sign-in cannot work; every attempt lands on `/login?error=Configuration`. |

### Required for anyone to sign in

| Variable | Value |
|---|---|
| `AUTH_MICROSOFT_ENTRA_ID_ID` / `_SECRET` / `_ISSUER` | From your Azure app registration. Redirect URI: `{AUTH_URL}/api/auth/callback/microsoft-entra-id`. Walkthrough in [`DEPLOYMENT.md`](DEPLOYMENT.md). |
| `AUTH_URL` | `https://your-domain` — the OAuth redirect URI must match a fixed origin. |

### Optional

| Variable | Default |
|---|---|
| `PRIMARY_ADMIN_EMAIL` | `warisa.kantifong@qnity.com` — always resolved to ADMIN, so the portal owner cannot be locked out |
| `INTERNAL_EMAIL_DOMAINS` | `qnity.com` |

> An environment change does not rebuild the site. After editing one:
> **Deployments → ⋯ → Redeploy**.

---

## 5. Close the demo door

`ENABLE_DEMO_LOGIN` **does not need to be set.** With `DATA_SOURCE=prisma`
the shared-password provider is disabled by default: a door opened by one
password published in this repository has no business standing in front of
real project records, and relying on somebody remembering to set a variable
is the wrong way round.

The login page says so rather than showing an empty panel:

> **Demo sign-in is disabled.** This deployment serves live project data
> (`DATA_SOURCE=prisma`), so the shared demo password is closed by default.
> Sign in with Microsoft Entra ID above.

**If Entra ID is not wired up yet**, that leaves no way in. To test the
migration first, set `ENABLE_DEMO_LOGIN=true` *and* a strong `DEMO_PASSWORD`
(`openssl rand -base64 18`), then remove both before real data goes in.

A mock deployment is unaffected — it is a demonstration, and keeps the role
switcher.

---

## 6. Deploy

No build-command change: `prisma generate && next build` is already correct,
and `prisma generate` opens no database connection.

Push to the tracked branch, or **Deployments → Redeploy**. Two to four
minutes.

---

## 7. Verify the running deployment

Sign in as the administrator and check, in order:

- [ ] **Admin Panel → Data management** shows *Record storage (PostgreSQL)*
      and **"Connected to PostgreSQL. Every change is written to the
      database."** Each register is listed against its table, badged
      **Live**. Anything else, and the message names the fault.
- [ ] **Risk Management** shows *"Changes are written to the project
      PostgreSQL database and are visible to everyone immediately"* — not
      the JSON-store wording.
- [ ] **New risk** → save → the row appears. Reload: still there. **Redeploy
      the project: still there.** That last step is the one that was
      impossible in mock mode.
- [ ] Set a risk to likelihood 5 × impact 5 — **Level** must read *Critical*.
      It is recomputed server-side, never taken from the form.
- [ ] Delete the test risk.
- [ ] **Admin Panel → Audit trail** lists your create, update and delete with
      your name against each. These rows are in `AuditLog` now, not the
      function log.
- [ ] **User management** → change a role → reload. It stuck.
- [ ] Sign in as a leadership account: no *New risk* button, no edit pencils.

---

## 8. Day-two operations

### Changing the schema

```bash
# 1. edit prisma/schema.prisma
npm run prisma:migrate -- --name add_something   # create the migration
git add prisma/migrations && git commit && git push
npm run db:deploy                                # apply to production
```

Apply the migration **before** the deploy that needs it. Code expecting a
column the database lacks fails at runtime; a column nothing reads yet is
harmless.

### Backups

Neon keeps automatic point-in-time restore; check the retention window on
your plan matches the project's tolerance for lost updates. Before anything
risky — a migration, a `--force` seed — take your own:

```bash
pg_dump "$DIRECT_URL" --no-owner --format=custom --file=qnity-$(date +%F).dump
pg_restore --dbname="$DIRECT_URL" --clean --no-owner qnity-2026-08-03.dump
```

Use `DIRECT_URL`; `pg_dump` through a transaction pooler is unreliable.

### Neon branching

Neon can branch a database like git. A branch is a copy-on-write clone with
its own connection string, which makes it the right way to rehearse a
migration against production-shaped data: branch, point `DIRECT_URL` at the
branch, run `db:deploy`, throw it away.

### Power BI

Point the dataset at the same database, read-only. The registers are
ordinary tables — `Risk`, `Milestone`, `ProcurementPackage`, `ActionItem` —
and every enum is stored as its UPPER_SNAKE string.

---

## Why migrations are not in the build

It is tempting to write `prisma migrate deploy && next build`. Resist:

- **Vercel builds run concurrently.** Two deploys racing the same migration
  can deadlock on the advisory lock.
- **Preview deployments share the production database** unless you give them
  their own, so a preview build would migrate production.
- **A failed migration would break the build**, turning a schema problem into
  a total outage instead of a degraded page.

`npm run db:deploy` is therefore a deliberate act from a machine you control.
The wrapper (`scripts/db-deploy.mjs`) exits cleanly when `DATABASE_URL` is
absent, so it is still safe to chain into a self-hosted deploy script where
those objections do not apply.

---

## What happens when the database is unreachable

Designed for, and verified by stopping PostgreSQL mid-session:

| | Behaviour |
|---|---|
| Dashboard and registers | Fall back to the built-in dataset so the portal stays readable, with a banner on every editable page: *"Database unavailable … the built-in baseline, not live project data."* |
| Admin Panel | *Record storage (PostgreSQL)* turns red and names the connection error. |
| Saving a record | **Fails loudly.** The dialog stays open with your work intact. A write never falls back — an edit saved against fallback data would be a phantom. |
| Signing in | **Fails closed.** User and audit reads do not fall back: authenticating people against the shipped demo accounts because the database blipped would turn an outage into an access-control failure. Existing sessions keep working, because they are JWTs. |
| Recovery | Automatic. The first write through a connection the pool lost is retried once (`P1017`/`P2024`), which also covers Neon waking from auto-suspend. |

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Pages show data but edits vanish after redeploy | `DATA_SOURCE` is not exactly `prisma`. The Admin Panel's *Current data source* line prints the live value. |
| *"Can't reach database server"* (`P1001`) | Wrong host, or the database is suspended and slow to wake. Run `npm run db:check`. |
| *"too many clients already"* | `DATABASE_URL` points at the direct connection. Swap it; keep the direct one in `DIRECT_URL`. |
| Migration hangs | It is running through the pooler. Set `DIRECT_URL` to the non-`-pooler` host. |
| *"prepared statement `s0` already exists"* | A transaction pooler without the flag Prisma expects. On Neon use the `-pooler` host; on Supabase add `?pgbouncer=true`. |
| First request each morning is slow | Neon auto-suspend. The database resumes in about a second; only the first query pays it. Disable auto-suspend on a paid plan if it bothers people. |
| Admin Panel says *"no project row exists yet"* | Schema migrated but not seeded. `npm run seed`. |
| The login page offers no way in at all | Expected in production: demo sign-in is closed and Entra ID is not configured. See [step 5](#5-close-the-demo-door). |
| Sign-in fails for everyone right after switching | Users now come from the `User` table. Run `npm run seed`, or invite accounts from the Admin Panel. `PRIMARY_ADMIN_EMAIL` is always ADMIN, which is your way back in. |
| *"… already exists. Use a different ID."* | The register enforces a unique code per project. Genuinely a duplicate. |
| A save reports fields *"left unchanged — the database requires a value there"* | You cleared a field whose column is `NOT NULL` with no sensible empty value, such as a required date. The rest of the save succeeded. |
| Build fails: *"@prisma/client did not initialize yet"* | The build command lost its `prisma generate` prefix. |
