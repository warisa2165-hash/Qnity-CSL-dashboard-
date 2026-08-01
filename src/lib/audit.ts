import { dataSource } from "@/lib/data";
import type { AuditLog } from "@/lib/types";

export interface AuditEntry {
  actorName: string;
  actorEmail: string;
  action: AuditLog["action"];
  entity: string;
  entityId: string;
  summary: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Records an audit event. In mock mode the entry is written to the server
 * log so the trail is still observable during evaluation; with a database
 * connected it is persisted to the immutable `AuditLog` table.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  if (dataSource() === "prisma") {
    try {
      const { prisma } = await import("@/lib/db");
      await prisma.auditLog.create({
        data: {
          actorName: entry.actorName,
          actorEmail: entry.actorEmail,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          summary: entry.summary,
          ipAddress: entry.ipAddress ?? "",
          metadata: entry.metadata as never,
        },
      });
      return;
    } catch (error) {
      console.error("[audit] failed to persist audit entry", error);
    }
  }

  console.info(
    `[audit] ${new Date().toISOString()} ${entry.actorEmail} ${entry.action} ${entry.entity}:${entry.entityId} — ${entry.summary}`,
  );
}

/** Best-effort client IP from the proxy headers. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
