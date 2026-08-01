import { CheckCircle2, Circle, FileText } from "lucide-react";

import { requirePage } from "@/lib/guard";
import { getPayments, getProject } from "@/lib/data";
import { paymentStats } from "@/lib/analytics";
import { formatCurrency, formatDate, percent } from "@/lib/utils";
import { progressTone } from "@/lib/status";

import { PageHeader, SectionTitle } from "@/components/dashboard/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const metadata = { title: "Milestone Payment Dashboard" };

const COLUMNS: Column[] = [
  { key: "code", header: "ID", type: "code", className: "w-16" },
  { key: "description", header: "Payment milestone", wrap: true, className: "min-w-[16rem]" },
  { key: "percentage", header: "%", type: "percent", className: "w-16" },
  { key: "amount", header: "Amount", type: "currency" },
  { key: "linkedDeliverable", header: "Linked deliverable", wrap: true, className: "min-w-[14rem]", hideOnMobile: true },
  { key: "requiredApproval", header: "Required approval", hideOnMobile: true },
  { key: "status", header: "Status", type: "status" },
  { key: "readiness", header: "Readiness", type: "progress", className: "min-w-[9rem]" },
  { key: "submittedDate", header: "Submitted", type: "date" },
  { key: "verifiedBy", header: "Verified by", hideOnMobile: true },
  { key: "approvedBy", header: "Approved by", hideOnMobile: true },
  { key: "remarks", header: "Remarks", wrap: true, className: "min-w-[18rem]" },
];

export default async function PaymentsPage() {
  const { can } = await requirePage("payments");
  const [payments, project] = await Promise.all([getPayments(), getProject()]);
  const stats = paymentStats(payments);

  return (
    <>
      <PageHeader
        title="Milestone Payment Dashboard"
        description="Contractor payment milestones, the deliverables they are tied to, and the verification evidence required before each release."
        readOnly={!can("payments:edit")}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total contract value"
          value={formatCurrency(project.contractValue, project.currency, true)}
          tone="info"
          hint={`${payments.length} payment milestones`}
        />
        <KpiCard
          label="Payment released"
          value={percent(stats.paidPercent, 1)}
          tone="success"
          progress={stats.paidPercent}
          hint={formatCurrency(stats.paidValue, project.currency, true)}
        />
        <KpiCard
          label="Remaining payment"
          value={percent(stats.remainingPercent, 1)}
          tone="info"
          hint={formatCurrency(
            stats.totalValue - stats.paidValue,
            project.currency,
            true,
          )}
        />
        <KpiCard
          label="On hold"
          value={formatCurrency(stats.onHoldValue, project.currency, true)}
          tone={stats.onHoldCount > 0 ? "critical" : "success"}
          hint={`${stats.onHoldCount} milestone(s) held`}
        />
      </div>

      {stats.next && (
        <Card className="border-l-4 border-l-warning">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Next payment milestone
                </p>
                <CardTitle className="mt-1">
                  {stats.next.code} — {stats.next.description}
                </CardTitle>
              </div>
              <StatusBadge status={stats.next.status} />
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Value</p>
              <p className="text-lg font-semibold tabular-nums">
                {formatCurrency(stats.next.amount, project.currency)}
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.next.percentage}% of contract value
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Linked deliverable</p>
              <p className="text-sm font-medium">{stats.next.linkedDeliverable}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Approval: {stats.next.requiredApproval}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payment readiness</p>
              <p className="text-lg font-semibold tabular-nums">
                {stats.next.readiness}%
              </p>
              <Progress
                value={stats.next.readiness}
                tone={progressTone(stats.next.readiness)}
                className="mt-1.5"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <section>
        <SectionTitle
          title="Verification checklist by milestone"
          description="A milestone can only be recommended for release once every required item is verified."
        />
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {payments.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-primary">
                    {p.code}
                  </span>
                  <StatusBadge status={p.status} />
                </div>
                <CardTitle className="text-sm leading-snug">
                  {p.description}
                </CardTitle>
                <p className="text-sm font-semibold tabular-nums">
                  {formatCurrency(p.amount, project.currency)}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({p.percentage}%)
                  </span>
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Readiness</span>
                    <span className="font-medium tabular-nums">{p.readiness}%</span>
                  </div>
                  <Progress value={p.readiness} tone={progressTone(p.readiness)} />
                </div>

                <ul className="space-y-1.5">
                  {p.checklist.map((item) => (
                    <li
                      key={item.label}
                      className="flex items-start gap-2 text-sm"
                    >
                      {item.complete ? (
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                      ) : (
                        <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                      )}
                      <span
                        className={
                          item.complete
                            ? "text-muted-foreground"
                            : "font-medium"
                        }
                      >
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="border-t border-border pt-2.5">
                  <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    Required evidence
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {p.requiredEvidence.map((e) => (
                      <li key={e} className="text-xs text-muted-foreground">
                        · {e}
                      </li>
                    ))}
                  </ul>
                </div>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-border pt-2.5 text-xs">
                  <dt className="text-muted-foreground">Submitted</dt>
                  <dd className="text-right font-medium">
                    {formatDate(p.submittedDate)}
                  </dd>
                  <dt className="text-muted-foreground">Verified by</dt>
                  <dd className="text-right font-medium">{p.verifiedBy ?? "—"}</dd>
                  <dt className="text-muted-foreground">Approved by</dt>
                  <dd className="text-right font-medium">{p.approvedBy ?? "—"}</dd>
                </dl>

                {p.remarks && (
                  <p className="rounded-md bg-muted/60 p-2 text-xs leading-relaxed text-muted-foreground">
                    {p.remarks}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle title="Payment milestone register" />
        <DataTable
          rows={payments}
          columns={COLUMNS}
          searchKeys={["code", "description", "linkedDeliverable", "remarks"]}
          filters={[{ key: "status", label: "Status" }]}
          exportName="qnity-csl-payment-milestones"
          currency={project.currency}
          defaultSort="code"
        />
      </section>
    </>
  );
}
