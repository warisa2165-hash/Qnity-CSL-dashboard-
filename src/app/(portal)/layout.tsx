import { getProject } from "@/lib/data";
import { requireUser } from "@/lib/guard";
import { canViewPage } from "@/lib/rbac";
import { NAV_ITEMS } from "@/lib/navigation";
import { AppShell } from "@/components/layout/app-shell";

/**
 * Every page inside this group is authenticated. The navigation list is
 * filtered here, on the server, so a user is never shown a link to a page
 * their role or per-user policy forbids.
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await requireUser();
  const project = await getProject();
  const nav = NAV_ITEMS.filter((item) => canViewPage(profile, item.key));

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company,
        jobTitle: user.jobTitle,
      }}
      nav={nav}
      projectName={project.name}
      projectCode={project.code}
    >
      {children}
    </AppShell>
  );
}
