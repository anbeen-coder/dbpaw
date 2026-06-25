import { useCallback, useEffect, useState } from "react";
import { mongodbApi } from "@/services/api/mongodb";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, RefreshCw, Search } from "lucide-react";

interface Props {
  connectionId: number;
  database: string;
  collection: string;
}

export function MongoDbDocumentView({
  connectionId,
  database,
  collection,
}: Props) {
  const [documents, setDocuments] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<Record<string, unknown> | null>(null);

  const [showNewDocDialog, setShowNewDocDialog] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocEmail, setNewDocEmail] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);

  const loadDocuments = useCallback(
    async (nextPage: number, filterStr?: string) => {
      setIsLoading(true);
      try {
        const result = await mongodbApi.mongodb.findDocuments({
          id: connectionId,
          database,
          collection,
          filter: filterStr || undefined,
          page: nextPage,
          pageSize,
        });
        setDocuments(result.documents);
        setTotal(result.total);
        setPage(result.page);
      } catch (e) {
        toast.error("Failed to load documents", {
          description: errorMessage(e),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [connectionId, database, collection, pageSize],
  );

  useEffect(() => {
    void loadDocuments(1);
  }, [loadDocuments]);

  const handleSearch = useCallback(() => {
    const trimmed = searchInput.trim();
    setFilter(trimmed);
    void loadDocuments(1, trimmed);
  }, [searchInput, loadDocuments]);

  const handleRefresh = useCallback(() => {
    void loadDocuments(page, filter);
  }, [loadDocuments, page, filter]);

  const getDocId = useCallback(
    (doc: Record<string, unknown>): string => {
      const id = doc._id;
      if (typeof id === "string") return id;
      if (id && typeof id === "object" && "$oid" in (id as Record<string, unknown>)) {
        return (id as Record<string, unknown>)["$oid"] as string;
      }
      return String(id ?? "");
    },
    [],
  );

  const handleInsertDocument = useCallback(async () => {
    try {
      const doc: Record<string, unknown> = {};
      if (newDocName.trim()) doc.name = newDocName.trim();
      if (newDocEmail.trim()) doc.email = newDocEmail.trim();
      await mongodbApi.mongodb.insertDocument({
        id: connectionId,
        database,
        collection,
        document: doc,
      });
      toast.success("Document inserted");
      setShowNewDocDialog(false);
      setNewDocName("");
      setNewDocEmail("");
      void loadDocuments(1, filter);
    } catch (e) {
      toast.error("Failed to insert document", {
        description: errorMessage(e),
      });
    }
  }, [connectionId, database, collection, newDocName, newDocEmail, loadDocuments, filter]);

  const handleDeleteClick = useCallback((doc: Record<string, unknown>) => {
    setDocToDelete(getDocId(doc));
    setShowDeleteConfirm(true);
  }, [getDocId]);

  const handleConfirmDelete = useCallback(async () => {
    if (!docToDelete) return;
    try {
      await mongodbApi.mongodb.deleteDocument({
        id: connectionId,
        database,
        collection,
        documentId: docToDelete,
      });
      toast.success("Document deleted");
      setSelectedDoc(null);
      void loadDocuments(page, filter);
    } catch (e) {
      toast.error("Failed to delete document", {
        description: errorMessage(e),
      });
    } finally {
      setShowDeleteConfirm(false);
      setDocToDelete(null);
    }
  }, [connectionId, database, collection, docToDelete, loadDocuments, page, filter]);

  const TABLE_EXCLUDED_COLUMNS = new Set(["email"]);
  const columns =
    documents.length > 0
      ? Array.from(
          new Set(documents.flatMap((doc) => Object.keys(doc))),
        )
          .filter((col) => !TABLE_EXCLUDED_COLUMNS.has(col))
          .sort()
      : [];

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0 border-r">
        <div className="flex items-center gap-2 p-2 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter documents..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              className="pl-8 h-8"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNewDocDialog(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            New Document
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/50">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="text-left px-3 py-2 font-medium text-muted-foreground border-b"
                  >
                    {col}
                  </th>
                ))}
                <th className="w-10 border-b" />
              </tr>
            </thead>
            <tbody>
              {documents.map((doc, idx) => (
                <tr
                  key={getDocId(doc) || idx}
                  className={`cursor-pointer hover:bg-accent/50 ${selectedDoc && getDocId(selectedDoc) === getDocId(doc) ? "bg-accent" : ""}`}
                  onClick={() => setSelectedDoc(doc)}
                >
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="px-3 py-2 border-b truncate max-w-[200px]"
                    >
                      {renderCellValue(doc[col])}
                    </td>
                  ))}
                  <td className="border-b">
                    {selectedDoc && getDocId(selectedDoc) === getDocId(doc) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        aria-label="Delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(doc);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {documents.length === 0 && !isLoading && (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No documents found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-3 py-1 border-t text-xs text-muted-foreground">
          <span>
            {total} document{total !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => void loadDocuments(page - 1, filter)}
            >
              Previous
            </Button>
            <span>
              Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={page * pageSize >= total}
              onClick={() => void loadDocuments(page + 1, filter)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {selectedDoc && (
        <div className="w-[350px] shrink-0 overflow-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Document Detail</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDoc(null)}
            >
              Close
            </Button>
          </div>
          <div className="space-y-2">
            {Object.entries(selectedDoc).map(([key, value]) => (
              <div key={key}>
                <div className="text-xs font-medium text-muted-foreground">
                  {key}
                </div>
                <div className="text-sm break-all">
                  {renderCellValue(value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={showNewDocDialog} onOpenChange={setShowNewDocDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="new-doc-name" className="text-sm font-medium">
                name
              </label>
              <Input
                id="new-doc-name"
                placeholder="name"
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="new-doc-email" className="text-sm font-medium">
                email
              </label>
              <Input
                id="new-doc-email"
                placeholder="email"
                value={newDocEmail}
                onChange={(e) => setNewDocEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewDocDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleInsertDocument}>Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Document</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function renderCellValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
