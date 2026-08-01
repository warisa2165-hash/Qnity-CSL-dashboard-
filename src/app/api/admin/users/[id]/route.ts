import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUser, toAccessProfile } from "@/lib/auth";
import { ACTIONS, isAdmin, PAGE_KEYS, ROLES } from "@/lib/rbac";
import { dataSource, getUsers } from "@/lib/data";
import { clientIp, recordAudit } from "@/lib/audit";

/** `page:action`, `page:*` and `*:*` are the only valid permission strings. */
const permissionPattern = new RegExp(
  `^(\\*|${PAGE_KEYS.join("|")}):(\\*|${ACTIONS.join("|")})$`,
);

const PermissionList = z
  .array(z.string().regex(permissionPattern, "Unknown permission"))
  .max(120);

const UpdateSchema = z.object({
  role: z.enum(ROLES).optional(),
  status: z.enum(["ACTIVE", "PENDING", "DISABLED"]).optional(),
  grants: PermissionList.optional(),
  denials: PermissionList.optional(),
});

async function requireAdminUser() {
  const user = await currentUser();
  return isAdmin(toAccessProfile(user)) ? user : null;
}

/** Update role, status or per-user permission overrides. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const admin = await requireAdminUser();
  if (!admin) {
    return NextResponse.json(
      { error: "Administrator access required" },
      { status: 403 },
    );
  }

  const parsed = UpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid update payload — check the role, status and permissions." },
      { status: 400 },
    );
  }

  const target = (await getUsers()).find((u) => u.id === id);
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // An administrator must not be able to lock themselves out of the portal.
  if (
    target.email.toLowerCase() === admin.email.toLowerCase() &&
    (parsed.data.status === "DISABLED" ||
      (parsed.data.role && parsed.data.role !== "ADMIN"))
  ) {
    return NextResponse.json(
      {
        error:
          "You cannot disable or demote your own administrator account. Ask another administrator to make this change.",
      },
      { status: 400 },
    );
  }

  const changes = Object.entries(parsed.data)
    .map(([key, value]) =>
      Array.isArray(value)
        ? `${key}=[${value.join(", ")}]`
        : `${key}=${String(value)}`,
    )
    .join("; ");

  if (dataSource() === "prisma") {
    try {
      const { prisma } = await import("@/lib/db");
      await prisma.user.update({
        where: { id },
        data: {
          role: parsed.data.role,
          status: parsed.data.status,
          grants: parsed.data.grants,
          denials: parsed.data.denials,
        },
      });
    } catch (error) {
      console.error("[admin/users] update failed", error);
      return NextResponse.json(
        { error: "The change could not be saved." },
        { status: 500 },
      );
    }
  }

  await recordAudit({
    actorName: admin.name,
    actorEmail: admin.email,
    action:
      parsed.data.grants || parsed.data.denials ? "PERMISSION_CHANGE" : "UPDATE",
    entity: "User",
    entityId: target.email,
    summary: `Updated ${target.name}: ${changes}`,
    ipAddress: clientIp(request),
    metadata: { before: { role: target.role, status: target.status }, after: parsed.data },
  });

  return NextResponse.json({
    message:
      dataSource() === "prisma"
        ? `${target.name} updated. The change takes effect on their next request.`
        : `Change validated and audited for ${target.name}. Persisting it requires DATA_SOURCE=prisma.`,
  });
}

/** Delete a portal user. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const admin = await requireAdminUser();
  if (!admin) {
    return NextResponse.json(
      { error: "Administrator access required" },
      { status: 403 },
    );
  }

  const target = (await getUsers()).find((u) => u.id === id);
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (target.email.toLowerCase() === admin.email.toLowerCase()) {
    return NextResponse.json(
      { error: "You cannot delete your own administrator account." },
      { status: 400 },
    );
  }

  if (dataSource() === "prisma") {
    try {
      const { prisma } = await import("@/lib/db");
      await prisma.user.delete({ where: { id } });
    } catch (error) {
      console.error("[admin/users] delete failed", error);
      return NextResponse.json(
        { error: "The user could not be deleted." },
        { status: 500 },
      );
    }
  }

  await recordAudit({
    actorName: admin.name,
    actorEmail: admin.email,
    action: "DELETE",
    entity: "User",
    entityId: target.email,
    summary: `Deleted portal user ${target.name} (${target.email})`,
    ipAddress: clientIp(request),
  });

  return NextResponse.json({
    message:
      dataSource() === "prisma"
        ? `${target.name} has been removed from the portal.`
        : `Deletion validated and audited. Persisting it requires DATA_SOURCE=prisma.`,
  });
}
