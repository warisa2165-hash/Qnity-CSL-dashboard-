"use client";

import * as React from "react";
import {
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Folder,
  History,
  Lock,
  Search,
  Trash2,
} from "lucide-react";

import type { DocumentFolder, DocumentRecord } from "@/lib/types";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/page-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function FileIcon({ type }: { type: string }) {
  const Icon = type === "XLSX" ? FileSpreadsheet : FileText;
  return (
    <Icon
      className={cn(
        "h-4 w-4 shrink-0",
        type === "XLSX" ? "text-success" : "text-primary",
      )}
    />
  );
}

export function DocumentCenter({
  documents,
  folders,
  canDownload,
  canDelete,
}: {
  documents: DocumentRecord[];
  folders: DocumentFolder[];
  canDownload: boolean;
  canDelete: boolean;
}) {
  const [folder, setFolder] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [showSuperseded, setShowSuperseded] = React.useState(false);
  const [preview, setPreview] = React.useState<DocumentRecord | null>(null);

  const visible = documents.filter((d) => {
    if (!showSuperseded && d.approvalStatus === "SUPERSEDED") return false;
    if (folder && d.folder !== folder) return false;
    const q = query.trim().toLowerCase();
    if (
      q &&
      !`${d.name} ${d.category} ${d.uploadedBy} ${d.revision}`
        .toLowerCase()
        .includes(q)
    ) {
      return false;
    }
    return true;
  });

  const folderList = folders.map((f) => {
    const name = `${f.code} ${f.name}`;
    return {
      ...f,
      full: name,
      count: documents.filter((d) => d.folder === name).length,
    };
  });

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        {/* ----------------------- Folder tree ----------------------- */}
        <aside className="space-y-1 rounded-lg border border-border bg-card p-2">
          <button
            type="button"
            onClick={() => setFolder(null)}
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
              folder === null ? "bg-accent font-medium text-accent-foreground" : "hover:bg-muted",
            )}
          >
            <span className="flex items-center gap-2">
              <Folder className="h-4 w-4" />
              All folders
            </span>
            <span className="text-xs text-muted-foreground">
              {documents.length}
            </span>
          </button>

          {folderList.map((f) => (
            <button
              key={f.code}
              type="button"
              onClick={() => setFolder(f.full)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                folder === f.full
                  ? "bg-accent font-medium text-accent-foreground"
                  : "hover:bg-muted",
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Folder className="h-4 w-4 shrink-0 opacity-70" />
                <span className="truncate">
                  <span className="font-mono text-xs opacity-60">{f.code}</span>{" "}
                  {f.name}
                </span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {f.count}
              </span>
            </button>
          ))}
        </aside>

        {/* ------------------------ File list ------------------------ */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search documents…"
                className="pl-8"
                aria-label="Search documents"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={showSuperseded}
                onChange={(e) => setShowSuperseded(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Show superseded
            </label>
            <span className="ml-auto text-xs text-muted-foreground">
              {visible.length} document{visible.length === 1 ? "" : "s"}
            </span>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              title="No documents"
              description="No documents match the current folder and search."
            />
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {visible.map((doc) => (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-start gap-3 p-3 transition-colors hover:bg-muted/40"
                >
                  <FileIcon type={doc.fileType} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium leading-snug">
                        {doc.name}
                      </p>
                      <Badge variant="secondary">{doc.revision}</Badge>
                      <StatusBadge status={doc.approvalStatus} />
                      {doc.restrictedTo && (
                        <span
                          title={`Restricted to: ${doc.restrictedTo.join(", ")}`}
                          className="flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300"
                        >
                          <Lock className="h-3 w-3" />
                          Restricted
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {doc.folder} · {doc.category} · {doc.fileType} ·{" "}
                      {formatNumber(doc.sizeKb)} KB · uploaded{" "}
                      {formatDate(doc.uploadedAt)} by {doc.uploadedBy}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreview(doc)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </Button>
                    {canDownload && (
                      <Button variant="ghost" size="sm" disabled>
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="sm" disabled>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* -------------------------- Preview -------------------------- */}
      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent>
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-4 leading-snug">
                  {preview.name}
                </DialogTitle>
                <DialogDescription>
                  {preview.folder} · {preview.category}
                </DialogDescription>
              </DialogHeader>

              <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-border bg-muted/40 text-center">
                <div>
                  <FileIcon type={preview.fileType} />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Preview is available once the file store is connected.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {preview.fileType} · {formatNumber(preview.sizeKb)} KB
                  </p>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Current revision</dt>
                  <dd className="font-medium">{preview.revision}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Approval status</dt>
                  <dd>
                    <StatusBadge status={preview.approvalStatus} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Uploaded by</dt>
                  <dd className="font-medium">{preview.uploadedBy}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Uploaded at</dt>
                  <dd className="font-medium">{formatDate(preview.uploadedAt)}</dd>
                </div>
              </dl>

              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <History className="h-3.5 w-3.5" />
                  Version history
                </p>
                <ul className="mt-2 space-y-1.5">
                  {preview.versions.map((v) => (
                    <li
                      key={v.revision}
                      className="flex items-center justify-between gap-3 rounded-md border border-border px-2.5 py-1.5 text-sm"
                    >
                      <span className="font-mono text-xs font-medium">
                        {v.revision}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(v.uploadedAt)} · {v.uploadedBy}
                      </span>
                      {v.revision === preview.revision && (
                        <Badge variant="secondary">Latest</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
