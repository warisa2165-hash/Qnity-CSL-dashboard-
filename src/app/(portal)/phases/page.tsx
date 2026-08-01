import {
  AlertOctagon,
  ArrowRight,
  CalendarClock,
  Flag,
  Gauge,
  LifeBuoy,
  Route,
  TrendingDown,
} from "lucide-react";

import { requirePage } from "@/lib/guard";
import { getMilestones, getPhases, getProject } from "@/lib/data";
import {
  analyseSchedule,
  floatLabel,
  spiTone,
  varianceLabel,
} from "@/lib/schedule";
import { cn, formatDate } from "@/lib/utils";
import { progressTone, TONE_CLASSES } from "@/lib/status";

import { PageHeader, SectionTitle } from "@/components/dashboard/page-header";
import { KpiCard, CounterTile } from "@/components/dashboard/kpi-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Gantt } from "@/components/dashboard/gantt";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const metadata = { title: "Project Phase Dashboard" };

const COMPARISON_COLUMNS: Column[] = [
  { key: "phase", header: "Phase", className: "min-w-[11rem]" },
  { key: "baselineStart", header: "Baseline start", type: "date" },
  { key: "baselineFinish", header: "Baseline finish", type: "date" },
  { key: "actualStart", header: "Actual start", type: "date" },
  { key: "forecastFinish", header: "Actual / forecast finish", type: "date" },
  { key: "startVariance", header: "Start var.", type: "variance" },
  { key: "finishVariance", header: "Finish var.", type: "variance" },
  { key: "plannedProgress", header: "Planned %", type: "percent", hideOnMobile: true },
  { key: "actualProgress", header: "Actual %", type: "percent" },
  { key: "progressVariance", header: "Progress var.", type: "variance", hideOnMobile: true },
  { key: "spi", header: "SPI", hideOnMobile: true },
  { key: "float", header: "Total float", hideOnMobile: true },
  { key: "criticality", header: "Critical path", type: "status" },
];

const MILESTONE_COLUMNS: Column[] = [
  { key: "code", header: "ID", type: "code", className: "w-16" },
  { key: "name", header: "Milestone", wrap: true, className: "min-w-[13rem]" },
  { key: "phase", header: "Phase", hideOnMobile: true },
  { key: "owner", header: "Owner", hideOnMobile: true },
  { key: "baselineDate", header: "Baseline", type: "date" },
  { key: "forecastDate", header: "Forecast / actual", type: "date" },
  { key: "variance", header: "Variance", type: "variance" },
  { key: "basis", header: "Forecast basis", type: "status" },
  { key: "status", header: "Status", type: "status" },
  { key: "criticality", header: "Critical path", type: "status" },
];

export default async function PhasesPage() {
  const { can } = await requirePage("phases");
  const [phases, milestones, project] = await Promise.all([
    getPhases(),
    getMilestones(),
    getProject(),
  ]);

  const schedule = analyseSchedule(phases, milestones, project);
  const {
    phases: analyses,
    criticalPath,
    forecastHandover,
    targetHandover,
    handoverVarianceDays,
    projectSpi,
    recoveryRequiredDays,
    delayedPhases,
    dataDate,
  } = schedule;

  const criticalAnalyses = criticalPath
    .map((id) => schedule.byId.get(id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  const openMilestones = schedule.milestones.filter(
    (m) => m.milestone.status !== "COMPLETED",
  );
  const slippedMilestones = openMilestones.filter((m) => m.varianceDays > 0);

  const comparisonRows = analyses.map((a) => ({
    id: a.phase.id,
    phase: a.phase.name,
    baselineStart: a.phase.plannedStart,
    baselineFinish: a.phase.plannedFinish,
    actualStart: a.phase.actualStart,
    forecastFinish: a.forecastFinish,
    startVariance: a.startVarianceDays,
    finishVariance: a.finishVarianceDays,
    plannedProgress: a.phase.plannedProgress,
    actualProgress: a.phase.progress,
    progressVariance: a.progressVariancePoints,
    spi: a.spi ? a.spi.toFixed(2) : "—",
    float: floatLabel(a.totalFloatDays),
    criticality: a.isCritical ? "Critical" : a.phase.status === "COMPLETED" ? "Completed" : "Not critical",
  }));

  const milestoneRows = schedule.milestones.map((m) => ({
    id: m.milestone.id,
    code: m.milestone.code,
    name: m.milestone.name,
    phase: m.milestone.phase,
    owner: m.milestone.owner,
    baselineDate: m.milestone.plannedDate,
    forecastDate: m.forecastDate,
    variance: m.varianceDays,
    basis: m.basis,
    status: m.milestone.status,
    criticality: m.isCritical ? "Critical" : "Not critical",
  }));

  const late = handoverVarianceDays > 0;

  return (
    <>
      <PageHeader
        title="Project Phase Dashboard"
        description={`Planned versus actual delivery, critical path and forecast for each phase of the CSL renovation. Schedule position as at ${formatDate(dataDate)}.`}
        readOnly={!can("phases:edit")}
      />

      {/* ---------------------- Forecast headline ---------------------- */}
      <section
        className={cn(
          "rounded-lg border p-5",
          TONE_CLASSES[late ? "critical" : "success"],
        )}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
              Schedule forecast at current performance
            </p>
            <p className="mt-1 text-2xl font-semibold leading-tight">
              {late
                ? `Handover forecast ${handoverVarianceDays} days late`
                : "Handover forecast on or ahead of the committed date"}
            </p>
            <p className="mt-1.5 text-sm opacity-90">
              {late
                ? `Construction performance is carrying ${handoverVarianceDays} days of slip through commissioning to handover. The recovery plan has to claw back ${recoveryRequiredDays} days to protect ${formatDate(targetHandover)}.`
                : `Forecast completion ${formatDate(forecastHandover)} against a committed ${formatDate(targetHandover)}.`}
            </p>
          </div>

          <dl className="grid shrink-0 grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="opacity-80">Committed handover</dt>
              <dd className="font-semibold">{formatDate(targetHandover)}</dd>
            </div>
            <div>
              <dt className="opacity-80">Forecast handover</dt>
              <dd className="font-semibold">{formatDate(forecastHandover)}</dd>
            </div>
            <div>
              <dt className="opacity-80">Variance</dt>
              <dd className="font-semibold tabular-nums">
                {varianceLabel(handoverVarianceDays)}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* --------------------------- KPI row --------------------------- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Schedule performance (SPI)"
          value={projectSpi.toFixed(2)}
          icon={Gauge}
          tone={spiTone(projectSpi)}
          progress={Math.min(100, projectSpi * 100)}
          target={100}
          hint="Actual ÷ planned progress, duration-weighted"
        />
        <KpiCard
          label="Forecast handover"
          value={formatDate(forecastHandover)}
          icon={CalendarClock}
          tone={late ? "critical" : "success"}
          hint={`Committed ${formatDate(targetHandover)}`}
        />
        <KpiCard
          label="Recovery required"
          value={recoveryRequiredDays}
          unit="days"
          icon={LifeBuoy}
          tone={recoveryRequiredDays > 0 ? "critical" : "success"}
          hint="To protect the committed handover date"
        />
        <KpiCard
          label="Phases on critical path"
          value={criticalPath.length}
          icon={Route}
          tone={criticalPath.length > 0 ? "warning" : "success"}
          hint={criticalAnalyses.map((a) => a.phase.name).join(" → ") || "None"}
        />
        <KpiCard
          label="Phases behind baseline"
          value={delayedPhases.length}
          icon={TrendingDown}
          tone={delayedPhases.length > 0 ? "critical" : "success"}
          hint={`${analyses.filter((a) => a.phase.status === "COMPLETED").length} of ${analyses.length} phases complete`}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <CounterTile
          label="Milestones forecast late"
          value={slippedMilestones.length}
          tone={slippedMilestones.length > 0 ? "critical" : "success"}
        />
        <CounterTile
          label="Open milestones"
          value={openMilestones.length}
          tone="info"
        />
        <CounterTile
          label="Largest milestone slip"
          value={
            slippedMilestones.length
              ? `${Math.max(...slippedMilestones.map((m) => m.varianceDays))} d`
              : "—"
          }
          tone={slippedMilestones.length ? "critical" : "success"}
        />
        <CounterTile
          label="Weighted phase progress"
          value={`${Math.round(project.overallProgress)}%`}
          tone="info"
        />
      </div>

      {/* ---------------------------- Gantt ---------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Baseline versus forecast timeline</CardTitle>
          <p className="text-sm text-muted-foreground">
            Dashed bars are the approved baseline; solid bars are actual
            progress; hatched red is slip beyond the baseline finish. Phases
            marked <strong>CP</strong> drive the handover date.
          </p>
        </CardHeader>
        <CardContent>
          <Gantt
            bars={analyses.map((a) => ({
              id: a.phase.id,
              name: `${a.phase.sequence}. ${a.phase.name}`,
              plannedStart: a.phase.plannedStart,
              plannedFinish: a.phase.plannedFinish,
              actualStart: a.phase.actualStart,
              actualFinish: a.phase.actualFinish,
              forecastStart: a.forecastStart,
              forecastFinish: a.forecastFinish,
              progress: a.phase.progress,
              status: a.phase.status,
              owner: a.phase.owner,
              isCritical: a.isCritical,
              varianceDays: a.finishVarianceDays,
            }))}
            milestones={schedule.milestones.map((m) => ({
              id: m.milestone.id,
              code: m.milestone.code,
              name: m.milestone.name,
              date: m.forecastDate,
              baselineDate: m.milestone.plannedDate,
              status: m.milestone.status,
              varianceDays: m.varianceDays,
            }))}
            windowStart={project.startDate}
            today={dataDate}
            deadline={targetHandover}
            deadlineLabel="Committed handover"
          />
        </CardContent>
      </Card>

      {/* ------------------ Critical path + variance ------------------- */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-l-4 border-l-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-4 w-4 text-destructive" />
              Critical path to handover
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              The chain that sets the forecast handover date. It terminates at
              the phase whose own performance is driving the schedule — that is
              the one to act on.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {criticalAnalyses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No incomplete phase is currently driving the handover date.
              </p>
            ) : (
              criticalAnalyses.map((a, i) => {
                const driver = a.drivingPredecessorId
                  ? schedule.byId.get(a.drivingPredecessorId)
                  : null;
                const link = a.drivingPredecessorId
                  ? a.phase.dependsOn.find(
                      (d) => d.phaseId === a.drivingPredecessorId,
                    )
                  : null;
                return (
                  <div
                    key={a.phase.id}
                    className="rounded-md border border-destructive/25 bg-destructive/5 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-destructive text-[11px] font-bold text-destructive-foreground">
                          {i + 1}
                        </span>
                        {a.phase.name}
                      </p>
                      <span className="text-xs font-medium tabular-nums text-destructive">
                        {varianceLabel(a.finishVarianceDays)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Forecast {formatDate(a.forecastStart)} →{" "}
                      {formatDate(a.forecastFinish)} · baseline finish{" "}
                      {formatDate(a.phase.plannedFinish)} · owner{" "}
                      {a.phase.owner}
                    </p>
                    {driver && link ? (
                      <p className="mt-1.5 flex items-start gap-1.5 text-xs">
                        <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                        <span>
                          <span className="text-muted-foreground">
                            Driven by {driver.phase.name}
                            {link.lagDays !== 0 &&
                              ` (${link.lagDays > 0 ? "+" : ""}${link.lagDays} day ${link.lagDays < 0 ? "overlap" : "lag"})`}
                            {" — "}
                          </span>
                          {link.note}
                        </span>
                      </p>
                    ) : (
                      <p className="mt-1.5 text-xs font-medium text-destructive">
                        Driven by its own productivity — SPI{" "}
                        {a.spi ? a.spi.toFixed(2) : "—"}. Recovery has to come
                        from this phase.
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              Schedule variance by phase
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Actual progress against the progress the baseline expects today.
            </p>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {analyses
              .filter((a) => a.phase.status !== "NOT_STARTED")
              .map((a) => (
                <div key={a.phase.id}>
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{a.phase.name}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="tabular-nums text-muted-foreground">
                        {a.phase.progress}% of {a.phase.plannedProgress}% planned
                      </span>
                      <span
                        className={cn(
                          "font-medium tabular-nums",
                          a.progressVariancePoints < 0
                            ? "text-destructive"
                            : "text-success",
                        )}
                      >
                        {a.progressVariancePoints > 0 ? "+" : ""}
                        {a.progressVariancePoints} pts
                      </span>
                      {a.spi !== null && (
                        <StatusBadge
                          status={`SPI ${a.spi.toFixed(2)}`}
                          tone={spiTone(a.spi)}
                          label={`SPI ${a.spi.toFixed(2)}`}
                          dot={false}
                        />
                      )}
                    </div>
                  </div>
                  <Progress
                    value={a.phase.progress}
                    target={a.phase.plannedProgress}
                    tone={progressTone(a.phase.progress, a.phase.plannedProgress)}
                  />
                </div>
              ))}
            <p className="border-t border-border pt-3 text-xs text-muted-foreground">
              The marker on each bar is the baseline position. SPI below 1.00
              means the phase is earning progress more slowly than the baseline
              assumed, and the forecast stretches the remaining duration by the
              same factor.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------ Delay analysis ----------------------- */}
      {delayedPhases.length > 0 && (
        <section>
          <SectionTitle
            title="Delay analysis and recovery"
            description="Every phase forecast to finish later than the approved baseline, with root cause and the agreed recovery plan."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {delayedPhases.map((a) => (
              <Card
                key={a.phase.id}
                className={cn(
                  "border-l-4",
                  a.isCritical ? "border-l-destructive" : "border-l-warning",
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="flex items-center gap-2">
                      {a.phase.name}
                      {a.isCritical && (
                        <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-destructive">
                          Critical path
                        </span>
                      )}
                    </CardTitle>
                    <StatusBadge status={a.phase.status} />
                  </div>
                  <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                    <div>
                      <dt className="text-muted-foreground">Baseline finish</dt>
                      <dd className="font-medium">
                        {formatDate(a.phase.plannedFinish)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Forecast finish</dt>
                      <dd className="font-medium text-destructive">
                        {formatDate(a.forecastFinish)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Slip</dt>
                      <dd className="font-medium tabular-nums text-destructive">
                        {a.finishVarianceDays} days
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Total float</dt>
                      <dd className="font-medium tabular-nums">
                        {floatLabel(a.totalFloatDays)}
                      </dd>
                    </div>
                  </dl>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/*
                    A phase can be late for two quite different reasons: its
                    own performance, or slip pushed onto it by a predecessor.
                    Commissioning and handover are in the second category —
                    telling their owners to "confirm the driver" would be
                    wrong, and asking them for a recovery plan would be
                    asking the wrong person.
                  */}
                  {(() => {
                    const driver = a.drivingPredecessorId
                      ? schedule.byId.get(a.drivingPredecessorId)
                      : null;

                    if (a.phase.delayReason) {
                      return (
                        <div className="rounded-md border border-destructive/25 bg-destructive/5 p-3">
                          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-destructive">
                            <AlertOctagon className="h-3.5 w-3.5" />
                            Root cause
                          </p>
                          <p className="mt-1 text-sm leading-relaxed">
                            {a.phase.delayReason}
                          </p>
                        </div>
                      );
                    }

                    if (driver) {
                      return (
                        <div className="rounded-md border border-border bg-muted/40 p-3">
                          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            <ArrowRight className="h-3.5 w-3.5" />
                            Slip inherited from {driver.phase.name}
                          </p>
                          <p className="mt-1 text-sm leading-relaxed">
                            This phase has no delay of its own. Its forecast
                            start is pushed back by {driver.phase.name}, which
                            is running {driver.finishVarianceDays} days late.
                            Recovering {driver.phase.name} recovers this phase.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <p className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm">
                        No root cause recorded for this slip. The forecast is
                        derived from performance alone — {a.phase.owner} to
                        confirm the driver.
                      </p>
                    );
                  })()}

                  {a.phase.recoveryPlan ? (
                    <div className="rounded-md border border-primary/25 bg-accent p-3 text-accent-foreground">
                      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
                        <LifeBuoy className="h-3.5 w-3.5" />
                        Recovery plan
                      </p>
                      <p className="mt-1 text-sm leading-relaxed">
                        {a.phase.recoveryPlan}
                      </p>
                    </div>
                  ) : a.drivingPredecessorId ? (
                    <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                      Recovery sits with{" "}
                      {schedule.byId.get(a.drivingPredecessorId)?.phase.name},
                      not with this phase.
                    </p>
                  ) : (
                    <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive">
                      No recovery plan on record for a phase forecast{" "}
                      {a.finishVarianceDays} days late.
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ------------------- Planned vs actual table -------------------- */}
      <section>
        <SectionTitle
          title="Planned versus actual comparison"
          description="Baseline dates, actual and forecast dates, start and finish variance, progress variance, SPI and total float for every phase."
        />
        <DataTable
          rows={comparisonRows}
          columns={COMPARISON_COLUMNS}
          searchKeys={["phase"]}
          filters={[{ key: "criticality", label: "Critical path" }]}
          exportName="qnity-csl-phase-schedule-variance"
          defaultSort="baselineStart"
        />
      </section>

      {/* --------------------- Milestone forecast ---------------------- */}
      <section>
        <SectionTitle
          title="Milestone forecast"
          description="Committed forecasts where the project has published one; otherwise the milestone carries the slip of its owning phase."
        />
        <DataTable
          rows={milestoneRows}
          columns={MILESTONE_COLUMNS}
          searchKeys={["code", "name", "owner", "phase"]}
          filters={[
            { key: "status", label: "Status" },
            { key: "phase", label: "Phase" },
            { key: "basis", label: "Basis" },
            { key: "criticality", label: "Critical path" },
          ]}
          exportName="qnity-csl-milestone-forecast"
          defaultSort="forecastDate"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          <strong>Committed</strong> — a date the project has formally
          published. <strong>Derived</strong> — the baseline date shifted by the
          owning phase&rsquo;s forecast slip. <strong>Actual</strong> — the
          milestone has been achieved. <strong>Baseline</strong> — no slip
          forecast, the approved date stands.
        </p>
      </section>

      {/* ----------------------- Phase detail --------------------------- */}
      <section>
        <SectionTitle
          title="Phase detail"
          description="Ownership, deliverables and the schedule position of each phase."
        />
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {analyses.map((a) => (
            <Card key={a.phase.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Phase {a.phase.sequence}
                    </p>
                    <CardTitle className="mt-0.5">{a.phase.name}</CardTitle>
                  </div>
                  <StatusBadge status={a.phase.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Progress vs {a.phase.plannedProgress}% planned
                    </span>
                    <span className="font-medium tabular-nums">
                      {a.phase.progress}%
                    </span>
                  </div>
                  <Progress
                    value={a.phase.progress}
                    target={a.phase.plannedProgress}
                    tone={progressTone(a.phase.progress, a.phase.plannedProgress)}
                  />
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Baseline start
                    </dt>
                    <dd className="font-medium">
                      {formatDate(a.phase.plannedStart)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Baseline finish
                    </dt>
                    <dd className="font-medium">
                      {formatDate(a.phase.plannedFinish)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Actual start</dt>
                    <dd className="font-medium">
                      {formatDate(a.phase.actualStart)}
                      {a.startVarianceDays !== null &&
                        a.startVarianceDays !== 0 && (
                          <span
                            className={cn(
                              "ml-1 text-xs",
                              a.startVarianceDays > 0
                                ? "text-destructive"
                                : "text-success",
                            )}
                          >
                            ({a.startVarianceDays > 0 ? "+" : ""}
                            {a.startVarianceDays}d)
                          </span>
                        )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      {a.phase.actualFinish ? "Actual finish" : "Forecast finish"}
                    </dt>
                    <dd
                      className={cn(
                        "font-medium",
                        a.isDelayed && "text-destructive",
                      )}
                    >
                      {formatDate(a.phase.actualFinish ?? a.forecastFinish)}
                      {a.finishVarianceDays !== 0 && (
                        <span className="ml-1 text-xs">
                          ({a.finishVarianceDays > 0 ? "+" : ""}
                          {a.finishVarianceDays}d)
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">Phase owner</dt>
                    <dd className="font-medium">{a.phase.owner}</dd>
                  </div>
                </dl>

                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Flag className="h-3 w-3" />
                    Key deliverables
                  </p>
                  <ul className="space-y-1">
                    {a.phase.keyDeliverables.map((k) => (
                      <li
                        key={k}
                        className="flex gap-2 text-sm leading-snug text-muted-foreground"
                      >
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
                        {k}
                      </li>
                    ))}
                  </ul>
                </div>

                {a.phase.dependsOn.length > 0 && (
                  <div className="border-t border-border pt-3">
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Predecessors
                    </p>
                    <ul className="space-y-1">
                      {a.phase.dependsOn.map((d) => {
                        const pred = schedule.byId.get(d.phaseId);
                        return (
                          <li key={d.phaseId} className="text-xs">
                            <span className="font-medium">
                              {pred?.phase.name ?? d.phaseId}
                            </span>
                            <span className="text-muted-foreground">
                              {" "}
                              ·{" "}
                              {d.lagDays === 0
                                ? "finish to start"
                                : d.lagDays < 0
                                  ? `${Math.abs(d.lagDays)} day overlap`
                                  : `${d.lagDays} day lag`}
                              {a.drivingPredecessorId === d.phaseId &&
                                " · driving"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
