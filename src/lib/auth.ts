import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

import { getUsers } from "@/lib/data";
import type { Company, User, UserStatus } from "@/lib/types";
import type { AccessProfile, Permission, Role } from "@/lib/rbac";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      company: Company;
      jobTitle: string;
      status: UserStatus;
      isExternal: boolean;
      grants: Permission[];
      denials: Permission[];
    } & DefaultSession["user"];
  }
}

const PRIMARY_ADMIN_EMAIL = (
  process.env.PRIMARY_ADMIN_EMAIL ?? "warisa.kantifong@qnity.com"
).toLowerCase();

export function demoLoginEnabled(): boolean {
  return process.env.ENABLE_DEMO_LOGIN !== "false";
}

export function entraConfigured(): boolean {
  return Boolean(
    process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
      process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
  );
}

/** Look a portal user up by e-mail address. */
export async function findUserByEmail(email: string): Promise<User | null> {
  const all = await getUsers();
  const match = all.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
  );
  return match ?? null;
}

/**
 * Entra ID hands us an authenticated identity; the portal still decides what
 * that identity is allowed to see. A directory user with no portal record is
 * not signed in — the administrator provisions them first (or approves their
 * access request), which is the "restrict access for external users"
 * requirement.
 */
async function resolveProfile(email: string): Promise<User | null> {
  const record = await findUserByEmail(email);
  if (!record) return null;
  if (record.status !== "ACTIVE") return null;
  // The primary administrator can never be locked out of their own portal.
  if (record.email.toLowerCase() === PRIMARY_ADMIN_EMAIL) {
    return { ...record, role: "ADMIN", status: "ACTIVE" };
  }
  return record;
}

const providers = [];

if (entraConfigured()) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    }),
  );
}

if (demoLoginEnabled()) {
  providers.push(
    Credentials({
      id: "demo",
      name: "Demo account",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "");
        const password = String(credentials?.password ?? "");
        const expected = process.env.DEMO_PASSWORD ?? "qnity2026";
        if (password !== expected) return null;

        const user = await resolveProfile(email);
        if (!user) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          company: user.company,
          jobTitle: user.jobTitle,
          status: user.status,
          isExternal: user.isExternal,
          grants: user.grants,
          denials: user.denials,
        } as never;
      },
    }),
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login", error: "/login" },
  trustHost: true,
  callbacks: {
    /**
     * Gate at the identity boundary: an Entra ID account that has no active
     * portal record is refused here, before any session is created.
     */
    async signIn({ user, account }) {
      if (account?.provider === "demo") return true;
      const email = user?.email;
      if (!email) return false;
      const profile = await resolveProfile(email);
      return profile ? true : "/login?error=not-provisioned";
    },

    async jwt({ token, user, trigger }) {
      // Refresh the authorisation claims on sign-in and on every session
      // update, so an admin's permission change takes effect without the
      // user having to sign out.
      const email = (user?.email ?? token.email) as string | undefined;
      if ((user || trigger === "update") && email) {
        const profile = await resolveProfile(email);
        if (profile) {
          token.uid = profile.id;
          token.name = profile.name;
          token.email = profile.email;
          token.role = profile.role;
          token.company = profile.company;
          token.jobTitle = profile.jobTitle;
          token.status = profile.status;
          token.isExternal = profile.isExternal;
          token.grants = profile.grants;
          token.denials = profile.denials;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? "";
        session.user.role = (token.role as Role) ?? "LEADERSHIP";
        session.user.company = (token.company as Company) ?? "QNITY";
        session.user.jobTitle = (token.jobTitle as string) ?? "";
        session.user.status = (token.status as UserStatus) ?? "ACTIVE";
        session.user.isExternal = Boolean(token.isExternal);
        session.user.grants = (token.grants as Permission[]) ?? [];
        session.user.denials = (token.denials as Permission[]) ?? [];
      }
      return session;
    },
  },
});

/* ------------------------------------------------------------------ */
/* Server helpers                                                      */
/* ------------------------------------------------------------------ */

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  company: Company;
  jobTitle: string;
  status: UserStatus;
  isExternal: boolean;
  grants: Permission[];
  denials: Permission[];
}

/** The signed-in user, or null. */
export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return {
    id: session.user.id,
    name: session.user.name ?? session.user.email,
    email: session.user.email,
    role: session.user.role,
    company: session.user.company,
    jobTitle: session.user.jobTitle,
    status: session.user.status,
    isExternal: session.user.isExternal,
    grants: session.user.grants ?? [],
    denials: session.user.denials ?? [],
  };
}

/** The shape the RBAC helpers expect. */
export function toAccessProfile(user: SessionUser | null): AccessProfile | null {
  if (!user) return null;
  return {
    role: user.role,
    grants: user.grants,
    denials: user.denials,
    status: user.status,
  };
}
