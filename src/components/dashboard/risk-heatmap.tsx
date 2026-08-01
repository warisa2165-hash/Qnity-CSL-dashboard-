import { cn } from "@/lib/utils";
import { RISK_CELL_CLASS, riskLevelFromScore } from "@/lib/status";
import type { Risk } from "@/lib/types";

const SCALE = [1, 2, 3, 4, 5] as const;

const LIKELIHOOD_LABELS: Record<number, string> = {
  1: "Rare",
  2: "Unlikely",
  3: "Possible",
  4: "Likely",
  5: "Almost certain",
};

const IMPACT_LABELS: Record<number, string> = {
  1: "Negligible",
  2: "Minor",
  3: "Moderate",
  4: "Major",
  5: "Severe",
};

/**
 * 5 x 5 likelihood / impact heat map. Each cell shows the risk codes that
 * fall in it, so leadership can trace a hot cell straight to a risk ID.
 */
export function RiskHeatmap({ risks }: { risks: Risk[] }) {
  const open = risks.filter((r) => r.status !== "CLOSED");

  const cell = (likelihood: number, impact: number) =>
    open.filter((r) => r.likelihood === likelihood && r.impact === impact);

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <div className="min-w-[34rem]">
        <div className="flex">
          {/* Y axis label */}
          <div className="flex w-6 items-center justify-center">
            <span className="-rotate-90 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Likelihood
            </span>
          </div>

          <div className="flex-1">
            {[...SCALE].reverse().map((likelihood) => (
              <div key={likelihood} className="flex items-stretch">
                <div className="flex w-24 shrink-0 flex-col justify-center pr-2 text-right">
                  <span className="text-xs font-medium">{likelihood}</span>
                  <span className="text-[10px] leading-tight text-muted-foreground">
                    {LIKELIHOOD_LABELS[likelihood]}
                  </span>
                </div>
                {SCALE.map((impact) => {
                  const items = cell(likelihood, impact);
                  const level = riskLevelFromScore(likelihood, impact);
                  return (
                    <div
                      key={impact}
                      className={cn(
                        "m-0.5 flex min-h-[3.75rem] flex-1 flex-col items-center justify-center gap-0.5 rounded p-1 text-center transition-colors",
                        RISK_CELL_CLASS[level],
                      )}
                      title={`${LIKELIHOOD_LABELS[likelihood]} × ${IMPACT_LABELS[impact]} — ${level}`}
                    >
                      {items.length > 0 ? (
                        <div className="flex flex-wrap justify-center gap-0.5">
                          {items.map((r) => (
                            <span
                              key={r.id}
                              title={r.description}
                              className="rounded bg-black/15 px-1 py-px font-mono text-[10px] font-semibold"
                            >
                              {r.code}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] opacity-40">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* X axis */}
            <div className="flex">
              <div className="w-24 shrink-0" />
              {SCALE.map((impact) => (
                <div key={impact} className="flex-1 px-0.5 pt-1 text-center">
                  <p className="text-xs font-medium">{impact}</p>
                  <p className="text-[10px] leading-tight text-muted-foreground">
                    {IMPACT_LABELS[impact]}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Impact
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((level) => (
            <span key={level} className="flex items-center gap-1.5">
              <span className={cn("h-3 w-3 rounded", RISK_CELL_CLASS[level])} />
              <span className="text-muted-foreground">
                {level.charAt(0) + level.slice(1).toLowerCase()}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
