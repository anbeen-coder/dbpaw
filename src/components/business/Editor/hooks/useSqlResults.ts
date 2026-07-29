import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  CircleStop,
  TriangleAlert,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type {
  QueryResultState,
  SingleResultState,
} from "@/lib/queryExecutionState";

const EMPTY_RESULT_SETS: SingleResultState[] = [];

export interface SqlResultStatus {
  text: string;
  toneClass: string;
  Icon: LucideIcon;
}

export interface VisibleResultSet {
  originalIndex: number;
  resultSet: SingleResultState;
}

export function useSqlResults(props: {
  queryResults?: QueryResultState | null;
}) {
  const { queryResults } = props;
  const { t } = useTranslation();
  const [activeResultSetIndex, setActiveResultSetIndex] = useState(
    queryResults?.activeResultSetIndex ?? 0,
  );
  const [closedResultSetIndexes, setClosedResultSetIndexes] = useState<
    Set<number>
  >(() => new Set());

  useEffect(() => {
    setClosedResultSetIndexes((previous) =>
      previous.size === 0 ? previous : new Set(),
    );
    setActiveResultSetIndex(queryResults?.activeResultSetIndex ?? 0);
  }, [queryResults]);

  const resultStatus = useMemo((): SqlResultStatus | null => {
    if (!queryResults) return null;
    const time = queryResults.executionTimeMs;
    if (queryResults.status === "cancelled") {
      return {
        text: t("sqlEditor.result.cancelled", { time }),
        toneClass: "text-muted-foreground",
        Icon: CircleStop,
      };
    }
    if (
      queryResults.status === "error" ||
      (!queryResults.status && queryResults.error)
    ) {
      return {
        text: t("sqlEditor.result.failedWithTime", { time }),
        toneClass: "text-destructive",
        Icon: XCircle,
      };
    }
    if (queryResults.status === "partial_error") {
      const completed = queryResults.resultSets?.filter(
        (item) => !item.error,
      ).length;
      return {
        text: t("sqlEditor.result.partialError", { completed, time }),
        toneClass: "text-amber-600 dark:text-amber-400",
        Icon: TriangleAlert,
      };
    }
    const text =
      queryResults.columns.length > 0
        ? t("sqlEditor.result.rowsReturned", {
            count: queryResults.rowCount,
            time,
          })
        : queryResults.rowCount > 0
          ? t("sqlEditor.result.rowsAffected", {
              count: queryResults.rowCount,
              time,
            })
          : t("sqlEditor.result.commandCompleted", { time });
    return {
      text,
      toneClass: "text-emerald-600 dark:text-emerald-400",
      Icon: CheckCircle2,
    };
  }, [queryResults, t]);

  const resultSets = queryResults?.resultSets ?? EMPTY_RESULT_SETS;
  const hasMultipleResults = resultSets.length > 1;
  const visibleResultSets = useMemo<VisibleResultSet[]>(
    () =>
      resultSets.flatMap((resultSet, originalIndex) =>
        closedResultSetIndexes.has(originalIndex)
          ? []
          : [{ originalIndex, resultSet }],
      ),
    [closedResultSetIndexes, resultSets],
  );
  const effectiveActiveResultSetIndex = visibleResultSets.some(
    ({ originalIndex }) => originalIndex === activeResultSetIndex,
  )
    ? activeResultSetIndex
    : (visibleResultSets[0]?.originalIndex ?? 0);

  const closeResultSet = useCallback(
    (index: number) => {
      const closingPosition = visibleResultSets.findIndex(
        ({ originalIndex }) => originalIndex === index,
      );
      if (closingPosition === -1) return;
      setClosedResultSetIndexes((previous) => {
        if (previous.has(index)) return previous;
        const next = new Set(previous);
        next.add(index);
        return next;
      });
      if (index === effectiveActiveResultSetIndex) {
        const nextActive =
          visibleResultSets[closingPosition + 1] ??
          visibleResultSets[closingPosition - 1];
        setActiveResultSetIndex(nextActive?.originalIndex ?? 0);
      }
    },
    [effectiveActiveResultSetIndex, visibleResultSets],
  );

  const currentResultSet = resultSets[effectiveActiveResultSetIndex] ?? null;
  return {
    resultStatus,
    displayData: currentResultSet?.data ?? queryResults?.data ?? [],
    displayColumns: currentResultSet?.columns ?? queryResults?.columns ?? [],
    hasMultipleResults,
    hasVisibleResults:
      !!queryResults &&
      queryResults.status !== "cancelled" &&
      (resultSets.length === 0 || visibleResultSets.length > 0),
    visibleResultSets,
    activeResultSetIndex: effectiveActiveResultSetIndex,
    setActiveResultSetIndex,
    closeResultSet,
    currentResultSet,
  };
}
