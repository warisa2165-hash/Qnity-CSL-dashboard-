import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileClock,
  FileSearch,
  Gauge,
  HardHat,
  Hammer,
  Ruler,
  ShoppingCart,
} from "lucide-react";

import { requirePage } from "@/lib/guard";
import { canViewPage } from "@/lib/rbac";
import { getExecutiveSummary } from "@/lib/analytics";
import { getProject, getProgressCurve } from "@/lib/data";
import { formatDate, daysRemaining, percent } from "@/lib/utils";
import { HEALTH_LABEL, healthTone, TONE_CLASSES } from "@/lib/status";
import { cn } from "@/lib/utils";

import { PageHeader, SectionTitle } from "@/components/dashboard/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { ProgressCurveChart } from "@/components/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const metadata = { title: "Executive Dashboard" };

export default async function DashboardPage() {
  const { profile, user } = await requirePage("dashboard");
  const [project, summary, progressCurve] = await Promise.all([
    getProject(),
    getExecutiveSummary(),
    getProgressCurve(),
  ]);

  const { kpis, statuses } = summary;
  const handoverDays = daysRemaining(project.targetHandoverDate) ?? 0;
  const canSeeAttention = canViewPage(profile, "owner-attention");
  const canSeeFinancials = canViewPage(profile, "payments");

  const statusTiles = [
    { label: "Safety", value: statuses.safety, href: "/safety", key: "safety" as const },
    { label: "Risk", value: statuses.risk, href: "/risks", key: "risks" as const },
    { label: "Milestones", value: statuses.milestone, href: "/milestones", key: "milestones" as const },
    { label: "Procurement", value: statuses.procurement, href: "/procurement", key: "procurement" as const },
    { label: "CAPEX equipment", value: statuses.capex, href: "/capex", key: "capex" as const },
    { label: "Payment", value: statuses.payment, href: "/payments", key: "payments" as const },
  ].filter((t) => canViewPage(profile, t.key));

  return (
    <>
      <PageHeader
        title="Executive Dashboard"
        description={`${project.name} — ${project.location}. Reporting position as at ${formatDate(new Date())}.`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/weekly-report">
              Weekly executive report
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      {/* ------------------------- Health banner ------------------------ */}
      <section
        className={cn(
          "rounded-lg border p-5",
          TONE_CLASSES[healthTone(summary.health)],
        )}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
              Project health
            </p>
            <p className="mt-1 text-2xl font-semibold leading-tight">
              {HEALTH_LABEL[summary.health]}
            </p>
            <p className="mt-1.5 text-sm opacity-90">{project.status}</p>
          </div>

          <dl className="grid shrink-0 grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="opacity-80">Current phase</dt>
              <dd className="font-semibold">{project.currentPhase}</dd>
            </div>
            <div>
              <dt className="opacity-80">Overall progress</dt>
              <dd className="font-semibold tabular-nums">
                {percent(project.overallProgress)}
              </dd>
            </div>
            <div>
              <dt className="opacity-80">Target completion</dt>
              <dd className="font-semibold">
                {formatDate(project.targetCompletionDate)}
              </dd>
            </div>
            <div>
              <dt className="opacity-80">Handover</dt>
              <dd className="font-semibold">
                {formatDate(project.targetHandoverDate)}
                <span className="ml-1 text-xs font-normal opacity-80">
                  ({handoverDays} days)
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ---------------------------- KPI cards ------------------------- */}
      <section>
        <SectionTitle
          title="Key performance indicators"
          description="Derived live from milestone, design, procurement, risk and safety records."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <KpiCard
            label="Overall Progress"
            value={percent(kpis.overallProgress)}
            icon={Gauge}
            tone="info"
            progress={kpis.overallProgress}
            target={64}
            hint="Planned 64% at end of July"
          />
          <KpiCard
            label="Design Progress"
            value={percent(kpis.designProgress)}
            icon={Ruler}
            tone="success"
            progress={kpis.designProgress}
            href="/design"
            hint="11 of 14 packages approved"
          />
          <KpiCard
            label="Procurement Progress"
            value={percent(kpis.procurementProgress)}
            icon={ShoppingCart}
            tone="warning"
            progress={kpis.procurementProgress}
            href="/procurement"
            hint="9 of 14 packages with PO issued"
          />
          <KpiCard
            label="Construction Progress"
            value={percent(kpis.constructionProgress)}
            icon={Hammer}
            tone="critical"
            progress={kpis.constructionProgress}
            target={50}
            href="/phases"
            hint="Behind plan — recovery plan active"
          />
          <KpiCard
            label="Safety Score"
            value={percent(kpis.safetyScore)}
            icon={HardHat}
            tone={statuses.safety === "GREEN" ? "success" : "warning"}
            progress={kpis.safetyScore}
            href="/safety"
            hint="Zero LTI · 198 LTI-free days"
          />
          <KpiCard
            label="Open Risks"
            value={kpis.openRisks}
            icon={AlertTriangle}
            tone={statuses.risk === "RED" ? "critical" : "warning"}
            href="/risks"
            hint={`${summary.topRisks.filter((r) => r.level === "CRITICAL").length} critical · ${summary.topRisks.filter((r) => r.level === "HIGH").length} high`}
          />
          <KpiCard
            label="Overdue Actions"
            value={kpis.overdueActions}
            icon={ClipboardList}
            tone={kpis.overdueActions > 0 ? "critical" : "success"}
            href="/actions"
            hint="Across all responsible parties"
          />
          <KpiCard
            label="Pending Approvals"
            value={kpis.pendingApprovals}
            icon={CheckCircle2}
            tone="warning"
            href="/submissions"
            hint="Documents, payments and purchase orders"
          />
          <KpiCard
            label="Pending DA Submissions"
            value={kpis.pendingDaSubmissions}
            icon={FileClock}
            tone={kpis.pendingDaSubmissions > 0 ? "warning" : "success"}
            href="/submissions"
            hint="Awaiting Design Alternative revision"
          />
          <KpiCard
            label="Pending Owner Reviews"
            value={kpis.pendingOwnerReviews}
            icon={FileSearch}
            tone={kpis.pendingOwnerReviews > 0 ? "warning" : "success"}
            href="/submissions"
            hint="With QNITY / SYME072 reviewers"
          />
        </div>
      </section>

      {/* ------------------------ Status + S-curve ---------------------- */}
      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Progress S-curve — planned vs actual</CardTitle>
            <p className="text-sm text-muted-foreground">
              Cumulative project completion against the approved baseline.
            </p>
          </CardHeader>
          <CardContent>
            <ProgressCurveChart data={progressCurve} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status summary</CardTitle>
            <p className="text-sm text-muted-foreground">
              Traffic light by project area.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {statusTiles.map((tile) => (
              <Link
                key={tile.label}
                href={tile.href}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 transition-colors hover:bg-muted/60"
              >
                <span className="text-sm font-medium">{tile.label}</span>
                <StatusBadge
                  status={tile.value}
                  tone={healthTone(tile.value)}
                  label={
                    tile.value === "GREEN"
                      ? "On Track"
                      : tile.value === "YELLOW"
                        ? "Watch"
                        : "Critical"
                  }
                />
              </Link>
            ))}

            {canSeeFinancials && (
              <div className="mt-3 rounded-md border border-border p-3">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Banknote className="h-3.5 w-3.5" />
                  Payment released
                </p>
                <p className="mt-1.5 text-lg font-semibold tabular-nums">
                  10.0%{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    of THB 48.5M contract value
                  </span>
                </p>
                <Progress value={10} tone="info" size="sm" className="mt-2" />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  PM-02 (THB 9.7M) on hold pending full IFC release.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* -------------------- Owner attention required ------------------ */}
      {canSeeAttention && summary.attentionItems.length > 0 && (
        <section>
          <SectionTitle
            title="Owner attention required"
            description="Items awaiting a decision, approval or escalation from QNITY leadership."
            actions={
              <Button asChild variant="ghost" size="sm">
                <Link href="/owner-attention">
                  View all <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            }
          />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {summary.attentionItems.slice(0, 3).map((item) => (
              <Card key={item.id} className="border-l-4 border-l-destructive">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-primary">
                      {item.code}
                    </span>
                    <StatusBadge
                      status={item.urgency}
                      tone={healthTone(item.urgency)}
                      label={item.status === "OVERDUE" ? "Decision overdue" : item.category}
                    />
                  </div>
                  <CardTitle className="text-sm leading-snug">
                    {item.topic}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="line-clamp-3 text-muted-foreground">
                    {item.requiredDecision}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BellRing className="h-3 w-3" />
                      {item.decisionOwner}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      By {formatDate(item.requestedDecisionDate)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ------------- Milestones / risks / overdue actions -------------- */}
      <section className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming key milestones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {summary.upcomingMilestones.map((m) => (
              <div
                key={m.id}
                className="flex items-start justify-between gap-3 border-b border-border/60 pb-2.5 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.code} · {formatDate(m.plannedDate)} · {m.owner}
                  </p>
                </div>
                <StatusBadge status={m.status} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 risks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {summary.topRisks.map((r) => (
              <div
                key={r.id}
                className="border-b border-border/60 pb-2.5 last:border-0 last:pb-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-mono text-xs font-semibold text-primary">
                    {r.code}
                  </p>
                  <StatusBadge status={r.level} />
                </div>
                <p className="mt-1 line-clamp-2 text-sm">{r.description}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {r.category} · {r.owner} · L{r.likelihood} × I{r.impact}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top overdue actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {summary.topOverdueActions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No overdue actions. Every action is within its due date.
              </p>
            ) : (
              summary.topOverdueActions.map((a) => (
                <div
                  key={a.id}
                  className="border-b border-border/60 pb-2.5 last:border-0 last:pb-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-mono text-xs font-semibold text-primary">
                      {a.code}
                    </p>
                    <StatusBadge status={a.priority} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm">{a.description}</p>
                  <p className="mt-0.5 text-xs text-destructive">
                    Due {formatDate(a.dueDate)} · {a.owner} ({a.company})
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <p className="text-xs text-muted-foreground">
        Signed in as {user.name} · {user.jobTitle}. Figures refresh from the
        project records each time this page is opened.
      </p>
    </>
  );
}
