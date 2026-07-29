import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { parseError } from "@/lib/errors";
import {
  makeRejectedQueryResult,
  normalizeResolvedQuery,
  reduceQueryExecutionState,
  type ExecutionSnapshot,
  type QueryExecutionEvent,
} from "@/lib/queryExecutionState";
import type { TabItem } from "@/types/tab";

export interface SqlExecutionTarget {
  sql: string;
  target: "selection" | "document";
  sourceRange?: { from: number; to: number };
}

interface UseSqlExecutionProps {
  tabs: TabItem[];
  setTabs: React.Dispatch<React.SetStateAction<TabItem[]>>;
  t: (key: string, options?: any) => string;
}

function nextExecutionId(connectionId: number) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `q-${connectionId}-${random}`;
}

export function useSqlExecution({ tabs, setTabs, t }: UseSqlExecutionProps) {
  const tabsRef = useRef(tabs);
  const inFlightTabsRef = useRef(new Set<string>());

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  const dispatch = useCallback(
    (tabId: string, event: QueryExecutionEvent) => {
      setTabs((previous) =>
        previous.map((item) => {
          if (item.id !== tabId || item.type !== "editor") return item;
          const next = reduceQueryExecutionState(
            {
              contextRevision: item.contextRevision ?? 0,
              activeExecution: item.activeExecution,
              queryResults: item.queryResults,
            },
            event,
          );
          if (
            next.contextRevision === (item.contextRevision ?? 0) &&
            next.activeExecution === item.activeExecution &&
            next.queryResults === item.queryResults
          ) {
            return item;
          }
          return { ...item, ...next };
        }),
      );
    },
    [setTabs],
  );

  const execute = useCallback(
    async (tabId: string, target: SqlExecutionTarget) => {
      const tab = tabsRef.current.find((item) => item.id === tabId);
      if (!tab || tab.type !== "editor" || !tab.connectionId || !tab.driver) {
        toast.info(t("app.error.selectConnectionFirst"));
        return;
      }
      if (
        tab.activeExecution ||
        inFlightTabsRef.current.has(tabId) ||
        !target.sql.trim()
      ) {
        return;
      }

      const snapshot: ExecutionSnapshot = {
        executionId: nextExecutionId(tab.connectionId),
        tabId,
        target: target.target,
        sql: target.sql,
        sourceRange: target.sourceRange,
        context: {
          connectionId: tab.connectionId,
          database: tab.database,
          schema: tab.currentSchema,
          driver: tab.driver,
          contextRevision: tab.contextRevision ?? 0,
        },
        documentRevision: tab.documentRevision ?? 0,
        startedAt: performance.now(),
      };

      inFlightTabsRef.current.add(tabId);
      dispatch(tabId, { type: "START", snapshot });
      try {
        const result = await api.query.execute(
          snapshot.context.connectionId,
          snapshot.sql,
          snapshot.context.database,
          "sql_editor",
          snapshot.executionId,
        );
        const normalized = normalizeResolvedQuery(snapshot, result);
        dispatch(tabId, {
          type: "RESOLVED",
          executionId: snapshot.executionId,
          contextRevision: snapshot.context.contextRevision,
          result: normalized,
        });
      } catch (error) {
        const parsed = parseError(error);
        console.error("execute_query failed:", parsed.message);
        dispatch(tabId, {
          type: "REJECTED",
          executionId: snapshot.executionId,
          contextRevision: snapshot.context.contextRevision,
          result: makeRejectedQueryResult(
            snapshot,
            parsed,
            performance.now() - snapshot.startedAt,
          ),
        });
      } finally {
        inFlightTabsRef.current.delete(tabId);
      }
    },
    [dispatch, t],
  );

  const cancel = useCallback(
    async (tabId: string) => {
      const tab = tabsRef.current.find((item) => item.id === tabId);
      if (
        !tab ||
        tab.type !== "editor" ||
        !tab.connectionId ||
        !tab.activeExecution ||
        tab.activeExecution.status === "cancelling"
      ) {
        return false;
      }
      const snapshot = tab.activeExecution.snapshot;
      dispatch(tabId, {
        type: "CANCEL_REQUESTED",
        executionId: snapshot.executionId,
      });
      try {
        const cancelled = await api.query.cancel(
          String(tab.connectionId),
          snapshot.executionId,
        );
        dispatch(
          tabId,
          cancelled
            ? {
                type: "CANCEL_CONFIRMED",
                executionId: snapshot.executionId,
                elapsedMs: performance.now() - snapshot.startedAt,
              }
            : {
                type: "CANCEL_FAILED",
                executionId: snapshot.executionId,
              },
        );
        if (!cancelled) {
          toast.info(t("sqlEditor.result.cancelUnavailable"));
        }
        return cancelled;
      } catch (error) {
        dispatch(tabId, {
          type: "CANCEL_FAILED",
          executionId: snapshot.executionId,
        });
        toast.error(t("sqlEditor.result.cancelFailed"), {
          description: parseError(error).message,
        });
        return false;
      }
    },
    [dispatch, t],
  );

  return { execute, cancel };
}
