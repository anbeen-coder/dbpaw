import CodeMirror from "@uiw/react-codemirror";
import { useMemo } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useTheme } from "@/components/theme-provider";
import type { SchemaOverview, SavedQuery } from "@/services/api";
import { SaveQueryDialog } from "./SaveQueryDialog";
import { useSqlEditorForm } from "./hooks/useSqlEditorForm";
import { useSqlEditorApi } from "./hooks/useSqlEditorApi";
import { useSqlEditorActions } from "./hooks/useSqlEditorActions";
import { useSqlResults } from "./hooks/useSqlResults";
import { SqlToolbar } from "./SqlToolbar";
import { SqlResultsPanel } from "./SqlResultsPanel";
import {
  isRegisteredDriver,
  supportsSchemaBrowsing,
} from "@/lib/driver-registry";
import { useDriverCapabilities } from "@/hooks/useDriverCapabilities";
import type {
  ActiveExecution,
  QueryResultState,
} from "@/lib/queryExecutionState";
import type { SqlExecutionTarget } from "./hooks/useSqlExecution";
import { useEditorViewSession } from "./hooks/useEditorViewSession";

interface SqlEditorProps {
  tabId?: string;
  documentRevision?: number;
  contextRevision?: number;
  queryResults?:
    | QueryResultState
    | {
        data: any[];
        columns: string[];
        executionTime?: string;
        error?: string;
        resultSets?: any[];
        activeResultSetIndex?: number;
      }
    | null;
  activeExecution?: ActiveExecution;
  onExecute?: (target: SqlExecutionTarget) => void;
  onCancel?: () => void;
  databaseName?: string;
  availableDatabases?: string[];
  crossDbSchemaCache?: Map<string, SchemaOverview>;
  onCrossDbSchemaLoad?: (dbName: string) => void;
  value?: string;
  onChange?: (value: string) => void;
  onDatabaseChange?: (database: string) => void;
  availableSchemas?: string[];
  currentSchema?: string;
  onSchemaChange?: (schema: string) => void;
  connectionId?: number;
  driver?: string;
  schemaOverview?: SchemaOverview;
  savedQueryId?: number;
  initialName?: string;
  initialDescription?: string;
  onSaveSuccess?: (savedQuery: SavedQuery) => void;
}

export function SqlEditor({
  tabId = "standalone-sql-editor",
  documentRevision = 0,
  contextRevision = 0,
  queryResults,
  activeExecution,
  onExecute,
  onCancel,
  databaseName,
  availableDatabases,
  crossDbSchemaCache,
  onCrossDbSchemaLoad,
  value,
  onChange,
  onDatabaseChange,
  availableSchemas,
  currentSchema,
  onSchemaChange,
  connectionId,
  driver,
  schemaOverview,
  savedQueryId,
  initialName,
  initialDescription,
  onSaveSuccess,
}: SqlEditorProps) {
  const { theme, editorFontSizePx } = useTheme();
  const capabilities = useDriverCapabilities(connectionId ?? null);
  const isExecuting = !!activeExecution;
  const isCancelling = activeExecution?.status === "cancelling";
  const viewSession = useEditorViewSession(tabId);
  const effectiveQueryResults = useMemo<QueryResultState | null | undefined>(
    () =>
      queryResults && "snapshot" in queryResults
        ? queryResults
        : queryResults
          ? {
              snapshot: {
                executionId: "legacy-result",
                tabId,
                target: "document",
                sql: value ?? "",
                context: {
                  connectionId: connectionId ?? 0,
                  database: databaseName,
                  driver: driver ?? "unknown",
                  contextRevision,
                },
                documentRevision,
                startedAt: 0,
              },
              status: queryResults.error ? "error" : "success",
              data: queryResults.data,
              columns: queryResults.columns,
              rowCount: queryResults.data.length,
              executionTimeMs: Number.parseInt(
                queryResults.executionTime ?? "0",
                10,
              ),
              error: queryResults.error
                ? {
                    code: 0,
                    message: queryResults.error,
                    category: "query",
                  }
                : undefined,
              resultSets: queryResults.resultSets,
              activeResultSetIndex: queryResults.activeResultSetIndex,
            }
          : queryResults,
    [
      connectionId,
      contextRevision,
      databaseName,
      documentRevision,
      driver,
      queryResults,
      tabId,
      value,
    ],
  );

  const form = useSqlEditorForm({ value, onChange });

  const api = useSqlEditorApi({
    code: form.code,
    connectionId,
    databaseName,
    driver,
    savedQueryId,
    initialName,
    initialDescription,
    onSaveSuccess,
  });

  const results = useSqlResults({ queryResults: effectiveQueryResults });

  const actions = useSqlEditorActions({
    driver,
    schemaOverview,
    crossDbSchemaCache,
    availableDatabases,
    onCrossDbSchemaLoad,
    editorFontSizePx,
    theme,
    onExecute,
    isExecuting,
    handleFormat: api.handleFormat,
    triggerSave: api.triggerSave,
    handleSqlChange: form.handleSqlChange,
  });

  const canSwitchDatabase =
    !!databaseName &&
    !!onDatabaseChange &&
    !!availableDatabases &&
    availableDatabases.length > 1;

  const canBrowseSchemas =
    isRegisteredDriver(driver) && supportsSchemaBrowsing(driver);

  const canSwitchSchema =
    canBrowseSchemas &&
    !!currentSchema &&
    !!onSchemaChange &&
    !!availableSchemas &&
    availableSchemas.length > 1;

  const handleFormatClick = async () => {
    const formatted = await api.handleFormat();
    if (formatted !== undefined) {
      form.handleSqlChange(formatted);
    }
  };

  return (
    <div
      className="h-full flex flex-col bg-background"
      data-sql-editor-tab={tabId}
    >
      <SqlToolbar
        databaseName={databaseName}
        availableDatabases={availableDatabases}
        canSwitchDatabase={canSwitchDatabase}
        disableContextSwitch={isExecuting}
        savedQueryId={savedQueryId}
        schemaOverview={schemaOverview}
        onDatabaseChange={onDatabaseChange}
        availableSchemas={availableSchemas}
        currentSchema={currentSchema}
        onSchemaChange={onSchemaChange}
        canSwitchSchema={canSwitchSchema}
        isExecuting={isExecuting}
        isCancelling={isCancelling}
        canCancel={capabilities.queryWithId}
        isFormatting={api.isFormatting}
        onExecute={actions.handleExecute}
        onFormat={handleFormatClick}
        onCancel={onCancel}
        onTriggerSave={api.triggerSave}
        onClear={actions.handleClear}
        resultStatus={results.resultStatus}
        queryResults={effectiveQueryResults}
        documentRevision={documentRevision}
        contextRevision={contextRevision}
        onExportResult={(format) =>
          effectiveQueryResults &&
          api.handleExportResult(effectiveQueryResults, format)
        }
      />

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup
          direction="vertical"
          id={`sql-editor-layout-${tabId}`}
          onLayout={viewSession.saveSplitLayout}
        >
          <ResizablePanel
            id={`sql-editor-panel-${tabId}`}
            order={1}
            defaultSize={
              results.hasVisibleResults
                ? (viewSession.initialSplitLayout?.[0] ?? 50)
                : 100
            }
            minSize={30}
          >
            <div className="h-full flex flex-col text-base">
              <CodeMirror
                value={form.code}
                height="100%"
                extensions={[
                  ...actions.extensions,
                  viewSession.sessionExtension,
                ]}
                theme={actions.editorTheme}
                onChange={form.handleSqlChange}
                onCreateEditor={(view) => {
                  actions.editorViewRef.current = view;
                  if ("scrollDOM" in view) {
                    viewSession.onCreateEditor(view);
                  }
                }}
                className="h-full"
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: true,
                  dropCursor: true,
                  allowMultipleSelections: true,
                  indentOnInput: true,
                  autocompletion: true,
                }}
              />
            </div>
          </ResizablePanel>

          {effectiveQueryResults && results.hasVisibleResults && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel
                id={`sql-result-panel-${tabId}`}
                order={2}
                defaultSize={viewSession.initialSplitLayout?.[1] ?? 50}
                minSize={20}
              >
                <SqlResultsPanel
                  queryResults={effectiveQueryResults}
                  hasMultipleResults={results.hasMultipleResults}
                  visibleResultSets={results.visibleResultSets}
                  activeResultSetIndex={results.activeResultSetIndex}
                  onResultSetChange={results.setActiveResultSetIndex}
                  onResultSetClose={results.closeResultSet}
                  displayData={results.displayData}
                  displayColumns={results.displayColumns}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      <SaveQueryDialog
        open={api.isSaveDialogOpen}
        onOpenChange={api.setIsSaveDialogOpen}
        onSave={api.executeSave}
        initialName={initialName}
        initialDescription={initialDescription}
      />
    </div>
  );
}
