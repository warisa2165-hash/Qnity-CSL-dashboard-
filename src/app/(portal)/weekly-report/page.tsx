import {
  Activity,
  AlertTriangle,
  BellRing,
  CalendarRange,
  CheckCircle2,
  Flag,
  Image as ImageIcon,
  ListTodo,
  Microscope,
  ShieldCheck,
  ShoppingCart,
  Target,
} from "lucide-react";

import { requirePage } from "@/lib/guard";
import { getWeeklyReports } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { HEALTH_LABEL, healthTone, TONE_CLASSES } from "@/lib/status";
import { cn } from "@/lib/utils";

import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ExportReportButton } from "./export-button";

export const metadata = { title: "Weekly Executive Report" };

function ListSection({
  title,
  icon: Icon,
  items,
  tone = "default",
}: {
  title: string;
  icon: typeof Activity;
  items: string[];
  tone?: "default" | "critical" | "warning" | "success";
}) {
  if (!items.length) return null;
  const dot =
    tone === "critical"
      ? "bg-destructive"
      : tone === "warning"
        ? "bg-warning"
        : tone === "success"
          ? "bg-success"
          : "bg-primary";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item} className="flex gap-2.5 text-sm leading-relaxed">
              <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default async function WeeklyReportPage() {
  const { can } = await requirePage("weekly-report");
  const reports = await getWeeklyReports();
  const report = reports[0];

  if (!report) {
    return (
      <PageHeader
        title="Weekly Executive Report"
        description="No weekly report has been published yet."
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Weekly Executive Report"
        description={`Week ${report.weekNumber} · ${formatDate(report.periodStart)} to ${formatDate(report.periodEnd)} · prepared by ${report.preparedBy}`}
        readOnly={!can("weekly-report:edit")}
        actions={
          can("weekly-report:download") && <ExportReportButton />
        }
      />

      {/* --------------------------- Status banner -------------------------- */}
      <section
        className={cn(
          "rounded-lg border p-5",
          TONE_CLASSES[healthTone(report.overallStatus)],
        )}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
              Overall project status
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {HEALTH_LABEL[report.overallStatus]}
            </p>
            <p className="mt-1 text-sm opacity-90">
              Current phase: {report.currentPhase}
            </p>
          </div>
          <div className="w-full max-w-xs">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="opacity-80">Overall progress</span>
              <span className="font-semibold tabular-nums">
                {report.overallProgress}%
              </span>
            </div>
            <Progress value={report.overallProgress} tone="info" />
            <p className="mt-1.5 text-xs opacity-80">
              Published {formatDate(report.publishedAt)}
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------- Narrative ----------------------------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ListSection
          title="Key achievements this week"
          icon={CheckCircle2}
          items={report.keyAchievements}
          tone="success"
        />
        <ListSection
          title="Key activities completed"
          icon={Activity}
          items={report.activitiesCompleted}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-success" />
              Safety summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {report.safetySummary}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShoppingCart className="h-4 w-4 text-primary" />
              Procurement summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {report.procurementSummary}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Microscope className="h-4 w-4 text-primary" />
              CAPEX equipment summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {report.capexSummary}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListSection
          title="Top risks"
          icon={AlertTriangle}
          items={report.topRisks}
          tone="critical"
        />
        <ListSection
          title="Open issues"
          icon={ListTodo}
          items={report.openIssues}
          tone="warning"
        />
      </div>

      <Card className="border-l-4 border-l-destructive">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BellRing className="h-4 w-4 text-destructive" />
            Management attention required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {report.managementAttention.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm leading-relaxed">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                <span className="font-medium">{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListSection
          title="Upcoming milestones"
          icon={Flag}
          items={report.upcomingMilestones}
        />
        <ListSection
          title="Next week focus"
          icon={Target}
          items={report.nextWeekFocus}
          tone="success"
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ImageIcon className="h-4 w-4 text-primary" />
            Photos &amp; highlights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {report.highlights.map((h, i) => (
              <div
                key={h}
                className="overflow-hidden rounded-md border border-border"
              >
                <div
                  className="h-24"
                  style={{
                    background: `linear-gradient(135deg, ${
                      ["#0078D4", "#107C10", "#FFB900"][i % 3]
                    } 0%, #106EBE 100%)`,
                  }}
                />
                <p className="p-2.5 text-sm leading-snug">{h}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ------------------------- Previous reports ------------------------- */}
      {reports.length > 1 && (
        <Card className="print:hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CalendarRange className="h-4 w-4 text-primary" />
              Previous reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {reports.slice(1).map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      Week {r.weekNumber} — {formatDate(r.periodStart)} to{" "}
                      {formatDate(r.periodEnd)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.currentPhase} · {r.overallProgress}% complete ·
                      prepared by {r.preparedBy}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-xs font-medium",
                      TONE_CLASSES[healthTone(r.overallStatus)],
                    )}
                  >
                    {HEALTH_LABEL[r.overallStatus]}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}
