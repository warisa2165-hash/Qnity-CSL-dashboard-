"use client";

import * as React from "react";
import {
  Ban,
  CheckCircle2,
  Loader2,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "lucide-react";

import type { User } from "@/lib/types";
import type { PageKey, Permission, Role } from "@/lib/rbac";
import { cn, formatDateTime, initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Avatar, AvatarFallback, Switch } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RoleOption {
  value: Role;
  label: string;
}
interface PageOption {
  key: PageKey;
  label: string;
}

type Feedback = { kind: "ok" | "error"; message: string } | null;

export function UserManagement({
  users,
  roles,
  pages,
  currentUserEmail,
}: {
  users: User[];
  roles: RoleOption[];
  pages: PageOption[];
  currentUserEmail: string;
}) {
  const [query, setQuery] = React.useState("");
  const [editing, setEditing] = React.useState<User | null>(null);
  const [inviting, setInviting] = React.useState(false);
  const [feedback, setFeedback] = React.useState<Feedback>(null);
  const [pending, setPending] = React.useState(false);

  const filtered = users.filter((u) =>
    `${u.name} ${u.email} ${u.company} ${u.jobTitle}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  async function call(path: string, method: string, body?: unknown) {
    setPending(true);
    setFeedback(null);
    try {
      const res = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      setFeedback({
        kind: res.ok ? "ok" : "error",
        message: data.message ?? data.error ?? "Request completed.",
      });
      return res.ok;
    } catch {
      setFeedback({ kind: "error", message: "Network error — please retry." });
      return false;
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users…"
            className="pl-8"
            aria-label="Search users"
          />
        </div>
        <Button size="sm" onClick={() => setInviting(true)} className="ml-auto">
          <UserPlus className="h-4 w-4" />
          Invite user
        </Button>
      </div>

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

      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {filtered.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 p-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback style={{ backgroundColor: u.avatarColor }}>
                {initials(u.name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{u.name}</p>
                <StatusBadge status={u.status} />
                {u.role === "ADMIN" && (
                  <Badge className="gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Administrator
                  </Badge>
                )}
                {u.isExternal && <Badge variant="outline">External</Badge>}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {u.email} · {u.jobTitle} · {u.company}
              </p>
              <p className="text-xs text-muted-foreground">
                {roles.find((r) => r.value === u.role)?.label} · last sign-in{" "}
                {formatDateTime(u.lastLoginAt)}
                {u.grants.length > 0 && ` · ${u.grants.length} extra grant(s)`}
                {u.denials.length > 0 && ` · ${u.denials.length} denial(s)`}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setEditing(u)}>
                <Pencil className="h-3.5 w-3.5" />
                Manage
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending || u.email === currentUserEmail}
                onClick={() =>
                  call(`/api/admin/users/${u.id}`, "PATCH", {
                    status: u.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
                  })
                }
                title={
                  u.email === currentUserEmail
                    ? "You cannot disable your own administrator account"
                    : undefined
                }
              >
                {u.status === "ACTIVE" ? (
                  <Ban className="h-3.5 w-3.5" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                {u.status === "ACTIVE" ? "Disable" : "Enable"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending || u.email === currentUserEmail}
                onClick={() => call(`/api/admin/users/${u.id}`, "DELETE")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {/* ------------------------- Manage user ------------------------- */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          {editing && (
            <UserEditor
              user={editing}
              roles={roles}
              pages={pages}
              pending={pending}
              onSave={async (payload) => {
                const ok = await call(
                  `/api/admin/users/${editing.id}`,
                  "PATCH",
                  payload,
                );
                if (ok) setEditing(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* --------------------------- Invite ---------------------------- */}
      <Dialog open={inviting} onOpenChange={setInviting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a user</DialogTitle>
            <DialogDescription>
              The invitee signs in with their Microsoft Entra ID account. Their
              role determines the baseline access; you can refine it per page
              afterwards.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const ok = await call("/api/admin/users", "POST", {
                name: form.get("name"),
                email: form.get("email"),
                company: form.get("company"),
                jobTitle: form.get("jobTitle"),
                role: form.get("role"),
              });
              if (ok) setInviting(false);
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="invite-name">Full name</Label>
                <Input id="invite-name" name="name" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Work e-mail</Label>
                <Input id="invite-email" name="email" type="email" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-company">Organisation</Label>
                <Input id="invite-company" name="company" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-title">Job title</Label>
                <Input id="invite-title" name="jobTitle" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                name="role"
                defaultValue="LEADERSHIP"
                className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm"
              >
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Send invitation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Per-user role, status and page permission editor                    */
/* ------------------------------------------------------------------ */

function UserEditor({
  user,
  roles,
  pages,
  pending,
  onSave,
}: {
  user: User;
  roles: RoleOption[];
  pages: PageOption[];
  pending: boolean;
  onSave: (payload: {
    role: Role;
    status: string;
    grants: Permission[];
    denials: Permission[];
  }) => void;
}) {
  const [role, setRole] = React.useState<Role>(user.role);
  const [status, setStatus] = React.useState(user.status);
  const [grants, setGrants] = React.useState<Permission[]>(user.grants);
  const [denials, setDenials] = React.useState<Permission[]>(user.denials);

  const toggle = (
    list: Permission[],
    setList: (v: Permission[]) => void,
    permission: Permission,
  ) =>
    setList(
      list.includes(permission)
        ? list.filter((p) => p !== permission)
        : [...list, permission],
    );

  return (
    <>
      <DialogHeader>
        <DialogTitle>{user.name}</DialogTitle>
        <DialogDescription>
          {user.email} · {user.company}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-role">Role</Label>
            <select
              id="edit-role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm"
            >
              {roles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-status">Account status</Label>
            <select
              id="edit-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as User["status"])}
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm"
            >
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending approval</option>
              <option value="DISABLED">Disabled</option>
            </select>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="max-h-72 overflow-y-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Page
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Grant edit
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Deny access
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((p) => {
                    const grant = `${p.key}:edit` as Permission;
                    const deny = `${p.key}:*` as Permission;
                    return (
                      <tr key={p.key} className="border-b border-border/60">
                        <td className="px-3 py-2">{p.label}</td>
                        <td className="px-3 py-2 text-center">
                          <Switch
                            checked={grants.includes(grant)}
                            onCheckedChange={() =>
                              toggle(grants, setGrants, grant)
                            }
                            aria-label={`Grant edit on ${p.label}`}
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Switch
                            checked={denials.includes(deny)}
                            onCheckedChange={() =>
                              toggle(denials, setDenials, deny)
                            }
                            aria-label={`Deny access to ${p.label}`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Denials are evaluated last and override both the role baseline and
          any grant — including the administrator wildcard.
        </p>
      </div>

      <DialogFooter>
        <Button
          onClick={() => onSave({ role, status, grants, denials })}
          disabled={pending}
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </DialogFooter>
    </>
  );
}
