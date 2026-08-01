"use client";

import * as React from "react";
import { Camera, MapPin, Pencil, Trash2 } from "lucide-react";

import type { GalleryPhoto } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/status";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Photos in the mock build have no binary payload, so each tile renders a
 * deterministic gradient derived from the record's seed. When real uploads
 * are connected, swap the placeholder for the stored image URL.
 */
function placeholder(seed: number) {
  const a = CHART_COLORS[seed % CHART_COLORS.length];
  const b = CHART_COLORS[(seed + 3) % CHART_COLORS.length];
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
}

export function GalleryGrid({
  photos,
  categories,
  canManage,
}: {
  photos: GalleryPhoto[];
  categories: string[];
  canManage: boolean;
}) {
  const [category, setCategory] = React.useState<string>("All");
  const [selected, setSelected] = React.useState<GalleryPhoto | null>(null);

  const filtered =
    category === "All" ? photos : photos.filter((p) => p.category === category);

  const timeline = [...filtered].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {["All", ...categories].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              category === c
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-muted",
            )}
          >
            {c}
            {c !== "All" && (
              <span className="ml-1.5 text-xs opacity-70">
                {photos.filter((p) => p.category === c).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {timeline.length} of {photos.length} photos, newest first.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {timeline.map((photo) => (
          <figure
            key={photo.id}
            className="group overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
          >
            <button
              type="button"
              onClick={() => setSelected(photo)}
              className="block w-full text-left"
            >
              <div
                className="relative flex h-40 items-end p-3"
                style={{ background: placeholder(photo.seed) }}
              >
                <Camera
                  className="absolute right-3 top-3 h-5 w-5 text-white/70"
                  aria-hidden
                />
                <Badge className="bg-black/40 backdrop-blur">
                  {photo.category}
                </Badge>
              </div>
              <figcaption className="p-3">
                <p className="line-clamp-2 text-sm font-medium leading-snug">
                  {photo.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(photo.date)} · {photo.uploadedBy}
                </p>
              </figcaption>
            </button>

            {canManage && (
              <div className="flex gap-1 border-t border-border p-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <Button variant="ghost" size="sm" disabled>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button variant="ghost" size="sm" disabled>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            )}
          </figure>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <div
                className="h-48 rounded-md"
                style={{ background: placeholder(selected.seed) }}
              />
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription>{selected.description}</DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Date</dt>
                  <dd className="font-medium">{formatDate(selected.date)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Category</dt>
                  <dd className="font-medium">{selected.category}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Uploaded by</dt>
                  <dd className="font-medium">{selected.uploadedBy}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Location</dt>
                  <dd className="flex items-center gap-1 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {selected.location}
                  </dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-1.5">
                {selected.tags.map((t) => (
                  <Badge key={t} variant="secondary">
                    #{t}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
