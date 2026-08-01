import {
  AlertOctagon,
  CalendarClock,
  Gavel,
  Lightbulb,
  Link2,
  TrendingDown,
  User,
} from "lucide-react";

import { requirePage } from "@/lib/guard";
import { getAttentionItems } from "@/lib/data";
import { attentionStats } from "@/lib/analytics";
import { formatDate, daysRemaining, sortBy, cn } from "@/lib/utils";
import { healthTone, TONE_CLASSES } from "@/lib/status";

import { PageHeader, SectionTitle } from "@/components/dashboard/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Owner Attention Dashboard" };

const COLUMNS: Column[] = [
  { key: "code", header: "ID", type: "code", className: "w-16" },
  { key: "topic", header: "Topic", wrap: true, className: "min-w-[16rem]" },
  { key: "category", header: "Category" },
  { key: "decisionOwner", header: "Decision owner" },
  { key: "requestedDecisionDate", header: "Decision by", type: "dueDate", statusKey: "status" },
  { key: "status", header: "Status", type: "status" },
  { key: "urgency", header: "Urgency", type: "status" },
  { key: "requiredDecision", header: "Required decision", wrap: true, className: "min-w-[20rem]", hideOnMobile: true },
  { key: "relatedRisk", header: "Risk", hideOnMobile: true },
  { key: "relatedMilestone", header: "Milestone", hideOnMobile: true },
];

export default async function OwnerAttentionPage() {
  const { can } = await requirePage("owner-attention");
  const items = await getAttentionItems();
  const stats = attentionStats(items);

  const openItems = sortBy(
    items.filter((i) => i.status !== "DECIDED"),
    (i) => i.requestedDecisionDate,
  );

  return (
    <>
      <PageHeader
        title="Owner Attention Dashboard"
        description="Items that need a decision, approval, escalation or management support from QNITY leadership. Each card states the decision required, the recommendation and the impact if it slips."
        readOnly={!can("owner-attention:edit")}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Items requiring decision"
          value={stats.open}
          tone={stats.open > 0 ? "warning" : "success"}
          hint="Open or under leadership review"
        />
        <KpiCard
          label="Items requiring approval"
          value={stats.requiringApproval}
          tone="warning"
          hint="Contract, budget, payment or design approvals"
        />
        <KpiCard
          label="Overdue for decision"
          value={stats.overdue}
          tone={stats.overdue > 0 ? "critical" : "success"}
          hint="Past the requested decision date"
        />
        <KpiCard
          label="High-impact issues"
          value={stats.highImpact}
          tone={stats.highImpact > 0 ? "critical" : "success"}
          hint="Directly threatening the handover date"
        />
      </div>

      <section>
        <SectionTitle
          title="Decisions awaiting QNITY leadership"
          description="Ordered by requested decision date — the most urgent first."
        />
        <div className="grid gap-4 xl:grid-cols-2">
          {openItems.map((item) => {
            const days = daysRemaining(item.requestedDecisionDate) ?? 0;
            const late = days < 0;
            return (
              <Card
                key={item.id}
                className={cn(
                  "border-l-4",
                  item.urgency === "RED"
                    ? "border-l-destructive"
                    : item.urgency === "YELLOW"
                      ? "border-l-warning"
                      : "border-l-success",
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-primary">
                        {item.code}
                      </span>
                      <Badge variant="outline">{item.category}</Badge>
                    </div>
                    <StatusBadge
                      status={item.urgency}
                      tone={healthTone(item.urgency)}
                      label={
                        item.status === "OVERDUE"
                          ? "Decision overdue"
                          : item.status === "IN_REVIEW"
                            ? "In leadership review"
                            : "Open"
                      }
                    />
                  </div>
                  <CardTitle className="mt-1 leading-snug">{item.topic}</CardTitle>
                </CardHeader>

                <CardContent className="space-y-3.5 text-sm">
                  <p className="leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>

                  <div className="rounded-md border border-border bg-muted/40 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <AlertOctagon className="h-3.5 w-3.5" />
                      Reason for escalation
                    </p>
                    <p className="mt-1 leading-relaxed">{item.escalationReason}</p>
                  </div>

                  <div
                    className={cn(
                      "rounded-md border p-3",
                      TONE_CLASSES[healthTone(item.urgency)],
                    )}
                  >
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
                      <Gavel className="h-3.5 w-3.5" />
                      Decision required
                    </p>
                    <p className="mt-1 font-medium leading-relaxed">
                      {item.requiredDecision}
                    </p>
                  </div>

                  <div className="rounded-md border border-primary/25 bg-accent p-3 text-accent-foreground">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
                      <Lightbulb className="h-3.5 w-3.5" />
                      Recommended action
                    </p>
                    <p className="mt-1 leading-relaxed">{item.recommendedAction}</p>
                  </div>

                  <div className="rounded-md border border-destructive/25 bg-destructive/5 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-destructive">
                      <TrendingDown className="h-3.5 w-3.5" />
                      Impact if delayed
                    </p>
                    <p className="mt-1 leading-relaxed">{item.impactIfDelayed}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3 text-xs">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Decision owner</span>
                      <span className="font-medium">{item.decisionOwner}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Requested by</span>
                      <span
                        className={cn(
                          "font-medium",
                          late && "text-destructive",
                        )}
                      >
                        {formatDate(item.requestedDecisionDate)}
                        {late
                          ? ` (${Math.abs(days)} days overdue)`
                          : ` (${days} days)`}
                      </span>
                    </span>
                    {(item.relatedRisk || item.relatedMilestone) && (
                      <span className="flex items-center gap-1.5">
                        <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">
                          {[item.relatedRisk, item.relatedMilestone]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                    )}
                  </div>

                  {item.remarks && (
                    <p className="text-xs italic text-muted-foreground">
                      {item.remarks}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle title="Attention item register" />
        <DataTable
          rows={items}
          columns={COLUMNS}
          searchKeys={["code", "topic", "description", "requiredDecision", "decisionOwner"]}
          filters={[
            { key: "category", label: "Category" },
            { key: "status", label: "Status" },
            { key: "urgency", label: "Urgency" },
            { key: "decisionOwner", label: "Decision owner" },
          ]}
          exportName="qnity-csl-owner-attention"
          defaultSort="requestedDecisionDate"
        />
      </section>
    </>
  );
}
