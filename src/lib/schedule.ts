/**
 * Schedule analysis
 * =================
 *
 * Turns the phase network into the numbers a project review actually asks
 * for: how far behind are we, what is driving the handover date, and where
 * do the milestones land if nothing changes?
 *
 * Three calculations, in order:
 *
 *   1. Performance  — actual progress against the progress the baseline
 *                     expects today (SPI). Linear interpolation of the
 *                     planned dates would be wrong; the baseline curve is
 *                     not linear, so `plannedProgress` is carried on the
 *                     phase record.
 *
 *   2. Forecast     — remaining baseline duration stretched by 1/SPI, then
 *                     pushed forward through the dependency network. Phases
 *                     that have finished are fixed points.
 *
 *   3. Float and    — a backward pass from the contractual handover date
 *      driving path   gives each phase its total float. The critical path is
 *                     then traced as the *driving path*: from the last phase,
 *                     back through whichever predecessor actually sets each
 *                     forecast start. Float alone will not do — once a
 *                     project is late against a fixed deadline every open
 *                     phase shows negative float, which identifies nothing.
 *
 * Everything is a pure function of the records, so the page, the API and any
 * future export all read the same numbers.
 */

import type { Milestone, ProjectPhase, Project } from "@/lib/types";
import { daysBetween, today } from "@/lib/utils";

const DAY = 86_400_000;

const ms = (date: string) => new Date(`${date}T00:00:00.000Z`).getTime();
const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
const addDays = (date: string, days: number) => iso(ms(date) + days * DAY);

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type VarianceDirection = "AHEAD" | "ON_PLAN" | "BEHIND";

export interface PhaseAnalysis {
  phase: ProjectPhase;

  /** Baseline duration in calendar days. */
  plannedDuration: number;
  /** Forecast (or actual, once complete) duration in calendar days. */
  forecastDuration: number;

  /** Positive = started late. Null until the phase starts. */
  startVarianceDays: number | null;
  /** Positive = finishing late. Forecast-based while in progress. */
  finishVarianceDays: number;

  /** Actual − planned progress, in percentage points. */
  progressVariancePoints: number;
  /** Actual ÷ planned progress. 1.0 is on plan; below 1.0 is behind. */
  spi: number | null;

  forecastStart: string;
  forecastFinish: string;

  /**
   * Days the phase can slip before it breaches the date the baseline network
   * needs it to finish. Negative means it is already past that date.
   */
  totalFloatDays: number;
  /** The predecessor that actually sets this phase's forecast start. */
  drivingPredecessorId: string | null;
  /** On the driving path to the forecast handover date. */
  isCritical: boolean;
  /** True when the forecast finish is later than the baseline finish. */
  isDelayed: boolean;
  direction: VarianceDirection;
}

export interface MilestoneForecast {
  milestone: Milestone;
  /** Committed forecast where one exists, otherwise derived from the phase. */
  forecastDate: string;
  varianceDays: number;
  /** Whether the date is the project's own commitment or a derivation. */
  basis: "ACTUAL" | "COMMITTED" | "DERIVED" | "BASELINE";
  isCritical: boolean;
  direction: VarianceDirection;
}

export interface ScheduleAnalysis {
  dataDate: string;
  phases: PhaseAnalysis[];
  byId: Map<string, PhaseAnalysis>;

  /** Phase ids on the zero-or-negative float chain, in sequence order. */
  criticalPath: string[];

  /** Forecast completion of the last phase at current performance. */
  forecastHandover: string;
  targetHandover: string;
  /** Positive = handover forecast to land late. */
  handoverVarianceDays: number;

  /** Whole-project schedule performance index, duration-weighted. */
  projectSpi: number;
  /** Days the recovery plan has to claw back to protect the target. */
  recoveryRequiredDays: number;

  milestones: MilestoneForecast[];
  delayedPhases: PhaseAnalysis[];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function direction(varianceDays: number): VarianceDirection {
  if (varianceDays > 0) return "BEHIND";
  if (varianceDays < 0) return "AHEAD";
  return "ON_PLAN";
}

/**
 * Forecast finish for one phase, ignoring the network.
 *
 *  - complete            → the actual finish
 *  - not started         → baseline duration, placed by the network later
 *  - in progress         → remaining baseline duration stretched by 1/SPI
 *
 * The stretch is applied to the work that remains, never to work already
 * done, so a phase that recovers is not punished for its early history.
 */
function standaloneForecast(
  phase: ProjectPhase,
  dataDate: string,
): { start: string; finish: string; spi: number | null } {
  const plannedDuration = Math.max(
    1,
    daysBetween(phase.plannedStart, phase.plannedFinish),
  );

  if (phase.status === "COMPLETED" && phase.actualFinish) {
    return {
      start: phase.actualStart ?? phase.plannedStart,
      finish: phase.actualFinish,
      spi: null,
    };
  }

  if (!phase.actualStart) {
    return {
      start: phase.plannedStart,
      finish: phase.plannedFinish,
      spi: null,
    };
  }

  // In progress. A zero planned-progress record cannot produce an index.
  const spi =
    phase.plannedProgress > 0 ? phase.progress / phase.plannedProgress : null;

  const remainingFraction = Math.max(0, (100 - phase.progress) / 100);

  // Remaining baseline duration: what is left on the baseline from today,
  // or — once the baseline finish has passed — the un-earned share of the
  // baseline duration, so an overrunning phase still forecasts forward.
  const baselineRemaining = Math.max(
    plannedDuration * remainingFraction,
    daysBetween(dataDate, phase.plannedFinish),
  );

  const stretched =
    spi && spi > 0 ? baselineRemaining / spi : baselineRemaining;

  return {
    start: phase.actualStart,
    finish: addDays(dataDate, Math.round(stretched)),
    spi,
  };
}

/* ------------------------------------------------------------------ */
/* Main analysis                                                       */
/* ------------------------------------------------------------------ */

export function analyseSchedule(
  phases: ProjectPhase[],
  milestones: Milestone[],
  project: Project,
  dataDateInput?: string,
): ScheduleAnalysis {
  const dataDate = dataDateInput ?? iso(today().getTime());
  const ordered = [...phases].sort((a, b) => a.sequence - b.sequence);
  const phaseById = new Map(ordered.map((p) => [p.id, p]));

  /* ---------------- 1. Forward pass ---------------- */

  const forecastStart = new Map<string, string>();
  const forecastFinish = new Map<string, string>();
  const spiById = new Map<string, number | null>();
  const drivenBy = new Map<string, string | null>();

  for (const phase of ordered) {
    const own = standaloneForecast(phase, dataDate);
    spiById.set(phase.id, own.spi);

    // Earliest the phase can start given its predecessors' forecast finishes.
    let start = own.start;
    let driver: string | null = null;
    for (const link of phase.dependsOn) {
      const predFinish = forecastFinish.get(link.phaseId);
      if (!predFinish) continue;
      const driven = addDays(predFinish, link.lagDays);
      if (ms(driven) > ms(start)) {
        start = driven;
        driver = link.phaseId;
      }
    }

    // A phase already under way keeps its real start; the network can only
    // push a phase that has not begun. Its own performance is then the
    // driver, so it terminates the driving path.
    if (phase.actualStart) {
      start = phase.actualStart;
      driver = null;
    }
    drivenBy.set(phase.id, driver);

    // Preserve the phase's own forecast duration when the network moves it.
    const shift =
      phase.actualStart || phase.status === "COMPLETED"
        ? 0
        : daysBetween(own.start, start);

    forecastStart.set(phase.id, start);
    forecastFinish.set(phase.id, addDays(own.finish, shift));
  }

  /* ---------------- 2. Backward pass ---------------- */

  // The constraint is the contractual handover date, not the forecast, so
  // float measures slip against the commitment QNITY has made.
  const targetHandover = project.targetHandoverDate;
  const successors = new Map<string, { phaseId: string; lagDays: number }[]>();
  for (const phase of ordered) {
    for (const link of phase.dependsOn) {
      const list = successors.get(link.phaseId) ?? [];
      list.push({ phaseId: phase.id, lagDays: link.lagDays });
      successors.set(link.phaseId, list);
    }
  }

  const latestFinish = new Map<string, string>();
  for (const phase of [...ordered].reverse()) {
    const links = successors.get(phase.id) ?? [];
    if (links.length === 0) {
      latestFinish.set(phase.id, targetHandover);
      continue;
    }

    let lf: string | null = null;
    for (const link of links) {
      const succ = phaseById.get(link.phaseId);
      const succLf = latestFinish.get(link.phaseId);
      if (!succ || !succLf) continue;
      const succDuration = Math.max(
        1,
        daysBetween(succ.plannedStart, succ.plannedFinish),
      );
      const succLs = addDays(succLf, -succDuration);
      const candidate = addDays(succLs, -link.lagDays);
      if (lf === null || ms(candidate) < ms(lf)) lf = candidate;
    }
    latestFinish.set(phase.id, lf ?? targetHandover);
  }

  /* ---------------- 3. Driving path ---------------- */

  // Walk back from the final phase through whichever predecessor sets each
  // forecast start. The chain terminates at the phase whose own performance
  // drives the date — that is the one to act on.
  const criticalSet = new Set<string>();
  let cursor: string | undefined = ordered[ordered.length - 1]?.id;
  while (cursor && !criticalSet.has(cursor)) {
    const phase = phaseById.get(cursor);
    if (!phase || phase.status === "COMPLETED") break;
    criticalSet.add(cursor);
    cursor = drivenBy.get(cursor) ?? undefined;
  }

  /* ---------------- 4. Assemble ---------------- */

  const analyses: PhaseAnalysis[] = ordered.map((phase) => {
    const fStart = forecastStart.get(phase.id)!;
    const fFinish = forecastFinish.get(phase.id)!;
    const lf = latestFinish.get(phase.id)!;

    const finishVarianceDays = daysBetween(phase.plannedFinish, fFinish);
    const startVarianceDays = phase.actualStart
      ? daysBetween(phase.plannedStart, phase.actualStart)
      : null;

    // A completed phase can no longer threaten the handover date.
    const totalFloatDays =
      phase.status === "COMPLETED" ? Number.POSITIVE_INFINITY : daysBetween(fFinish, lf);

    return {
      phase,
      plannedDuration: Math.max(
        1,
        daysBetween(phase.plannedStart, phase.plannedFinish),
      ),
      forecastDuration: Math.max(1, daysBetween(fStart, fFinish)),
      startVarianceDays,
      finishVarianceDays,
      progressVariancePoints: phase.progress - phase.plannedProgress,
      spi: spiById.get(phase.id) ?? null,
      forecastStart: fStart,
      forecastFinish: fFinish,
      totalFloatDays,
      drivingPredecessorId: drivenBy.get(phase.id) ?? null,
      isCritical: criticalSet.has(phase.id),
      isDelayed: finishVarianceDays > 0,
      direction: direction(finishVarianceDays),
    };
  });

  const byId = new Map(analyses.map((a) => [a.phase.id, a]));

  const criticalPath = analyses
    .filter((a) => a.isCritical)
    .map((a) => a.phase.id);

  const last = analyses[analyses.length - 1];
  const forecastHandover = last?.forecastFinish ?? targetHandover;
  const handoverVarianceDays = daysBetween(targetHandover, forecastHandover);

  // Duration-weighted SPI across phases that are actually under way.
  const active = analyses.filter((a) => a.spi !== null);
  const totalWeight = active.reduce((sum, a) => sum + a.plannedDuration, 0);
  const projectSpi = totalWeight
    ? active.reduce((sum, a) => sum + (a.spi ?? 0) * a.plannedDuration, 0) /
      totalWeight
    : 1;

  return {
    dataDate,
    phases: analyses,
    byId,
    criticalPath,
    forecastHandover,
    targetHandover,
    handoverVarianceDays,
    projectSpi,
    recoveryRequiredDays: Math.max(0, handoverVarianceDays),
    milestones: forecastMilestones(milestones, analyses, byId),
    delayedPhases: analyses.filter((a) => a.isDelayed),
  };
}

/* ------------------------------------------------------------------ */
/* Milestone forecasting                                               */
/* ------------------------------------------------------------------ */

function forecastMilestones(
  milestones: Milestone[],
  analyses: PhaseAnalysis[],
  byId: Map<string, PhaseAnalysis>,
): MilestoneForecast[] {
  const byPhaseName = new Map(
    analyses.map((a) => [a.phase.name.toLowerCase(), a]),
  );

  return milestones
    .filter((m) => m.status !== "CANCELLED")
    .map((milestone) => {
      const owner = byPhaseName.get(milestone.phase.toLowerCase());

      let forecastDate: string;
      let basis: MilestoneForecast["basis"];

      if (milestone.actualDate) {
        forecastDate = milestone.actualDate;
        basis = "ACTUAL";
      } else if (milestone.forecastDate) {
        // The project has committed to a date — always prefer it over a
        // derivation, and never quietly override it.
        forecastDate = milestone.forecastDate;
        basis = "COMMITTED";
      } else if (owner && owner.finishVarianceDays !== 0) {
        // Carry the owning phase's slip onto the milestone.
        forecastDate = addDays(milestone.plannedDate, owner.finishVarianceDays);
        basis = "DERIVED";
      } else {
        forecastDate = milestone.plannedDate;
        basis = "BASELINE";
      }

      const varianceDays = daysBetween(milestone.plannedDate, forecastDate);

      return {
        milestone,
        forecastDate,
        varianceDays,
        basis,
        // A milestone that has already been achieved cannot drive anything.
        isCritical:
          milestone.status !== "COMPLETED" && owner ? owner.isCritical : false,
        direction: direction(varianceDays),
      };
    })
    .sort((a, b) => (a.forecastDate < b.forecastDate ? -1 : 1));
}

/* ------------------------------------------------------------------ */
/* Presentation helpers                                                */
/* ------------------------------------------------------------------ */

/** `+12 days late` / `4 days early` / `On plan` */
export function varianceLabel(days: number): string {
  if (days === 0) return "On plan";
  const magnitude = Math.abs(days);
  const unit = magnitude === 1 ? "day" : "days";
  return days > 0 ? `+${magnitude} ${unit} late` : `${magnitude} ${unit} early`;
}

export function floatLabel(days: number): string {
  if (!Number.isFinite(days)) return "Complete";
  if (days === 0) return "No float";
  const magnitude = Math.abs(days);
  const unit = magnitude === 1 ? "day" : "days";
  return days > 0 ? `${magnitude} ${unit} float` : `${magnitude} ${unit} behind`;
}

export function directionTone(
  value: VarianceDirection,
): "success" | "warning" | "critical" {
  return value === "AHEAD" ? "success" : value === "ON_PLAN" ? "success" : "critical";
}

/** SPI banding used by the KPI cards. */
export function spiTone(spi: number): "success" | "warning" | "critical" {
  if (spi >= 0.98) return "success";
  if (spi >= 0.9) return "warning";
  return "critical";
}
