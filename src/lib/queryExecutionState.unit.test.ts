import { describe, expect, it } from "bun:test";
import {
  makeRejectedQueryResult,
  normalizeResolvedQuery,
  reduceQueryExecutionState,
  type ExecutionSnapshot,
  type QueryExecutionState,
  type QueryResultState,
} from "./queryExecutionState";

const snapshot = (
  overrides: Partial<ExecutionSnapshot> = {},
): ExecutionSnapshot => ({
  executionId: "query-A",
  tabId: "tab-1",
  target: "document",
  sql: "SELECT 1",
  context: {
    connectionId: 1,
    database: "db",
    schema: "public",
    driver: "postgres",
    contextRevision: 3,
  },
  documentRevision: 5,
  startedAt: 10,
  ...overrides,
});

const completed = (
  source = snapshot(),
  status: QueryResultState["status"] = "success",
): QueryResultState => ({
  snapshot: source,
  status,
  data: [{ value: 1 }],
  columns: ["value"],
  rowCount: 1,
  executionTimeMs: 12,
});

const initial = (): QueryExecutionState => ({
  contextRevision: 3,
  queryResults: null,
});

describe("reduceQueryExecutionState", () => {
  it("starts one immutable execution and rejects a concurrent start", () => {
    const started = reduceQueryExecutionState(initial(), {
      type: "START",
      snapshot: snapshot(),
    });
    const second = reduceQueryExecutionState(started, {
      type: "START",
      snapshot: snapshot({ executionId: "query-B" }),
    });
    expect(started.activeExecution?.snapshot.sql).toBe("SELECT 1");
    expect(second).toBe(started);
  });

  it("accepts only the matching execution and context revision", () => {
    const started = reduceQueryExecutionState(initial(), {
      type: "START",
      snapshot: snapshot(),
    });
    const staleId = reduceQueryExecutionState(started, {
      type: "RESOLVED",
      executionId: "query-B",
      contextRevision: 3,
      result: completed(),
    });
    const staleContext = reduceQueryExecutionState(started, {
      type: "RESOLVED",
      executionId: "query-A",
      contextRevision: 2,
      result: completed(),
    });
    const accepted = reduceQueryExecutionState(started, {
      type: "RESOLVED",
      executionId: "query-A",
      contextRevision: 3,
      result: completed(),
    });
    expect(staleId).toBe(started);
    expect(staleContext).toBe(started);
    expect(accepted.activeExecution).toBeUndefined();
    expect(accepted.queryResults?.rowCount).toBe(1);
  });

  it("invalidates an active execution while retaining prior results", () => {
    const old = completed();
    const started = reduceQueryExecutionState(
      { ...initial(), queryResults: old },
      { type: "START", snapshot: snapshot() },
    );
    const changed = reduceQueryExecutionState(started, {
      type: "CONTEXT_CHANGED",
      contextRevision: 4,
    });
    expect(changed.contextRevision).toBe(4);
    expect(changed.activeExecution).toBeUndefined();
    expect(changed.queryResults).toBe(old);
  });

  it("buffers completion while cancelling and discards it on confirmation", () => {
    let state = reduceQueryExecutionState(initial(), {
      type: "START",
      snapshot: snapshot(),
    });
    state = reduceQueryExecutionState(state, {
      type: "CANCEL_REQUESTED",
      executionId: "query-A",
    });
    state = reduceQueryExecutionState(state, {
      type: "RESOLVED",
      executionId: "query-A",
      contextRevision: 3,
      result: completed(),
    });
    expect(state.activeExecution?.pendingResult?.status).toBe("success");
    state = reduceQueryExecutionState(state, {
      type: "CANCEL_CONFIRMED",
      executionId: "query-A",
      elapsedMs: 21,
    });
    expect(state.queryResults?.status).toBe("cancelled");
    expect(state.queryResults?.executionTimeMs).toBe(21);
  });

  it("replays buffered completion when cancellation fails", () => {
    let state = reduceQueryExecutionState(initial(), {
      type: "START",
      snapshot: snapshot(),
    });
    state = reduceQueryExecutionState(state, {
      type: "CANCEL_REQUESTED",
      executionId: "query-A",
    });
    state = reduceQueryExecutionState(state, {
      type: "REJECTED",
      executionId: "query-A",
      contextRevision: 3,
      result: completed(snapshot(), "error"),
    });
    state = reduceQueryExecutionState(state, {
      type: "CANCEL_FAILED",
      executionId: "query-A",
    });
    expect(state.activeExecution).toBeUndefined();
    expect(state.queryResults?.status).toBe("error");
  });

  it("returns to running when cancellation fails before completion", () => {
    let state = reduceQueryExecutionState(initial(), {
      type: "START",
      snapshot: snapshot(),
    });
    state = reduceQueryExecutionState(state, {
      type: "CANCEL_REQUESTED",
      executionId: "query-A",
    });
    state = reduceQueryExecutionState(state, {
      type: "CANCEL_FAILED",
      executionId: "query-A",
    });
    expect(state.activeExecution?.status).toBe("running");
  });

  it("ignores duplicate, stale cancellation, and no-op context events", () => {
    const idle = initial();
    const started = reduceQueryExecutionState(idle, {
      type: "START",
      snapshot: snapshot(),
    });
    const cancelling = reduceQueryExecutionState(started, {
      type: "CANCEL_REQUESTED",
      executionId: "query-A",
    });

    expect(
      reduceQueryExecutionState(cancelling, {
        type: "CANCEL_REQUESTED",
        executionId: "query-A",
      }),
    ).toBe(cancelling);
    expect(
      reduceQueryExecutionState(started, {
        type: "CANCEL_CONFIRMED",
        executionId: "query-B",
        elapsedMs: 1,
      }),
    ).toBe(started);
    expect(
      reduceQueryExecutionState(started, {
        type: "CANCEL_FAILED",
        executionId: "query-B",
      }),
    ).toBe(started);
    expect(
      reduceQueryExecutionState(idle, {
        type: "CONTEXT_CHANGED",
        contextRevision: 3,
      }),
    ).toBe(idle);
  });
});

describe("query result normalization", () => {
  const execution = {
    queryId: "query-A",
    originalSql: "SELECT 1",
    executedSql: "SELECT 1 LIMIT 1000",
    defaultLimitApplied: true,
    defaultLimit: 1000,
  };

  it("normalizes a successful response with numeric timing and row count", () => {
    const result = normalizeResolvedQuery(snapshot(), {
      data: [{ value: 1 }],
      columns: [{ name: "value", type: "int" }],
      rowCount: 1,
      timeTakenMs: 12.4,
      success: true,
      execution,
    });
    expect(result.status).toBe("success");
    expect(result.columns).toEqual(["value"]);
    expect(result.executionTimeMs).toBe(12);
    expect(result.execution?.defaultLimitApplied).toBe(true);
  });

  it("preserves successful result sets and appends an error result", () => {
    const result = normalizeResolvedQuery(snapshot(), {
      data: [],
      columns: [],
      rowCount: 0,
      timeTakenMs: 20,
      success: false,
      error: "statement 2 failed",
      resultSets: [
        {
          data: [{ value: 1 }],
          columns: [{ name: "value", type: "int" }],
          rowCount: 1,
          index: 0,
          statement: "SELECT 1",
        },
      ],
      execution,
    });
    expect(result.status).toBe("partial_error");
    expect(result.resultSets).toHaveLength(2);
    expect(result.resultSets?.[1].error?.category).toBe("query");
  });

  it("normalizes unsuccessful and thrown responses as errors", () => {
    const resolved = normalizeResolvedQuery(snapshot(), {
      data: [],
      columns: [],
      rowCount: 0,
      timeTakenMs: 3,
      success: false,
      error: "bad SQL",
      execution,
    });
    const rejected = makeRejectedQueryResult(
      snapshot(),
      {
        code: 2001,
        message: "syntax error",
        hint: "check SQL",
        category: "query",
      },
      4.7,
    );
    expect(resolved.status).toBe("error");
    expect(resolved.error?.message).toBe("bad SQL");
    expect(rejected.executionTimeMs).toBe(5);
    expect(rejected.error?.hint).toBe("check SQL");
  });
});
