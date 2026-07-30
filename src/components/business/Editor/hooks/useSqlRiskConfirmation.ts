import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api, type SqlRiskAnalysis } from "@/services/api";
import { parseError } from "@/lib/errors";
import type { ExecutionSnapshot } from "@/lib/queryExecutionState";

export interface PendingSqlRiskConfirmation {
  analysis: SqlRiskAnalysis;
  snapshot: ExecutionSnapshot;
}

export function useSqlRiskConfirmation(
  t: (key: string) => string,
) {
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingSqlRiskConfirmation | null>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);
  const reviewInProgressRef = useRef(false);

  const resolvePending = useCallback((confirmed: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setPendingConfirmation(null);
    resolve?.(confirmed);
  }, []);

  useEffect(
    () => () => {
      resolverRef.current?.(false);
      resolverRef.current = null;
    },
    [],
  );

  const review = useCallback(
    async (snapshot: ExecutionSnapshot) => {
      if (reviewInProgressRef.current) return false;
      reviewInProgressRef.current = true;
      try {
        const analysis = await api.query.analyzeRisk(snapshot.sql);
        if (!analysis.requiresConfirmation) return true;

        return await new Promise<boolean>((resolve) => {
          resolverRef.current = resolve;
          setPendingConfirmation({ analysis, snapshot });
        });
      } catch (error) {
        toast.error(t("sqlEditor.risk.analysisFailed"), {
          description: parseError(error).message,
        });
        return false;
      } finally {
        reviewInProgressRef.current = false;
      }
    },
    [t],
  );
  const confirmPending = useCallback(
    () => resolvePending(true),
    [resolvePending],
  );
  const cancelPending = useCallback(
    () => resolvePending(false),
    [resolvePending],
  );

  return {
    pendingConfirmation,
    review,
    confirmPending,
    cancelPending,
  };
}
