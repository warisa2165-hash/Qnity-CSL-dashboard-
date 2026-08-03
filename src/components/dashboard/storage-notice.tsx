import { AlertTriangle, Database, HardDrive } from "lucide-react";

import { storageStatus } from "@/lib/actions/records";

/**
 * Tells an editor, before they start typing, where what they save will go and
 * whether this deployment can actually keep it. A read-only filesystem
 * accepts edits and discards them on the next cold start; a database that is
 * merely unreachable produces a page that looks perfectly healthy because the
 * read path falls back to the built-in dataset. Silently losing a project
 * manager's work — or letting them edit a fallback — would be far worse than
 * saying so up front.
 */
export async function StorageNotice({ editable }: { editable: boolean }) {
  if (!editable) return null;

  const { durable, reason, source } = await storageStatus();

  if (durable) {
    return (
      <p className="flex items-start gap-2 rounded-md border border-primary/25 bg-accent px-3 py-2 text-sm text-accent-foreground">
        <Database className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>
          {source === "prisma" ? (
            <>
              You have edit rights on this page. Changes are written to the
              project PostgreSQL database and are visible to everyone
              immediately.
            </>
          ) : (
            <>
              You have edit rights on this page. Changes are saved to JSON
              files in the repository&rsquo;s{" "}
              <code className="font-mono text-xs">data/</code> directory and
              stay in place after a refresh or restart.
            </>
          )}
        </span>
      </p>
    );
  }

  return (
    <p className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <span>
        {source === "prisma" ? (
          <>
            <strong className="font-semibold">Database unavailable.</strong>{" "}
            {reason} The figures on this page are the built-in baseline, not
            live project data, and saving will fail until the connection is
            restored.
          </>
        ) : (
          <>
            <strong className="font-semibold">Temporary storage.</strong> This
            host has a read-only filesystem, so edits are written to a
            temporary directory: they survive a page refresh but are lost when
            the instance recycles. Connect PostgreSQL
            (<code className="font-mono text-xs">DATA_SOURCE=prisma</code>), or
            run the portal where{" "}
            <code className="font-mono text-xs">data/</code> is writable, to
            make changes permanent.
          </>
        )}
      </span>
    </p>
  );
}

/** Compact variant for the admin panel. */
export async function StorageStatusLine() {
  const { durable, reason } = await storageStatus();
  return (
    <p className="flex items-start gap-2 text-sm text-muted-foreground">
      <HardDrive
        className={`mt-0.5 h-4 w-4 shrink-0 ${durable ? "text-success" : "text-warning"}`}
      />
      <span>{reason}</span>
    </p>
  );
}
