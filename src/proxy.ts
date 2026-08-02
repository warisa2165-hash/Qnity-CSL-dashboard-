import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge-level gate. Called `proxy` because Next 16 renamed the `middleware`
 * file convention; the behaviour is unchanged.
 *
 * The proxy only checks whether a session cookie is present, which is
 * cheap and avoids pulling the Node-only auth stack into the edge runtime.
 * The authoritative check — is this user active, and are they entitled to
 * this page? — happens in the server components via `lib/guard.ts`, so a
 * forged or stale cookie gains nothing.
 */

const PUBLIC_PATHS = [
  "/login",
  "/request-access",
  "/no-access",
  "/api/auth",
  "/api/access-requests",
];

const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const hasSession = SESSION_COOKIES.some((name) =>
    request.cookies.has(name),
  );

  if (!hasSession) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Everything except Next.js internals and static assets.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
