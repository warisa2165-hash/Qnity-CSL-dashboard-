"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CHART_COLORS } from "@/lib/status";
import { cn } from "@/lib/utils";

const AXIS = {
  stroke: "hsl(var(--muted-foreground))",
  fontSize: 11,
};

const gridProps = {
  stroke: "hsl(var(--border))",
  strokeDasharray: "3 3",
  vertical: false,
};

/** Shared tooltip styling so every chart reads as one system. */
const tooltipProps = {
  contentStyle: {
    background: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "0.5rem",
    fontSize: "12px",
    color: "hsl(var(--popover-foreground))",
    boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)",
  },
  labelStyle: { fontWeight: 600, marginBottom: 4 },
  cursor: { fill: "hsl(var(--muted))", fillOpacity: 0.4 },
};

function ChartFrame({
  height = 260,
  children,
  className,
}: {
  height?: number;
  children: React.ReactElement;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Planned vs actual S-curve                                           */
/* ------------------------------------------------------------------ */

export function ProgressCurveChart({
  data,
  height = 260,
}: {
  data: readonly { month: string; planned: number; actual: number | null }[];
  height?: number;
}) {
  return (
    <ChartFrame height={height}>
      <AreaChart data={data as object[]} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0078D4" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#0078D4" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} {...AXIS} />
        <YAxis
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          {...AXIS}
        />
        <Tooltip {...tooltipProps} formatter={(v: number) => `${v}%`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area
          type="monotone"
          dataKey="planned"
          name="Planned"
          stroke="#605E5C"
          strokeDasharray="5 4"
          fill="transparent"
          strokeWidth={2}
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="actual"
          name="Actual"
          stroke="#0078D4"
          fill="url(#actualFill)"
          strokeWidth={2.5}
          connectNulls={false}
          dot={{ r: 3, fill: "#0078D4" }}
        />
      </AreaChart>
    </ChartFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Grouped / single bar chart                                          */
/* ------------------------------------------------------------------ */

export function GroupedBarChart({
  data,
  xKey,
  series,
  height = 260,
  layout = "horizontal",
  unit = "",
  domain,
}: {
  data: readonly object[];
  xKey: string;
  series: { key: string; name: string; color?: string }[];
  height?: number;
  layout?: "horizontal" | "vertical";
  unit?: string;
  domain?: [number, number];
}) {
  const vertical = layout === "vertical";
  return (
    <ChartFrame height={height}>
      <BarChart
        data={data as object[]}
        layout={layout}
        margin={{ top: 8, right: 12, left: vertical ? 8 : -18, bottom: 0 }}
        barCategoryGap={vertical ? "20%" : "25%"}
      >
        <CartesianGrid {...gridProps} vertical={vertical} horizontal={!vertical} />
        {/*
          Both axes must be *direct* children of the chart. Recharts discovers
          them by walking its children and matching component types, and it
          does not look inside a React fragment — wrapping the layout branches
          in <>…</> silently drops the axes and the chart falls back to an
          index-based category scale.
        */}
        <XAxis
          type={vertical ? "number" : "category"}
          dataKey={vertical ? undefined : xKey}
          domain={vertical ? domain : undefined}
          tickLine={false}
          axisLine={false}
          {...AXIS}
        />
        <YAxis
          type={vertical ? "category" : "number"}
          dataKey={vertical ? xKey : undefined}
          domain={vertical ? undefined : domain}
          width={vertical ? 150 : 60}
          tickLine={false}
          axisLine={false}
          {...AXIS}
        />
        <Tooltip
          {...tooltipProps}
          formatter={(v: number) => `${v}${unit}`}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            fill={s.color ?? CHART_COLORS[i % CHART_COLORS.length]}
            radius={vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            maxBarSize={vertical ? 22 : 44}
          />
        ))}
      </BarChart>
    </ChartFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Stacked bar (status composition)                                    */
/* ------------------------------------------------------------------ */

export function StackedBarChart({
  data,
  xKey,
  series,
  height = 260,
}: {
  data: readonly object[];
  xKey: string;
  series: { key: string; name: string; color: string }[];
  height?: number;
}) {
  return (
    <ChartFrame height={height}>
      <BarChart data={data as object[]} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey={xKey} tickLine={false} axisLine={false} {...AXIS} />
        <YAxis tickLine={false} axisLine={false} allowDecimals={false} {...AXIS} />
        <Tooltip {...tooltipProps} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            stackId="a"
            fill={s.color}
            maxBarSize={48}
          />
        ))}
      </BarChart>
    </ChartFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Donut                                                               */
/* ------------------------------------------------------------------ */

export function DonutChart({
  data,
  height = 240,
  centerLabel,
  centerValue,
}: {
  data: readonly { name: string; value: number; color?: string }[];
  height?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div className="relative">
      <ChartFrame height={height}>
        <PieChart>
          <Pie
            data={data as object[]}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell
                key={entry.name}
                fill={entry.color ?? CHART_COLORS[i % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            {...tooltipProps}
            formatter={(v: number, n: string) => [
              `${v} (${total ? Math.round((v / total) * 100) : 0}%)`,
              n,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            iconType="circle"
            iconSize={8}
          />
        </PieChart>
      </ChartFrame>
      {centerValue && (
        <div className="pointer-events-none absolute inset-x-0 top-[38%] -translate-y-1/2 text-center">
          <p className="text-2xl font-semibold tabular-nums">{centerValue}</p>
          {centerLabel && (
            <p className="text-xs text-muted-foreground">{centerLabel}</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Line trend (safety)                                                 */
/* ------------------------------------------------------------------ */

export function TrendLineChart({
  data,
  xKey,
  series,
  height = 260,
  domain,
}: {
  data: readonly object[];
  xKey: string;
  series: { key: string; name: string; color?: string }[];
  height?: number;
  domain?: [number, number];
}) {
  return (
    <ChartFrame height={height}>
      <LineChart data={data as object[]} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey={xKey} tickLine={false} axisLine={false} {...AXIS} />
        <YAxis
          tickLine={false}
          axisLine={false}
          domain={domain}
          allowDecimals={false}
          {...AXIS}
        />
        <Tooltip {...tooltipProps} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color ?? CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ChartFrame>
  );
}

/* ------------------------------------------------------------------ */
/* Procurement funnel                                                  */
/* ------------------------------------------------------------------ */

export function FunnelChart({
  stages,
}: {
  stages: readonly { name: string; value: number }[];
}) {
  const max = Math.max(...stages.map((s) => s.value), 1);
  return (
    <div className="space-y-1.5">
      {stages.map((stage, i) => {
        const width = (stage.value / max) * 100;
        return (
          <div key={stage.name} className="flex items-center gap-3">
            <span className="w-40 shrink-0 truncate text-xs text-muted-foreground">
              {stage.name}
            </span>
            <div className="h-6 flex-1 overflow-hidden rounded bg-muted">
              <div
                className="flex h-full items-center justify-end rounded px-2 text-[11px] font-medium text-white transition-all"
                style={{
                  width: `${Math.max(width, stage.value > 0 ? 8 : 0)}%`,
                  backgroundColor:
                    CHART_COLORS[i % 2 === 0 ? 0 : 7],
                  opacity: 1 - i * 0.045,
                }}
              >
                {stage.value > 0 && stage.value}
              </div>
            </div>
            <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {stage.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
