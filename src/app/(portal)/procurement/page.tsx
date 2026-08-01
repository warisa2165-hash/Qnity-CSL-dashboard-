import { requirePage } from "@/lib/guard";
import { getProcurement } from "@/lib/data";
import { procurementStats } from "@/lib/analytics";
import { PROCUREMENT_STAGES } from "@/lib/types";
import { formatCurrency, humanize } from "@/lib/utils";

import { PageHeader, SectionTitle } from "@/components/dashboard/page-header";
import { KpiCard, CounterTile } from "@/components/dashboard/kpi-card";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { FunnelChart, DonutChart } from "@/components/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Procurement Dashboard" };

const COLUMNS: Column[] = [
  { key: "code", header: "ID", type: "code", className: "w-16" },
  { key: "packageName", header: "Package", wrap: true, className: "min-w-[16rem]" },
  { key: "vendor", header: "Vendor" },
  { key: "requester", header: "Requester", hideOnMobile: true },
  { key: "buyer", header: "Buyer", hideOnMobile: true },
  { key: "budget", header: "Budget", type: "currency" },
  { key: "stage", header: "Current stage", type: "status" },
  { key: "poStatus", header: "PO status", type: "status" },
  { key: "poNumber", header: "PO number", hideOnMobile: true },
  { key: "targetDeliveryDate", header: "Target delivery", type: "dueDate", statusKey: "poStatus" },
  { key: "actualDeliveryDate", header: "Actual delivery", type: "date" },
  { key: "riskStatus", header: "Risk", type: "risk" },
  { key: "remarks", header: "Remarks", wrap: true, className: "min-w-[18rem]" },
];

export default async function ProcurementPage() {
  const { can } = await requirePage("procurement");
  const packages = await getProcurement();
  const stats = procurementStats(packages);

  /**
   * The funnel counts every package that has *reached at least* each stage,
   * so it reads as a true progression rather than a snapshot histogram.
   */
  const funnel = PROCUREMENT_STAGES.map((stage, index) => ({
    name: humanize(stage),
    value: packages.filter(
      (p) => PROCUREMENT_STAGES.indexOf(p.stage) >= index,
    ).length,
  }));

  const budgetByRisk = (["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map(
    (level) => ({
      name: `${humanize(level)} risk`,
      value: packages
        .filter((p) => p.riskStatus === level)
        .reduce((sum, p) => sum + p.budget, 0),
      color:
        level === "LOW"
          ? "#107C10"
          : level === "MEDIUM"
            ? "#FFB900"
            : level === "HIGH"
              ? "#CA5010"
              : "#D13438",
    }),
  ).filter((b) => b.value > 0);

  return (
    <>
      <PageHeader
        title="Procurement Dashboard"
        description="Package progression from RFQ through purchase order, manufacturing and delivery to installation and commissioning."
        readOnly={!can("procurement:edit")}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Procurement value"
          value={formatCurrency(stats.totalBudget, "THB", true)}
          tone="info"
          hint={`${stats.total} packages tracked`}
        />
        <KpiCard
          label="Committed (PO issued)"
          value={formatCurrency(stats.committed, "THB", true)}
          tone="success"
          progress={stats.committedPercent}
          hint={`${stats.poIssued} of ${stats.total} packages`}
        />
        <KpiCard
          label="Pending PO approval"
          value={stats.pendingApproval}
          tone={stats.pendingApproval > 0 ? "warning" : "success"}
          hint="Awaiting leadership or buyer approval"
        />
        <KpiCard
          label="Packages at risk"
          value={stats.atRisk}
          tone={stats.atRisk > 2 ? "critical" : "warning"}
          hint="High or critical delivery risk"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Procurement funnel</CardTitle>
            <p className="text-sm text-muted-foreground">
              Number of packages that have reached each stage of the
              procurement cycle.
            </p>
          </CardHeader>
          <CardContent>
            <FunnelChart stages={funnel} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Budget exposure by risk</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={budgetByRisk}
              centerValue={formatCurrency(stats.totalBudget, "THB", true)}
              centerLabel="total budget"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <CounterTile label="PO issued" value={stats.poIssued} tone="success" />
        <CounterTile label="PO pending approval" value={stats.pendingApproval} tone="warning" />
        <CounterTile label="Not yet started" value={stats.notStarted} tone="neutral" />
        <CounterTile label="Delivered" value={stats.delivered} tone="success" />
        <CounterTile label="High / critical risk" value={stats.atRisk} tone="critical" />
      </div>

      <section>
        <SectionTitle
          title="Procurement package register"
          description="Filter by stage, PO status, buyer or risk level."
        />
        <DataTable
          rows={packages}
          columns={COLUMNS}
          searchKeys={["code", "packageName", "vendor", "remarks", "poNumber"]}
          filters={[
            { key: "stage", label: "Stage" },
            { key: "poStatus", label: "PO status" },
            { key: "riskStatus", label: "Risk" },
            { key: "buyer", label: "Buyer" },
          ]}
          exportName="qnity-csl-procurement"
          defaultSort="targetDeliveryDate"
        />
      </section>
    </>
  );
}
