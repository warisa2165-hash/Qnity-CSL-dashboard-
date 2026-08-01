"use client";

import * as React from "react";
import { Check, Loader2, X } from "lucide-react";

import type { AccessRequest } from "@/lib/types";
import type { Role } from "@/lib/rbac";
import { cn, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AccessRequestQueue({
  requests,
  roles,
}: {
  requests: AccessRequest[];
  roles: { value: Role; label: string }[];
}) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<
    { kind: "ok" | "error"; message: string } | null
  >(null);
  const [assigned, setAssigned] = React.useState<Record<string, Role>>({});

  const pending = requests.filter((r) => r.status === "PENDING");
  const decided = requests.filter((r) => r.status !== "PENDING");

  async function decide(request: AccessRequest, approve: boolean) {
    setPendingId(request.id);
    setFeedback(null);
    try {
      const res = await fetch(`/api/access-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: approve ? "APPROVED" : "REJECTED",
          role: assigned[request.id] ?? request.requestedRole,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setFeedback({
        kind: res.ok ? "ok" : "error",
        message: data.message ?? data.error ?? "Decision recorded.",
      });
    } catch {
      setFeedback({ kind: "error", message: "Network error — please retry." });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {feedback && (
        <p
          role="status"
          className={cn(
            "rounded-md border px-3 py-2 text-sm",
            feedback.kind === "ok"
              ? "border-success/30 bg-success/10 text-success"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {feedback.message}
        </p>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Awaiting decision ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <EmptyState
            title="No pending requests"
            description="Every access request has been decided."
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {pending.map((r) => (
              <Card key={r.id} className="border-l-4 border-l-warning">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm">{r.name}</CardTitle>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.email} · {r.company}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {r.justification}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Requested {formatDateTime(r.requestedAt)}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs text-muted-foreground">
                      Assign role
                    </label>
                    <select
                      value={assigned[r.id] ?? r.requestedRole}
                      onChange={(e) =>
                        setAssigned((prev) => ({
                          ...prev,
                          [r.id]: e.target.value as Role,
                        }))
                      }
                      className="h-8 rounded-md border border-input bg-card px-2 text-sm shadow-sm"
                    >
                      {roles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="success"
                      disabled={pendingId === r.id}
                      onClick={() => decide(r, true)}
                    >
                      {pendingId === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pendingId === r.id}
                      onClick={() => decide(r, false)}
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {decided.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Decided ({decided.length})
          </h3>
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {decided.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.email} · {r.company} ·{" "}
                    {roles.find((x) => x.value === r.requestedRole)?.label}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {r.decidedBy} · {formatDateTime(r.decidedAt)}
                  </span>
                  <StatusBadge status={r.status} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
