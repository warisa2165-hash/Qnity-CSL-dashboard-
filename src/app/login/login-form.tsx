"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertCircle, Loader2, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/misc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Role } from "@/lib/rbac";

interface DemoAccount {
  email: string;
  name: string;
  role: Role;
  roleLabel: string;
  company: string;
  jobTitle: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  "not-provisioned":
    "Your Microsoft account is valid, but you have not been provisioned for this portal yet. Request access below and the project administrator will review it.",
  CredentialsSignin:
    "Sign-in failed. Check the e-mail address and demo password, and confirm the account is active.",
  AccessDenied: "Access denied. Contact the project administrator.",
  Configuration:
    "Authentication is not configured correctly. Contact the portal administrator.",
};

export function LoginForm({
  error,
  callbackUrl,
  entraEnabled,
  demoEnabled,
  secretMissing,
  demoAccounts,
}: {
  error?: string;
  callbackUrl: string;
  entraEnabled: boolean;
  demoEnabled: boolean;
  secretMissing: boolean;
  demoAccounts: DemoAccount[];
}) {
  const router = useRouter();
  const [email, setEmail] = React.useState(demoAccounts[0]?.email ?? "");
  const [password, setPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(
    error ? (ERROR_MESSAGES[error] ?? "Sign-in failed. Please try again.") : null,
  );

  async function handleDemoSignIn(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage(null);
    const result = await signIn("demo", {
      email,
      password,
      redirect: false,
    });
    setPending(false);
    if (result?.error) {
      setMessage(ERROR_MESSAGES.CredentialsSignin);
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="w-full max-w-md space-y-5">
      <div className="lg:hidden">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
          Q
        </span>
        <h1 className="mt-4 text-xl font-semibold">
          QNITY CSL Laboratory Renovation 2026
        </h1>
        <p className="text-sm text-muted-foreground">Project Dashboard Portal</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <p className="text-sm text-muted-foreground">
            Access is restricted to authorised QNITY project stakeholders.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/*
            `Configuration` is Auth.js's catch-all. The overwhelmingly common
            cause is an unset AUTH_SECRET, and whoever sees this on a fresh
            deployment is the person who can fix it — so name the variable
            instead of telling them to contact themselves. Only shown while
            demo login is on, i.e. never on a production deployment.
          */}
          {secretMissing && demoEnabled && (
            <div
              role="alert"
              className="space-y-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm"
            >
              <p className="flex items-center gap-2 font-semibold text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                AUTH_SECRET is not set
              </p>
              <p className="text-muted-foreground">
                Sign-in cannot work until this deployment has a session
                signing key. Nothing else is wrong with the build.
              </p>
              <ol className="ml-4 list-decimal space-y-1 text-muted-foreground">
                <li>
                  Generate one:{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                    openssl rand -base64 32
                  </code>
                </li>
                <li>
                  Add it as{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                    AUTH_SECRET
                  </code>{" "}
                  in your host&rsquo;s environment variables, for{" "}
                  <strong>both</strong> Production and Preview.
                </li>
                <li>
                  Redeploy — environment changes do not apply to an existing
                  build.
                </li>
              </ol>
            </div>
          )}

          {message && !secretMissing && (
            <div
              role="alert"
              className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {entraEnabled ? (
            <Button
              className="w-full"
              size="lg"
              onClick={() => signIn("microsoft-entra-id", { callbackUrl })}
            >
              <MicrosoftLogo />
              Sign in with Microsoft Entra ID
            </Button>
          ) : (
            <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-300">
                Microsoft Entra ID is not configured
              </p>
              <p className="mt-1 text-muted-foreground">
                Set <code className="font-mono text-xs">AUTH_MICROSOFT_ENTRA_ID_ID</code>{" "}
                and{" "}
                <code className="font-mono text-xs">
                  AUTH_MICROSOFT_ENTRA_ID_SECRET
                </code>{" "}
                to enable single sign-on. Use a demo account below in the
                meantime.
              </p>
            </div>
          )}

          {demoEnabled && (
            <>
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-card px-2 text-xs uppercase tracking-wide text-muted-foreground">
                    Demo access
                  </span>
                </div>
              </div>

              <form onSubmit={handleDemoSignIn} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="demo-account">Demo account</Label>
                  <select
                    id="demo-account"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {demoAccounts.map((a) => (
                      <option key={a.email} value={a.email}>
                        {a.name} — {a.roleLabel} ({a.company})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Each account demonstrates a different role-based view of the
                    portal.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="demo-password">Demo password</Label>
                  <Input
                    id="demo-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter the shared demo password"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  variant="outline"
                  className="w-full"
                  disabled={pending}
                >
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  Continue with demo account
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Need access?{" "}
        <a
          href="/request-access"
          className="font-medium text-primary hover:underline"
        >
          Request portal access
        </a>{" "}
        — the project administrator (Warisa Kantifong) reviews every request.
      </p>
    </div>
  );
}

function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 21 21" className="h-4 w-4" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
