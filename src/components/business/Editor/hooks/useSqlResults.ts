import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, type LucideIcon } from "lucide-react";
import type { SingleResultState } from "@/lib/queryExecutionState";

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

export function useSqlResults(props: { queryResults?: SqlResultsData | null }) {
  const { queryResults } = props;
  const { t } = useTranslation();
  const [activeResultSetIndex, setActiveResultSetIndex] = useState(0);

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

  const hasMultipleResults =
    queryResults?.resultSets && queryResults.resultSets.length > 1;

  const currentResultSet = useMemo((): SingleResultState | null => {
    if (!queryResults) return null;
    if (hasMultipleResults && queryResults.resultSets) {
      return queryResults.resultSets[activeResultSetIndex] || null;
    }
    return null;
  }, [queryResults, hasMultipleResults, activeResultSetIndex]);

  const displayData = currentResultSet?.data ?? queryResults?.data ?? [];
  const displayColumns =
    currentResultSet?.columns ?? queryResults?.columns ?? [];

  return {
    resultStatus,
    displayData,
    displayColumns,
    hasMultipleResults: !!hasMultipleResults,
    activeResultSetIndex,
    setActiveResultSetIndex,
    currentResultSet,
  };
}
