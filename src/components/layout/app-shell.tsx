"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Banknote,
  BellRing,
  FileCheck,
  Flag,
  FolderOpen,
  Gauge,
  HardHat,
  Images,
  Info,
  Layers,
  ListChecks,
  LogOut,
  Menu,
  Microscope,
  Newspaper,
  Ruler,
  Search,
  ShieldCheck,
  ShoppingCart,
  X,
  type LucideIcon,
} from "lucide-react";

import { cn, initials } from "@/lib/utils";
import { ROLE_LABELS, type Role } from "@/lib/rbac";
import { NAV_GROUPS, type NavItem } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, Separator } from "@/components/ui/misc";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/layout/theme";
import { GlobalSearch } from "@/components/layout/global-search";

const ICONS: Record<string, LucideIcon> = {
  gauge: Gauge,
  info: Info,
  newspaper: Newspaper,
  layers: Layers,
  flag: Flag,
  ruler: Ruler,
  fileCheck: FileCheck,
  shoppingCart: ShoppingCart,
  microscope: Microscope,
  banknote: Banknote,
  alertTriangle: AlertTriangle,
  hardHat: HardHat,
  listChecks: ListChecks,
  bellRing: BellRing,
  images: Images,
  folderOpen: FolderOpen,
  shieldCheck: ShieldCheck,
};

export interface ShellUser {
  name: string;
  email: string;
  role: Role;
  company: string;
  jobTitle: string;
}

interface AppShellProps {
  user: ShellUser;
  nav: NavItem[];
  projectName: string;
  projectCode: string;
  children: React.ReactNode;
}

export function AppShell({
  user,
  nav,
  projectName,
  projectCode,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);

  // Close the mobile drawer whenever the route changes.
  React.useEffect(() => setMobileOpen(false), [pathname]);

  // Ctrl/Cmd+K opens search, matching the platform convention on every browser.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const groups = NAV_GROUPS.map((group) => ({
    group,
    items: nav.filter((i) => i.group === group),
  })).filter((g) => g.items.length > 0);

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto scrollbar-thin p-3">
      {groups.map(({ group, items }) => (
        <div key={group} className="mb-2">
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {group}
          </p>
          <ul className="space-y-0.5">
            {items.map((item) => {
              const Icon = ICONS[item.icon] ?? Gauge;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-sidebar-accent font-medium text-primary"
                        : "text-sidebar-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ---------------------------- Top bar ---------------------------- */}
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3 shadow-sm sm:px-4 print:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            Q
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-tight">
              {projectName}
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block">
              {projectCode} · Project Dashboard Portal
            </span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchOpen(true)}
            className="hidden gap-2 text-muted-foreground sm:flex"
          >
            <Search className="h-4 w-4" />
            <span>Search</span>
            <kbd className="rounded border border-border bg-muted px-1 text-[10px]">
              ⌘K
            </kbd>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
          </Button>

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="ml-1 flex items-center gap-2 rounded-full focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="User menu"
              >
                <Avatar>
                  <AvatarFallback>{initials(user.name)}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {user.jobTitle} · {user.company}
                </p>
                <p className="mt-1.5 inline-flex rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
                  {ROLE_LABELS[user.role]}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/project-info">
                  <Info className="h-4 w-4" /> Project information
                </Link>
              </DropdownMenuItem>
              {user.role === "ADMIN" && (
                <DropdownMenuItem asChild>
                  <Link href="/admin">
                    <ShieldCheck className="h-4 w-4" /> Admin settings
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/api/auth/signout">
                  <LogOut className="h-4 w-4" /> Sign out
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1">
        {/* --------------------------- Sidebar -------------------------- */}
        {/*
          The wrapper stretches to the full page height so the sidebar tint
          never stops short on a long page; the nav inside it sticks.
        */}
        <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block print:hidden">
          <div className="sticky top-14 h-[calc(100vh-3.5rem)]">{sidebar}</div>
        </aside>

        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 top-14 z-30 bg-black/40 lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <aside className="fixed left-0 top-14 z-30 h-[calc(100vh-3.5rem)] w-64 border-r border-sidebar-border bg-sidebar shadow-xl lg:hidden">
              {sidebar}
            </aside>
          </>
        )}

        {/* ---------------------------- Content ------------------------- */}
        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <div className="mx-auto w-full max-w-[100rem] animate-fade-in space-y-6">
            {children}
          </div>
        </main>
      </div>

      <footer className="border-t border-border bg-card px-4 py-3 text-center text-xs text-muted-foreground print:hidden">
        <p>
          {projectName} · Internal use only · Data classification: QNITY
          Confidential
        </p>
      </footer>

      <GlobalSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
        nav={nav}
      />
    </div>
  );
}

export { Separator };
