import { useCallback, useEffect, useState } from "react";
import { save, open } from "@tauri-apps/plugin-dialog";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { api, isTauri } from "@/services/api";
import type {
  ElasticsearchIndexInfo,
  ElasticsearchSearchHit,
} from "@/services/api";
import { toast } from "sonner";
import {
  executeElasticsearchIndexAction,
  extractFieldsFromIndexMapping,
  formatJson,
  bulkDefaultName,
  type ElasticsearchIndexAction,
} from "./elasticsearch-index-management";
import { ElasticsearchSearchBar } from "./ElasticsearchSearchBar";
import { ElasticsearchFieldList } from "./ElasticsearchFieldList";
import { ElasticsearchDocumentTable } from "./ElasticsearchDocumentTable";
import { ElasticsearchDocumentDetail } from "./ElasticsearchDocumentDetail";
import type {
  ElasticsearchDetailMode,
  ElasticsearchField,
  ElasticsearchSort,
} from "./types";
import { errorMessage } from "@/lib/errors";

const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_VISIBLE_COLUMNS = ["_id", "_score", "_source"];

interface Props {
  connectionId: number;
  index: string;
}

export function ElasticsearchIndexView({ connectionId, index }: Props) {
  // Data state
  const [indices, setIndices] = useState<ElasticsearchIndexInfo[]>([]);
  const [mapping, setMapping] = useState<unknown>(null);
  const [fields, setFields] = useState<ElasticsearchField[]>([]);
  const [result, setResult] = useState<{
    hits: ElasticsearchSearchHit[];
    total: number;
    tookMs: number;
    aggregations?: unknown;
  }>({ hits: [], total: 0, tookMs: 0 });

  // Search state
  const [query, setQuery] = useState("");
  const [dsl, setDsl] = useState("");
  const [from, setFrom] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<ElasticsearchSort>({
    field: "_score",
    direction: "desc",
  });
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    ...DEFAULT_VISIBLE_COLUMNS,
  ]);

  // UI state
  const [selectedHit, setSelectedHit] = useState<ElasticsearchSearchHit | null>(
    null,
  );
  const [detailMode, setDetailMode] =
    useState<ElasticsearchDetailMode>("document");
  const [showFieldList, setShowFieldList] = useState(true);
  const [showDocumentDetail, setShowDocumentDetail] = useState(true);

  // Loading state
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [isManagingIndex, setIsManagingIndex] = useState(false);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [isBulkExporting, setIsBulkExporting] = useState(false);

  const currentIndex = indices.find((item) => item.name === index);

  // Load metadata
  const loadMetadata = useCallback(async () => {
    setIsLoadingMeta(true);
    try {
      const [nextIndices, nextMapping] = await Promise.all([
        api.elasticsearch.listIndices(connectionId),
        api.elasticsearch.getIndexMapping(connectionId, index),
      ]);
      setIndices(nextIndices);
      setMapping(nextMapping);
      setFields(extractFieldsFromIndexMapping(nextMapping));
    } catch (e) {
      toast.error("Failed to load Elasticsearch metadata", {
        description: errorMessage(e),
      });
    } finally {
      setIsLoadingMeta(false);
    }
  }, [connectionId, index]);

  // Search documents
  const search = useCallback(
    async (nextFrom: number) => {
      setIsSearching(true);
      try {
        const response = await api.elasticsearch.searchDocuments({
          id: connectionId,
          index,
          query: query.trim() || undefined,
          dsl: dsl.trim() || undefined,
          from: nextFrom,
          size: pageSize,
        });
        setFrom(nextFrom);
        setResult(response);
      } catch (e) {
        toast.error("Elasticsearch search failed", {
          description: errorMessage(e),
        });
      } finally {
        setIsSearching(false);
      }
    },
    [connectionId, index, query, dsl, pageSize],
  );

  // Auto-select first hit when result changes
  useEffect(() => {
    if (result.hits.length > 0) {
      setSelectedHit((prev) => {
        if (prev && result.hits.some((h) => h.id === prev.id)) return prev;
        return result.hits[0];
      });
    } else {
      setSelectedHit(null);
    }
  }, [result.hits]);

  // Load once per opened index
  useEffect(() => {
    void loadMetadata();
    void search(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId, index]);

  // Hit selection handler
  const handleHitSelect = useCallback((hit: ElasticsearchSearchHit) => {
    setSelectedHit(hit);
    setDetailMode("document");
  }, []);

  // Page size change handler
  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      setPageSize(newSize);
      setFrom(0);
      void search(0);
    },
    [search],
  );

  // Sort change handler
  const handleSortChange = useCallback(
    (newSort: ElasticsearchSort) => {
      setSort(newSort);
      // Re-search with new sort by applying via DSL
      const sortDsl = JSON.stringify({
        sort: [
          {
            [newSort.field === "_id" ? "_id" : newSort.field]: {
              order: newSort.direction,
            },
          },
        ],
      });
      setDsl(sortDsl);
      void search(0);
    },
    [search],
  );

  // Column toggle handler
  const handleColumnToggle = useCallback((fieldName: string) => {
    setVisibleColumns((prev) => {
      if (prev.includes(fieldName)) {
        return prev.filter((col) => col !== fieldName);
      }
      return [...prev, fieldName];
    });
  }, []);

  // Copy handler
  const handleCopy = useCallback(async () => {
    let text = "";

    if (detailMode === "mapping") {
      text = formatJson(mapping);
    } else if (detailMode === "aggregations") {
      text = formatJson(result.aggregations);
    } else if (selectedHit) {
      text = formatJson({
        _index: selectedHit.index,
        _id: selectedHit.id,
        _score: selectedHit.score,
        _source: selectedHit.source,
        fields: selectedHit.fields,
      });
    }

    if (!text) return;
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  }, [detailMode, mapping, result.aggregations, selectedHit]);

  // Document save handler
  const handleDocumentSave = useCallback(
    async (docId: string, source: string) => {
      try {
        const parsedSource = JSON.parse(source);
        const saved = await api.elasticsearch.upsertDocument({
          id: connectionId,
          index,
          documentId: docId.trim() || undefined,
          source: parsedSource,
          refresh: true,
        });
        toast.success(
          `${saved.result || "saved"}${saved.id ? ` · ${saved.id}` : ""}`,
        );
        await search(from);
        await loadMetadata();
      } catch (e) {
        toast.error("Failed to save document", {
          description: errorMessage(e),
        });
        throw e;
      }
    },
    [connectionId, index, from, search, loadMetadata],
  );

  // Document delete handler
  const handleDocumentDelete = useCallback(
    async (docId: string) => {
      try {
        await api.elasticsearch.deleteDocument({
          id: connectionId,
          index,
          documentId: docId,
          refresh: true,
        });
        toast.success("Document deleted");
        setSelectedHit(null);
        await search(Math.max(0, from));
        await loadMetadata();
      } catch (e) {
        toast.error("Failed to delete document", {
          description: errorMessage(e),
        });
        throw e;
      }
    },
    [connectionId, index, from, search, loadMetadata],
  );

  // Index management handler
  const handleManageIndex = useCallback(
    async (action: ElasticsearchIndexAction) => {
      if (action === "delete" && !window.confirm(`Delete index "${index}"?`)) {
        return;
      }
      setIsManagingIndex(true);
      try {
        await executeElasticsearchIndexAction(connectionId, index, action);
        toast.success(
          action === "delete"
            ? `Index deleted · ${index}`
            : `Index ${action} complete · ${index}`,
        );
        if (action !== "delete") {
          await loadMetadata();
          await search(from);
        }
      } catch (e) {
        toast.error(`Failed to ${action} Elasticsearch index`, {
          description: errorMessage(e),
        });
      } finally {
        setIsManagingIndex(false);
      }
    },
    [connectionId, index, from, loadMetadata, search],
  );

  // Import handler
  const handleImport = useCallback(async () => {
    if (!isTauri()) {
      toast.error("Import dialog is only available in Tauri desktop mode.");
      return;
    }
    setIsBulkImporting(true);
    try {
      const selected = await open({
        title: "Import Elasticsearch NDJSON",
        multiple: false,
        directory: false,
        filters: [{ name: "NDJSON", extensions: ["ndjson", "json"] }],
      });
      if (!selected) return;
      const filePath = Array.isArray(selected) ? selected[0] : selected;
      if (!filePath) return;
      if (!window.confirm(`Import documents into "${index}"?`)) return;

      const result = await api.elasticsearch.importDocuments({
        id: connectionId,
        index,
        filePath,
        refresh: true,
      });

      if (result.failed > 0) {
        toast.error(
          `Imported ${result.successful} documents, ${result.failed} failed`,
          {
            description: result.errors.slice(0, 3).join("\n") || filePath,
          },
        );
      } else {
        toast.success(`Imported ${result.successful} documents`, {
          description: result.filePath,
        });
      }
      await search(0);
      await loadMetadata();
    } catch (e) {
      toast.error("Failed to import Elasticsearch documents", {
        description: errorMessage(e),
      });
    } finally {
      setIsBulkImporting(false);
    }
  }, [connectionId, index, search, loadMetadata]);

  // Export handler
  const handleExport = useCallback(async () => {
    if (!isTauri()) {
      toast.error("Export dialog is only available in Tauri desktop mode.");
      return;
    }
    setIsBulkExporting(true);
    try {
      const selected = await save({
        title: "Export Elasticsearch documents",
        defaultPath: bulkDefaultName(index),
        filters: [{ name: "NDJSON", extensions: ["ndjson"] }],
      });
      if (!selected) return;
      const filePath = Array.isArray(selected) ? selected[0] : selected;
      if (!filePath) return;

      const result = await api.elasticsearch.exportDocuments({
        id: connectionId,
        index,
        query: query.trim() || undefined,
        dsl: dsl.trim() || undefined,
        filePath,
      });
      toast.success(`Exported ${result.documents} documents`, {
        description: result.filePath,
      });
    } catch (e) {
      toast.error("Failed to export Elasticsearch documents", {
        description: errorMessage(e),
      });
    } finally {
      setIsBulkExporting(false);
    }
  }, [connectionId, index, query, dsl]);

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {/* Left panel: Field list */}
      {showFieldList && (
        <>
          <ResizablePanel defaultSize={18} minSize={12} maxSize={30}>
            <ElasticsearchFieldList
              fields={fields}
              selectedField={null}
              isLoading={isLoadingMeta}
              visibleColumns={visibleColumns}
              onFieldSelect={() => {
                setDetailMode("mapping");
              }}
              onFieldToggle={handleColumnToggle}
            />
          </ResizablePanel>
          <ResizableHandle />
        </>
      )}

      {/* Center panel: Search bar + Document table */}
      <ResizablePanel
        defaultSize={
          showFieldList && showDocumentDetail
            ? 47
            : showFieldList || showDocumentDetail
              ? 65
              : 100
        }
        minSize={30}
      >
        <div className="flex h-full flex-col">
          <ElasticsearchSearchBar
            index={index}
            currentIndex={currentIndex}
            total={result.total}
            tookMs={result.tookMs}
            query={query}
            dsl={dsl}
            isSearching={isSearching}
            isManagingIndex={isManagingIndex}
            isBulkImporting={isBulkImporting}
            isBulkExporting={isBulkExporting}
            showFieldList={showFieldList}
            showDocumentDetail={showDocumentDetail}
            onQueryChange={setQuery}
            onDslChange={setDsl}
            onSearch={() => search(0)}
            onRefresh={() => {
              void loadMetadata();
              void search(from);
            }}
            onImport={handleImport}
            onExport={handleExport}
            onManageIndex={handleManageIndex}
            onToggleFieldList={() => setShowFieldList(!showFieldList)}
            onToggleDocumentDetail={() =>
              setShowDocumentDetail(!showDocumentDetail)
            }
          />

          <ElasticsearchDocumentTable
            hits={result.hits}
            total={result.total}
            from={from}
            pageSize={pageSize}
            isLoading={isSearching}
            selectedHit={selectedHit}
            sort={sort}
            visibleColumns={visibleColumns}
            onHitSelect={handleHitSelect}
            onPageChange={(newFrom) => {
              setFrom(newFrom);
              void search(newFrom);
            }}
            onPageSizeChange={handlePageSizeChange}
            onSortChange={handleSortChange}
            onColumnsChange={setVisibleColumns}
          />
        </div>
      </ResizablePanel>

      {/* Right panel: Document detail */}
      {showDocumentDetail && (
        <>
          <ResizableHandle />
          <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
            <ElasticsearchDocumentDetail
              hit={selectedHit}
              mapping={mapping}
              aggregations={result.aggregations}
              index={index}
              connectionId={connectionId}
              detailMode={detailMode}
              onDetailModeChange={setDetailMode}
              onDocumentSave={handleDocumentSave}
              onDocumentDelete={handleDocumentDelete}
              onCopy={handleCopy}
            />
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
}
