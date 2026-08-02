"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label, Checkbox } from "@/components/ui/misc";
import { cn, humanize } from "@/lib/utils";
import { ENTITIES, type FieldDef } from "@/lib/records";
import { deleteRecord, saveRecord } from "@/lib/actions/records";

/**
 * One editor for every collection.
 *
 * The form is generated from the field schema in `lib/records.ts`, which is
 * plain data, so a server component can decide *what* is editable and this
 * client component decides only *how* it is rendered. Adding a field to an
 * entity therefore needs no change here.
 */

type Values = Record<string, unknown>;

interface RecordEditorProps {
  entityKey: string;
  /** Existing record; omit (or pass null) to create a new one. */
  record?: Values | null;
  /** Show the delete control. Ignored when creating. */
  canDelete?: boolean;
  /** Visual weight of the trigger. */
  trigger?: "button" | "outline" | "icon";
  /** Override the trigger label. */
  label?: string;
}

/* ------------------------------------------------------------------ */
/* Value <-> input marshalling                                         */
/* ------------------------------------------------------------------ */

function toInput(field: FieldDef, raw: unknown): unknown {
  if (field.type === "boolean") return raw === true;
  if (raw === null || raw === undefined) return "";
  if (field.type === "date") return String(raw).slice(0, 10);
  return String(raw);
}

function initialValues(fields: FieldDef[], record: Values | null): Values {
  const out: Values = {};
  for (const field of fields) out[field.key] = toInput(field, record?.[field.key]);
  return out;
}

/* ------------------------------------------------------------------ */
/* Field                                                               */
/* ------------------------------------------------------------------ */

function Field({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  const id = `field-${field.key}`;
  const describedBy = field.help ? `${id}-help` : undefined;

  const control = (() => {
    switch (field.type) {
      case "textarea":
        return (
          <Textarea
            id={id}
            aria-describedby={describedBy}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
          />
        );

      case "select":
        return (
          <select
            id={id}
            aria-describedby={describedBy}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-card px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">— Select —</option>
            {(field.options ?? []).map((option) => (
              <option key={option} value={option}>
                {humanize(option)}
              </option>
            ))}
          </select>
        );

      case "boolean":
        return (
          <div className="flex h-9 items-center gap-2">
            <Checkbox
              id={id}
              aria-describedby={describedBy}
              checked={value === true}
              onCheckedChange={(checked) => onChange(checked === true)}
            />
            <Label htmlFor={id} className="text-sm font-normal">
              {value === true ? "Yes" : "No"}
            </Label>
          </div>
        );

      case "number":
      case "percent":
      case "currency":
        return (
          <Input
            id={id}
            aria-describedby={describedBy}
            type="number"
            inputMode="decimal"
            min={field.min ?? (field.type === "percent" ? 0 : undefined)}
            max={field.max ?? (field.type === "percent" ? 100 : undefined)}
            step={field.type === "currency" ? 1000 : 1}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case "date":
        return (
          <Input
            id={id}
            aria-describedby={describedBy}
            type="date"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      default:
        return (
          <Input
            id={id}
            aria-describedby={describedBy}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  })();

  return (
    <div className={cn("space-y-1.5", field.wide && "sm:col-span-2")}>
      {field.type !== "boolean" && (
        <Label htmlFor={id}>
          {field.label}
          {field.required && (
            <span className="ml-0.5 text-destructive" aria-hidden>
              *
            </span>
          )}
        </Label>
      )}
      {field.type === "boolean" && (
        <p className="text-sm font-medium">{field.label}</p>
      )}
      {control}
      {field.help && (
        <p id={describedBy} className="text-xs text-muted-foreground">
          {field.help}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */

export function RecordEditor({
  entityKey,
  record = null,
  canDelete = false,
  trigger = "outline",
  label,
}: RecordEditorProps) {
  const entity = ENTITIES[entityKey];
  const router = useRouter();

  const [open, setOpen] = React.useState(false);
  const [values, setValues] = React.useState<Values>(() =>
    initialValues(entity?.fields ?? [], record),
  );
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [warning, setWarning] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  if (!entity) return null;

  const id = record ? String(record.id ?? "") : null;
  const isCreate = !id;
  const title = isCreate
    ? `New ${entity.label}`
    : `Edit ${entity.label}`;
  const subject = record
    ? [record[entity.codeKey ?? ""], record[entity.titleKey]]
        .filter(Boolean)
        .map(String)
        .join(" · ")
    : "";

  function reset(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      // Re-seed from the record every time, so a dialog reopened after a
      // server refresh shows the stored values rather than stale edits.
      setValues(initialValues(entity.fields, record));
      setError(null);
      setWarning(null);
      setConfirmDelete(false);
    }
  }

  async function handleSave() {
    setPending(true);
    setError(null);
    setWarning(null);
    try {
      const result = await saveRecord(entityKey, id, values);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (result.durable === false) {
        setWarning(result.message);
      }
      router.refresh();
      if (result.durable !== false) setOpen(false);
    } catch {
      setError("The change could not be sent to the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await deleteRecord(entityKey, id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
      setOpen(false);
    } catch {
      setError("The record could not be deleted. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>
        {trigger === "icon" ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={`Edit ${entity.label} ${subject}`.trim()}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant={trigger === "button" ? "default" : "outline"} size="sm">
            {isCreate ? <Plus className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            {label ?? (isCreate ? `New ${entity.label}` : `Edit ${entity.label}`)}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {subject ||
              `Complete the required fields marked with an asterisk, then save.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
          {entity.fields.map((field) => (
            <Field
              key={field.key}
              field={field}
              value={values[field.key]}
              onChange={(next) =>
                setValues((prev) => ({ ...prev, [field.key]: next }))
              }
            />
          ))}
        </div>

        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        {warning && (
          <p
            role="status"
            className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning-foreground"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            {warning}
          </p>
        )}

        <DialogFooter className="sm:justify-between">
          <div>
            {canDelete && !isCreate && (
              <Button
                type="button"
                variant={confirmDelete ? "destructive" : "ghost"}
                size="sm"
                onClick={handleDelete}
                disabled={pending}
              >
                <Trash2 className="h-4 w-4" />
                {confirmDelete ? "Confirm delete" : "Delete"}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {isCreate ? "Create" : "Save changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
