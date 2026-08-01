import Link from "next/link";

import { ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RequestAccessForm } from "./request-form";

export const metadata = { title: "Request access" };

export default function RequestAccessPage() {
  const roles = ROLES.filter((r) => r !== "ADMIN").map((r) => ({
    value: r,
    label: ROLE_LABELS[r],
    description: ROLE_DESCRIPTIONS[r],
  }));

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Request portal access</CardTitle>
            <p className="text-sm text-muted-foreground">
              Submit a request for the QNITY CSL Laboratory Renovation 2026
              Project Dashboard Portal. The project administrator reviews every
              request before access is granted.
            </p>
          </CardHeader>
          <CardContent>
            <RequestAccessForm roles={roles} />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Already have access?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
