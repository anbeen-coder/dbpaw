import type { ParsedError } from "@/lib/errors";
import type {
  QueryExecutionMetadata,
  QueryExecutionResult,
  QueryResult,
} from "@/services/types/sql";

export interface ExecutionContext {
  connectionId: number;
  database?: string;
  schema?: string;
  driver: string;
  contextRevision: number;
}

export interface ExecutionSnapshot {
  readonly executionId: string;
  readonly tabId: string;
  readonly target: "selection" | "document";
  readonly sql: string;
  readonly sourceRange?: {
    readonly from: number;
    readonly to: number;
  };
  readonly context: Readonly<ExecutionContext>;
  readonly documentRevision: number;
  readonly startedAt: number;
}

export type SingleResultState = {
  data: unknown[];
  columns: string[];
  rowCount: number;
  statement: string;
  index: number;
  error?: ParsedError;
};

export type QueryResultStatus =
  | "success"
  | "partial_error"
  | "error"
  | "cancelled";

export interface QueryResultState {
  snapshot: ExecutionSnapshot;
  status: QueryResultStatus;
  data: unknown[];
  columns: string[];
  rowCount: number;
  executionTimeMs: number;
  execution?: QueryExecutionMetadata;
  resultSets?: SingleResultState[];
  activeResultSetIndex?: number;
  error?: ParsedError;
}

export interface ActiveExecution {
  snapshot: ExecutionSnapshot;
  status: "running" | "cancelling";
  pendingResult?: QueryResultState;
}

export interface QueryExecutionState {
  contextRevision: number;
  activeExecution?: ActiveExecution;
  queryResults?: QueryResultState | null;
}

export type QueryExecutionEvent =
  | { type: "START"; snapshot: ExecutionSnapshot }
  | {
      type: "RESOLVED";
      executionId: string;
      contextRevision: number;
      result: QueryResultState;
    }
  | {
      type: "REJECTED";
      executionId: string;
      contextRevision: number;
      result: QueryResultState;
    }
  | { type: "CANCEL_REQUESTED"; executionId: string }
  | { type: "CANCEL_CONFIRMED"; executionId: string; elapsedMs: number }
  | { type: "CANCEL_FAILED"; executionId: string }
  | { type: "CONTEXT_CHANGED"; contextRevision: number };

export function reduceQueryExecutionState(
  state: QueryExecutionState,
  event: QueryExecutionEvent,
): QueryExecutionState {
  switch (event.type) {
    case "START":
      if (state.activeExecution) return state;
      return {
        ...state,
        activeExecution: { snapshot: event.snapshot, status: "running" },
      };

    case "RESOLVED":
    case "REJECTED": {
      const active = state.activeExecution;
      if (
        !active ||
        active.snapshot.executionId !== event.executionId ||
        active.snapshot.context.contextRevision !== event.contextRevision ||
        state.contextRevision !== event.contextRevision
      ) {
        return state;
      }
      if (active.status === "cancelling") {
        return {
          ...state,
          activeExecution: { ...active, pendingResult: event.result },
        };
      }
      return {
        ...state,
        activeExecution: undefined,
        queryResults: event.result,
      };
    }

    case "CANCEL_REQUESTED": {
      const active = state.activeExecution;
      if (
        !active ||
        active.snapshot.executionId !== event.executionId ||
        active.status === "cancelling"
      ) {
        return state;
      }
      return {
        ...state,
        activeExecution: { ...active, status: "cancelling" },
      };
    }

    case "CANCEL_CONFIRMED": {
      const active = state.activeExecution;
      if (!active || active.snapshot.executionId !== event.executionId) {
        return state;
      }
      return {
        ...state,
        activeExecution: undefined,
        queryResults: {
          snapshot: active.snapshot,
          status: "cancelled",
          data: [],
          columns: [],
          rowCount: 0,
          executionTimeMs: event.elapsedMs,
        },
      };
    }

    case "CANCEL_FAILED": {
      const active = state.activeExecution;
      if (!active || active.snapshot.executionId !== event.executionId) {
        return state;
      }
      if (active.pendingResult) {
        return {
          ...state,
          activeExecution: undefined,
          queryResults: active.pendingResult,
        };
      }
      return {
        ...state,
        activeExecution: {
          snapshot: active.snapshot,
          status: "running",
        },
      };
    }

    case "CONTEXT_CHANGED":
      if (
        state.contextRevision === event.contextRevision &&
        !state.activeExecution
      ) {
        return state;
      }
      return {
        ...state,
        contextRevision: event.contextRevision,
        activeExecution: undefined,
      };
  }
}

function columnsOf(result: Pick<QueryResult, "columns">): string[] {
  return (result.columns ?? []).map((column) => column.name);
}

function partialError(error: string | undefined): ParsedError {
  return {
    code: 0,
    message: error || "A SQL statement failed",
    category: "query",
  };
}

export function normalizeResolvedQuery(
  snapshot: ExecutionSnapshot,
  result: QueryExecutionResult,
): QueryResultState {
  const executionTimeMs = Math.max(0, Math.round(result.timeTakenMs ?? 0));
  const resultSets: SingleResultState[] | undefined = result.resultSets?.map(
    (item) => ({
      data: item.data,
      columns: columnsOf(item),
      rowCount: item.rowCount,
      statement: item.statement,
      index: item.index,
    }),
  );

  if (!result.success) {
    const error = partialError(result.error);
    if (resultSets?.length) {
      const nextIndex =
        Math.max(...resultSets.map((resultSet) => resultSet.index), -1) + 1;
      resultSets.push({
        data: [],
        columns: [],
        rowCount: 0,
        statement: "",
        index: nextIndex,
        error,
      });
      return {
        snapshot,
        status: "partial_error",
        data: result.data ?? [],
        columns: columnsOf(result),
        rowCount: result.rowCount ?? 0,
        executionTimeMs,
        execution: result.execution,
        resultSets,
        activeResultSetIndex: 0,
        error,
      };
    }
    return {
      snapshot,
      status: "error",
      data: [],
      columns: [],
      rowCount: 0,
      executionTimeMs,
      execution: result.execution,
      error,
    };
  }

  return {
    snapshot,
    status: "success",
    data: result.data ?? [],
    columns: columnsOf(result),
    rowCount: result.rowCount ?? 0,
    executionTimeMs,
    execution: result.execution,
    resultSets,
    activeResultSetIndex: resultSets?.length ? 0 : undefined,
  };
}

export function makeRejectedQueryResult(
  snapshot: ExecutionSnapshot,
  error: ParsedError,
  elapsedMs: number,
): QueryResultState {
  return {
    snapshot,
    status: "error",
    data: [],
    columns: [],
    rowCount: 0,
    executionTimeMs: Math.max(0, Math.round(elapsedMs)),
    error,
  };
}
