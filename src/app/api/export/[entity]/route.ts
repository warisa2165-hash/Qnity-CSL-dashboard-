import { NextResponse } from "next/server";

import { currentUser, toAccessProfile } from "@/lib/auth";
import { can, type PageKey } from "@/lib/rbac";
import * as data from "@/lib/data";
import { toCsv } from "@/lib/utils";
import { clientIp, recordAudit } from "@/lib/audit";

type Loader = () => Promise<readonly object[]>;

/** Each export is bound to the page permission that owns the register. */
const EXPORTS: Record<string, { page: PageKey; load: Loader }> = {
  milestones: { page: "milestones", load: data.getMilestones },
  design: { page: "design", load: data.getDesignPackages },
  submissions: { page: "submissions", load: data.getSubmissions },
  procurement: { page: "procurement", load: data.getProcurement },
  capex: { page: "capex", load: data.getCapex },
  payments: { page: "payments", load: data.getPayments },
  risks: { page: "risks", load: data.getRisks },
  safety: { page: "safety", load: data.getSafetyReports },
  actions: { page: "actions", load: data.getActions },
  attention: { page: "owner-attention", load: data.getAttentionItems },
  phases: { page: "phases", load: data.getPhases },
  audit: { page: "admin", load: data.getAuditLogs },
};

/** Flatten arrays and nested objects so the CSV stays one row per record. */
function flatten(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (Array.isArray(value)) {
      out[key] = value
        .map((v) => (typeof v === "object" && v !== null ? JSON.stringify(v) : v))
        .join(" | ");
    } else if (value !== null && typeof value === "object") {
      out[key] = JSON.stringify(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ entity: string }> },
) {
  const { entity } = await params;
  const user = await currentUser();
  const profile = toAccessProfile(user);

  if (!user || !profile) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const config = EXPORTS[entity];
  if (!config) {
    return NextResponse.json({ error: "Unknown export" }, { status: 404 });
  }

  if (!can(profile, `${config.page}:download`) && !can(profile, `${config.page}:view`)) {
    return NextResponse.json(
      { error: `You are not permitted to export ${entity}.` },
      { status: 403 },
    );
  }

  const rows = (await config.load()).map((row) =>
    flatten(row as Record<string, unknown>),
  );
  const csv = toCsv(rows);

  await recordAudit({
    actorName: user.name,
    actorEmail: user.email,
    action: "DOWNLOAD",
    entity: "Export",
    entityId: entity,
    summary: `Exported ${rows.length} ${entity} records as CSV`,
    ipAddress: clientIp(request),
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="qnity-csl-${entity}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
