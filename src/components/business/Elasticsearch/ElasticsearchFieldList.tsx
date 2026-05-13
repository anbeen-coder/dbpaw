import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search } from "lucide-react";
import type { ElasticsearchFieldListProps } from "./types";

export function ElasticsearchFieldList({
  fields,
  selectedField,
  isLoading,
  visibleColumns,
  onFieldSelect,
  onFieldToggle,
}: ElasticsearchFieldListProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("");

  const filteredFields = useMemo(() => {
    if (!filter.trim()) return fields;
    const lowerFilter = filter.toLowerCase();
    return fields.filter(
      (field) =>
        field.name.toLowerCase().includes(lowerFilter) ||
        field.type?.toLowerCase().includes(lowerFilter),
    );
  }, [fields, filter]);

  const defaultFields = ["_id", "_score", "_source"];

  const isVisible = (fieldName: string) => visibleColumns.includes(fieldName);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b px-3 py-2">
          <div className="text-sm font-medium">
            {t("elasticsearch.fields.title")}
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-3 py-2">
        <div className="text-sm font-medium">
          {t("elasticsearch.fields.title")}
        </div>
      </div>

      <div className="px-3 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-7 pl-7 text-xs"
            placeholder={t("elasticsearch.fields.search")}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-3 py-1">
          {/* Default fields */}
          {defaultFields.map((fieldName) => (
            <div
              key={fieldName}
              className={`flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs cursor-pointer hover:bg-muted/50 ${
                selectedField === fieldName ? "bg-muted" : ""
              }`}
              onClick={() => onFieldSelect(fieldName)}
            >
              <Checkbox
                checked={isVisible(fieldName)}
                onCheckedChange={() => onFieldToggle(fieldName)}
                onClick={(e) => e.stopPropagation()}
                className="h-3.5 w-3.5"
              />
              <span className="font-mono truncate flex-1">{fieldName}</span>
              <span className="text-muted-foreground">default</span>
            </div>
          ))}

          {/* Mapping fields */}
          {filteredFields.map((field) => (
            <div
              key={field.name}
              className={`flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs cursor-pointer hover:bg-muted/50 ${
                selectedField === field.name ? "bg-muted" : ""
              }`}
              onClick={() => onFieldSelect(field.name)}
            >
              <Checkbox
                checked={isVisible(field.name)}
                onCheckedChange={() => onFieldToggle(field.name)}
                onClick={(e) => e.stopPropagation()}
                className="h-3.5 w-3.5"
              />
              <span className="font-mono truncate flex-1">{field.name}</span>
              {field.type && (
                <span className="text-muted-foreground text-[10px]">
                  {field.type}
                </span>
              )}
            </div>
          ))}

          {filteredFields.length === 0 && filter && (
            <div className="px-2 py-4 text-center text-xs text-muted-foreground">
              {t("elasticsearch.fields.noFields")}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
