import { AlertTriangle, Database, HardDrive } from "lucide-react";

import { storageStatus } from "@/lib/actions/records";

/**
 * Tells an editor, before they start typing, whether this deployment can
 * actually keep what they save. On a host with a read-only filesystem
 * (Vercel, for instance) edits are accepted but discarded on the next cold
 * start — silently losing a project manager's work would be far worse than
 * saying so up front.
 */
export async function StorageNotice({ editable }: { editable: boolean }) {
  if (!editable) return null;

  const { durable } = await storageStatus();

  if (durable) {
    return (
      <p className="flex items-start gap-2 rounded-md border border-primary/25 bg-accent px-3 py-2 text-sm text-accent-foreground">
        <Database className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>
          You have edit rights on this page. Changes are saved to JSON files in
          the repository&rsquo;s{" "}
          <code className="font-mono text-xs">data/</code> directory and stay in
          place after a refresh or restart.
        </span>
      </p>
    );
  }

  return (
    <p className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <span>
        <strong className="font-semibold">Temporary storage.</strong> This host
        has a read-only filesystem, so edits are written to a temporary
        directory: they survive a page refresh but are lost when the instance
        recycles. Run the portal on a server with a writable{" "}
        <code className="font-mono text-xs">data/</code> directory, or connect a
        database, to make changes permanent.
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
