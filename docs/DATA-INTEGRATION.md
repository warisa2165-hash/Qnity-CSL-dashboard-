# Connecting real project data

The first version of the portal runs on a complete QNITY mock dataset so the
layout, KPIs and access model can be reviewed before any integration work.
This document explains how to replace that dataset with live project data.

---

## The principle

Every page reads through **one** module — `src/lib/data`. No page, component
or API route touches the mock files or Prisma directly.

```ts
// src/lib/data/index.ts
export const getRisks = () => resolve("getRisks", mock.risks);
```

`resolve()` looks at `DATA_SOURCE`:

| Value | Behaviour |
|---|---|
| `mock` (default) | Serves the built-in QNITY 2026 dataset. No database required. |
| `prisma` | Reads PostgreSQL through `prisma-repository.ts`. |

Both paths return identical shapes (`src/lib/types.ts`), so switching the
source changes nothing in the UI.

**The contract:** dates are ISO date strings (`"2026-08-01"`), money is a
plain number, enums are UPPER_SNAKE strings matching the Prisma schema, and
optional values are `null` rather than `undefined`.

---

## Step 1 — stand up the database

```bash
export DATABASE_URL="postgresql://qnity:<password>@<host>:5432/qnity_csl?schema=public"
npm run prisma:push
npm run seed          # loads the QNITY 2026 baseline as a starting point
export DATA_SOURCE=prisma
```

The portal now serves the database. From here, every route below writes into
the same schema.

---

## Step 2 — pick your source

### A. Excel / CSV

The most direct path from the trackers the project already keeps.

**Ad-hoc import.** Admin Panel → *Data management* → **Import from CSV /
Excel**. Column headings must match the corresponding export, so the
reliable workflow is: export the register first, edit that file, import it
back.

**Scripted import.** For a first bulk load, adapt `prisma/seed.ts` — it
already maps every entity. Replace the mock import with a spreadsheet reader:

```ts
import * as XLSX from "xlsx";

const book = XLSX.readFile("./data/CSL-Milestone-Tracker.xlsx");
const rows = XLSX.utils.sheet_to_json<{
  "Milestone ID": string;
  "Milestone Name": string;
  "Planned Date": string;
  Status: string;
  Owner: string;
}>(book.Sheets["Milestones"]);

await prisma.milestone.createMany({
  data: rows.map((r) => ({
    projectId,
    code: r["Milestone ID"],
    name: r["Milestone Name"],
    plannedDate: new Date(r["Planned Date"]),
    status: normaliseStatus(r.Status),   // "In Progress" → "IN_PROGRESS"
    owner: r.Owner,
    description: "",
    phase: "",
    remarks: "",
  })),
});
```

Two rules that save a lot of pain:

- **Normalise enums on the way in.** Spreadsheets hold `"In Progress"`; the
  schema holds `IN_PROGRESS`. Convert at the boundary, never in the UI.
- **Excel serial dates.** A numeric cell is days since 1899-12-30 —
  `new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000)`.

### B. SharePoint

Best fit for the Document Center and the Document Submission Tracker, since
Design Alternative and SYME072 already submit through SharePoint.

Register the app for Microsoft Graph (`Sites.Read.All`, or
`Files.ReadWrite.All` for two-way sync), then sync the library into
`Document` and `DocumentVersion`:

```ts
const files = await graph
  .api(`/sites/${siteId}/drives/${driveId}/root/children`)
  .get();

for (const file of files.value) {
  await prisma.document.upsert({
    where: { id: file.id },
    create: {
      id: file.id,
      projectId,
      name: file.name,
      folder: mapFolder(file.parentReference.path),   // → "06 IFC Drawings"
      category: "Engineering",
      revision: file.listItem?.fields?.Revision ?? "Rev.A",
      uploadedByName: file.lastModifiedBy.user.displayName,
      uploadedAt: new Date(file.lastModifiedDateTime),
      sizeKb: Math.round(file.size / 1024),
      fileType: file.name.split(".").pop()?.toUpperCase() ?? "PDF",
      approvalStatus: mapApproval(file.listItem?.fields?.ApprovalStatus),
      url: file.webUrl,
    },
    update: { revision: …, approvalStatus: …, url: file.webUrl },
  });
}
```

Map the SharePoint folder names onto the portal's thirteen folders (`01
Project Charter` … `13 Handover Documents`). Run the sync on a schedule; the
portal reads whatever the last run left behind.

Because `Document.restrictedTo` is a role list, SharePoint permissions and
portal permissions stay independent — set `restrictedTo` during the sync for
anything commercially sensitive.

### C. Power BI

Point Power BI at the **same PostgreSQL database** the portal reads. The
schema is already reporting-shaped: one project row, and dated child records
for phases, milestones, submissions, procurement, CAPEX, payments, risks,
safety, actions and attention items.

- Use *DirectQuery* for live executive reporting, or *Import* with a
  scheduled refresh.
- The `ProgressPoint` table is ready-made for an S-curve visual.
- `SafetyMonthlyStat` drives the monthly safety trend.
- Grant Power BI a **read-only** database role.

Power BI is a consumer of the portal's data, not a source for it — keep
writes flowing through the portal so the audit trail stays complete.

### D. Manual admin input

With `DATA_SOURCE=prisma`, records can be maintained in the portal itself.
The API routes under `src/app/api/` already carry the pattern: permission
check → Zod validation → Prisma write → `recordAudit()`. Extend it per
register:

```ts
export async function PATCH(request: Request, { params }) {
  const guard = await apiGuard("milestones:edit");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const parsed = MilestoneSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { id } = await params;
  await prisma.milestone.update({ where: { id }, data: parsed.data });

  await recordAudit({
    actorName: guard.user.name,
    actorEmail: guard.user.email,
    action: "UPDATE",
    entity: "Milestone",
    entityId: id,
    summary: `Updated milestone ${parsed.data.code}`,
    ipAddress: clientIp(request),
  });

  return NextResponse.json({ message: "Milestone updated." });
}
```

Never skip `recordAudit()` — the audit trail is a stated requirement of the
portal, and it is the record the handover pack depends on.

---

## Step 3 — keep the two paths honest

When you add a field:

1. `src/lib/types.ts` — the interface.
2. `src/lib/data/mock/*.ts` — the mock record.
3. `prisma/schema.prisma` — the column, then `npm run prisma:push`.
4. `src/lib/data/prisma-repository.ts` — the mapping.
5. The page's `Column[]` config.

If the mock path and the Prisma path ever disagree, the mock dataset stops
being a usable rehearsal of production. `npm run typecheck` catches most
drift, because both paths satisfy the same interfaces.

---

## Suggested sequence

| Phase | Source | Result |
|---|---|---|
| 1 | `DATA_SOURCE=mock` | Stakeholders review layout, KPIs and role access. |
| 2 | Seeded PostgreSQL | Real structure, baseline content, real persistence. |
| 3 | Excel import | The project's current registers become the live data. |
| 4 | SharePoint sync | Documents and submissions update themselves. |
| 5 | Portal as system of record | The team maintains data in the portal; Power BI reads alongside. |

---

## File uploads

`FILE_STORAGE_DRIVER=local` writes to `public/uploads`, which is adequate for
a single-server deployment and is what the first version assumes. For
production, use Azure Blob Storage or the SharePoint document library and
store only the URL in `Document.url` — that keeps the database small and puts
the files where the project's retention policy already applies.

Uploads must be size-limited (`MAX_UPLOAD_SIZE_MB`), extension-checked and
permission-gated on `<page>:upload` before anything is written to disk.
