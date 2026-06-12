import { useTranslation } from "react-i18next";
import {
  ArrowUpDown,
  ArrowDownToLine,
  ArrowUpFromLine,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ZSetToolbarProps {
  memberCount: number;
  sortAsc: boolean;
  onToggleSort: () => void;
  showQueryPanel: boolean;
  hasQueryCapability: boolean;
  onToggleQuery: () => void;
  onAddNew: () => void;
  showNewRow: boolean;
  hasPopCapability: boolean;
  onPopMin: () => void;
  onPopMax: () => void;
  valueEmpty: boolean;
}

export function ZSetToolbar({
  memberCount,
  sortAsc,
  onToggleSort,
  showQueryPanel,
  hasQueryCapability,
  onToggleQuery,
  onAddNew,
  showNewRow,
  hasPopCapability,
  onPopMin,
  onPopMax,
  valueEmpty,
}: ZSetToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">
        {t("redis.zset.memberCount", { count: memberCount })}
      </span>
      <div className="flex gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-7"
          onClick={onToggleSort}
        >
          <ArrowUpDown className="w-3 h-3 mr-1" />
          {t("redis.zset.scoreSort", { direction: sortAsc ? "↑" : "↓" })}
        </Button>
        {hasQueryCapability && (
          <Button
            variant={showQueryPanel ? "secondary" : "outline"}
            size="sm"
            className="h-7"
            onClick={onToggleQuery}
          >
            <SlidersHorizontal className="w-3 h-3 mr-1" />
            {t("redis.zset.query")}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-7"
          onClick={onAddNew}
          disabled={showNewRow}
        >
          <Plus className="w-3 h-3 mr-1" />
          {t("redis.zset.addMember")}
        </Button>
        {hasPopCapability && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-destructive hover:text-destructive"
              onClick={onPopMin}
              disabled={valueEmpty}
              title={t("redis.zset.popMinTitle")}
            >
              <ArrowDownToLine className="w-3 h-3 mr-1" />
              {t("redis.zset.popMin")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-destructive hover:text-destructive"
              onClick={onPopMax}
              disabled={valueEmpty}
              title={t("redis.zset.popMaxTitle")}
            >
              <ArrowUpFromLine className="w-3 h-3 mr-1" />
              {t("redis.zset.popMax")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
