import { NextResponse } from "next/server";
import { z } from "zod";

import { dataSource, getAccessRequests } from "@/lib/data";
import { currentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/rbac";
import { toAccessProfile } from "@/lib/auth";
import { clientIp, recordAudit } from "@/lib/audit";
import { ROLES } from "@/lib/rbac";

const CreateSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  company: z.string().min(2).max(120),
  requestedRole: z.enum(ROLES),
  justification: z.string().min(20).max(2000),
});

/** Public — anyone can ask for access; nobody gets it without admin approval. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Please complete every field. The justification must be at least 20 characters.",
      },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // An access request must never be able to self-assign administrator rights.
  const requestedRole = data.requestedRole === "ADMIN" ? "LEADERSHIP" : data.requestedRole;

  if (dataSource() === "prisma") {
    try {
      const { prisma } = await import("@/lib/db");
      await prisma.accessRequest.create({
        data: {
          name: data.name,
          email: data.email.toLowerCase(),
          company: data.company,
          requestedRole,
          justification: data.justification,
        },
      });
    } catch (error) {
      console.error("[access-requests] create failed", error);
      return NextResponse.json(
        { error: "The request could not be stored. Please try again." },
        { status: 500 },
      );
    }
  }

  await recordAudit({
    actorName: data.name,
    actorEmail: data.email,
    action: "CREATE",
    entity: "AccessRequest",
    entityId: data.email,
    summary: `Access request submitted for ${requestedRole} (${data.company})`,
    ipAddress: clientIp(request),
  });

  return NextResponse.json({
    message:
      "Access request submitted. The project administrator will review it.",
  });
}

/** Admin only — the approval queue. */
export async function GET() {
  const user = await currentUser();
  if (!isAdmin(toAccessProfile(user))) {
    return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
  }
  return NextResponse.json({ requests: await getAccessRequests() });
}
