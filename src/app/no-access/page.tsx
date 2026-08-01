import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { currentUser } from "@/lib/auth";
import { PAGE_LABELS, ROLE_LABELS, type PageKey } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Access restricted" };

export default async function NoAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; permission?: string }>;
}) {
  const params = await searchParams;
  const user = await currentUser();
  const pageLabel = params.page
    ? (PAGE_LABELS[params.page as PageKey] ?? params.page)
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <CardTitle className="mt-3">Access restricted</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            {pageLabel ? (
              <>
                Your account is not permitted to open{" "}
                <strong className="text-foreground">{pageLabel}</strong>.
              </>
            ) : params.permission ? (
              <>
                This action requires the{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                  {params.permission}
                </code>{" "}
                permission, which your account does not hold.
              </>
            ) : (
              "Your account is not permitted to view this section of the portal."
            )}
          </p>

          {user && (
            <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5 rounded-md border border-border bg-muted/40 p-3">
              <dt className="text-muted-foreground">Signed in as</dt>
              <dd className="font-medium">{user.name}</dd>
              <dt className="text-muted-foreground">Role</dt>
              <dd className="font-medium">{ROLE_LABELS[user.role]}</dd>
              <dt className="text-muted-foreground">Organisation</dt>
              <dd className="font-medium">{user.company}</dd>
            </dl>
          )}

          <p className="text-muted-foreground">
            Access to individual pages is controlled by the project
            administrator (Warisa Kantifong). If you need this section for your
            role, ask the administrator to grant the permission from the Admin
            Panel.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild>
              <Link href="/">Back to the portal</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/api/auth/signout">Sign out</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
