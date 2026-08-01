/**
 * Role-Based Access Control
 * =========================
 *
 * Access is resolved in three layers, in order:
 *
 *   1. Role defaults      — every role ships with a baseline permission set.
 *   2. Admin grants       — extra permissions the admin gives a single user.
 *   3. Admin denials      — permissions the admin explicitly removes.
 *
 * Denials always win. That gives the primary administrator (Warisa Kantifong)
 * the ability to open or close any page/action for any individual user without
 * having to invent new roles.
 *
 * A permission string is always `"<pageKey>:<action>"`, plus the two wildcards
 * `"*:*"` (full system administrator) and `"<pageKey>:*"`.
 */

export const ROLES = [
  "ADMIN",
  "LEADERSHIP",
  "PROJECT_TEAM",
  "CONSULTANT",
  "CONTRACTOR",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "System Administrator",
  LEADERSHIP: "Leadership View",
  PROJECT_TEAM: "Project Team View",
  CONSULTANT: "Consultant View",
  CONTRACTOR: "Contractor View",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN: "Full access to every page, record and setting, including user management and audit logs.",
  LEADERSHIP:
    "Read-only executive access to dashboards, reports and approved documents.",
  PROJECT_TEAM:
    "Updates progress, milestones, actions and uploads project reports.",
  CONSULTANT:
    "Uploads consultant reports, reviews documents and submits advisory comments. No financial data.",
  CONTRACTOR:
    "Uploads drawings and revisions, submits schedule/progress updates and RFIs. No leadership reports.",
};

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

export const PAGE_KEYS = [
  "dashboard",
  "project-info",
  "phases",
  "milestones",
  "design",
  "submissions",
  "procurement",
  "capex",
  "payments",
  "risks",
  "safety",
  "actions",
  "owner-attention",
  "gallery",
  "documents",
  "weekly-report",
  "admin",
] as const;

export type PageKey = (typeof PAGE_KEYS)[number];

export const PAGE_LABELS: Record<PageKey, string> = {
  dashboard: "Executive Dashboard",
  "project-info": "Project Information",
  phases: "Project Phase Dashboard",
  milestones: "Milestone Dashboard",
  design: "Design Progress",
  submissions: "Document Submission Tracker",
  procurement: "Procurement Dashboard",
  capex: "CAPEX 2026 Equipment",
  payments: "Milestone Payment Dashboard",
  risks: "Risk Management",
  safety: "Safety Dashboard",
  actions: "Action Tracker",
  "owner-attention": "Owner Attention",
  gallery: "Project Gallery",
  documents: "Document Center",
  "weekly-report": "Weekly Executive Report",
  admin: "Admin Panel",
};

/** Pages that expose contract value, budget and payment figures. */
export const FINANCIAL_PAGES: PageKey[] = ["payments", "procurement", "capex"];

/** Pages that are prepared exclusively for QNITY leadership. */
export const LEADERSHIP_ONLY_PAGES: PageKey[] = [
  "owner-attention",
  "weekly-report",
];

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

export const ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "upload",
  "download",
  "approve",
] as const;

export type Action = (typeof ACTIONS)[number];

export type Permission = `${PageKey | "*"}:${Action | "*"}`;

/* ------------------------------------------------------------------ */
/* Role defaults                                                       */
/* ------------------------------------------------------------------ */

const readOnly = (pages: PageKey[]): Permission[] =>
  pages.map((p) => `${p}:view` as Permission);

const withActions = (pages: PageKey[], actions: Action[]): Permission[] =>
  pages.flatMap((p) => actions.map((a) => `${p}:${a}` as Permission));

/** Every page except the admin panel. */
const ALL_PROJECT_PAGES = PAGE_KEYS.filter((p) => p !== "admin") as PageKey[];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  /* ---------------- System Administrator ---------------- */
  ADMIN: ["*:*"],

  /* ---------------- Leadership (read-only) -------------- */
  LEADERSHIP: [
    ...readOnly(ALL_PROJECT_PAGES),
    // Leadership may pull down approved reports and documents.
    "documents:download",
    "weekly-report:download",
    "submissions:download",
  ],

  /* ---------------- Project Team ------------------------ */
  PROJECT_TEAM: [
    ...readOnly(ALL_PROJECT_PAGES),
    ...withActions(
      [
        "phases",
        "milestones",
        "design",
        "submissions",
        "actions",
        "risks",
        "safety",
        "gallery",
      ],
      ["create", "edit"],
    ),
    "documents:upload",
    "documents:download",
    "submissions:upload",
    "design:upload",
    "safety:upload",
    "gallery:upload",
    "weekly-report:create",
    "weekly-report:edit",
    "weekly-report:download",
    // Procurement editing is granted per-user by the admin, not by default.
  ],

  /* ---------------- Consultant (SYME072) ---------------- */
  CONSULTANT: [
    ...readOnly([
      "dashboard",
      "project-info",
      "phases",
      "milestones",
      "design",
      "submissions",
      "actions",
      "risks",
      "safety",
      "gallery",
      "documents",
    ]),
    "documents:upload",
    "documents:download",
    "submissions:upload",
    "submissions:create",
    "design:upload",
    "actions:edit",
    "risks:create",
    // No financial pages (payments / procurement / capex) unless granted.
  ],

  /* ---------------- Contractor (Design Alternative) ----- */
  CONTRACTOR: [
    ...readOnly([
      // The executive dashboard hides financial and leadership tiles from
      // anyone without those page permissions, so the contractor sees
      // progress, milestone and safety status only.
      "dashboard",
      "project-info",
      "phases",
      "milestones",
      "design",
      "submissions",
      "actions",
      "safety",
      "gallery",
      "documents",
    ]),
    "design:create",
    "design:edit",
    "design:upload",
    "submissions:create",
    "submissions:edit",
    "submissions:upload",
    "documents:upload",
    "documents:download",
    "phases:edit",
    "milestones:edit",
    "actions:edit",
    "safety:create",
    "gallery:upload",
    // No leadership-only pages, no financial pages.
  ],
};

/* ------------------------------------------------------------------ */
/* Resolution                                                          */
/* ------------------------------------------------------------------ */

export interface AccessProfile {
  role: Role;
  /** Extra permissions granted to this specific user by the administrator. */
  grants?: Permission[];
  /** Permissions explicitly removed from this user by the administrator. */
  denials?: Permission[];
  /** A disabled user resolves to no permissions at all. */
  status?: "ACTIVE" | "PENDING" | "DISABLED";
}

function matches(held: Permission, wanted: Permission): boolean {
  if (held === wanted) return true;
  const [hPage, hAction] = held.split(":");
  const [wPage, wAction] = wanted.split(":");
  const pageOk = hPage === "*" || hPage === wPage;
  const actionOk = hAction === "*" || hAction === wAction;
  return pageOk && actionOk;
}

/** Resolve the effective permission list for a user. */
export function effectivePermissions(profile: AccessProfile): Permission[] {
  if (profile.status && profile.status !== "ACTIVE") return [];
  const base = new Set<Permission>(ROLE_PERMISSIONS[profile.role] ?? []);
  for (const g of profile.grants ?? []) base.add(g);
  return [...base];
}

/** Does this user hold `permission`? */
export function can(
  profile: AccessProfile | null | undefined,
  permission: Permission,
): boolean {
  if (!profile) return false;
  if (profile.status && profile.status !== "ACTIVE") return false;

  // Denials win over everything, including the admin wildcard.
  for (const denied of profile.denials ?? []) {
    if (matches(denied, permission)) return false;
  }
  for (const held of effectivePermissions(profile)) {
    if (matches(held, permission)) return true;
  }
  return false;
}

export function canViewPage(
  profile: AccessProfile | null | undefined,
  page: PageKey,
): boolean {
  return can(profile, `${page}:view`);
}

export function canEditPage(
  profile: AccessProfile | null | undefined,
  page: PageKey,
): boolean {
  return can(profile, `${page}:edit`);
}

export function isAdmin(profile: AccessProfile | null | undefined): boolean {
  return profile?.role === "ADMIN" && profile.status !== "DISABLED";
}

/** Every page the user is allowed to open, in navigation order. */
export function visiblePages(
  profile: AccessProfile | null | undefined,
): PageKey[] {
  return PAGE_KEYS.filter((p) => canViewPage(profile, p));
}

/** Full permission matrix for a user — used by the admin permission editor. */
export function permissionMatrix(
  profile: AccessProfile,
): Record<PageKey, Record<Action, boolean>> {
  const matrix = {} as Record<PageKey, Record<Action, boolean>>;
  for (const page of PAGE_KEYS) {
    matrix[page] = {} as Record<Action, boolean>;
    for (const action of ACTIONS) {
      matrix[page][action] = can(profile, `${page}:${action}`);
    }
  }
  return matrix;
}
