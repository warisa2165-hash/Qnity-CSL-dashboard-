"use client";

import * as React from "react";
import { Download, FileSpreadsheet, FileText, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ENTITIES = [
  { key: "milestones", label: "Milestones" },
  { key: "design", label: "Design packages" },
  { key: "submissions", label: "Document submissions" },
  { key: "procurement", label: "Procurement packages" },
  { key: "capex", label: "CAPEX 2026 equipment" },
  { key: "payments", label: "Payment milestones" },
  { key: "risks", label: "Risk register" },
  { key: "safety", label: "Safety reports" },
  { key: "actions", label: "Action tracker" },
  { key: "attention", label: "Owner attention items" },
  { key: "audit", label: "Audit trail" },
];

export function DataManagement({ source }: { source: "mock" | "prisma" }) {
  const [busy, setBusy] = React.useState<string | null>(null);

  async function exportCsv(entity: string) {
    setBusy(entity);
    try {
      const res = await fetch(`/api/export/${entity}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `qnity-csl-${entity}-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Download className="h-4 w-4 text-primary" />
            Export project data
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Download any register as CSV for Excel or Power BI. Every export is
            written to the audit trail.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ENTITIES.map((e) => (
              <Button
                key={e.key}
                variant="outline"
                size="sm"
                className="justify-start"
                disabled={busy === e.key}
                onClick={() => exportCsv(e.key)}
              >
                {busy === e.key ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                {e.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Upload className="h-4 w-4 text-primary" />
            Import from CSV / Excel
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Bulk-load project registers exported from the existing project
            trackers.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className={cn(
              "rounded-lg border border-dashed border-border p-6 text-center",
              source === "mock" && "opacity-60",
            )}
          >
            <FileText className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">
              Drop a CSV file here, or choose a file
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Column headings must match the corresponding export. Rows are
              validated before anything is written.
            </p>
            <Button size="sm" variant="outline" className="mt-3" disabled>
              Choose file
            </Button>
          </div>

          {source === "mock" && (
            <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
              Import requires a database. Set{" "}
              <code className="font-mono text-xs">DATA_SOURCE=prisma</code> with
              a valid <code className="font-mono text-xs">DATABASE_URL</code>,
              then run <code className="font-mono text-xs">npm run seed</code>{" "}
              to establish the baseline before importing.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Connecting real project data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            The portal reads every record through a single data layer
            (<code className="font-mono text-xs">src/lib/data</code>), so real
            data can replace the mock dataset without touching any page:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong className="text-foreground">Excel / CSV</strong> — import
              through this panel, or seed the database from a spreadsheet.
            </li>
            <li>
              <strong className="text-foreground">SharePoint</strong> — sync
              document libraries into the Document Center via Microsoft Graph.
            </li>
            <li>
              <strong className="text-foreground">Power BI</strong> — point a
              dataset at the same PostgreSQL database the portal reads.
            </li>
            <li>
              <strong className="text-foreground">Manual admin input</strong> —
              edit records directly in the portal once a database is connected.
            </li>
          </ul>
          <p>
            Full instructions are in{" "}
            <code className="font-mono text-xs">docs/DATA-INTEGRATION.md</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
