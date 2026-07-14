import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, type LucideIcon } from "lucide-react";
import type { SingleResultState } from "@/lib/queryExecutionState";

const EMPTY_RESULT_SETS: SingleResultState[] = [];

export interface SqlResultsData {
  data: any[];
  columns: string[];
  executionTime?: string;
  error?: string;
  resultSets?: SingleResultState[];
  activeResultSetIndex?: number;
}

export interface SqlResultStatus {
  text: string;
  toneClass: string;
  Icon: LucideIcon;
}

export interface VisibleResultSet {
  originalIndex: number;
  resultSet: SingleResultState;
}

export function useSqlResults(props: { queryResults?: SqlResultsData | null }) {
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
    if (queryResults.error) {
      return {
        text: t("sqlEditor.result.failed"),
        toneClass: "text-destructive",
        Icon: XCircle,
      };
    }

    const hasMultipleResults =
      queryResults.resultSets && queryResults.resultSets.length > 1;
    if (hasMultipleResults) {
      const totalRows = queryResults.resultSets!.reduce(
        (sum, rs) => sum + rs.rowCount,
        0,
      );
      return {
        text: `${t("sqlEditor.result.success")} ${queryResults.resultSets!.length} results (${totalRows} rows)`,
        toneClass: "text-emerald-600 dark:text-emerald-400",
        Icon: CheckCircle2,
      };
    }

    const returnedRows = queryResults.data.length;
    const hasResultSet = queryResults.columns.length > 0;
    const suffix = hasResultSet
      ? returnedRows === 1
        ? t("sqlEditor.result.rowsSuffix", { count: returnedRows })
        : t("sqlEditor.result.rowsSuffixPlural", { count: returnedRows })
      : "";

    return {
      text: `${t("sqlEditor.result.success")}${suffix}`,
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

  const currentResultSet = useMemo((): SingleResultState | null => {
    if (!queryResults) return null;
    if (resultSets.length > 0) {
      return resultSets[effectiveActiveResultSetIndex] || null;
    }
    return null;
  }, [effectiveActiveResultSetIndex, queryResults, resultSets]);

  const displayData = currentResultSet?.data ?? queryResults?.data ?? [];
  const displayColumns =
    currentResultSet?.columns ?? queryResults?.columns ?? [];

  return {
    resultStatus,
    displayData,
    displayColumns,
    hasMultipleResults,
    hasVisibleResults:
      !!queryResults &&
      (resultSets.length === 0 || visibleResultSets.length > 0),
    visibleResultSets,
    activeResultSetIndex: effectiveActiveResultSetIndex,
    setActiveResultSetIndex,
    closeResultSet,
    currentResultSet,
  };
}
