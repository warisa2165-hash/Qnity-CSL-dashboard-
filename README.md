# QNITY CSL Laboratory Renovation 2026 — Project Dashboard Portal

Central project control and executive reporting platform for the **QNITY CSL
Laboratory Renovation 2026** project at INC2 Building, Thailand Science Park.

A single source of truth for project progress, milestone tracking, safety
performance, design submission tracking, procurement status, CAPEX equipment
tracking, risks, actions and management attention items.

| | |
|---|---|
| **Project owner** | QNITY |
| **Primary administrator** | Warisa Kantifong |
| **Consultant** | SYME072 |
| **Main contractor** | Design Alternative |
| **Target completion** | End of November 2026 |
| **Target handover** | 06 December 2026 |

Runs in Google Chrome, Microsoft Edge, Safari and Firefox. Responsive from
mobile through to desktop, with light and dark themes.

---

## Quick start

```bash
npm install
cp .env.example .env.local          # then set AUTH_SECRET
npm run dev                         # http://localhost:3000
```

Generate a secret with `openssl rand -base64 32` and paste it into
`AUTH_SECRET`. Nothing else is required — the portal ships with a complete
QNITY mock dataset and needs **no database** to run.

To put the same mock-data build on a public URL for stakeholder review, see
[`docs/DEPLOY-VERCEL.md`](docs/DEPLOY-VERCEL.md) — seven environment
variables, no database, demo sign-in left on for UAT.

### Signing in to the first version

With `ENABLE_DEMO_LOGIN=true` the login page offers a role switcher so every
role can be evaluated. The shared password is `DEMO_PASSWORD`
(default `qnity2026`).

| Demo account | Role | What they see |
|---|---|---|
| `warisa.kantifong@qnity.com` | System Administrator | Everything, including the Admin Panel |
| `peiming.zhou@qnity.com` | Leadership | Read-only executive views and reports |
| `rita.tang@qnity.com` | Leadership + procurement edit | Leadership views plus procurement/CAPEX editing |
| `rattiya.janpum@qnity.com` | Project Team | Dashboards plus progress, action and upload rights |
| `sarawut.t@syme072.co.th` | Consultant | Design and documents; financial pages denied |
| `nattapong@design-alternative.co.th` | Contractor | Design, submissions and site data; leadership pages denied |

> **Set `ENABLE_DEMO_LOGIN=false` for any production deployment.** Demo
> sign-in exists only so the portal can be reviewed before an Entra ID app
> registration is available.

---

## Technology

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, React 19, server components) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3 with the QNITY corporate palette |
| Components | shadcn/ui patterns on Radix primitives |
| Charts | Recharts |
| ORM / database | Prisma + PostgreSQL |
| Authentication | Auth.js (NextAuth v5 beta) with Microsoft Entra ID |
| Access control | Role-based, with per-user page and action overrides |

---

## Application architecture

```
qnity-csl-dashboard/
├── prisma/
│   ├── schema.prisma              Database schema (20+ models)
│   └── seed.ts                    Seeds PostgreSQL from the QNITY baseline
├── vercel.json                    Vercel framework + region pin
├── docs/
│   ├── USER-GUIDE-TH.md           คู่มือการใช้งาน (Thai user guide)
│   ├── ARCHITECTURE.md            Structure, data flow, RBAC design
│   ├── DEPLOY-VERCEL.md           UAT deployment on mock data
│   ├── DEPLOYMENT.md              Entra ID setup and hosting
│   └── DATA-INTEGRATION.md        Excel / SharePoint / Power BI / manual input
└── src/
    ├── proxy.ts                   Edge session gate (Next 16 file convention)
    ├── app/
    │   ├── layout.tsx             Root layout + theme provider
    │   ├── page.tsx               Permission-aware landing redirect
    │   ├── login/                 Entra ID + demo sign-in
    │   ├── request-access/        Public access-request form
    │   ├── no-access/             Access-denied explanation
    │   ├── (portal)/              Authenticated portal (shared shell)
    │   │   ├── dashboard/         1  Executive Dashboard
    │   │   ├── project-info/      2  Project Information
    │   │   ├── phases/            3  Project Phase Dashboard
    │   │   ├── milestones/        4  Milestone Dashboard
    │   │   ├── design/            5  Design Progress Dashboard
    │   │   ├── submissions/       6  Document Submission Tracker
    │   │   ├── procurement/       7  Procurement Dashboard
    │   │   ├── capex/             8  CAPEX 2026 Equipment Tracking
    │   │   ├── payments/          9  Milestone Payment Dashboard
    │   │   ├── risks/            10  Risk Management Dashboard
    │   │   ├── safety/           11  Safety Dashboard
    │   │   ├── actions/          12  Action Tracker
    │   │   ├── owner-attention/  13  Owner Attention Dashboard
    │   │   ├── gallery/          14  Project Gallery
    │   │   ├── documents/        15  Document Center
    │   │   ├── weekly-report/    16  Weekly Executive Report
    │   │   └── admin/                Admin Panel
    │   └── api/
    │       ├── auth/[...nextauth]/   Auth.js handlers
    │       ├── access-requests/      Submit / approve / reject access
    │       ├── admin/users/          Create, update, disable, delete users
    │       ├── export/[entity]/      Permission-checked CSV export
    │       └── search/               Permission-aware record search
    ├── components/
    │   ├── ui/                    Button, Card, Table, Tabs, Dialog, …
    │   ├── layout/                App shell, sidebar, theme, global search
    │   ├── charts/                Recharts wrappers (S-curve, funnel, donut…)
    │   └── dashboard/             KPI cards, status badges, Gantt, heat map,
    │                              and the config-driven DataTable
    └── lib/
        ├── auth.ts                Auth.js configuration and session shape
        ├── rbac.ts                Roles, pages, actions, permission resolution
        ├── guard.ts               requireUser / requirePage / requireAdmin
        ├── analytics.ts           Executive KPI derivation
        ├── audit.ts               Audit trail writer
        ├── navigation.ts          Portal navigation definition
        ├── status.ts              Traffic-light tone mapping
        ├── types.ts               Domain model
        └── data/
            ├── index.ts           The data layer every page reads through
            ├── prisma-repository.ts   PostgreSQL implementation
            └── mock/                  The QNITY 2026 mock dataset
```

---

## Roles and access control

Five roles, resolved in three layers — **role defaults → admin grants → admin
denials**. Denials are evaluated last and override everything, including the
administrator wildcard.

| Role | Access |
|---|---|
| **System Administrator** | Every page and record; user, permission and data management; audit logs |
| **Leadership View** | Read-only executive dashboards, reports and approved document downloads |
| **Project Team View** | Dashboards plus progress, milestone, action, risk, safety and upload rights |
| **Consultant View** | Design, submissions, actions and documents; no financial data unless granted |
| **Contractor View** | Drawings, revisions, schedule and progress updates; no leadership-only reports |

Every permission is a `page:action` string (`payments:approve`,
`design:upload`, `*:*`). The administrator can:

- create, invite, approve, disable and delete users
- assign and change roles
- grant edit rights on individual pages to individual users
- deny any page to any user, regardless of their role
- review the access-request queue, the login history and the audit trail

Access is enforced in three places, so no single bypass exposes data:

1. **Edge proxy** — unauthenticated requests never reach a portal route.
2. **Server components** — `requirePage()` re-checks entitlement on every
   render; the navigation is filtered from the same rules.
3. **API routes** — every route re-derives permissions from the session; the
   search and export endpoints only consult sources the caller may view.

---

## Data: mock first, real data later

The portal reads **all** project data through `src/lib/data`. Nothing else in
the codebase knows where records come from.

```
DATA_SOURCE=mock      (default)  → the built-in QNITY 2026 dataset, no database
DATA_SOURCE=prisma               → PostgreSQL through Prisma
```

### Editing without a database

Five registers can be edited in the portal on the default mock setting:
**Project Information, Milestones, Risks, Actions and Procurement**. A user
with `<page>:edit` sees a pencil on each row and an *Edit* button on the
project record; `<page>:create` adds a *New …* button; `<page>:delete` adds a
delete control inside the form.

Saving writes the whole collection to `data/<collection>.json`, and every page
reads that file from then on — through a refresh, a restart and a redeploy of
the same commit. The built-in dataset is untouched and stays the baseline for
anything not yet edited; *Admin Panel → Data management → Saved edits* shows
which collections have been changed and can reset any of them. The files are
plain JSON, meant to be committed: see [`data/README.md`](data/README.md).

> **On Vercel and other read-only hosts** the application directory cannot be
> written, so the store falls back to a temporary directory. Edits save and
> display normally but are lost when the instance recycles — the edit pages
> and the Admin Panel say so explicitly rather than losing work quietly. For
> permanent storage, run where `data/` is writable or connect PostgreSQL.

### Moving to real data

```bash
# 1. Point at a PostgreSQL instance
DATABASE_URL="postgresql://user:pass@host:5432/qnity_csl?schema=public"

# 2. Create the schema and load the QNITY baseline
npm run db:deploy
npm run seed

# 3. Switch the data source
DATA_SOURCE=prisma
```

No page component changes, and any edits already saved under `data/` remain
as a readable record of what was changed. `docs/DATA-INTEGRATION.md` covers
loading from Excel/CSV, SharePoint document libraries, Power BI and manual
admin input.

---

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | `prisma generate` then the production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run prisma:generate` | Regenerate the Prisma client |
| `npm run db:deploy` | Apply `prisma/migrations` to the database |
| `npm run db:setup` | `db:deploy` then `seed`, in one step |
| `npm run db:check` | Diagnose the production database — config, connection, schema, seed state |
| `npm run prisma:push` | Push the schema without a migration (development only) |
| `npm run prisma:migrate` | Create a migration |
| `npm run prisma:studio` | Browse the database |
| `npm run seed` | Seed the QNITY 2026 baseline (refuses to overwrite a populated database; `-- --force` to override) |

---

## Design system

Microsoft-style corporate executive dashboard.

| Token | Hex | Use |
|---|---|---|
| Primary blue | `#0078D4` | Primary actions, in-progress state, charts |
| Secondary blue | `#106EBE` | Hover, secondary emphasis |
| Success green | `#107C10` | On track, approved, completed |
| Warning yellow | `#FFB900` | Watch items, pending review |
| Critical red | `#D13438` | Management attention, overdue, delayed |
| Neutral grey | `#605E5C` | Secondary text, planned baselines |
| Background | `#F3F2F1` | Page background (light theme) |

Traffic-light language is consistent across every page:

- **Green** — On Track
- **Yellow** — On Track with Watch Items
- **Red** — Critical / Management Attention Required

---

## Reporting and export

- **Weekly Executive Report** exports to PDF through the browser's own
  print pipeline (`Export as PDF`), which behaves identically in Chrome,
  Edge, Safari and Firefox. The print stylesheet strips navigation and
  interactive controls.
- **Every register** exports to CSV, both from the table toolbar and from the
  Admin Panel's data management tab. Exports are permission-checked and
  written to the audit trail.

---

## Security

- Microsoft Entra ID single sign-on; an Entra account with no active portal
  record cannot sign in — the administrator provisions or approves it first.
- Eight-hour JWT sessions; authorisation claims refresh on sign-in and on
  session update, so a permission change takes effect without a sign-out.
- Protected routes, admin-only routes and read-only leadership access.
- External users are flagged and can be denied any section individually.
- Role-restricted documents are filtered server-side — a user outside the
  access list never receives the record.
- An administrator cannot disable, demote or delete their own account.
- Full audit trail: create, update, delete, approve, reject, upload,
  download, permission change, sign-in and denied access attempts.
- Security headers set on every response (`X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).

---

## Documentation

- [`docs/USER-GUIDE-TH.md`](docs/USER-GUIDE-TH.md) — คู่มือการใช้งาน (Thai user guide for admin, user and visitor)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — structure, data flow and RBAC design
- [`docs/DEPLOY-VERCEL.md`](docs/DEPLOY-VERCEL.md) — UAT deployment to Vercel on mock data, demo login enabled
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Entra ID registration, database and hosting
- [`docs/DATA-INTEGRATION.md`](docs/DATA-INTEGRATION.md) — connecting Excel, SharePoint, Power BI and manual input
- [`data/README.md`](data/README.md) — the JSON store behind the admin edit forms

---

Internal use only · Data classification: QNITY Confidential
