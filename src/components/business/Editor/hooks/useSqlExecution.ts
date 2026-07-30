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
import { useSqlRiskConfirmation } from "./useSqlRiskConfirmation";

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
  const { pendingConfirmation, review, confirmPending, cancelPending } =
    useSqlRiskConfirmation(t);

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  useEffect(() => {
    const pending = pendingConfirmation;
    if (!pending) return;
    const tab = tabs.find((item) => item.id === pending.snapshot.tabId);
    if (!isSnapshotContextCurrent(tab, pending.snapshot)) {
      cancelPending();
    }
  }, [cancelPending, pendingConfirmation, tabs]);

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

      const candidate: ExecutionSnapshot = {
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
        startedAt: 0,
      };

      inFlightTabsRef.current.add(tabId);
      try {
        const confirmed = await review(candidate);
        if (!confirmed) return;

        const currentTab = tabsRef.current.find((item) => item.id === tabId);
        if (
          !isSnapshotContextCurrent(currentTab, candidate) ||
          (currentTab?.type === "editor" && currentTab.activeExecution)
        ) {
          toast.info(t("sqlEditor.risk.contextChanged"));
          return;
        }

        const snapshot = {
          ...candidate,
          startedAt: performance.now(),
        };
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
        }
      } finally {
        inFlightTabsRef.current.delete(tabId);
      }
    },
    [dispatch, review, t],
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

  return {
    execute,
    cancel,
    pendingRiskConfirmation: pendingConfirmation,
    confirmRiskExecution: confirmPending,
    cancelRiskExecution: cancelPending,
  };
}

function isSnapshotContextCurrent(
  tab: TabItem | undefined,
  snapshot: ExecutionSnapshot,
) {
  return (
    !!tab &&
    tab.type === "editor" &&
    tab.connectionId === snapshot.context.connectionId &&
    tab.database === snapshot.context.database &&
    tab.currentSchema === snapshot.context.schema &&
    (tab.contextRevision ?? 0) === snapshot.context.contextRevision &&
    (tab.documentRevision ?? 0) === snapshot.documentRevision
  );
}
