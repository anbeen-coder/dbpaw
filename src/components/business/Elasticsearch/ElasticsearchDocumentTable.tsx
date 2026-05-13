import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/components/ui/utils";
import type {
  ElasticsearchDocumentTableProps,
  ElasticsearchSort,
} from "./types";

const PAGE_SIZE_OPTIONS = ["10", "20", "50", "100", "200"] as const;

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function ElasticsearchDocumentTable({
  hits,
  total,
  from,
  pageSize,
  isLoading,
  selectedHit,
  sort,
  visibleColumns,
  onHitSelect,
  onPageChange,
  onPageSizeChange,
  onSortChange,
}: ElasticsearchDocumentTableProps) {
  const { t } = useTranslation();

  const page = Math.floor(from / pageSize) + 1;
  const totalPages = Math.ceil(total / pageSize);
  const canPrev = from > 0;
  const canNext = from + pageSize < total;

  const displayColumns = useMemo(() => {
    return visibleColumns.length > 0
      ? visibleColumns
      : ["_id", "_score", "_source"];
  }, [visibleColumns]);

  const handleSort = (column: string) => {
    if (column === "_source") return;

    const newDirection =
      sort.field === column && sort.direction === "asc" ? "desc" : "asc";

    onSortChange({
      field: column as ElasticsearchSort["field"],
      direction: newDirection,
    });
  };

  const getSortIcon = (column: string) => {
    if (sort.field !== column) {
      return <ChevronsUpDown className="h-3 w-3 opacity-50" />;
    }
    return sort.direction === "asc" ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    );
  };

  const renderCellValue = (hit: (typeof hits)[0], column: string) => {
    if (column === "_id") return hit.id;
    if (column === "_score") return hit.score ?? "-";
    if (column === "_source") {
      const source = hit.source;
      if (!source || typeof source !== "object") return "";
      const entries = Object.entries(source).slice(0, 4);
      return entries
        .map(([key, value]) => {
          const rendered =
            typeof value === "object" && value !== null
              ? JSON.stringify(value)
              : String(value);
          return `${key}: ${rendered}`;
        })
        .join(" · ");
    }

    if (hit.source && typeof hit.source === "object") {
      const parts = column.split(".");
      let value: unknown = hit.source;
      for (const part of parts) {
        if (value && typeof value === "object") {
          value = (value as Record<string, unknown>)[part];
        } else {
          value = undefined;
          break;
        }
      }
      return formatCellValue(value);
    }

    return "";
  };

  if (isLoading && hits.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Table */}
      <ScrollArea className="flex-1">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              {displayColumns.map((column) => (
                <TableHead
                  key={column}
                  className={cn(
                    "h-8 text-xs font-medium",
                    column !== "_source" && "cursor-pointer select-none",
                    column === "_id" && "w-[180px]",
                    column === "_score" && "w-[80px]",
                  )}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center gap-1">
                    <span>{column}</span>
                    {column !== "_source" && getSortIcon(column)}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {hits.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={displayColumns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("elasticsearch.documents.noDocuments")}
                </TableCell>
              </TableRow>
            ) : (
              hits.map((hit) => (
                <TableRow
                  key={`${hit.index}:${hit.id}`}
                  className={cn(
                    "cursor-pointer",
                    selectedHit?.id === hit.id && "bg-muted/50",
                  )}
                  onClick={() => onHitSelect(hit)}
                >
                  {displayColumns.map((column) => (
                    <TableCell
                      key={column}
                      className={cn(
                        "text-xs py-2",
                        column === "_id" && "font-mono",
                        column === "_source" &&
                          "max-w-[300px] truncate text-muted-foreground",
                      )}
                    >
                      {renderCellValue(hit, column)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t px-3 py-2">
        <div className="text-xs text-muted-foreground">
          {t("elasticsearch.documents.showing", {
            from: from + 1,
            to: Math.min(from + pageSize, total),
            total,
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">
              {t("elasticsearch.documents.limit")}
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-7 w-[70px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={size} className="text-xs">
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1 bg-muted/40 rounded-md p-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              disabled={!canPrev || isLoading}
              onClick={() => onPageChange(Math.max(0, from - pageSize))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <div className="flex items-center gap-1 px-1">
              <span className="text-xs text-muted-foreground">
                {t("elasticsearch.documents.page")}
              </span>
              <span className="text-xs font-medium">{page}</span>
              <span className="text-xs text-muted-foreground">
                {t("elasticsearch.documents.of")}
              </span>
              <span className="text-xs font-medium">{totalPages}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              disabled={!canNext || isLoading}
              onClick={() => onPageChange(from + pageSize)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
