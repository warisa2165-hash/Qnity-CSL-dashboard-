import { AlertOctagon, LifeBuoy } from "lucide-react";

import { requirePage } from "@/lib/guard";
import { getPhases, getProject } from "@/lib/data";
import { formatDate, average } from "@/lib/utils";
import { progressTone } from "@/lib/status";

import { PageHeader, SectionTitle } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Gantt } from "@/components/dashboard/gantt";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const metadata = { title: "Project Phase Dashboard" };

export default async function PhasesPage() {
  const { can } = await requirePage("phases");
  const [phases, project] = await Promise.all([getPhases(), getProject()]);

  const completed = phases.filter((p) => p.status === "COMPLETED").length;
  const atRisk = phases.filter((p) =>
    ["AT_RISK", "DELAYED"].includes(p.status),
  ).length;

  return (
    <>
      <PageHeader
        title="Project Phase Dashboard"
        description="Planned versus actual delivery for each phase of the CSL renovation, from initiation through to handover on 06 December 2026."
        readOnly={!can("phases:edit")}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Phases completed"
          value={`${completed} / ${phases.length}`}
          tone="success"
        />
        <KpiCard
          label="Phases in progress"
          value={phases.filter((p) => p.status === "IN_PROGRESS").length}
          tone="info"
        />
        <KpiCard
          label="Phases at risk or delayed"
          value={atRisk}
          tone={atRisk > 0 ? "critical" : "success"}
        />
        <KpiCard
          label="Weighted phase progress"
          value={`${Math.round(average(phases.map((p) => p.progress)))}%`}
          tone="info"
          progress={average(phases.map((p) => p.progress))}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Phase timeline</CardTitle>
          <p className="text-sm text-muted-foreground">
            Dashed bars show the approved baseline; solid bars show actual
            start and progress to date.
          </p>
        </CardHeader>
        <CardContent>
          <Gantt
            bars={phases.map((p) => ({
              id: p.id,
              name: `${p.sequence}. ${p.name}`,
              plannedStart: p.plannedStart,
              plannedFinish: p.plannedFinish,
              actualStart: p.actualStart,
              actualFinish: p.actualFinish,
              progress: p.progress,
              status: p.status,
              owner: p.owner,
            }))}
            windowStart={project.startDate}
            windowEnd={project.targetHandoverDate}
            today={new Date().toISOString().slice(0, 10)}
          />
        </CardContent>
      </Card>

      <section>
        <SectionTitle
          title="Phase detail"
          description="Deliverables, ownership, delay reasons and recovery plans."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          {phases.map((phase) => (
            <Card key={phase.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Phase {phase.sequence}
                    </p>
                    <CardTitle className="mt-0.5">{phase.name}</CardTitle>
                  </div>
                  <StatusBadge status={phase.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium tabular-nums">
                      {phase.progress}%
                    </span>
                  </div>
                  <Progress
                    value={phase.progress}
                    tone={progressTone(phase.progress)}
                  />
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Planned start
                    </dt>
                    <dd className="font-medium">{formatDate(phase.plannedStart)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Planned finish
                    </dt>
                    <dd className="font-medium">
                      {formatDate(phase.plannedFinish)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Actual start</dt>
                    <dd className="font-medium">{formatDate(phase.actualStart)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Actual finish
                    </dt>
                    <dd className="font-medium">{formatDate(phase.actualFinish)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">Phase owner</dt>
                    <dd className="font-medium">{phase.owner}</dd>
                  </div>
                </dl>

                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Key deliverables
                  </p>
                  <ul className="space-y-1">
                    {phase.keyDeliverables.map((k) => (
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

                {phase.delayReason && (
                  <div className="rounded-md border border-destructive/25 bg-destructive/5 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-destructive">
                      <AlertOctagon className="h-3.5 w-3.5" />
                      Delay reason
                    </p>
                    <p className="mt-1 text-sm leading-relaxed">
                      {phase.delayReason}
                    </p>
                  </div>
                )}

                {phase.recoveryPlan && (
                  <div className="rounded-md border border-primary/25 bg-accent p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent-foreground">
                      <LifeBuoy className="h-3.5 w-3.5" />
                      Recovery plan
                    </p>
                    <p className="mt-1 text-sm leading-relaxed">
                      {phase.recoveryPlan}
                    </p>
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
