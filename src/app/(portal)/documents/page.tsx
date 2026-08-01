import { Upload } from "lucide-react";

import { requirePage } from "@/lib/guard";
import { documentFolders, getDocuments } from "@/lib/data";

import { PageHeader } from "@/components/dashboard/page-header";
import { CounterTile } from "@/components/dashboard/kpi-card";
import { Button } from "@/components/ui/button";
import { DocumentCenter } from "./document-center";

export const metadata = { title: "Document Center" };

export default async function DocumentsPage() {
  const { can, user } = await requirePage("documents");
  const all = await getDocuments();

  /**
   * Role-restricted documents are filtered on the server. A user who is not
   * on a document's access list never receives the record, let alone a
   * download link.
   */
  const documents = all.filter(
    (d) => !d.restrictedTo || d.restrictedTo.includes(user.role),
  );
  const withheld = all.length - documents.length;

  return (
    <>
      <PageHeader
        title="Document Center"
        description="Controlled document repository with folder structure, revision history and approval status."
        readOnly={!can("documents:upload")}
        actions={
          can("documents:upload") && (
            <Button size="sm" variant="outline" disabled>
              <Upload className="h-4 w-4" />
              Upload document
            </Button>
          )
        }
      />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <CounterTile label="Documents available to you" value={documents.length} tone="info" />
        <CounterTile
          label="Approved"
          value={documents.filter((d) => d.approvalStatus === "APPROVED").length}
          tone="success"
        />
        <CounterTile
          label="Under review"
          value={documents.filter((d) => d.approvalStatus === "UNDER_REVIEW").length}
          tone="warning"
        />
        <CounterTile
          label="Superseded / rejected"
          value={
            documents.filter((d) =>
              ["SUPERSEDED", "REJECTED"].includes(d.approvalStatus),
            ).length
          }
          tone="muted"
        />
      </div>

      {withheld > 0 && (
        <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          {withheld} document{withheld === 1 ? " is" : "s are"} restricted to
          other roles and {withheld === 1 ? "is" : "are"} not shown. Contact the
          project administrator if you require access.
        </p>
      )}

      <DocumentCenter
        documents={documents}
        folders={documentFolders}
        canDownload={can("documents:download")}
        canDelete={can("documents:delete")}
      />
    </>
  );
}
