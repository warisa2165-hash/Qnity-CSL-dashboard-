"use client";

import * as React from "react";
import { ArrowUpDown, Download, Search, X } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/page-header";
import {
  cn,
  formatCurrency,
  formatDate,
  humanize,
  isOverdue,
  toCsv,
} from "@/lib/utils";
import { progressTone, toneFor } from "@/lib/status";

/**
 * Column definitions are declarative (no render callbacks) so that server
 * components can pass a table configuration straight across the client
 * boundary. Every tracker page in the portal is built from this one table.
 */
export type ColumnType =
  | "text"
  | "code"
  | "date"
  | "dueDate"
  | "currency"
  | "percent"
  | "progress"
  | "status"
  | "risk"
  | "number"
  | "list"
  | "boolean";

export interface Column {
  key: string;
  header: string;
  type?: ColumnType;
  /** Tailwind width/behaviour classes for the cell. */
  className?: string;
  /** Allow the cell to wrap onto multiple lines. */
  wrap?: boolean;
  sortable?: boolean;
  /** For `dueDate`: the field holding the status used to suppress overdue. */
  statusKey?: string;
  /** Hide below the `md` breakpoint. */
  hideOnMobile?: boolean;
}

export interface FilterDef {
  key: string;
  label: string;
  /** Explicit options; otherwise derived from the data. */
  options?: string[];
}

interface DataTableProps<T extends object> {
  rows: T[];
  columns: Column[];
  searchKeys?: string[];
  filters?: FilterDef[];
  /** Enables the CSV export button and names the downloaded file. */
  exportName?: string;
  currency?: string;
  emptyMessage?: string;
  /** Initial sort column key. */
  defaultSort?: string;
  defaultSortDirection?: "asc" | "desc";
  /** Extra toolbar content (e.g. an "Add record" button). */
  toolbar?: React.ReactNode;
}

/** Narrowing helper: domain records are plain objects, not index types. */
const asRecord = (row: object): Record<string, unknown> =>
  row as Record<string, unknown>;

function valueOf(row: Record<string, unknown>, key: string): unknown {
  return key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, row);
}

function Cell({
  row,
  column,
  currency,
}: {
  row: Record<string, unknown>;
  column: Column;
  currency: string;
}) {
  const raw = valueOf(row, column.key);

  switch (column.type) {
    case "code":
      return (
        <span className="font-mono text-xs font-medium text-primary">
          {String(raw ?? "—")}
        </span>
      );

    case "date":
      return (
        <span className="whitespace-nowrap tabular-nums">
          {formatDate(raw as string)}
        </span>
      );

    case "dueDate": {
      const status = column.statusKey
        ? (valueOf(row, column.statusKey) as string)
        : undefined;
      const late = isOverdue(raw as string, status);
      return (
        <span
          className={cn(
            "whitespace-nowrap tabular-nums",
            late && "font-medium text-destructive",
          )}
        >
          {formatDate(raw as string)}
          {late && <span className="ml-1 text-xs">(overdue)</span>}
        </span>
      );
    }

    case "currency":
      return (
        <span className="whitespace-nowrap tabular-nums">
          {formatCurrency(raw as number, currency)}
        </span>
      );

    case "percent":
      return (
        <span className="tabular-nums">
          {raw === null || raw === undefined ? "—" : `${Math.round(Number(raw))}%`}
        </span>
      );

    case "progress": {
      const value = Number(raw ?? 0);
      return (
        <div className="flex min-w-[7rem] items-center gap-2">
          <Progress value={value} tone={progressTone(value)} size="sm" />
          <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
            {Math.round(value)}%
          </span>
        </div>
      );
    }

    case "status":
      return <StatusBadge status={raw as string} />;

    case "risk":
      return <StatusBadge status={raw as string} tone={toneFor(raw as string)} />;

    case "number":
      return <span className="tabular-nums">{String(raw ?? "—")}</span>;

    case "boolean":
      return <StatusBadge status={raw ? "Yes" : "No"} tone={raw ? "warning" : "neutral"} dot={false} />;

    case "list": {
      const items = Array.isArray(raw) ? (raw as string[]) : [];
      if (!items.length) return <span className="text-muted-foreground">—</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {items.map((item) => (
            <span
              key={item}
              className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
            >
              {item}
            </span>
          ))}
        </div>
      );
    }

    default: {
      const text =
        raw === null || raw === undefined || raw === "" ? "—" : String(raw);
      return (
        <span className={cn(!column.wrap && "block truncate")} title={text}>
          {text}
        </span>
      );
    }
  }
}

export function DataTable<T extends object>({
  rows,
  columns,
  searchKeys = [],
  filters = [],
  exportName,
  currency = "THB",
  emptyMessage = "No records match the current filters.",
  defaultSort,
  defaultSortDirection = "asc",
  toolbar,
}: DataTableProps<T>) {
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState<Record<string, string>>({});
  const [sort, setSort] = React.useState<{ key: string; dir: "asc" | "desc" }>(
    () =>
      defaultSort
        ? { key: defaultSort, dir: defaultSortDirection }
        : { key: "", dir: "asc" },
  );

  const filterOptions = React.useMemo(() => {
    return filters.map((f) => ({
      ...f,
      options:
        f.options ??
        [...new Set(rows.map((r) => String(valueOf(asRecord(r), f.key) ?? "")))]
          .filter(Boolean)
          .sort(),
    }));
  }, [filters, rows]);

  const filtered = React.useMemo(() => {
    let out = rows;

    for (const [key, value] of Object.entries(active)) {
      if (!value) continue;
      out = out.filter((r) => String(valueOf(asRecord(r), key) ?? "") === value);
    }

    const q = query.trim().toLowerCase();
    if (q && searchKeys.length) {
      out = out.filter((r) =>
        searchKeys.some((k) =>
          String(valueOf(asRecord(r), k) ?? "")
            .toLowerCase()
            .includes(q),
        ),
      );
    }

    if (sort.key) {
      out = [...out].sort((a, b) => {
        const av = valueOf(asRecord(a), sort.key);
        const bv = valueOf(asRecord(b), sort.key);
        if (av === bv) return 0;
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        const result = av > bv ? 1 : -1;
        return sort.dir === "asc" ? result : -result;
      });
    }

    return out;
  }, [rows, active, query, searchKeys, sort]);

  const hasFilters = query || Object.values(active).some(Boolean);

  function handleExport() {
    const csv = toCsv(
      filtered.map((row) => {
        const record: Record<string, unknown> = {};
        for (const c of columns) {
          const v = valueOf(asRecord(row), c.key);
          record[c.header] = Array.isArray(v) ? v.join("; ") : v;
        }
        return record;
      }),
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${exportName ?? "export"}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      {(searchKeys.length > 0 || filters.length > 0 || exportName || toolbar) && (
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {searchKeys.length > 0 && (
            <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="pl-8"
                aria-label="Search records"
              />
            </div>
          )}

          {filterOptions.map((f) => (
            <select
              key={f.key}
              value={active[f.key] ?? ""}
              onChange={(e) =>
                setActive((prev) => ({ ...prev, [f.key]: e.target.value }))
              }
              aria-label={f.label}
              className="h-9 rounded-md border border-input bg-card px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">{f.label}: All</option>
              {f.options.map((o) => (
                <option key={o} value={o}>
                  {humanize(o)}
                </option>
              ))}
            </select>
          ))}

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery("");
                setActive({});
              }}
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            {toolbar}
            {exportName && (
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {rows.length} records
      </p>

      {filtered.length === 0 ? (
        <EmptyState title="No results" description={emptyMessage} />
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columns.map((c) => (
                  <TableHead
                    key={c.key}
                    className={cn(c.className, c.hideOnMobile && "hidden md:table-cell")}
                  >
                    {c.sortable === false ? (
                      c.header
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setSort((prev) =>
                            prev.key === c.key
                              ? { key: c.key, dir: prev.dir === "asc" ? "desc" : "asc" }
                              : { key: c.key, dir: "asc" },
                          )
                        }
                        className="inline-flex items-center gap-1 uppercase hover:text-foreground"
                      >
                        {c.header}
                        <ArrowUpDown
                          className={cn(
                            "h-3 w-3",
                            sort.key === c.key ? "opacity-100" : "opacity-30",
                          )}
                        />
                      </button>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row, index) => (
                <TableRow key={String(asRecord(row).id ?? index)}>
                  {columns.map((c) => (
                    <TableCell
                      key={c.key}
                      className={cn(
                        c.className,
                        c.hideOnMobile && "hidden md:table-cell",
                        !c.wrap && "max-w-[22rem]",
                      )}
                    >
                      <Cell row={asRecord(row)} column={c} currency={currency} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
