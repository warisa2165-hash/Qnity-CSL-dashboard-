import { redirect } from "next/navigation";

import { currentUser, toAccessProfile, type SessionUser } from "@/lib/auth";
import {
  can,
  canViewPage,
  isAdmin,
  type AccessProfile,
  type PageKey,
  type Permission,
} from "@/lib/rbac";

export interface Guarded {
  user: SessionUser;
  profile: AccessProfile;
  can: (permission: Permission) => boolean;
  isAdmin: boolean;
}

/** Require a signed-in user. Redirects to the login page otherwise. */
export async function requireUser(returnTo?: string): Promise<Guarded> {
  const user = await currentUser();
  const profile = toAccessProfile(user);
  if (!user || !profile || user.status !== "ACTIVE") {
    const target = returnTo
      ? `/login?callbackUrl=${encodeURIComponent(returnTo)}`
      : "/login";
    redirect(target);
  }
  return {
    user,
    profile,
    can: (permission: Permission) => can(profile, permission),
    isAdmin: isAdmin(profile),
  };
}

/**
 * Require view access to a page. A user who is signed in but not entitled is
 * sent to /no-access rather than the login page, so the distinction between
 * "not signed in" and "not permitted" stays clear.
 */
export async function requirePage(page: PageKey): Promise<Guarded> {
  const guarded = await requireUser();
  if (!canViewPage(guarded.profile, page)) {
    redirect(`/no-access?page=${page}`);
  }
  return guarded;
}

/** Require a specific permission (e.g. an edit or approve action). */
export async function requirePermission(
  permission: Permission,
): Promise<Guarded> {
  const guarded = await requireUser();
  if (!guarded.can(permission)) {
    redirect(`/no-access?permission=${encodeURIComponent(permission)}`);
  }
  return guarded;
}

/** Require full administrator rights. */
export async function requireAdmin(): Promise<Guarded> {
  const guarded = await requireUser();
  if (!guarded.isAdmin) {
    redirect("/no-access?page=admin");
  }
  return guarded;
}

/** Non-redirecting variant for API routes. */
export async function apiGuard(permission: Permission): Promise<
  | { ok: true; user: SessionUser }
  | { ok: false; status: 401 | 403; message: string }
> {
  const user = await currentUser();
  if (!user) return { ok: false, status: 401, message: "Authentication required" };
  const profile = toAccessProfile(user);
  if (!can(profile, permission)) {
    return { ok: false, status: 403, message: `Missing permission: ${permission}` };
  }
  return { ok: true, user };
}
