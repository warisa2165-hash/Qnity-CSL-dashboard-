/**
 * Editable record registry
 * ========================
 *
 * Field definitions are plain data — no render callbacks, no closures — so a
 * server component can hand a whole form schema straight to the client
 * editor, exactly as the data table already does for columns. One editor
 * component serves all five collections.
 *
 * The schema is also the security boundary: the save action accepts only the
 * keys declared here and coerces each by its declared type, so a crafted
 * request cannot introduce fields the form never offered.
 */

import { PROCUREMENT_STAGES } from "@/lib/types";
import type { PageKey } from "@/lib/rbac";
import type { Collection } from "@/lib/data/store";

export type FieldType =
  | "text"
  | "textarea"
  | "date"
  | "number"
  | "percent"
  | "currency"
  | "select"
  | "boolean";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  help?: string;
  min?: number;
  max?: number;
  /** Render across both columns of the two-column form grid. */
  wide?: boolean;
}

export interface EntityDef {
  collection: Collection;
  page: PageKey;
  /** Singular noun used in buttons and confirmations. */
  label: string;
  /** Field shown as the record's headline in the editor and audit trail. */
  titleKey: string;
  /** Short code shown beside the title, when the record has one. */
  codeKey?: string;
  /** A single record rather than a collection. */
  singleton?: boolean;
  fields: FieldDef[];
}

const MILESTONE_STATUS = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "DELAYED",
  "AT_RISK",
  "CANCELLED",
];

const PRIORITY = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const RISK_LEVEL = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const COMPANIES = ["QNITY", "SYME072", "Design Alternative", "Vendor", "Other"];

export const ENTITIES: Record<string, EntityDef> = {
  /* ---------------------------------------------------------------- */
  project: {
    collection: "project",
    page: "project-info",
    label: "project details",
    titleKey: "name",
    singleton: true,
    fields: [
      { key: "name", label: "Project name", type: "text", required: true, wide: true },
      { key: "code", label: "Project code", type: "text", required: true },
      { key: "location", label: "Project location", type: "text", required: true },
      { key: "owner", label: "Project owner", type: "text", required: true },
      { key: "administrator", label: "Project administrator", type: "text", required: true },
      { key: "consultant", label: "Consultant", type: "text" },
      { key: "contractor", label: "Main contractor", type: "text" },
      { key: "objective", label: "Project objective", type: "textarea", wide: true },
      {
        key: "status",
        label: "Project status",
        type: "text",
        wide: true,
        help: "Free text shown on the dashboard banner.",
      },
      { key: "currentPhase", label: "Current phase", type: "text" },
      {
        key: "health",
        label: "Project health",
        type: "select",
        options: ["GREEN", "YELLOW", "RED"],
        help: "Green = on track · Yellow = watch items · Red = management attention",
      },
      { key: "overallProgress", label: "Overall progress", type: "percent" },
      { key: "designProgress", label: "Design progress", type: "percent" },
      { key: "procurementProgress", label: "Procurement progress", type: "percent" },
      { key: "constructionProgress", label: "Construction progress", type: "percent" },
      { key: "safetyScore", label: "Safety score", type: "percent" },
      { key: "contractValue", label: "Contract value", type: "currency" },
      { key: "currency", label: "Currency", type: "text" },
      { key: "startDate", label: "Project start", type: "date" },
      { key: "targetCompletionDate", label: "Target completion", type: "date" },
      { key: "targetHandoverDate", label: "Target handover", type: "date" },
    ],
  },

  /* ---------------------------------------------------------------- */
  milestones: {
    collection: "milestones",
    page: "milestones",
    label: "milestone",
    titleKey: "name",
    codeKey: "code",
    fields: [
      { key: "code", label: "Milestone ID", type: "text", required: true },
      { key: "name", label: "Milestone name", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea", wide: true },
      { key: "plannedDate", label: "Planned date", type: "date", required: true },
      { key: "actualDate", label: "Actual date", type: "date" },
      {
        key: "forecastDate",
        label: "Forecast date",
        type: "date",
        help: "Leave blank to derive the forecast from the owning phase's slip.",
      },
      { key: "status", label: "Status", type: "select", options: MILESTONE_STATUS, required: true },
      { key: "owner", label: "Owner", type: "text", required: true },
      { key: "phase", label: "Phase", type: "text" },
      { key: "dependency", label: "Depends on", type: "text" },
      { key: "remarks", label: "Remarks", type: "textarea", wide: true },
    ],
  },

  /* ---------------------------------------------------------------- */
  risks: {
    collection: "risks",
    page: "risks",
    label: "risk",
    titleKey: "description",
    codeKey: "code",
    fields: [
      { key: "code", label: "Risk ID", type: "text", required: true },
      {
        key: "category",
        label: "Category",
        type: "select",
        required: true,
        options: [
          "Schedule",
          "Design",
          "Procurement",
          "Safety",
          "Budget",
          "Contractor performance",
          "Equipment delivery",
          "Compliance",
          "Permit",
          "Utility readiness",
        ],
      },
      { key: "description", label: "Risk description", type: "textarea", required: true, wide: true },
      { key: "owner", label: "Owner", type: "text", required: true },
      {
        key: "likelihood",
        label: "Likelihood (1–5)",
        type: "number",
        min: 1,
        max: 5,
        required: true,
        help: "1 rare · 3 possible · 5 almost certain",
      },
      {
        key: "impact",
        label: "Impact (1–5)",
        type: "number",
        min: 1,
        max: 5,
        required: true,
        help: "Risk level is recalculated automatically from likelihood × impact.",
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["OPEN", "MITIGATING", "CLOSED", "ESCALATED"],
        required: true,
      },
      { key: "dueDate", label: "Mitigation due", type: "date", required: true },
      { key: "mitigationPlan", label: "Mitigation plan", type: "textarea", wide: true },
      {
        key: "escalationRequired",
        label: "Requires leadership attention",
        type: "boolean",
      },
      { key: "remarks", label: "Remarks", type: "textarea", wide: true },
    ],
  },

  /* ---------------------------------------------------------------- */
  actions: {
    collection: "actions",
    page: "actions",
    label: "action",
    titleKey: "description",
    codeKey: "code",
    fields: [
      { key: "code", label: "Action ID", type: "text", required: true },
      { key: "description", label: "Action description", type: "textarea", required: true, wide: true },
      { key: "owner", label: "Owner", type: "text", required: true },
      { key: "company", label: "Responsible company", type: "select", options: COMPANIES, required: true },
      { key: "dueDate", label: "Due date", type: "date", required: true },
      { key: "priority", label: "Priority", type: "select", options: PRIORITY, required: true },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["OPEN", "IN_PROGRESS", "COMPLETED", "OVERDUE", "CANCELLED"],
        required: true,
      },
      { key: "sourceMeeting", label: "Source meeting", type: "text" },
      { key: "relatedDocument", label: "Related document", type: "text" },
      { key: "comment", label: "Comment", type: "textarea", wide: true },
    ],
  },

  /* ---------------------------------------------------------------- */
  procurement: {
    collection: "procurement",
    page: "procurement",
    label: "procurement package",
    titleKey: "packageName",
    codeKey: "code",
    fields: [
      { key: "code", label: "Package ID", type: "text", required: true },
      { key: "packageName", label: "Package name", type: "text", required: true, wide: true },
      { key: "vendor", label: "Vendor", type: "text" },
      { key: "requester", label: "Requester", type: "text" },
      { key: "buyer", label: "Buyer", type: "text" },
      { key: "budget", label: "Budget", type: "currency", required: true },
      {
        key: "stage",
        label: "Current stage",
        type: "select",
        options: [...PROCUREMENT_STAGES],
        required: true,
      },
      {
        key: "poStatus",
        label: "PO status",
        type: "select",
        options: ["NOT_STARTED", "REQUESTED", "PENDING_APPROVAL", "ISSUED"],
        required: true,
      },
      { key: "poNumber", label: "PO number", type: "text" },
      { key: "targetDeliveryDate", label: "Target delivery", type: "date", required: true },
      { key: "actualDeliveryDate", label: "Actual delivery", type: "date" },
      { key: "riskStatus", label: "Risk status", type: "select", options: RISK_LEVEL, required: true },
      { key: "remarks", label: "Remarks", type: "textarea", wide: true },
    ],
  },
};

export type EntityKey = keyof typeof ENTITIES;

export const isEntityKey = (value: string): value is EntityKey =>
  Object.prototype.hasOwnProperty.call(ENTITIES, value);
