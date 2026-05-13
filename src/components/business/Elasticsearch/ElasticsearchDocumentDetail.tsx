import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Copy,
  FileJson,
  Loader2,
  Plus,
  Save,
  Search,
  SquareTerminal,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { toast } from "sonner";
import { api } from "@/services/api";
import type {
  ElasticsearchDocumentDetailProps,
  ElasticsearchDetailMode,
} from "./types";
import { formatJson } from "./elasticsearch-index-management";

const DEFAULT_DOCUMENT_SOURCE = "{\n  \n}";

export function ElasticsearchDocumentDetail({
  hit,
  mapping,
  aggregations,
  index,
  connectionId,
  detailMode,
  onDetailModeChange,
  onDocumentSave,
  onDocumentDelete,
  onCopy,
}: ElasticsearchDocumentDetailProps) {
  const { t } = useTranslation();

  const [documentIdInput, setDocumentIdInput] = useState("");
  const [editorDocumentId, setEditorDocumentId] = useState("");
  const [editorSource, setEditorSource] = useState(DEFAULT_DOCUMENT_SOURCE);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [isSavingDocument, setIsSavingDocument] = useState(false);
  const [isDeletingDocument, setIsDeletingDocument] = useState(false);

  const [rawMethod, setRawMethod] = useState("GET");
  const [rawPath, setRawPath] = useState(`/${index}/_search`);
  const [rawBody, setRawBody] = useState(
    '{\n  "query": {\n    "match_all": {}\n  }\n}',
  );
  const [rawResponse, setRawResponse] = useState("");
  const [isExecutingRaw, setIsExecutingRaw] = useState(false);

  useEffect(() => {
    if (hit) {
      setEditorDocumentId(hit.id);
      setDocumentIdInput(hit.id);
      setEditorSource(formatJson(hit.source));
    } else {
      setEditorDocumentId("");
      setDocumentIdInput("");
      setEditorSource(DEFAULT_DOCUMENT_SOURCE);
    }
  }, [hit]);

  const openDocumentById = useCallback(
    async (documentId?: string) => {
      const id = (documentId || documentIdInput).trim();
      if (!id) return;

      setIsLoadingDocument(true);
      try {
        const doc = await api.elasticsearch.getDocument(
          connectionId,
          index,
          id,
        );
        if (!doc.found || !doc.source) {
          toast.error("Document not found");
          return;
        }

        setEditorDocumentId(doc.id);
        setDocumentIdInput(doc.id);
        setEditorSource(formatJson(doc.source));
      } catch (e) {
        toast.error("Failed to load document", {
          description: e instanceof Error ? e.message : String(e),
        });
      } finally {
        setIsLoadingDocument(false);
      }
    },
    [connectionId, index, documentIdInput],
  );

  const newDocument = () => {
    setEditorDocumentId("");
    setDocumentIdInput("");
    setEditorSource(DEFAULT_DOCUMENT_SOURCE);
    onDetailModeChange("document");
  };

  const saveDocument = async () => {
    setIsSavingDocument(true);
    try {
      await onDocumentSave(editorDocumentId, editorSource);
    } finally {
      setIsSavingDocument(false);
    }
  };

  const deleteDocument = async () => {
    const id = editorDocumentId.trim();
    if (!id) return;
    if (!window.confirm(`Delete document "${id}" from ${index}?`)) return;

    setIsDeletingDocument(true);
    try {
      await onDocumentDelete(id);
      setEditorDocumentId("");
      setDocumentIdInput("");
      setEditorSource(DEFAULT_DOCUMENT_SOURCE);
    } finally {
      setIsDeletingDocument(false);
    }
  };

  const executeRaw = async () => {
    setIsExecutingRaw(true);
    try {
      const response = await api.elasticsearch.executeRaw({
        id: connectionId,
        method: rawMethod,
        path: rawPath,
        body: rawBody.trim() || undefined,
      });
      setRawResponse(
        response.json ? formatJson(response.json) : response.body || "",
      );
      toast.success(`HTTP ${response.status} · ${response.tookMs}ms`);
    } catch (e) {
      toast.error("Elasticsearch request failed", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setIsExecutingRaw(false);
    }
  };

  const renderTabs = () => (
    <div className="flex items-center gap-1 border-b px-3 py-1.5">
      {(
        [
          "document",
          "mapping",
          "aggregations",
          "console",
        ] as ElasticsearchDetailMode[]
      ).map((mode) => (
        <Button
          key={mode}
          variant={detailMode === mode ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-2"
          onClick={() => onDetailModeChange(mode)}
        >
          {mode === "document" && <FileJson className="mr-1.5 h-3.5 w-3.5" />}
          {mode === "console" && (
            <SquareTerminal className="mr-1.5 h-3.5 w-3.5" />
          )}
          {t(`elasticsearch.detail.${mode}`)}
        </Button>
      ))}

      <div className="flex-1" />

      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onCopy}>
        <Copy className="mr-1.5 h-3.5 w-3.5" />
        {t("elasticsearch.detail.copy")}
      </Button>
    </div>
  );

  const renderDocumentTab = () => (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Document ID input */}
      <div className="flex gap-2 border-b p-3">
        <Input
          className="h-8 font-mono text-xs"
          placeholder={t("elasticsearch.detail.documentId")}
          value={documentIdInput}
          onChange={(e) => setDocumentIdInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") openDocumentById();
          }}
        />
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          disabled={isLoadingDocument || !documentIdInput.trim()}
          onClick={() => openDocumentById()}
        >
          {isLoadingDocument ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          {t("elasticsearch.detail.open")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={newDocument}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("elasticsearch.detail.new")}
        </Button>
      </div>

      {/* Document ID for save */}
      <div className="flex gap-2 border-b p-3">
        <Input
          className="h-8 font-mono text-xs"
          placeholder={t("elasticsearch.detail.autoGenerateId")}
          value={editorDocumentId}
          onChange={(e) => setEditorDocumentId(e.target.value)}
        />
        <Button
          size="sm"
          className="h-8"
          disabled={isSavingDocument}
          onClick={() => saveDocument()}
        >
          {isSavingDocument ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {t("elasticsearch.detail.save")}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="h-8"
          disabled={isDeletingDocument || !editorDocumentId.trim()}
          onClick={() => deleteDocument()}
        >
          {isDeletingDocument ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          {t("elasticsearch.detail.delete")}
        </Button>
      </div>

      {/* JSON editor */}
      <Textarea
        className="flex-1 resize-none rounded-none border-0 font-mono text-xs focus-visible:ring-0 min-h-0"
        value={editorSource}
        onChange={(e) => setEditorSource(e.target.value)}
      />
    </div>
  );

  const renderMappingTab = () => (
    <pre className="flex-1 overflow-auto p-3 text-xs min-h-0">
      {formatJson(mapping)}
    </pre>
  );

  const renderAggregationsTab = () =>
    aggregations ? (
      <pre className="flex-1 overflow-auto p-3 text-xs min-h-0">
        {formatJson(aggregations)}
      </pre>
    ) : (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        {t("elasticsearch.detail.noAggregations")}
      </div>
    );

  const renderConsoleTab = () => (
    <ResizablePanelGroup direction="vertical" className="flex-1 min-h-0">
      <ResizablePanel defaultSize={45} minSize={20}>
        <div className="flex flex-col h-full">
          <div className="flex gap-2 border-b p-3">
            <Input
              className="h-8 w-24 font-mono text-xs uppercase"
              value={rawMethod}
              onChange={(e) => setRawMethod(e.target.value.toUpperCase())}
            />
            <Input
              className="h-8 font-mono text-xs"
              value={rawPath}
              onChange={(e) => setRawPath(e.target.value)}
              placeholder="/_cluster/health"
            />
            <Button
              size="sm"
              className="h-8"
              disabled={isExecutingRaw}
              onClick={() => executeRaw()}
            >
              {isExecutingRaw ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <SquareTerminal className="mr-2 h-4 w-4" />
              )}
              {t("elasticsearch.detail.send")}
            </Button>
          </div>
          <Textarea
            className="flex-1 resize-none rounded-none border-0 font-mono text-xs focus-visible:ring-0 min-h-0"
            value={rawBody}
            onChange={(e) => setRawBody(e.target.value)}
            placeholder={t("elasticsearch.console.placeholder")}
          />
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={55} minSize={20}>
        <pre className="h-full overflow-auto p-3 text-xs">{rawResponse}</pre>
      </ResizablePanel>
    </ResizablePanelGroup>
  );

  return (
    <div className="flex h-full flex-col">
      {renderTabs()}

      {detailMode === "document" && renderDocumentTab()}
      {detailMode === "mapping" && renderMappingTab()}
      {detailMode === "aggregations" && renderAggregationsTab()}
      {detailMode === "console" && renderConsoleTab()}
    </div>
  );
}
