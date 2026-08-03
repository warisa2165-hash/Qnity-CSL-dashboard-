import { requirePage } from "@/lib/guard";
import { getDesignByDiscipline, getDesignPackages } from "@/lib/data";
import { average } from "@/lib/utils";

import { PageHeader, SectionTitle } from "@/components/dashboard/page-header";
import { KpiCard, CounterTile } from "@/components/dashboard/kpi-card";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { GroupedBarChart, DonutChart } from "@/components/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Design Progress Dashboard" };

const COLUMNS: Column[] = [
  { key: "documentName", header: "Document", wrap: true, className: "min-w-[16rem]" },
  { key: "packageType", header: "Package type", hideOnMobile: true },
  { key: "discipline", header: "Discipline" },
  { key: "revision", header: "Rev", className: "w-16" },
  { key: "responsibleParty", header: "Responsible" },
  { key: "submittedDate", header: "Submitted", type: "date" },
  { key: "reviewStatus", header: "Review status", type: "status" },
  { key: "percentComplete", header: "Complete", type: "progress", className: "min-w-[9rem]" },
  { key: "nextSubmissionDate", header: "Next submission", type: "dueDate", statusKey: "reviewStatus", hideOnMobile: true },
  { key: "status", header: "Health", type: "status" },
  { key: "pendingAction", header: "Pending action", wrap: true, className: "min-w-[16rem]" },
  { key: "ownerReviewComments", header: "Owner review comments", wrap: true, className: "min-w-[18rem]", hideOnMobile: true },
];

export default async function DesignPage() {
  const { can } = await requirePage("design");
  const [packages, designByDiscipline] = await Promise.all([
    getDesignPackages(),
    getDesignByDiscipline(),
  ]);

  const approved = packages.filter((p) =>
    ["APPROVED", "APPROVED_WITH_COMMENT"].includes(p.reviewStatus),
  ).length;
  const commented = packages.filter((p) => p.reviewStatus === "COMMENTED").length;
  const underReview = packages.filter((p) =>
    ["UNDER_REVIEW", "SUBMITTED"].includes(p.reviewStatus),
  ).length;
  const critical = packages.filter((p) => p.status === "CRITICAL").length;

  const statusMix = [
    { name: "Approved", value: approved, color: "#107C10" },
    { name: "Under review", value: underReview, color: "#0078D4" },
    { name: "Commented", value: commented, color: "#FFB900" },
    {
      name: "Not started",
      value: packages.filter((p) =>
        ["NOT_STARTED", "IN_PROGRESS"].includes(p.reviewStatus),
      ).length,
      color: "#605E5C",
    },
  ].filter((s) => s.value > 0);

  return (
    <>
      <PageHeader
        title="Design Progress Dashboard"
        description="Engineering and design package status by discipline, including owner review comments and the next submission commitment."
        readOnly={!can("design:edit")}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Overall design progress"
          value={`${Math.round(average(packages.map((p) => p.percentComplete)))}%`}
          tone="info"
          progress={average(packages.map((p) => p.percentComplete))}
          hint={`${packages.length} design packages tracked`}
        />
        <KpiCard
          label="Packages approved"
          value={`${approved} / ${packages.length}`}
          tone="success"
          progress={(approved / packages.length) * 100}
        />
        <KpiCard
          label="Awaiting DA revision"
          value={commented}
          tone={commented > 0 ? "warning" : "success"}
          hint="Returned with owner comments"
        />
        <KpiCard
          label="Critical packages"
          value={critical}
          tone={critical > 0 ? "critical" : "success"}
          hint="Blocking IFC release or procurement"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Design completion by discipline</CardTitle>
            <p className="text-sm text-muted-foreground">
              Planned versus actual completion across the five engineering
              disciplines.
            </p>
          </CardHeader>
          <CardContent>
            <GroupedBarChart
              data={designByDiscipline}
              xKey="discipline"
              domain={[0, 100]}
              unit="%"
              series={[
                { key: "planned", name: "Planned", color: "#605E5C" },
                { key: "actual", name: "Actual", color: "#0078D4" },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Review status mix</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={statusMix}
              centerValue={String(packages.length)}
              centerLabel="packages"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <CounterTile label="On track" value={packages.filter((p) => p.status === "ON_TRACK").length} tone="success" />
        <CounterTile label="Watch" value={packages.filter((p) => p.status === "WATCH").length} tone="warning" />
        <CounterTile label="Critical" value={critical} tone="critical" />
        <CounterTile label="Under owner / consultant review" value={underReview} tone="info" />
      </div>

      <section>
        <SectionTitle
          title="Design package register"
          description="Filter by discipline, responsible party or review status."
        />
        <DataTable
          rows={packages}
          columns={COLUMNS}
          searchKeys={["documentName", "packageType", "pendingAction", "ownerReviewComments"]}
          filters={[
            { key: "discipline", label: "Discipline" },
            { key: "reviewStatus", label: "Review status" },
            { key: "responsibleParty", label: "Responsible" },
            { key: "status", label: "Health" },
          ]}
          exportName="qnity-csl-design-packages"
          defaultSort="percentComplete"
        />
      </section>
    </>
  );
}
