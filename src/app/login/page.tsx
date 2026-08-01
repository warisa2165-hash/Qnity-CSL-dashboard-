import { redirect } from "next/navigation";

import { currentUser, demoLoginEnabled, entraConfigured } from "@/lib/auth";
import { getUsers } from "@/lib/data";
import { ROLE_LABELS } from "@/lib/rbac";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const user = await currentUser();
  if (user) redirect(params.callbackUrl ?? "/");

  const users = await getUsers();
  const demoAccounts = users
    .filter((u) => u.status === "ACTIVE")
    .map((u) => ({
      email: u.email,
      name: u.name,
      role: u.role,
      roleLabel: ROLE_LABELS[u.role],
      company: u.company,
      jobTitle: u.jobTitle,
    }));

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div
          aria-hidden
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #106EBE 0%, transparent 45%), radial-gradient(circle at 80% 70%, #00B7C3 0%, transparent 40%)",
          }}
        />
        <div className="relative">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/15 text-lg font-bold backdrop-blur">
            Q
          </span>
          <h1 className="mt-8 max-w-md text-3xl font-semibold leading-tight">
            QNITY CSL Laboratory Renovation 2026
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-primary-foreground/80">
            Project Dashboard Portal — a single source of truth for progress,
            milestones, safety, design submissions, procurement, CAPEX
            equipment, risks and management attention items.
          </p>
        </div>

        <dl className="relative grid grid-cols-2 gap-6 text-sm">
          <div>
            <dt className="text-primary-foreground/70">Location</dt>
            <dd className="font-medium">INC2 Building, Thailand Science Park</dd>
          </div>
          <div>
            <dt className="text-primary-foreground/70">Target handover</dt>
            <dd className="font-medium">06 December 2026</dd>
          </div>
          <div>
            <dt className="text-primary-foreground/70">Consultant</dt>
            <dd className="font-medium">SYME072</dd>
          </div>
          <div>
            <dt className="text-primary-foreground/70">Main contractor</dt>
            <dd className="font-medium">Design Alternative</dd>
          </div>
        </dl>
      </div>

      {/* Sign-in panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <LoginForm
          error={params.error}
          callbackUrl={params.callbackUrl ?? "/"}
          entraEnabled={entraConfigured()}
          demoEnabled={demoLoginEnabled()}
          demoAccounts={demoAccounts}
        />
      </div>
    </div>
  );
}
