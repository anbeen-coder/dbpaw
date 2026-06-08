import { useTranslation } from "react-i18next";
import {
  Play,
  Save,
  Trash2,
  Database,
  Braces,
  Download,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SchemaOverview, TransferFormat } from "@/services/api";

interface SqlToolbarProps {
  databaseName?: string;
  availableDatabases?: string[];
  canSwitchDatabase: boolean;
  savedQueryId?: number;
  schemaOverview?: SchemaOverview;
  onDatabaseChange?: (database: string) => void;
  isExecuting?: boolean;
  isFormatting: boolean;
  onExecute: () => void;
  onFormat: () => void;
  onCancel?: () => void;
  onTriggerSave: () => void;
  onClear: () => void;
  resultStatus: {
    text: string;
    toneClass: string;
    Icon: LucideIcon;
  } | null;
  queryResults?: {
    error?: string;
  } | null;
  onExportResult: (format: TransferFormat) => void;
}

export function SqlToolbar({
  databaseName,
  availableDatabases,
  canSwitchDatabase,
  savedQueryId,
  schemaOverview,
  onDatabaseChange,
  isExecuting,
  isFormatting,
  onExecute,
  onFormat,
  onCancel,
  onTriggerSave,
  onClear,
  resultStatus,
  queryResults,
  onExportResult,
}: SqlToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border">
      <div className="flex items-center gap-2">
        {databaseName &&
          (canSwitchDatabase ? (
            <div className="flex items-center gap-2">
              <Database
                className={`w-3 h-3 ${schemaOverview ? "text-green-500" : "text-muted-foreground"}`}
              />
              <Select value={databaseName} onValueChange={onDatabaseChange}>
                <SelectTrigger
                  size="sm"
                  className="h-8 min-w-[180px] bg-muted/50 text-xs"
                  aria-label={t("sqlEditor.database.ariaLabel")}
                >
                  <SelectValue
                    placeholder={t("sqlEditor.database.placeholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableDatabases?.map((database) => (
                    <SelectItem key={database} value={database}>
                      {database}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {savedQueryId && (
                <span className="text-[10px] opacity-50">
                  #{savedQueryId}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded text-xs text-muted-foreground border border-border">
              <Database
                className={`w-3 h-3 ${schemaOverview ? "text-green-500" : "text-muted-foreground"}`}
              />
              <span>{databaseName}</span>
              {savedQueryId && (
                <span className="text-[10px] opacity-50 ml-1">
                  #{savedQueryId}
                </span>
              )}
            </div>
          ))}

        <div className="w-px h-4 bg-border mx-2" />

        <TooltipProvider>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onExecute}
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  disabled={isExecuting}
                >
                  {isExecuting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("sqlEditor.tooltip.runSql")}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onFormat}
                  disabled={isFormatting}
                >
                  <Braces className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("sqlEditor.tooltip.formatSql")}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onCancel}
                >
                  <span className="h-3 w-3 bg-foreground/80 rounded-[1px]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("sqlEditor.tooltip.cancelQuery")}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onTriggerSave}
                >
                  <Save className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("sqlEditor.tooltip.saveQuery")}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onClear}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("sqlEditor.tooltip.clearEditor")}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {resultStatus && (
          <>
            <span
              className={`text-xs inline-flex items-center gap-1 ${resultStatus.toneClass}`}
            >
              <resultStatus.Icon className="w-3.5 h-3.5" />
              {resultStatus.text}
            </span>
          </>
        )}
        {queryResults && !queryResults.error && (
          <>
            <div className="w-px h-3 bg-border mx-2" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5">
                  <Download className="w-4 h-4" />
                  {t("sqlEditor.export.result")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onExportResult("csv")}>
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExportResult("json")}>
                  JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExportResult("sql_dml")}>
                  SQL
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </div>
  );
}
