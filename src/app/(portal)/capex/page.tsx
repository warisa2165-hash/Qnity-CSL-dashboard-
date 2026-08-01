import { Truck, Wrench } from "lucide-react";

import { requirePage } from "@/lib/guard";
import { getCapex } from "@/lib/data";
import { capexStats, capexProgress } from "@/lib/analytics";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { TONE_DOT, toneFor } from "@/lib/status";
import type { CapexEquipment, StageStatus } from "@/lib/types";

import { PageHeader, SectionTitle } from "@/components/dashboard/page-header";
import { KpiCard, CounterTile } from "@/components/dashboard/kpi-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { GroupedBarChart } from "@/components/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "CAPEX 2026 Equipment Tracking" };

/** The ten tracked stages, in the order an item moves through them. */
const STAGES: { key: keyof CapexEquipment; label: string; short: string }[] = [
  { key: "rfqStatus", label: "RFQ", short: "RFQ" },
  { key: "technicalEvaluationStatus", label: "Technical evaluation", short: "TE" },
  { key: "commercialEvaluationStatus", label: "Commercial evaluation", short: "CE" },
  { key: "poStatus", label: "Purchase order", short: "PO" },
  { key: "manufacturingStatus", label: "Manufacturing", short: "MFG" },
  { key: "shippingStatus", label: "Shipping", short: "SHIP" },
  { key: "deliveryStatus", label: "Delivery", short: "DEL" },
  { key: "installationStatus", label: "Installation", short: "INST" },
  { key: "commissioningStatus", label: "Commissioning", short: "COM" },
  { key: "trainingStatus", label: "Training", short: "TRN" },
];

const STAGE_DOT: Record<StageStatus, string> = {
  COMPLETED: "bg-success",
  IN_PROGRESS: "bg-primary",
  DELAYED: "bg-destructive",
  NOT_STARTED: "bg-muted-foreground/25",
  NOT_APPLICABLE: "bg-transparent border border-dashed border-muted-foreground/40",
};

const COLUMNS: Column[] = [
  { key: "code", header: "ID", type: "code", className: "w-16" },
  { key: "name", header: "Equipment", wrap: true, className: "min-w-[14rem]" },
  { key: "category", header: "Category" },
  { key: "capexNumber", header: "CAPEX no.", hideOnMobile: true },
  { key: "vendor", header: "Vendor" },
  { key: "budget", header: "Budget", type: "currency" },
  { key: "owner", header: "Owner", hideOnMobile: true },
  { key: "targetDeliveryDate", header: "Target delivery", type: "dueDate", statusKey: "deliveryStatus" },
  { key: "actualDeliveryDate", header: "Actual delivery", type: "date" },
  { key: "leadTimeWeeks", header: "Lead (wk)", type: "number", hideOnMobile: true },
  { key: "isLongLead", header: "Long lead", type: "boolean", hideOnMobile: true },
  { key: "riskLevel", header: "Risk", type: "risk" },
  { key: "remarks", header: "Remarks", wrap: true, className: "min-w-[18rem]" },
];

export default async function CapexPage() {
  const { can } = await requirePage("capex");
  const equipment = await getCapex();
  const stats = capexStats(equipment);

  const byCategory = [...new Set(equipment.map((e) => e.category))].map(
    (category) => {
      const rows = equipment.filter((e) => e.category === category);
      return {
        category,
        budget: Math.round(
          rows.reduce((sum, r) => sum + r.budget, 0) / 1_000_000,
        ),
        progress: Math.round(
          rows.reduce((s, r) => s + capexProgress(r), 0) / rows.length,
        ),
      };
    },
  );

  return (
    <>
      <PageHeader
        title="CAPEX 2026 Equipment Tracking"
        description="New CAPEX 2026 laboratory equipment from RFQ through evaluation, purchase order, manufacturing, delivery, installation, commissioning and user training."
        readOnly={!can("capex:edit")}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="CAPEX 2026 budget"
          value={formatCurrency(stats.totalBudget, "THB", true)}
          tone="info"
          hint={`${stats.total} equipment items`}
        />
        <KpiCard
          label="Average completion"
          value={`${Math.round(stats.averageProgress)}%`}
          tone="info"
          progress={stats.averageProgress}
          hint="Across all applicable stages"
        />
        <KpiCard
          label="PO issued"
          value={`${stats.poIssued} / ${stats.total}`}
          tone="success"
          progress={(stats.poIssued / stats.total) * 100}
        />
        <KpiCard
          label="High / critical risk items"
          value={stats.atRisk}
          tone={stats.atRisk > 3 ? "critical" : "warning"}
          hint={`${stats.longLead} long-lead items`}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <CounterTile label="Pending RFQ" value={stats.pendingRfq} tone="warning" />
        <CounterTile label="Pending technical review" value={stats.pendingTechnicalReview} tone="warning" />
        <CounterTile label="Long lead items" value={stats.longLead} tone="info" />
        <CounterTile label="Delayed equipment" value={stats.delayed} tone={stats.delayed ? "critical" : "success"} />
        <CounterTile label="Ready for installation" value={stats.readyForInstallation} tone="success" />
        <CounterTile label="Commissioning complete" value={stats.commissioned} tone="success" />
      </div>

      {/* --------------------------- Stage matrix -------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Equipment status summary</CardTitle>
          <p className="text-sm text-muted-foreground">
            Every item against the ten tracked stages. Hover a marker for the
            stage status.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[52rem] text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Equipment
                  </th>
                  {STAGES.map((s) => (
                    <th
                      key={String(s.key)}
                      title={s.label}
                      className="px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {s.short}
                    </th>
                  ))}
                  <th className="py-2 pl-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Progress
                  </th>
                  <th className="py-2 pl-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Risk
                  </th>
                </tr>
              </thead>
              <tbody>
                {equipment.map((item) => (
                  <tr key={item.id} className="border-b border-border/60">
                    <td className="py-2.5 pr-3">
                      <p className="text-sm font-medium leading-tight">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.code} · {item.capexNumber} ·{" "}
                        {formatCurrency(item.budget, "THB", true)}
                      </p>
                    </td>
                    {STAGES.map((s) => {
                      const value = item[s.key] as StageStatus;
                      return (
                        <td key={String(s.key)} className="px-1 py-2.5 text-center">
                          <span
                            title={`${s.label}: ${value.replace(/_/g, " ").toLowerCase()}`}
                            className={cn(
                              "inline-block h-3 w-3 rounded-full",
                              STAGE_DOT[value],
                            )}
                          />
                        </td>
                      );
                    })}
                    <td className="py-2.5 pl-3 text-right text-sm tabular-nums">
                      {Math.round(capexProgress(item))}%
                    </td>
                    <td className="py-2.5 pl-3 text-right">
                      <StatusBadge status={item.riskLevel} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            {(
              [
                ["COMPLETED", "Completed"],
                ["IN_PROGRESS", "In progress"],
                ["DELAYED", "Delayed"],
                ["NOT_STARTED", "Not started"],
                ["NOT_APPLICABLE", "Not applicable"],
              ] as [StageStatus, string][]
            ).map(([key, label]) => (
              <span key={key} className="flex items-center gap-1.5">
                <span className={cn("h-3 w-3 rounded-full", STAGE_DOT[key])} />
                {label}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>CAPEX budget by category (THB millions)</CardTitle>
          </CardHeader>
          <CardContent>
            <GroupedBarChart
              data={byCategory}
              xKey="category"
              layout="vertical"
              height={260}
              series={[{ key: "budget", name: "Budget (THB m)", color: "#0078D4" }]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              Long lead &amp; delivery watch list
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {equipment
              .filter((e) => e.isLongLead || ["HIGH", "CRITICAL"].includes(e.riskLevel))
              .map((e) => (
                <div
                  key={e.id}
                  className="border-b border-border/60 pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{e.name}</p>
                    <StatusBadge status={e.riskLevel} tone={toneFor(e.riskLevel)} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {e.leadTimeWeeks} week lead time · target{" "}
                    {formatDate(e.targetDeliveryDate)} · owner {e.owner}
                  </p>
                  <p className="mt-1 text-sm leading-snug text-muted-foreground">
                    {e.remarks}
                  </p>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      <section>
        <SectionTitle
          title="CAPEX 2026 equipment register"
          description="Filter by category, owner, risk level or long-lead status."
        />
        <DataTable
          rows={equipment}
          columns={COLUMNS}
          searchKeys={["code", "name", "vendor", "capexNumber", "remarks"]}
          filters={[
            { key: "category", label: "Category" },
            { key: "riskLevel", label: "Risk" },
            { key: "owner", label: "Owner" },
            { key: "poStatus", label: "PO status" },
          ]}
          exportName="qnity-csl-capex-2026"
          defaultSort="targetDeliveryDate"
        />
      </section>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Wrench className="h-3.5 w-3.5" />
        Stage status values: Not started · In progress · Completed · Delayed ·
        Not applicable.
      </p>
    </>
  );
}
