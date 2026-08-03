"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Database, HardDrive, Loader2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ENTITIES } from "@/lib/records";
import { resetEntity } from "@/lib/actions/records";

/** The PostgreSQL table behind each editable register. */
const TABLES: Record<string, string> = {
  project: "Project",
  milestones: "Milestone",
  risks: "Risk",
  actions: "ActionItem",
  procurement: "ProcurementPackage",
};

/**
 * Where each editable register is stored, and — with the JSON store — which
 * ones have been edited away from the built-in baseline, with a way back.
 * Without that the store would be a one-way door: once a collection had been
 * saved there would be no way, short of shell access, to return to the
 * shipped dataset. With PostgreSQL connected there is no overlay to undo, so
 * the card reports the connection instead.
 */
export function SavedEdits({
  storage,
  customised,
}: {
  storage: { durable: boolean; reason: string; source: "mock" | "prisma" };
  customised: string[];
}) {
  const onDatabase = storage.source === "prisma";
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [confirming, setConfirming] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  async function handleReset(key: string) {
    if (confirming !== key) {
      setConfirming(key);
      return;
    }
    setBusy(key);
    setMessage(null);
    try {
      const result = await resetEntity(key);
      setMessage(result.message);
      if (result.ok) router.refresh();
    } finally {
      setBusy(null);
      setConfirming(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          {onDatabase ? (
            <Database
              className={`h-4 w-4 ${storage.durable ? "text-success" : "text-destructive"}`}
            />
          ) : (
            <HardDrive
              className={`h-4 w-4 ${storage.durable ? "text-success" : "text-warning"}`}
            />
          )}
          {onDatabase ? "Record storage (PostgreSQL)" : "Saved edits (JSON store)"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{storage.reason}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="divide-y divide-border">
          {Object.entries(ENTITIES).map(([key, entity]) => {
            const edited = customised.includes(key);
            return (
              <li
                key={key}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium capitalize">
                    {entity.collection}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {onDatabase
                      ? `Reading and writing the ${TABLES[key] ?? key} table`
                      : edited
                        ? `Reading from data/${entity.collection}.json`
                        : "Reading the built-in baseline"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {onDatabase ? (
                    <Badge variant={storage.durable ? "default" : "outline"}>
                      {storage.durable ? "Live" : "Unavailable"}
                    </Badge>
                  ) : (
                    <>
                      <Badge variant={edited ? "default" : "outline"}>
                        {edited ? "Edited" : "Baseline"}
                      </Badge>
                      <Button
                        variant={confirming === key ? "destructive" : "outline"}
                        size="sm"
                        disabled={!edited || busy === key}
                        onClick={() => handleReset(key)}
                      >
                        {busy === key ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                        {confirming === key ? "Confirm reset" : "Reset"}
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {message && (
          <p role="status" className="text-sm text-muted-foreground">
            {message}
          </p>
        )}

        {!storage.durable &&
          (onDatabase ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
              Pages are falling back to the built-in dataset and every edit will
              fail until the database responds. Check{" "}
              <code className="font-mono text-xs">DATABASE_URL</code>, then run{" "}
              <code className="font-mono text-xs">npm run db:deploy</code> and{" "}
              <code className="font-mono text-xs">npm run seed</code> if the
              database is new.
            </p>
          ) : (
            <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
              Edits made on this host are written to a temporary directory and
              are lost when the instance recycles. Deploy where the{" "}
              <code className="font-mono text-xs">data/</code> directory is
              writable, or connect PostgreSQL, to keep them permanently.
            </p>
          ))}
      </CardContent>
    </Card>
  );
}
