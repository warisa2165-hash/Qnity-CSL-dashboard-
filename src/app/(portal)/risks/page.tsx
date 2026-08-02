import { ArrowUpRight } from "lucide-react";

import { requirePage } from "@/lib/guard";
import { getRisks } from "@/lib/data";
import { riskStats } from "@/lib/analytics";
import { formatDate, sortBy, countBy, isOverdue } from "@/lib/utils";

import { PageHeader, SectionTitle } from "@/components/dashboard/page-header";
import { KpiCard, CounterTile } from "@/components/dashboard/kpi-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { RiskHeatmap } from "@/components/dashboard/risk-heatmap";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { StorageNotice } from "@/components/dashboard/storage-notice";
import { GroupedBarChart } from "@/components/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Risk Management Dashboard" };

const COLUMNS: Column[] = [
  { key: "code", header: "ID", type: "code", className: "w-16" },
  { key: "description", header: "Risk description", wrap: true, className: "min-w-[22rem]" },
  { key: "category", header: "Category" },
  { key: "owner", header: "Owner" },
  { key: "likelihood", header: "L", type: "number", className: "w-12" },
  { key: "impact", header: "I", type: "number", className: "w-12" },
  { key: "level", header: "Level", type: "risk" },
  { key: "status", header: "Status", type: "status" },
  { key: "dueDate", header: "Mitigation due", type: "dueDate", statusKey: "status" },
  { key: "escalationRequired", header: "Escalate", type: "boolean" },
  { key: "mitigationPlan", header: "Mitigation plan", wrap: true, className: "min-w-[22rem]", hideOnMobile: true },
  { key: "remarks", header: "Remarks", wrap: true, className: "min-w-[16rem]", hideOnMobile: true },
];

export default async function RisksPage() {
  const { can } = await requirePage("risks");
  const editable = can("risks:edit");
  const risks = await getRisks();
  const stats = riskStats(risks);

  const open = risks.filter((r) => r.status !== "CLOSED");
  const top10 = sortBy(open, (r) => r.likelihood * r.impact, "desc").slice(0, 10);
  const escalations = open.filter((r) => r.escalationRequired);
  const overdue = open.filter((r) => isOverdue(r.dueDate, r.status));

  const byCategory = Object.entries(
    countBy(open, (r) => r.category),
  )
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <>
      <PageHeader
        title="Risk Management Dashboard"
        description="Project risk register with a 5 × 5 likelihood and impact heat map, mitigation ownership and leadership escalation flags."
        readOnly={!editable}
      />

      <StorageNotice editable={editable} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Open risks"
          value={stats.open}
          tone={stats.open > 10 ? "warning" : "info"}
          hint={`${stats.total} risks in the register`}
        />
        <KpiCard
          label="Critical risks"
          value={stats.critical}
          tone={stats.critical > 0 ? "critical" : "success"}
          hint="Score 20 or above"
        />
        <KpiCard
          label="High risks"
          value={stats.high}
          tone={stats.high > 2 ? "critical" : "warning"}
          hint="Score 12 to 19"
        />
        <KpiCard
          label="Requiring leadership attention"
          value={stats.escalated}
          tone={stats.escalated > 0 ? "critical" : "success"}
          href="/owner-attention"
          hint="Flagged for escalation"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Risk heat map</CardTitle>
            <p className="text-sm text-muted-foreground">
              Open risks positioned by likelihood and impact. Each cell lists
              the risk IDs it contains.
            </p>
          </CardHeader>
          <CardContent>
            <RiskHeatmap risks={risks} />
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Open risks by category</CardTitle>
          </CardHeader>
          <CardContent>
            <GroupedBarChart
              data={byCategory}
              xKey="category"
              layout="vertical"
              height={320}
              series={[{ key: "count", name: "Open risks", color: "#D13438" }]}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <CounterTile label="Open risks" value={stats.open} tone="warning" />
        <CounterTile label="High-risk items" value={stats.high + stats.critical} tone="critical" />
        <CounterTile label="Overdue mitigation actions" value={stats.overdueMitigation} tone={stats.overdueMitigation ? "critical" : "success"} />
        <CounterTile label="Closed risks" value={risks.filter((r) => r.status === "CLOSED").length} tone="success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 risks</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ranked by likelihood × impact score.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {top10.map((r, i) => (
              <div
                key={r.id}
                className="flex gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-xs font-semibold">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-primary">
                      {r.code}
                    </span>
                    <StatusBadge status={r.level} />
                    <span className="text-xs text-muted-foreground">
                      score {r.likelihood * r.impact}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-snug">{r.description}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {r.category} · {r.owner} · due {formatDate(r.dueDate)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-destructive" />
                Risks requiring leadership attention
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {escalations.map((r) => (
                <div
                  key={r.id}
                  className="border-b border-border/60 pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-primary">
                      {r.code}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-sm leading-snug">{r.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Mitigation:
                    </span>{" "}
                    {r.mitigationPlan}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Overdue mitigation actions</CardTitle>
            </CardHeader>
            <CardContent>
              {overdue.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No overdue mitigation actions.
                </p>
              ) : (
                <ul className="space-y-2">
                  {overdue.map((r) => (
                    <li key={r.id} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {r.code} — {r.category}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {r.owner}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-destructive">
                        Due {formatDate(r.dueDate)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <section>
        <SectionTitle
          title="Risk register"
          description="Filter by category, owner, level or status."
        />
        <DataTable
          rows={risks}
          columns={COLUMNS}
          searchKeys={["code", "description", "mitigationPlan", "owner", "remarks"]}
          filters={[
            { key: "category", label: "Category" },
            { key: "level", label: "Level" },
            { key: "status", label: "Status" },
            { key: "owner", label: "Owner" },
          ]}
          exportName="qnity-csl-risk-register"
          defaultSort="dueDate"
          editing={{
            entityKey: "risks",
            canEdit: editable,
            canCreate: can("risks:create"),
            canDelete: can("risks:delete"),
          }}
        />
      </section>
    </>
  );
}
