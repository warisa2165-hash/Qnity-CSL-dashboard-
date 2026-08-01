import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUser, toAccessProfile } from "@/lib/auth";
import { isAdmin, ROLES } from "@/lib/rbac";
import { dataSource, getAccessRequests } from "@/lib/data";
import { clientIp, recordAudit } from "@/lib/audit";

const DecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  role: z.enum(ROLES).optional(),
});

/** Approve or reject a pending access request. Administrator only. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const admin = await currentUser();

  if (!isAdmin(toAccessProfile(admin)) || !admin) {
    return NextResponse.json(
      { error: "Administrator access required" },
      { status: 403 },
    );
  }

  const parsed = DecisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid decision payload" }, { status: 400 });
  }

  const requests = await getAccessRequests();
  const target = requests.find((r) => r.id === id);
  if (!target) {
    return NextResponse.json({ error: "Access request not found" }, { status: 404 });
  }

  const role = parsed.data.role ?? target.requestedRole;
  // Approving a request must never mint another administrator.
  const grantedRole = role === "ADMIN" ? "LEADERSHIP" : role;
  const approved = parsed.data.decision === "APPROVED";

  if (dataSource() === "prisma") {
    try {
      const { prisma } = await import("@/lib/db");
      await prisma.$transaction(async (tx) => {
        await tx.accessRequest.update({
          where: { id },
          data: {
            status: parsed.data.decision,
            decidedAt: new Date(),
            decidedById: admin.id,
          },
        });

        if (approved) {
          await tx.user.upsert({
            where: { email: target.email.toLowerCase() },
            create: {
              email: target.email.toLowerCase(),
              name: target.name,
              company: target.company,
              role: grantedRole,
              status: "ACTIVE",
              isExternal: !target.email
                .toLowerCase()
                .endsWith("@qnity.com"),
            },
            update: { role: grantedRole, status: "ACTIVE" },
          });
        }
      });
    } catch (error) {
      console.error("[access-requests] decision failed", error);
      return NextResponse.json(
        { error: "The decision could not be saved." },
        { status: 500 },
      );
    }
  }

  await recordAudit({
    actorName: admin.name,
    actorEmail: admin.email,
    action: approved ? "APPROVE" : "REJECT",
    entity: "AccessRequest",
    entityId: id,
    summary: approved
      ? `Approved portal access for ${target.name} (${target.email}) as ${grantedRole}`
      : `Rejected portal access request from ${target.name} (${target.email})`,
    ipAddress: clientIp(request),
  });

  return NextResponse.json({
    message:
      dataSource() === "prisma"
        ? approved
          ? `${target.name} now has ${grantedRole} access.`
          : `Request from ${target.name} rejected.`
        : `Decision recorded and audited. Persisting it requires DATA_SOURCE=prisma.`,
  });
}
