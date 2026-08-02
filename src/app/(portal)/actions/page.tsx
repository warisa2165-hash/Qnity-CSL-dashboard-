import { requirePage } from "@/lib/guard";
import { getActions } from "@/lib/data";
import { actionStats } from "@/lib/analytics";
import { countBy, isOverdue, formatDate } from "@/lib/utils";

import { PageHeader, SectionTitle } from "@/components/dashboard/page-header";
import { KpiCard, CounterTile } from "@/components/dashboard/kpi-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { StorageNotice } from "@/components/dashboard/storage-notice";
import { GroupedBarChart, StackedBarChart } from "@/components/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Action Tracker" };

const COLUMNS: Column[] = [
  { key: "code", header: "ID", type: "code", className: "w-20" },
  { key: "description", header: "Action", wrap: true, className: "min-w-[22rem]" },
  { key: "owner", header: "Owner" },
  { key: "company", header: "Company" },
  { key: "dueDate", header: "Due", type: "dueDate", statusKey: "status" },
  { key: "priority", header: "Priority", type: "risk" },
  { key: "status", header: "Status", type: "status" },
  { key: "sourceMeeting", header: "Source meeting", hideOnMobile: true },
  { key: "relatedDocument", header: "Related doc", hideOnMobile: true },
  { key: "comment", header: "Comment", wrap: true, className: "min-w-[18rem]", hideOnMobile: true },
  { key: "lastUpdated", header: "Updated", type: "date", hideOnMobile: true },
];

export default async function ActionsPage() {
  const { can } = await requirePage("actions");
  const editable = can("actions:edit");
  const actions = await getActions();
  const stats = actionStats(actions);

  const byOwner = Object.entries(
    countBy(
      actions.filter((a) => ["OPEN", "IN_PROGRESS", "OVERDUE"].includes(a.status)),
      (a) => a.owner,
    ),
  )
    .map(([owner, count]) => ({ owner, count }))
    .sort((a, b) => b.count - a.count);

  const byCompany = ["QNITY", "Design Alternative", "SYME072"].map((company) => {
    const rows = actions.filter((a) => a.company === company);
    return {
      company,
      open: rows.filter((a) => a.status === "OPEN").length,
      inProgress: rows.filter((a) => a.status === "IN_PROGRESS").length,
      overdue: rows.filter((a) => a.status === "OVERDUE").length,
      completed: rows.filter((a) => a.status === "COMPLETED").length,
    };
  });

  const overdueList = actions.filter(
    (a) => a.status === "OVERDUE" || isOverdue(a.dueDate, a.status),
  );

  return (
    <>
      <PageHeader
        title="Action Tracker"
        description="Every action arising from project meetings, e-mail follow-ups and site reviews, with owner, company and due date."
        readOnly={!editable}
      />

      <StorageNotice editable={editable} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Total open actions" value={stats.open} tone="info" />
        <KpiCard
          label="Overdue actions"
          value={stats.overdue}
          tone={stats.overdue > 0 ? "critical" : "success"}
        />
        <KpiCard
          label="Due this week"
          value={stats.dueThisWeek}
          tone={stats.dueThisWeek > 0 ? "warning" : "success"}
        />
        <KpiCard label="Completed actions" value={stats.completed} tone="success" />
        <KpiCard
          label="Closure rate"
          value={`${Math.round((stats.completed / (stats.total - stats.cancelled || 1)) * 100)}%`}
          tone="info"
          progress={(stats.completed / (stats.total - stats.cancelled || 1)) * 100}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Open actions by owner</CardTitle>
          </CardHeader>
          <CardContent>
            <GroupedBarChart
              data={byOwner}
              xKey="owner"
              layout="vertical"
              height={280}
              series={[{ key: "count", name: "Open actions", color: "#0078D4" }]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Action status by company</CardTitle>
          </CardHeader>
          <CardContent>
            <StackedBarChart
              data={byCompany}
              xKey="company"
              height={280}
              series={[
                { key: "completed", name: "Completed", color: "#107C10" },
                { key: "inProgress", name: "In progress", color: "#0078D4" },
                { key: "open", name: "Open", color: "#FFB900" },
                { key: "overdue", name: "Overdue", color: "#D13438" },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <CounterTile label="Open" value={actions.filter((a) => a.status === "OPEN").length} tone="warning" />
        <CounterTile label="In progress" value={actions.filter((a) => a.status === "IN_PROGRESS").length} tone="info" />
        <CounterTile label="Completed" value={stats.completed} tone="success" />
        <CounterTile label="Overdue" value={stats.overdue} tone="critical" />
        <CounterTile label="Cancelled" value={stats.cancelled} tone="muted" />
      </div>

      {overdueList.length > 0 && (
        <Card className="border-l-4 border-l-destructive">
          <CardHeader>
            <CardTitle>Overdue actions requiring follow-up</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {overdueList.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-primary">
                        {a.code}
                      </span>
                      <StatusBadge status={a.priority} />
                    </div>
                    <p className="mt-1 text-sm leading-snug">{a.description}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {a.sourceMeeting}
                      {a.relatedDocument ? ` · ${a.relatedDocument}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium">{a.owner}</p>
                    <p className="text-xs text-muted-foreground">{a.company}</p>
                    <p className="text-xs font-medium text-destructive">
                      Due {formatDate(a.dueDate)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <section>
        <SectionTitle
          title="Action register"
          description="Filter by owner, company, priority, source meeting or status."
        />
        <DataTable
          rows={actions}
          columns={COLUMNS}
          searchKeys={["code", "description", "owner", "comment", "sourceMeeting"]}
          filters={[
            { key: "status", label: "Status" },
            { key: "priority", label: "Priority" },
            { key: "owner", label: "Owner" },
            { key: "company", label: "Company" },
            { key: "sourceMeeting", label: "Source meeting" },
          ]}
          exportName="qnity-csl-actions"
          defaultSort="dueDate"
          editing={{
            entityKey: "actions",
            canEdit: editable,
            canCreate: can("actions:create"),
            canDelete: can("actions:delete"),
          }}
        />
      </section>
    </>
  );
}
