import { cn, formatDate } from "@/lib/utils";
import { toneFor, TONE_DOT } from "@/lib/status";
import { StatusBadge } from "@/components/dashboard/status-badge";

export interface GanttBar {
  id: string;
  name: string;
  /** Approved baseline. */
  plannedStart: string;
  plannedFinish: string;
  actualStart?: string | null;
  actualFinish?: string | null;
  /** Forecast finish at current performance; drives the delay overlay. */
  forecastStart?: string | null;
  forecastFinish?: string | null;
  progress: number;
  status: string;
  owner?: string;
  /** On the driving path to the forecast completion date. */
  isCritical?: boolean;
  /** Days late (positive) or early (negative) against the baseline finish. */
  varianceDays?: number;
}

export interface GanttMilestone {
  id: string;
  code: string;
  name: string;
  /** Where the diamond sits — the forecast or actual date. */
  date: string;
  baselineDate: string;
  status: string;
  varianceDays: number;
}

interface GanttProps {
  bars: GanttBar[];
  milestones?: GanttMilestone[];
  /** Overall project window; defaults to the min/max of the bars. */
  windowStart?: string;
  windowEnd?: string;
  /** Vertical "today" marker. */
  today?: string;
  /** Contract date marker, e.g. the committed handover. */
  deadline?: string;
  deadlineLabel?: string;
}

function ms(date: string) {
  return new Date(date).getTime();
}

function monthTicks(start: number, end: number) {
  const ticks: { label: string; position: number }[] = [];
  const cursor = new Date(start);
  cursor.setUTCDate(1);
  while (cursor.getTime() <= end) {
    const position = ((cursor.getTime() - start) / (end - start)) * 100;
    if (position >= 0 && position <= 100) {
      ticks.push({
        label: cursor.toLocaleDateString("en-GB", {
          month: "short",
          timeZone: "UTC",
        }),
        position,
      });
    }
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return ticks;
}

/**
 * Gantt-style phase timeline with baseline-versus-forecast comparison.
 *
 * Each row draws up to three bars:
 *   · the approved baseline (dashed outline),
 *   · actual/forecast progress (solid, filled to percent complete),
 *   · a hatched delay overlay from the baseline finish to the forecast
 *     finish, so slip is visible as length rather than as a number.
 *
 * Rendered on the server with no chart library, so it prints correctly in
 * the weekly executive report.
 */
export function Gantt({
  bars,
  milestones = [],
  windowStart,
  windowEnd,
  today,
  deadline,
  deadlineLabel = "Contract date",
}: GanttProps) {
  if (!bars.length) return null;

  // The window must cover forecast dates too, or a slipping bar runs off the
  // end of the chart and the delay becomes invisible.
  const candidateStarts = bars.flatMap((b) =>
    [b.plannedStart, b.actualStart, b.forecastStart].filter(Boolean as never),
  ) as string[];
  const candidateEnds = bars.flatMap((b) =>
    [b.plannedFinish, b.actualFinish, b.forecastFinish].filter(Boolean as never),
  ) as string[];
  if (deadline) candidateEnds.push(deadline);
  // Milestone forecasts can land well beyond the last phase — MS-09 is four
  // months past handover. Leaving them out of the window would clip the most
  // important slip on the page.
  for (const m of milestones) {
    candidateStarts.push(m.date);
    candidateEnds.push(m.date);
  }

  const start = ms(windowStart ?? candidateStarts.sort()[0]);
  const end = ms(windowEnd ?? candidateEnds.sort()[candidateEnds.length - 1]);
  const span = Math.max(end - start, 1);
  const ticks = monthTicks(start, end);

  const pos = (date: string) => ((ms(date) - start) / span) * 100;
  const todayPos = today ? pos(today) : null;
  const deadlinePos = deadline ? pos(deadline) : null;

  const place = (from: string, to: string) => {
    const left = pos(from);
    const width = pos(to) - left;
    return {
      left: `${Math.max(0, Math.min(100, left))}%`,
      width: `${Math.max(0.6, Math.min(100 - Math.max(0, left), width))}%`,
    };
  };

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <div className="min-w-[52rem]">
        {/* Month scale */}
        <div className="relative mb-2 ml-[16rem] h-5 border-b border-border">
          {ticks.map((t) => (
            <span
              key={`${t.label}-${t.position}`}
              className="absolute -translate-x-1/2 text-[10px] uppercase tracking-wide text-muted-foreground"
              style={{ left: `${t.position}%` }}
            >
              {t.label}
            </span>
          ))}
        </div>

        <div className="space-y-2">
          {bars.map((bar) => {
            const planned = place(bar.plannedStart, bar.plannedFinish);
            const progressEnd =
              bar.forecastFinish ?? bar.actualFinish ?? bar.plannedFinish;
            const actual = bar.actualStart
              ? place(bar.actualStart, progressEnd)
              : null;

            // Slip is drawn from the baseline finish to the forecast finish.
            const late =
              bar.forecastFinish &&
              ms(bar.forecastFinish) > ms(bar.plannedFinish);
            const delay = late
              ? place(bar.plannedFinish, bar.forecastFinish!)
              : null;

            const tone = toneFor(bar.status);

            return (
              <div key={bar.id} className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-[15rem] shrink-0 border-l-2 py-0.5 pl-2 pr-2",
                    bar.isCritical ? "border-l-destructive" : "border-l-transparent",
                  )}
                >
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                    <span className="truncate" title={bar.name}>
                      {bar.name}
                    </span>
                    {bar.isCritical && (
                      <span
                        title="On the critical path"
                        className="shrink-0 rounded bg-destructive/10 px-1 text-[9px] font-bold uppercase tracking-wide text-destructive"
                      >
                        CP
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDate(bar.plannedStart)} → {formatDate(bar.plannedFinish)}
                  </p>
                </div>

                <div className="relative h-11 flex-1 rounded bg-muted/50">
                  {deadlinePos !== null &&
                    deadlinePos >= 0 &&
                    deadlinePos <= 100 && (
                      <span
                        aria-hidden
                        title={`${deadlineLabel}: ${formatDate(deadline!)}`}
                        className="absolute top-0 z-10 h-full w-px bg-primary/70"
                        style={{ left: `${deadlinePos}%` }}
                      />
                    )}

                  {todayPos !== null && todayPos >= 0 && todayPos <= 100 && (
                    <span
                      aria-hidden
                      className="absolute top-0 z-10 h-full w-px bg-foreground/50"
                      style={{ left: `${todayPos}%` }}
                    />
                  )}

                  {/* Baseline */}
                  <div
                    className="absolute top-1.5 h-3 rounded-sm border border-dashed border-muted-foreground/50 bg-muted-foreground/10"
                    style={planned}
                    title={`Baseline: ${formatDate(bar.plannedStart)} – ${formatDate(bar.plannedFinish)}`}
                  />

                  {/* Actual / forecast, filled to percent complete */}
                  {actual && (
                    <div
                      className={cn(
                        "absolute top-5 h-4 overflow-hidden rounded-sm bg-muted ring-1",
                        bar.isCritical ? "ring-destructive/40" : "ring-transparent",
                      )}
                      style={actual}
                      title={`Actual/forecast: ${formatDate(bar.actualStart!)} – ${formatDate(progressEnd)} · ${Math.round(bar.progress)}% complete`}
                    >
                      <div
                        className={cn("h-full", TONE_DOT[tone])}
                        style={{
                          width: `${Math.max(2, Math.min(100, bar.progress))}%`,
                        }}
                      />
                    </div>
                  )}

                  {/* Forecast bar for a phase that has not started yet */}
                  {!actual && bar.forecastStart && bar.forecastFinish && (
                    <div
                      className={cn(
                        "absolute top-5 h-4 rounded-sm border border-dashed",
                        bar.isCritical
                          ? "border-destructive/50 bg-destructive/10"
                          : "border-primary/40 bg-primary/10",
                      )}
                      style={place(bar.forecastStart, bar.forecastFinish)}
                      title={`Forecast: ${formatDate(bar.forecastStart)} – ${formatDate(bar.forecastFinish)}`}
                    />
                  )}

                  {/* Delay overlay */}
                  {delay && (
                    <div
                      className="absolute top-5 h-4 rounded-r-sm border border-destructive/50"
                      style={{
                        ...delay,
                        backgroundImage:
                          "repeating-linear-gradient(45deg, rgba(209,52,56,0.55) 0, rgba(209,52,56,0.55) 3px, transparent 3px, transparent 6px)",
                      }}
                      title={`Slip: ${formatDate(bar.plannedFinish)} → ${formatDate(bar.forecastFinish!)} (${bar.varianceDays ?? "?"} days)`}
                    />
                  )}
                </div>

                <div className="flex w-[12rem] shrink-0 items-center justify-end gap-2">
                  {bar.varianceDays !== undefined && bar.varianceDays !== 0 && (
                    <span
                      className={cn(
                        "text-xs font-medium tabular-nums",
                        bar.varianceDays > 0 ? "text-destructive" : "text-success",
                      )}
                    >
                      {bar.varianceDays > 0 ? "+" : ""}
                      {bar.varianceDays}d
                    </span>
                  )}
                  <span className="text-xs font-medium tabular-nums">
                    {Math.round(bar.progress)}%
                  </span>
                  <StatusBadge status={bar.status} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Milestone track */}
        {milestones.length > 0 && (
          <div className="mt-3 flex items-start gap-3 border-t border-border pt-3">
            <div className="w-[15rem] shrink-0 pl-2 pr-2">
              <p className="text-sm font-medium">Milestones</p>
              <p className="text-xs text-muted-foreground">
                Positioned at forecast date
              </p>
            </div>
            <div className="relative h-14 flex-1">
              {milestones.map((m, index) => {
                const p = pos(m.date);
                if (p < 0 || p > 100) return null;
                const late = m.varianceDays > 0;
                const done = m.status === "COMPLETED";
                // Rotate the label across three rows. Four milestones land
                // inside the last three weeks of the schedule, so two rows
                // still overprint.
                const labelRow = index % 3;
                return (
                  <span
                    key={m.id}
                    title={`${m.code} ${m.name}\nBaseline: ${formatDate(m.baselineDate)}\nForecast: ${formatDate(m.date)}${late ? ` (+${m.varianceDays} days)` : ""}`}
                    className="absolute top-1 -translate-x-1/2"
                    style={{ left: `${p}%` }}
                  >
                    <span
                      className={cn(
                        "block h-2.5 w-2.5 rotate-45 border",
                        done
                          ? "border-success bg-success"
                          : late
                            ? "border-destructive bg-destructive"
                            : "border-primary bg-primary",
                      )}
                    />
                    <span
                      className={cn(
                        "absolute left-1/2 block -translate-x-1/2 whitespace-nowrap text-[9px] font-medium text-muted-foreground",
                        labelRow === 0 && "top-4",
                        labelRow === 1 && "top-8",
                        labelRow === 2 && "top-[2.9rem]",
                      )}
                    >
                      {m.code}
                    </span>
                  </span>
                );
              })}
            </div>
            <div className="w-[12rem] shrink-0" />
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-6 rounded-sm border border-dashed border-muted-foreground/50 bg-muted-foreground/10" />
            Baseline
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-6 rounded-sm bg-primary" />
            Actual / progress
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-6 rounded-sm border border-destructive/50"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, rgba(209,52,56,0.55) 0, rgba(209,52,56,0.55) 3px, transparent 3px, transparent 6px)",
              }}
            />
            Slip vs baseline
          </span>
          <span className="flex items-center gap-1.5">
            <span className="rounded bg-destructive/10 px-1 text-[9px] font-bold uppercase text-destructive">
              CP
            </span>
            Critical path
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rotate-45 border border-primary bg-primary" />
            Milestone
          </span>
          {today && (
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-px bg-foreground/50" />
              Today ({formatDate(today)})
            </span>
          )}
          {deadline && (
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-px bg-primary/70" />
              {deadlineLabel} ({formatDate(deadline)})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
