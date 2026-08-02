# Architecture

QNITY CSL Laboratory Renovation 2026 — Project Dashboard Portal.

---

## 1. Shape of the application

Next.js 16 App Router, server components by default. A page is a server
component that:

1. calls a guard (`requirePage("risks")`) to establish identity and
   entitlement,
2. reads records through the data layer (`getRisks()`),
3. derives its numbers through `lib/analytics`, and
4. renders presentation components.

Client components exist only where interaction demands them: the app shell,
the data table, charts, dialogs and the admin editors. They receive plain
serializable props, never functions.

```
Browser
  │
  ├─ proxy.ts ................. session cookie present?  (edge)
  │
  ├─ app/(portal)/layout.tsx .. requireUser() + build the permitted nav
  │
  └─ app/(portal)/<page> ...... requirePage(<key>)
                                  │
                                  ├─ lib/data  ....... records
                                  ├─ lib/analytics ... derived KPIs
                                  └─ components ...... render
```

---

## 2. The data layer

`src/lib/data/index.ts` is the only module that knows where data comes from.

```ts
export const getRisks = () => resolve("getRisks", mock.risks);
```

`resolve()` checks `DATA_SOURCE`. With `prisma` it dynamically imports
`prisma-repository.ts` and calls the matching method; with `mock` — or if the
database is unreachable — it returns the built-in dataset. The dynamic import
matters: a mock-mode deployment never needs `DATABASE_URL`, and a transient
database outage degrades to the baseline rather than an empty dashboard.

Both implementations return **identical shapes**, defined in `lib/types.ts`.
Dates are ISO date strings (`2026-08-01`), money is a plain number, and enums
are the same UPPER_SNAKE strings the Prisma schema uses. That is what makes
`DATA_SOURCE` a one-line switch.

### The JSON overlay

Five collections — project, milestones, risks, actions, procurement — are
editable without a database. Their getters go through `overlay()` instead:

```ts
export const getRisks = () => overlay("risks", "getRisks", mock.risks);
```

`overlay()` asks `data/store.ts` for a saved `data/<collection>.json` and
returns it if present; otherwise it falls through to `resolve()` and the
baseline. So the mock dataset is never mutated, and the switch happens one
collection at a time. `store.ts` is imported dynamically because it touches
`node:fs`, which must never be pulled into the edge bundle that `proxy.ts`
compiles to.

`store.ts` resolves its write location once per process: the repository's
`data/` directory if that is writable, otherwise the OS temp directory with
`durable: false`. Callers surface that flag rather than assuming a write
succeeded — a read-only host (Vercel) accepts edits and loses them on
recycle, and the UI has to be able to say so. Writes go to a sibling `.tmp`
file and are renamed into place, so a crash mid-write cannot leave a
half-written file that the next read would reject.

### Editing: schema in one place

`lib/records.ts` declares each editable entity — its collection, its page (the
`<page>:edit` permission checked against it), and its fields as plain data.
That single declaration drives the form (`components/dashboard/record-editor.tsx`),
the coercion and validation, and what `lib/actions/records.ts` will accept:
only declared keys, coerced to declared types. The field list being plain data
is what lets a server component hand a whole form schema across the client
boundary, the same way `Column[]` already works for tables.

Derived fields are computed server-side and never taken from the form — a
risk's `level` from likelihood × impact, an action's `lastUpdated` from the
edit itself — because a hand-entered value there would let the register
contradict itself.

### Adding a field

1. Add it to the interface in `lib/types.ts`.
2. Add it to the mock records.
3. Add the column to `prisma/schema.prisma` and map it in
   `prisma-repository.ts`.
4. Add it to the page's `Column[]` config.
5. If the register is editable, add a `FieldDef` to `lib/records.ts` — that
   alone puts it in the form, the validation and the saved record.

---

## 3. Access control

`src/lib/rbac.ts` is the single authority. Three layers, resolved in order:

```
role defaults  →  admin grants  →  admin denials      (denials always win)
```

A permission is `"<pageKey>:<action>"`, with `"<pageKey>:*"` and `"*:*"`
wildcards. Seventeen page keys, seven actions.

```ts
can(profile, "payments:approve")   // → boolean
visiblePages(profile)              // → PageKey[]  (drives the sidebar)
```

`ADMIN` holds `*:*`. A per-user denial of `payments:*` removes the payments
page even from an administrator — deliberate, so the primary administrator
can construct any policy the project needs without inventing new roles.

### Enforcement points

| Layer | File | Responsibility |
|---|---|---|
| Edge | `proxy.ts` | Is there a session cookie? Cheap, no Node stack on the edge. Named `proxy` since Next 16 renamed the `middleware` convention. |
| Layout | `app/(portal)/layout.tsx` | Authenticate, filter the navigation. |
| Page | `lib/guard.ts` | `requirePage()` re-checks entitlement on every render. |
| API | `lib/guard.ts` / route handlers | Re-derive permissions from the session. |
| Record | Page code | Role-restricted documents are filtered before rendering. |

The edge proxy intentionally does **not** carry the authorisation decision.
It only avoids pointless work for anonymous requests; every authoritative
check runs server-side where the full session is available.

---

## 4. Authentication

Auth.js (NextAuth v5), JWT sessions, eight-hour lifetime.

- **Microsoft Entra ID** is the production provider, registered only when
  `AUTH_MICROSOFT_ENTRA_ID_ID` and `..._SECRET` are set.
- **Demo credentials** provider is registered only when
  `ENABLE_DEMO_LOGIN` is not `"false"`, so it disappears entirely in
  production.

Entra ID authenticates; the portal authorises. The `signIn` callback rejects
any identity without an **active portal record**, so directory membership
alone grants nothing. The `jwt` callback re-reads the user's role, grants and
denials on sign-in and on session update, so an administrator's permission
change lands without the user signing out. The primary administrator
(`PRIMARY_ADMIN_EMAIL`) is always resolved to `ADMIN` + `ACTIVE`, so the
portal owner cannot be locked out.

---

## 5. Presentation

### The config-driven table

`components/dashboard/data-table.tsx` renders every register in the portal.
Columns are declarative — `{ key, header, type }` — with no render callbacks,
so a **server component can pass its table configuration straight across the
client boundary**. That is why the tracker pages have no client wrapper file.

```tsx
const COLUMNS: Column[] = [
  { key: "code",     header: "ID",     type: "code" },
  { key: "level",    header: "Level",  type: "risk" },
  { key: "dueDate",  header: "Due",    type: "dueDate", statusKey: "status" },
];
```

Cell types: `text · code · date · dueDate · currency · percent · progress ·
status · risk · number · list · boolean`. `dueDate` reads `statusKey` so a
closed record is never flagged overdue. The table provides search, per-column
filters, sorting and CSV export for free.

### Status language

`lib/status.ts` maps every status string in the domain onto one of six tones
(`success · warning · critical · info · neutral · muted`). Badges, KPI cards,
progress bars, the heat map and the chart palette all resolve colour through
it, so "Delayed" is the same red everywhere.

### Server-rendered visuals

The Gantt (`dashboard/gantt.tsx`) and risk heat map
(`dashboard/risk-heatmap.tsx`) are plain server-rendered markup rather than
chart-library output, so they print correctly in the PDF export and cost no
client JavaScript.

---

## 6. Derived numbers

`lib/analytics.ts` computes every KPI on the executive dashboard from the
underlying records — `getExecutiveSummary()` fans out across nine sources,
rolls each domain up to a traffic light, and takes the worst as project
health. The landing page can therefore never disagree with the detail page it
summarises.

Thresholds live in one place:

| Area | Red | Yellow |
|---|---|---|
| Safety | score < 90 | score < 95 |
| Risk | any critical open risk | more than 2 high risks |
| Milestones | any delayed | any at risk |
| Procurement | 3+ packages at risk | any package at risk |
| CAPEX | any critical item | any high-risk item |
| Payment | any milestone on hold | any pending approval |

---

## 7. Audit trail

`lib/audit.ts` writes to the immutable `AuditLog` table in Prisma mode and to
the server log in mock mode, so the trail is observable during evaluation.
Every mutating API route records the actor, action, entity, summary and
client IP; permission changes also store a before/after snapshot.

---

## 8. Conventions

- Server component unless interaction requires otherwise.
- Data through `lib/data` — never import `mock/` or `@/lib/db` from a page.
- Colour through `lib/status` — never hard-code a status colour.
- Guard first: the first statement of a page is its `requirePage()` call.
- Wide content scrolls inside its own container; the page body never scrolls
  horizontally.
- Both themes styled; the toggle must win in both directions.
