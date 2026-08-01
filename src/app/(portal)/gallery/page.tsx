import { Upload } from "lucide-react";

import { requirePage } from "@/lib/guard";
import { galleryCategories, getGallery } from "@/lib/data";
import { countBy } from "@/lib/utils";

import { PageHeader } from "@/components/dashboard/page-header";
import { CounterTile } from "@/components/dashboard/kpi-card";
import { Button } from "@/components/ui/button";
import { GalleryGrid } from "./gallery-grid";

export const metadata = { title: "Project Gallery" };

export default async function GalleryPage() {
  const { can } = await requirePage("gallery");
  const photos = await getGallery();
  const canUpload = can("gallery:upload");
  const byCategory = countBy(photos, (p) => p.category);

  return (
    <>
      <PageHeader
        title="Project Gallery"
        description="Photographic record of the CSL renovation — site survey, design workshops, construction progress, equipment delivery, safety activity and project events."
        readOnly={!canUpload}
        actions={
          canUpload && (
            <Button size="sm" variant="outline" disabled>
              <Upload className="h-4 w-4" />
              Upload photo
            </Button>
          )
        }
      />

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <CounterTile label="Photos in gallery" value={photos.length} tone="info" />
        <CounterTile
          label="Construction progress"
          value={byCategory["Construction progress"] ?? 0}
          tone="info"
        />
        <CounterTile
          label="Safety activity"
          value={byCategory["Safety activity"] ?? 0}
          tone="success"
        />
        <CounterTile
          label="Equipment delivery"
          value={byCategory["Equipment delivery"] ?? 0}
          tone="warning"
        />
      </div>

      <GalleryGrid
        photos={photos}
        categories={galleryCategories}
        canManage={can("gallery:edit")}
      />
    </>
  );
}
