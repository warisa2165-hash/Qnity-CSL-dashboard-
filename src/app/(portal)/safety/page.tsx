import { ShieldCheck } from "lucide-react";

import { requirePage } from "@/lib/guard";
import { getSafetyReports, safetyMonthly, safetySummary } from "@/lib/data";
import { formatDate, formatNumber, countBy, humanize } from "@/lib/utils";

import { PageHeader, SectionTitle } from "@/components/dashboard/page-header";
import { KpiCard, CounterTile } from "@/components/dashboard/kpi-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { TrendLineChart, StackedBarChart, DonutChart } from "@/components/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Safety Dashboard" };

const COLUMNS: Column[] = [
  { key: "code", header: "Report ID", type: "code", className: "w-28" },
  { key: "date", header: "Date", type: "date" },
  { key: "category", header: "Category", type: "status" },
  { key: "severity", header: "Severity", type: "risk" },
  { key: "description", header: "Description", wrap: true, className: "min-w-[20rem]" },
  { key: "reportedBy", header: "Reported by", hideOnMobile: true },
  { key: "correctiveAction", header: "Corrective action", wrap: true, className: "min-w-[20rem]" },
  { key: "owner", header: "Owner" },
  { key: "dueDate", header: "Due", type: "dueDate", statusKey: "status" },
  { key: "status", header: "Status", type: "status" },
];

export default async function SafetyPage() {
  const { can } = await requirePage("safety");
  const reports = await getSafetyReports();

  const open = reports.filter((r) => r.status !== "CLOSED");
  const overdue = reports.filter((r) => r.status === "OVERDUE");
  const categoryMix = Object.entries(countBy(reports, (r) => r.category)).map(
    ([name, value]) => ({ name: humanize(name), value }),
  );
  const latest = reports[0];

  return (
    <>
      <PageHeader
        title="Safety Dashboard"
        description="EHS performance for the INC2 CSL renovation — incidents, observations, inspections, permits and the corrective action register."
        readOnly={!can("safety:edit")}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Safety score"
          value={`${safetySummary.safetyScore}%`}
          tone={safetySummary.safetyScore >= 95 ? "success" : "warning"}
          progress={safetySummary.safetyScore}
          icon={ShieldCheck}
          hint="Weighted incident, observation and closure performance"
        />
        <KpiCard
          label="Lost time injuries"
          value={safetyMonthly.reduce((s, m) => s + m.lti, 0)}
          tone="success"
          hint={`${safetySummary.ltiFreeDays} consecutive LTI-free days`}
        />
        <KpiCard
          label="Open corrective actions"
          value={safetySummary.openFindings}
          tone={safetySummary.openFindings > 0 ? "warning" : "success"}
          hint={`${safetySummary.closedFindings} closed to date`}
        />
        <KpiCard
          label="Overdue safety actions"
          value={safetySummary.overdueFindings}
          tone={safetySummary.overdueFindings > 0 ? "critical" : "success"}
          hint="Past the agreed close-out date"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <CounterTile
          label="Total man-hours worked"
          value={formatNumber(safetySummary.totalManhours)}
          tone="info"
        />
        <CounterTile
          label="Permits issued this month"
          value={safetySummary.permitsIssuedThisMonth}
          tone="info"
        />
        <CounterTile
          label="Toolbox talks this month"
          value={safetySummary.toolboxTalksThisMonth}
          tone="success"
        />
        <CounterTile
          label="Near misses reported"
          value={safetyMonthly.reduce((s, m) => s + m.nearMiss, 0)}
          tone="warning"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Monthly safety trend</CardTitle>
            <p className="text-sm text-muted-foreground">
              Incident and observation counts alongside the monthly safety
              score.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <StackedBarChart
              data={safetyMonthly}
              xKey="month"
              height={200}
              series={[
                { key: "lti", name: "LTI", color: "#D13438" },
                { key: "firstAid", name: "First aid", color: "#CA5010" },
                { key: "nearMiss", name: "Near miss", color: "#FFB900" },
                { key: "observations", name: "Observations", color: "#0078D4" },
              ]}
            />
            <TrendLineChart
              data={safetyMonthly}
              xKey="month"
              height={180}
              domain={[85, 100]}
              series={[
                { key: "safetyScore", name: "Safety score %", color: "#107C10" },
              ]}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reports by category</CardTitle>
            </CardHeader>
            <CardContent>
              <DonutChart
                data={categoryMix}
                height={220}
                centerValue={String(reports.length)}
                centerLabel="reports"
              />
            </CardContent>
          </Card>

          {latest && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Latest safety report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-primary">
                    {latest.code}
                  </span>
                  <StatusBadge status={latest.category} />
                  <StatusBadge status={latest.severity} />
                </div>
                <p className="leading-snug">{latest.description}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(latest.date)} · reported by {latest.reportedBy}
                </p>
                <p className="rounded-md bg-muted/60 p-2 text-xs leading-relaxed">
                  <span className="font-medium">Corrective action: </span>
                  {latest.correctiveAction}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open safety corrective actions</CardTitle>
        </CardHeader>
        <CardContent>
          {open.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              All safety findings are closed.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {open.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-primary">
                        {r.code}
                      </span>
                      <StatusBadge status={r.status} />
                      <StatusBadge status={r.severity} />
                    </div>
                    <p className="mt-1 text-sm leading-snug">{r.description}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {r.correctiveAction}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">Owner</p>
                    <p className="text-sm font-medium">{r.owner}</p>
                    <p
                      className={
                        r.status === "OVERDUE"
                          ? "text-xs font-medium text-destructive"
                          : "text-xs text-muted-foreground"
                      }
                    >
                      Due {formatDate(r.dueDate)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <section>
        <SectionTitle
          title="Safety report register"
          description={`${reports.length} reports · ${overdue.length} overdue`}
        />
        <DataTable
          rows={reports}
          columns={COLUMNS}
          searchKeys={["code", "description", "correctiveAction", "reportedBy", "owner"]}
          filters={[
            { key: "category", label: "Category" },
            { key: "severity", label: "Severity" },
            { key: "status", label: "Status" },
            { key: "owner", label: "Owner" },
          ]}
          exportName="qnity-csl-safety-reports"
          defaultSort="date"
          defaultSortDirection="desc"
        />
      </section>
    </>
  );
}
