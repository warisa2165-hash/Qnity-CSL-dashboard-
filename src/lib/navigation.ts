import type { PageKey } from "@/lib/rbac";

export interface NavItem {
  key: PageKey;
  label: string;
  href: string;
  /** Key into the icon map in `components/layout/sidebar.tsx`. */
  icon: string;
  group: string;
}

/**
 * Full portal navigation. The sidebar renders only the entries the signed-in
 * user is permitted to view, so the menu itself is part of the access model.
 */
export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Executive Dashboard", href: "/dashboard", icon: "gauge", group: "Overview" },
  { key: "project-info", label: "Project Information", href: "/project-info", icon: "info", group: "Overview" },
  { key: "weekly-report", label: "Weekly Executive Report", href: "/weekly-report", icon: "newspaper", group: "Overview" },

  { key: "phases", label: "Project Phases", href: "/phases", icon: "layers", group: "Delivery" },
  { key: "milestones", label: "Milestones", href: "/milestones", icon: "flag", group: "Delivery" },
  { key: "design", label: "Design Progress", href: "/design", icon: "ruler", group: "Delivery" },
  { key: "submissions", label: "Document Submissions", href: "/submissions", icon: "fileCheck", group: "Delivery" },

  { key: "procurement", label: "Procurement", href: "/procurement", icon: "shoppingCart", group: "Commercial" },
  { key: "capex", label: "CAPEX 2026 Equipment", href: "/capex", icon: "microscope", group: "Commercial" },
  { key: "payments", label: "Milestone Payments", href: "/payments", icon: "banknote", group: "Commercial" },

  { key: "risks", label: "Risk Management", href: "/risks", icon: "alertTriangle", group: "Governance" },
  { key: "safety", label: "Safety", href: "/safety", icon: "hardHat", group: "Governance" },
  { key: "actions", label: "Action Tracker", href: "/actions", icon: "listChecks", group: "Governance" },
  { key: "owner-attention", label: "Owner Attention", href: "/owner-attention", icon: "bellRing", group: "Governance" },

  { key: "gallery", label: "Project Gallery", href: "/gallery", icon: "images", group: "Resources" },
  { key: "documents", label: "Document Center", href: "/documents", icon: "folderOpen", group: "Resources" },

  { key: "admin", label: "Admin Panel", href: "/admin", icon: "shieldCheck", group: "Administration" },
];

export const NAV_GROUPS = [
  "Overview",
  "Delivery",
  "Commercial",
  "Governance",
  "Resources",
  "Administration",
];
