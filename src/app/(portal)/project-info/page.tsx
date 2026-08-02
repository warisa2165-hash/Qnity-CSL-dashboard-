import { Building2, CalendarCheck, Target, Users } from "lucide-react";

import { requirePage } from "@/lib/guard";
import { getProject } from "@/lib/data";
import { formatCurrency, formatDate, daysRemaining } from "@/lib/utils";
import { HEALTH_LABEL, healthTone } from "@/lib/status";

import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { RecordEditor } from "@/components/dashboard/record-editor";
import { StorageNotice } from "@/components/dashboard/storage-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Project Information" };

export default async function ProjectInfoPage() {
  const { can } = await requirePage("project-info");
  const project = await getProject();
  const editable = can("project-info:edit");

  const facts = [
    { label: "Project name", value: project.name },
    { label: "Project code", value: project.code },
    { label: "Project location", value: project.location },
    { label: "Project owner", value: project.owner },
    { label: "Project administrator", value: project.administrator },
    { label: "Project consultant", value: project.consultant },
    { label: "Main contractor", value: project.contractor },
    { label: "Contract value", value: formatCurrency(project.contractValue, project.currency) },
  ];

  const dates = [
    { label: "Project start", value: formatDate(project.startDate) },
    { label: "Target completion", value: formatDate(project.targetCompletionDate) },
    { label: "Target handover", value: formatDate(project.targetHandoverDate) },
    {
      label: "Days to handover",
      value: `${daysRemaining(project.targetHandoverDate)} days`,
    },
  ];

  return (
    <>
      <PageHeader
        title="Project Information"
        description="Reference record for the QNITY CSL Laboratory Renovation 2026 project."
        readOnly={!editable}
        actions={
          editable && (
            <RecordEditor
              entityKey="project"
              record={project as unknown as Record<string, unknown>}
              label="Edit project details"
            />
          )
        }
      />

      <StorageNotice editable={editable} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Project identity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {facts.map((f) => (
                <div key={f.label}>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {f.label}
                  </dt>
                  <dd className="mt-0.5 text-sm font-medium">{f.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-primary" />
              Status &amp; schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Project health
              </p>
              <div className="mt-1">
                <StatusBadge
                  status={project.health}
                  tone={healthTone(project.health)}
                  label={HEALTH_LABEL[project.health]}
                />
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Project status
              </p>
              <p className="mt-0.5 text-sm font-medium">{project.status}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Current phase
              </p>
              <p className="mt-0.5 text-sm font-medium">{project.currentPhase}</p>
            </div>
            <dl className="space-y-2 border-t border-border pt-3">
              {dates.map((dte) => (
                <div key={dte.label} className="flex justify-between gap-3 text-sm">
                  <dt className="text-muted-foreground">{dte.label}</dt>
                  <dd className="font-medium">{dte.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Project objective
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground">
            {project.objective}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Scope summary</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {project.scopeSummary.map((item, i) => (
                <li key={item} className="flex gap-3 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent text-[11px] font-semibold text-accent-foreground">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Key stakeholders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {project.stakeholders.map((s) => (
                <li
                  key={s.name}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.role}</p>
                  </div>
                  <Badge variant="outline">{s.company}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
