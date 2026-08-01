"use client";

import * as React from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/misc";

interface RoleOption {
  value: string;
  label: string;
  description: string;
}

export function RequestAccessForm({ roles }: { roles: RoleOption[] }) {
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [role, setRole] = React.useState(roles[0]?.value ?? "");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          company: form.get("company"),
          requestedRole: form.get("requestedRole"),
          justification: form.get("justification"),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Request could not be submitted.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-3 rounded-md border border-success/30 bg-success/10 p-4 text-sm">
        <p className="flex items-center gap-2 font-medium text-success">
          <CheckCircle2 className="h-4 w-4" />
          Request submitted
        </p>
        <p className="text-muted-foreground">
          Your request is now in the administrator&rsquo;s approval queue. You
          will be notified by e-mail once Warisa Kantifong has reviewed it.
          Access is granted per page and per action, so mention in your
          justification exactly which project sections you need.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" required placeholder="Jane Doe" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Work e-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            placeholder="jane.doe@company.com"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="company">Organisation</Label>
        <Input
          id="company"
          name="company"
          required
          placeholder="QNITY / SYME072 / Design Alternative / Vendor"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="requestedRole">Requested role</Label>
        <select
          id="requestedRole"
          name="requestedRole"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {roles.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {roles.find((r) => r.value === role)?.description}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="justification">Business justification</Label>
        <Textarea
          id="justification"
          name="justification"
          required
          minLength={20}
          placeholder="Describe your role on the project and which sections of the portal you need."
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        Submit access request
      </Button>
    </form>
  );
}
