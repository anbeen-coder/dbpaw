import CodeMirror from "@uiw/react-codemirror";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useTheme } from "@/components/theme-provider";
import type { SchemaOverview, SavedQuery } from "@/services/api";
import { SaveQueryDialog } from "./SaveQueryDialog";
import type { SingleResultState } from "@/lib/queryExecutionState";
import { useSqlEditorForm } from "./hooks/useSqlEditorForm";
import { useSqlEditorApi } from "./hooks/useSqlEditorApi";
import { useSqlEditorActions } from "./hooks/useSqlEditorActions";
import { useSqlResults } from "./hooks/useSqlResults";
import { SqlToolbar } from "./SqlToolbar";
import { SqlResultsPanel } from "./SqlResultsPanel";

interface SqlEditorProps {
  queryResults?: {
    data: any[];
    columns: string[];
    executionTime?: string;
    error?: string;
    resultSets?: SingleResultState[];
    activeResultSetIndex?: number;
  } | null;
  onExecute?: (sql: string) => void;
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
  isExecuting?: boolean;
}

export function SqlEditor({
  queryResults,
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
  isExecuting,
}: SqlEditorProps) {
  const { theme, editorFontSizePx } = useTheme();

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

  const results = useSqlResults({ queryResults });

  const actions = useSqlEditorActions({
    driver,
    schemaOverview,
    crossDbSchemaCache,
    availableDatabases,
    onCrossDbSchemaLoad,
    editorFontSizePx,
    theme,
    onExecute,
    handleFormat: api.handleFormat,
    triggerSave: api.triggerSave,
    handleSqlChange: form.handleSqlChange,
  });

  const canSwitchDatabase =
    !!databaseName &&
    !!onDatabaseChange &&
    !!availableDatabases &&
    availableDatabases.length > 1;

  const canSwitchSchema =
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
    <div className="h-full flex flex-col bg-background">
      <SqlToolbar
        databaseName={databaseName}
        availableDatabases={availableDatabases}
        canSwitchDatabase={canSwitchDatabase}
        savedQueryId={savedQueryId}
        schemaOverview={schemaOverview}
        onDatabaseChange={onDatabaseChange}
        availableSchemas={availableSchemas}
        currentSchema={currentSchema}
        onSchemaChange={onSchemaChange}
        canSwitchSchema={canSwitchSchema}
        isExecuting={isExecuting}
        isFormatting={api.isFormatting}
        onExecute={actions.handleExecute}
        onFormat={handleFormatClick}
        onCancel={onCancel}
        onTriggerSave={api.triggerSave}
        onClear={actions.handleClear}
        resultStatus={results.resultStatus}
        queryResults={queryResults}
        onExportResult={api.handleExportResult}
      />

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="vertical">
          <ResizablePanel defaultSize={queryResults ? 50 : 100} minSize={30}>
            <div className="h-full flex flex-col text-base">
              <CodeMirror
                value={form.code}
                height="100%"
                extensions={actions.extensions}
                theme={actions.editorTheme}
                onChange={form.handleSqlChange}
                onCreateEditor={(view) => {
                  actions.editorViewRef.current = view;
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

          {queryResults && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={50} minSize={20}>
                <SqlResultsPanel
                  queryResults={queryResults}
                  hasMultipleResults={results.hasMultipleResults}
                  activeResultSetIndex={results.activeResultSetIndex}
                  onResultSetChange={results.setActiveResultSetIndex}
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
