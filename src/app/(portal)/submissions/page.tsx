import { requirePage } from "@/lib/guard";
import { getSubmissions } from "@/lib/data";
import { submissionStats } from "@/lib/analytics";
import { formatDate, isOverdue } from "@/lib/utils";

import { PageHeader, SectionTitle } from "@/components/dashboard/page-header";
import { CounterTile } from "@/components/dashboard/kpi-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { StackedBarChart } from "@/components/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Document Submission Tracker" };

const COLUMNS: Column[] = [
  { key: "code", header: "Doc ID", type: "code", className: "w-28" },
  { key: "title", header: "Document title", wrap: true, className: "min-w-[16rem]" },
  { key: "documentType", header: "Type" },
  { key: "submittedBy", header: "Submitted by" },
  { key: "submittedDate", header: "Submitted", type: "date" },
  { key: "revision", header: "Rev", className: "w-14" },
  { key: "status", header: "Status", type: "status" },
  { key: "reviewer", header: "Reviewer" },
  { key: "reviewDueDate", header: "Review due", type: "dueDate", statusKey: "status" },
  { key: "approvalStatus", header: "Approval", type: "status" },
  { key: "commentStatus", header: "Comments", type: "status", hideOnMobile: true },
  { key: "nextAction", header: "Next action", wrap: true, className: "min-w-[16rem]" },
  { key: "responsiblePerson", header: "Responsible", hideOnMobile: true },
];

export default async function SubmissionsPage() {
  const { can } = await requirePage("submissions");
  const submissions = await getSubmissions();
  const stats = submissionStats(submissions);

  const bySubmitter = ["Design Alternative", "SYME072", "QNITY", "Vendor"].map(
    (party) => {
      const rows = submissions.filter((s) => s.submittedBy === party);
      return {
        party,
        approved: rows.filter((s) =>
          ["APPROVED", "APPROVED_WITH_COMMENT"].includes(s.status),
        ).length,
        underReview: rows.filter((s) =>
          ["SUBMITTED", "UNDER_REVIEW", "DRAFT"].includes(s.status),
        ).length,
        commented: rows.filter((s) =>
          ["COMMENTED", "REVISION_REQUIRED"].includes(s.status),
        ).length,
        rejected: rows.filter((s) => s.status === "REJECTED").length,
      };
    },
  );

  const overdueRows = submissions.filter(
    (s) =>
      isOverdue(s.reviewDueDate) &&
      !["APPROVED", "APPROVED_WITH_COMMENT", "REJECTED", "SUPERSEDED"].includes(
        s.status,
      ),
  );

  return (
    <>
      <PageHeader
        title="Document Submission Tracker"
        description="Every document submitted by Design Alternative, SYME072, QNITY and vendors — what has been submitted, reviewed, commented, approved or rejected."
        readOnly={!can("submissions:edit")}
      />

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <CounterTile label="Total submitted" value={stats.total} tone="info" />
        <CounterTile label="Under review" value={stats.underReview} tone="info" />
        <CounterTile label="Approved" value={stats.approved} tone="success" />
        <CounterTile label="Rejected" value={stats.rejected} tone="critical" />
        <CounterTile label="Overdue review" value={stats.overdueReview} tone="critical" />
        <CounterTile
          label="Waiting for DA revision"
          value={stats.awaitingDaRevision}
          tone="warning"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Submission status by originator</CardTitle>
            <p className="text-sm text-muted-foreground">
              Where each party stands in the review cycle.
            </p>
          </CardHeader>
          <CardContent>
            <StackedBarChart
              data={bySubmitter}
              xKey="party"
              series={[
                { key: "approved", name: "Approved", color: "#107C10" },
                { key: "underReview", name: "Under review", color: "#0078D4" },
                { key: "commented", name: "Commented / revision", color: "#FFB900" },
                { key: "rejected", name: "Rejected", color: "#D13438" },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overdue reviews</CardTitle>
            <p className="text-sm text-muted-foreground">
              Documents past their agreed review turnaround.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {overdueRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No overdue reviews. Every submission is within its turnaround.
              </p>
            ) : (
              overdueRows.map((s) => (
                <div
                  key={s.id}
                  className="border-b border-border/60 pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-primary">
                      {s.code}
                    </span>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="mt-1 text-sm leading-snug">{s.title}</p>
                  <p className="mt-0.5 text-xs text-destructive">
                    Review due {formatDate(s.reviewDueDate)} · {s.reviewer}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <section>
        <SectionTitle
          title="Submission register"
          description="Filter by document type, originator, reviewer, approval status or overdue review."
        />
        <DataTable
          rows={submissions}
          columns={COLUMNS}
          searchKeys={["code", "title", "nextAction", "reviewer", "responsiblePerson"]}
          filters={[
            { key: "documentType", label: "Type" },
            { key: "submittedBy", label: "Submitted by" },
            { key: "reviewer", label: "Reviewer" },
            { key: "status", label: "Status" },
            { key: "approvalStatus", label: "Approval" },
          ]}
          exportName="qnity-csl-document-submissions"
          defaultSort="reviewDueDate"
        />
      </section>

      <section>
        <SectionTitle
          title="Version history"
          description="Revision trail for each tracked submission."
        />
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {submissions
            .filter((s) => s.versionHistory.length > 1)
            .map((s) => (
              <Card key={s.id}>
                <CardHeader className="pb-2">
                  <span className="font-mono text-xs font-semibold text-primary">
                    {s.code}
                  </span>
                  <CardTitle className="text-sm leading-snug">{s.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {s.versionHistory.map((v) => (
                      <li
                        key={v.revision}
                        className="flex items-start gap-2.5 text-sm"
                      >
                        <span className="mt-0.5 w-12 shrink-0 font-mono text-xs font-medium">
                          {v.revision}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <StatusBadge status={v.status} dot={false} />
                            <span className="text-xs text-muted-foreground">
                              {formatDate(v.date)}
                            </span>
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {v.note}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            ))}
        </div>
      </section>
    </>
  );
}
