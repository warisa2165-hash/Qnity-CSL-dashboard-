import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUser, toAccessProfile } from "@/lib/auth";
import { isAdmin, ROLES } from "@/lib/rbac";
import { dataSource, getUsers } from "@/lib/data";
import { clientIp, recordAudit } from "@/lib/audit";

const InviteSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  company: z.string().min(1).max(120),
  jobTitle: z.string().max(160).optional(),
  role: z.enum(ROLES),
});

async function requireAdminUser() {
  const user = await currentUser();
  return isAdmin(toAccessProfile(user)) ? user : null;
}

export async function GET() {
  const admin = await requireAdminUser();
  if (!admin) {
    return NextResponse.json(
      { error: "Administrator access required" },
      { status: 403 },
    );
  }
  return NextResponse.json({ users: await getUsers() });
}

/** Invite / create a portal user. */
export async function POST(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) {
    return NextResponse.json(
      { error: "Administrator access required" },
      { status: 403 },
    );
  }

  const parsed = InviteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Name, e-mail, organisation and role are all required." },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const email = data.email.toLowerCase();
  const internalDomains = (process.env.INTERNAL_EMAIL_DOMAINS ?? "qnity.com")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  const isExternal = !internalDomains.some((d) => email.endsWith(`@${d}`));

  const existing = (await getUsers()).find(
    (u) => u.email.toLowerCase() === email,
  );
  if (existing) {
    return NextResponse.json(
      { error: `${data.email} already has a portal account.` },
      { status: 409 },
    );
  }

  if (dataSource() === "prisma") {
    try {
      const { prisma } = await import("@/lib/db");
      await prisma.user.create({
        data: {
          email,
          name: data.name,
          company: data.company,
          jobTitle: data.jobTitle ?? "",
          role: data.role,
          status: "ACTIVE",
          isExternal,
        },
      });
    } catch (error) {
      console.error("[admin/users] create failed", error);
      return NextResponse.json(
        { error: "The user could not be created." },
        { status: 500 },
      );
    }
  }

  await recordAudit({
    actorName: admin.name,
    actorEmail: admin.email,
    action: "CREATE",
    entity: "User",
    entityId: email,
    summary: `Invited ${data.name} (${email}) as ${data.role}${isExternal ? " — external account" : ""}`,
    ipAddress: clientIp(request),
  });

  return NextResponse.json({
    message:
      dataSource() === "prisma"
        ? `${data.name} has been invited. They can now sign in with Microsoft Entra ID.`
        : "Invitation validated and audited. Persisting it requires DATA_SOURCE=prisma.",
  });
}
