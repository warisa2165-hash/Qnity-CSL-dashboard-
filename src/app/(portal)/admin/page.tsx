import { Database, FileDown, KeyRound, ScrollText, UserCog } from "lucide-react";

import { requireAdmin } from "@/lib/guard";
import { getAccessRequests, getAuditLogs, getUsers, dataSource } from "@/lib/data";
import {
  can as rbacCan,
  PAGE_KEYS,
  PAGE_LABELS,
  ROLE_LABELS,
  ROLES,
  type Action,
  type PageKey,
  type Role,
} from "@/lib/rbac";
import { formatDateTime } from "@/lib/utils";

import { PageHeader, SectionTitle } from "@/components/dashboard/page-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { DataTable, type Column } from "@/components/dashboard/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserManagement } from "./user-management";
import { AccessRequestQueue } from "./access-requests";
import { DataManagement } from "./data-management";
import { SavedEdits } from "./saved-edits";
import { customisedCollections, storageStatus } from "@/lib/actions/records";

export const metadata = { title: "Admin Panel" };

const AUDIT_COLUMNS: Column[] = [
  { key: "timestamp", header: "Timestamp", type: "text", className: "w-48" },
  { key: "actorName", header: "User" },
  { key: "action", header: "Action", type: "status" },
  { key: "entity", header: "Entity" },
  { key: "entityId", header: "Record", type: "code" },
  { key: "summary", header: "Summary", wrap: true, className: "min-w-[22rem]" },
  { key: "ipAddress", header: "IP address", hideOnMobile: true },
];

export default async function AdminPage() {
  const { user } = await requireAdmin();
  const [users, requests, logs, storage, customised] = await Promise.all([
    getUsers(),
    getAccessRequests(),
    getAuditLogs(),
    storageStatus(),
    customisedCollections(),
  ]);

  const pending = requests.filter((r) => r.status === "PENDING");
  const auditRows = logs.map((l) => ({
    ...l,
    timestamp: formatDateTime(l.timestamp),
  }));

  return (
    <>
      <PageHeader
        title="Admin Panel"
        description={`User management, permissions, data management and the audit trail. Signed in as ${user.name}, primary system administrator.`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Portal users"
          value={users.length}
          icon={UserCog}
          tone="info"
          hint={`${users.filter((u) => u.status === "ACTIVE").length} active · ${users.filter((u) => u.status === "DISABLED").length} disabled`}
        />
        <KpiCard
          label="Pending access requests"
          value={pending.length}
          icon={KeyRound}
          tone={pending.length > 0 ? "warning" : "success"}
          hint="Awaiting your approval"
        />
        <KpiCard
          label="External users"
          value={users.filter((u) => u.isExternal).length}
          tone="warning"
          hint="Consultant, contractor and vendor accounts"
        />
        <KpiCard
          label="Audit events recorded"
          value={logs.length}
          icon={ScrollText}
          tone="info"
          hint="Most recent activity first"
        />
      </div>

      {dataSource() === "mock" && (
        <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          The portal is running on the built-in mock dataset
          (<code className="font-mono text-xs">DATA_SOURCE=mock</code>).
          Administrative changes are validated and audited but not persisted.
          Point <code className="font-mono text-xs">DATABASE_URL</code> at
          PostgreSQL and set{" "}
          <code className="font-mono text-xs">DATA_SOURCE=prisma</code> to make
          every action durable.
        </p>
      )}

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">User management</TabsTrigger>
          <TabsTrigger value="requests">
            Access requests
            {pending.length > 0 && (
              <span className="ml-1.5 rounded-full bg-warning px-1.5 text-[10px] font-semibold text-warning-foreground">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="data">Data management</TabsTrigger>
          <TabsTrigger value="audit">Audit trail</TabsTrigger>
        </TabsList>

        {/* ------------------------- Users ------------------------- */}
        <TabsContent value="users">
          <UserManagement
            users={users}
            roles={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
            pages={PAGE_KEYS.map((p) => ({ key: p, label: PAGE_LABELS[p] }))}
            currentUserEmail={user.email}
          />
        </TabsContent>

        {/* --------------------- Access requests -------------------- */}
        <TabsContent value="requests">
          <AccessRequestQueue
            requests={requests}
            roles={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
          />
        </TabsContent>

        {/* ----------------------- Permissions ---------------------- */}
        <TabsContent value="permissions" className="space-y-4">
          <SectionTitle
            title="Role permission baseline"
            description="Default page access per role. Individual users can be granted or denied any page from the User management tab; denials always win."
          />
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full min-w-[46rem] text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Page
                      </th>
                      {ROLES.map((r) => (
                        <th
                          key={r}
                          className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                        >
                          {ROLE_LABELS[r].replace(" View", "")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PAGE_KEYS.map((page) => (
                      <tr key={page} className="border-b border-border/60">
                        <td className="px-3 py-2 font-medium">
                          {PAGE_LABELS[page]}
                        </td>
                        {ROLES.map((role) => {
                          const canView = permissionFor(role, page, "view");
                          const canEdit = permissionFor(role, page, "edit");
                          return (
                            <td key={role} className="px-3 py-2 text-center">
                              {canEdit ? (
                                <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
                                  Edit
                                </span>
                              ) : canView ? (
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                  View
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground/50">
                                  —
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------------------- Data management --------------------- */}
        <TabsContent value="data" className="space-y-4">
          <SavedEdits storage={storage} customised={customised} />
          <DataManagement source={dataSource()} />
        </TabsContent>

        {/* ------------------------ Audit --------------------------- */}
        <TabsContent value="audit" className="space-y-4">
          <SectionTitle
            title="Audit trail"
            description="Who created, edited, deleted, approved, uploaded or downloaded — plus every sign-in and denied access attempt."
          />
          <DataTable
            rows={auditRows}
            columns={AUDIT_COLUMNS}
            searchKeys={["actorName", "actorEmail", "summary", "entity", "entityId"]}
            filters={[
              { key: "action", label: "Action" },
              { key: "entity", label: "Entity" },
              { key: "actorName", label: "User" },
            ]}
            exportName="qnity-csl-audit-trail"
            defaultSort="timestamp"
            defaultSortDirection="desc"
          />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileDown className="h-4 w-4 text-primary" />
                Retention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Audit records are immutable and retained for the life of the
                project plus seven years. Export the trail as CSV for
                inclusion in the handover documentation pack.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Database className="h-4 w-4 text-primary" />
            Current data source
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono text-xs">{dataSource()}</span> — see{" "}
            <code className="font-mono text-xs">docs/DATA-INTEGRATION.md</code>{" "}
            for connecting Excel, SharePoint, Power BI or manual admin input.
          </p>
        </CardContent>
      </Card>
    </>
  );
}

/* Keeps the displayed matrix in step with the live RBAC rules. */
function permissionFor(role: Role, page: PageKey, action: Action): boolean {
  return rbacCan({ role, status: "ACTIVE" }, `${page}:${action}`);
}
