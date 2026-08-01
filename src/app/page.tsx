import { redirect } from "next/navigation";

import { currentUser, toAccessProfile } from "@/lib/auth";
import { visiblePages } from "@/lib/rbac";
import { NAV_ITEMS } from "@/lib/navigation";

/**
 * The portal is dashboard-first, but a user whose policy excludes the
 * executive dashboard is sent to the first page they *can* open rather than
 * bounced straight into an access-denied screen.
 */
export default async function RootPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const pages = visiblePages(toAccessProfile(user));
  if (pages.includes("dashboard")) redirect("/dashboard");

  const first = NAV_ITEMS.find((item) => pages.includes(item.key));
  redirect(first?.href ?? "/no-access");
}
