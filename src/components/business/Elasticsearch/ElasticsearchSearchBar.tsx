import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  Download,
  FolderOpen,
  Loader2,
  PanelLeft,
  PanelRight,
  RefreshCw,
  Search,
  Table2,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ElasticsearchSearchBarProps } from "./types";

export function ElasticsearchSearchBar({
  index,
  currentIndex,
  total,
  tookMs,
  query,
  dsl,
  isSearching,
  isManagingIndex,
  isBulkImporting,
  isBulkExporting,
  showFieldList,
  showDocumentDetail,
  onQueryChange,
  onDslChange,
  onSearch,
  onRefresh,
  onImport,
  onExport,
  onManageIndex,
  onToggleFieldList,
  onToggleDocumentDetail,
}: ElasticsearchSearchBarProps) {
  const { t } = useTranslation();
  const [showDsl, setShowDsl] = useState(false);

  const isLoading = isSearching || isBulkImporting || isBulkExporting;

  return (
    <div className="flex flex-col border-b">
      {/* Top bar: index info + actions */}
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="truncate text-sm font-medium">{index}</div>
          <div className="text-xs text-muted-foreground">
            {currentIndex?.docsCount ?? total} docs
            {currentIndex?.storeSize ? ` · ${currentIndex.storeSize}` : ""}
            {tookMs ? ` · ${tookMs}ms` : ""}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showFieldList ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={onToggleFieldList}
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{showFieldList ? "Hide fields" : "Show fields"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showDocumentDetail ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={onToggleDocumentDetail}
                >
                  <PanelRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {showDocumentDetail
                    ? "Hide detail panel"
                    : "Show detail panel"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="w-px h-4 bg-border mx-1" />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={onRefresh}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("elasticsearch.actions.refresh")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={isBulkImporting}
                  onClick={onImport}
                >
                  {isBulkImporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("elasticsearch.actions.import")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={isBulkExporting}
                  onClick={onExport}
                >
                  {isBulkExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("elasticsearch.actions.export")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={isManagingIndex}
              >
                {isManagingIndex ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Table2 className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onManageIndex("open")}>
                <FolderOpen className="mr-2 h-4 w-4" />
                {t("elasticsearch.actions.openIndex")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onManageIndex("close")}>
                <Table2 className="mr-2 h-4 w-4" />
                {t("elasticsearch.actions.closeIndex")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onManageIndex("delete")}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("elasticsearch.actions.deleteIndex")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-3 pb-2 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-8 font-mono text-xs"
              placeholder={t("elasticsearch.search.placeholder")}
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSearch();
              }}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2"
            onClick={() => setShowDsl(!showDsl)}
          >
            DSL
            <ChevronDown
              className={`ml-1 h-3 w-3 transition-transform ${showDsl ? "rotate-180" : ""}`}
            />
          </Button>
          <Button
            size="sm"
            className="h-8"
            onClick={onSearch}
            disabled={isSearching}
          >
            {isSearching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            {t("elasticsearch.search.search")}
          </Button>
        </div>

        {showDsl && (
          <Textarea
            className="min-h-20 resize-none font-mono text-xs"
            placeholder={t("elasticsearch.search.dslPlaceholder")}
            value={dsl}
            onChange={(e) => onDslChange(e.target.value)}
          />
        )}
      </div>
    </div>
  );
}
