import { requirePage } from "@/lib/guard";
import { getMilestones } from "@/lib/data";
import { milestoneStats } from "@/lib/analytics";
import { formatDate, daysBetween } from "@/lib/utils";

import { PageHeader, SectionTitle } from "@/components/dashboard/page-header";
import { KpiCard, CounterTile } from "@/components/dashboard/kpi-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { StorageNotice } from "@/components/dashboard/storage-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Milestone Dashboard" };

const COLUMNS: Column[] = [
  { key: "code", header: "ID", type: "code", className: "w-16" },
  { key: "name", header: "Milestone", wrap: true, className: "min-w-[14rem]" },
  { key: "description", header: "Description", wrap: true, className: "min-w-[18rem]", hideOnMobile: true },
  { key: "phase", header: "Phase", hideOnMobile: true },
  { key: "plannedDate", header: "Planned", type: "date" },
  { key: "actualDate", header: "Actual", type: "date" },
  { key: "status", header: "Status", type: "status" },
  { key: "owner", header: "Owner" },
  { key: "dependency", header: "Depends on", hideOnMobile: true },
  { key: "remarks", header: "Remarks", wrap: true, className: "min-w-[16rem]", hideOnMobile: true },
];

export default async function MilestonesPage() {
  const { can } = await requirePage("milestones");
  const milestones = await getMilestones();
  const stats = milestoneStats(milestones);
  const editable = can("milestones:edit");

  const completedOnTime = milestones.filter(
    (m) =>
      m.status === "COMPLETED" &&
      m.actualDate &&
      daysBetween(m.plannedDate, m.actualDate) <= 0,
  ).length;

  const upcoming = milestones
    .filter((m) => !["COMPLETED", "CANCELLED"].includes(m.status))
    .slice(0, 6);

  return (
    <>
      <PageHeader
        title="Milestone Dashboard"
        description="Every contractual and delivery milestone from project kick-off to final handover on 06 December 2026."
        readOnly={!editable}
      />

      <StorageNotice editable={editable} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Milestones completed"
          value={`${stats.completed} / ${stats.total}`}
          tone="success"
          progress={(stats.completed / stats.total) * 100}
        />
        <KpiCard
          label="Completed on or before plan"
          value={`${completedOnTime} / ${stats.completed}`}
          tone={completedOnTime === stats.completed ? "success" : "warning"}
          hint="Schedule adherence of closed milestones"
        />
        <KpiCard
          label="Delayed milestones"
          value={stats.delayed}
          tone={stats.delayed > 0 ? "critical" : "success"}
        />
        <KpiCard
          label="At risk"
          value={stats.atRisk}
          tone={stats.atRisk > 0 ? "warning" : "success"}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <CounterTile label="Not started" value={stats.notStarted} tone="neutral" />
        <CounterTile label="In progress" value={stats.inProgress} tone="info" />
        <CounterTile label="Completed" value={stats.completed} tone="success" />
        <CounterTile label="Delayed" value={stats.delayed} tone="critical" />
        <CounterTile label="At risk" value={stats.atRisk} tone="warning" />
        <CounterTile label="Cancelled" value={stats.cancelled} tone="muted" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Milestone timeline</CardTitle>
          <p className="text-sm text-muted-foreground">
            Next six open milestones in planned date order.
          </p>
        </CardHeader>
        <CardContent>
          <ol className="relative space-y-5 border-l border-border pl-6">
            {upcoming.map((m) => {
              const slip = m.actualDate
                ? daysBetween(m.plannedDate, m.actualDate)
                : null;
              return (
                <li key={m.id} className="relative">
                  <span
                    aria-hidden
                    className="absolute -left-[1.9rem] top-1 flex h-3 w-3 items-center justify-center rounded-full border-2 border-card bg-primary"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-primary">
                      {m.code}
                    </span>
                    <p className="text-sm font-medium">{m.name}</p>
                    <StatusBadge status={m.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Planned {formatDate(m.plannedDate)} · Owner {m.owner} ·{" "}
                    {m.phase}
                    {slip !== null && slip > 0 && (
                      <span className="ml-1 text-destructive">
                        ({slip} days late)
                      </span>
                    )}
                  </p>
                  <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                    {m.remarks}
                  </p>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <section>
        <SectionTitle title="All milestones" />
        <DataTable
          rows={milestones}
          columns={COLUMNS}
          searchKeys={["code", "name", "description", "owner", "remarks"]}
          filters={[
            { key: "status", label: "Status" },
            { key: "phase", label: "Phase" },
            { key: "owner", label: "Owner" },
          ]}
          exportName="qnity-csl-milestones"
          defaultSort="plannedDate"
          editing={{
            entityKey: "milestones",
            canEdit: editable,
            canCreate: can("milestones:create"),
            canDelete: can("milestones:delete"),
          }}
        />
      </section>
    </>
  );
}
