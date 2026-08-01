"use client";

import { FileDown } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * PDF export uses the browser's own print-to-PDF pipeline, which works
 * identically in Chrome, Edge, Safari and Firefox and needs no server-side
 * rendering service. The print stylesheet in globals.css strips the sidebar,
 * header and interactive controls.
 */
export function ExportReportButton() {
  return (
    <Button size="sm" variant="outline" onClick={() => window.print()}>
      <FileDown className="h-4 w-4" />
      Export as PDF
    </Button>
  );
}
