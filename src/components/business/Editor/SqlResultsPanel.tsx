import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { TableView } from "@/components/business/DataGrid/TableView";
import type { VisibleResultSet } from "./hooks/useSqlResults";

interface SqlResultsPanelProps {
  queryResults: {
    data: any[];
    columns: string[];
    error?: string;
  };
  hasMultipleResults: boolean;
  visibleResultSets: VisibleResultSet[];
  activeResultSetIndex: number;
  onResultSetChange: (idx: number) => void;
  onResultSetClose: (idx: number) => void;
  displayData: any[];
  displayColumns: string[];
}

export function SqlResultsPanel({
  queryResults,
  hasMultipleResults,
  visibleResultSets,
  activeResultSetIndex,
  onResultSetChange,
  onResultSetClose,
  displayData,
  displayColumns,
}: SqlResultsPanelProps) {
  const { t } = useTranslation();

  if (queryResults.error) {
    return (
      <div className="h-full p-4 bg-destructive/10 text-destructive overflow-auto font-mono text-sm whitespace-pre-wrap">
        <div className="font-bold mb-2">
          {t("sqlEditor.error.executingQuery")}
        </div>
        {queryResults.error}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {hasMultipleResults && (
        <div className="flex min-w-0 overflow-x-auto border-b bg-muted/30">
          {visibleResultSets.map(({ originalIndex, resultSet }) => (
            <div
              key={originalIndex}
              className={`flex shrink-0 items-center text-sm ${
                originalIndex === activeResultSetIndex
                  ? "border-b-2 border-primary bg-background"
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
              onMouseDown={(event) => {
                if (event.button === 1) {
                  event.preventDefault();
                  onResultSetClose(originalIndex);
                }
              }}
            >
              <button
                type="button"
                className="px-3 py-1.5 pr-1"
                onClick={() => onResultSetChange(originalIndex)}
              >
                Result {originalIndex + 1} ({resultSet.rowCount} rows)
              </button>
              <button
                type="button"
                className="mr-1 rounded-sm p-1 hover:bg-accent"
                aria-label={t("sqlEditor.result.closeAria", {
                  number: originalIndex + 1,
                })}
                title={t("sqlEditor.result.closeAria", {
                  number: originalIndex + 1,
                })}
                onClick={(event) => {
                  event.stopPropagation();
                  onResultSetClose(originalIndex);
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        <TableView data={displayData} columns={displayColumns} hideHeader />
      </div>
    </div>
  );
}
