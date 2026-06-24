import {
  QueryResult,
  SqlExecutionLog,
  RedisCommandLog,
  ConnectionForm,
} from "../types";
import { COMMANDS } from "../commands";
import { mockTableData } from "./tableData";

// Dedicated dataset for querying "SELECT * FROM json_test" in mock mode.
// Covers every complex-type edge case in a single focused table.
export const mockComplexTypeData: QueryResult = {
  rowCount: 8,
  timeTakenMs: 12,
  success: true,
  columns: [
    { name: "id", type: "integer" },
    { name: "label", type: "text" },
    { name: "payload", type: "jsonb" },
    { name: "notes", type: "text" },
  ],
  data: [
    {
      id: 1,
      label: "flat object (2 keys)",
      payload: { name: "alice", age: 30 },
      notes: "inline JSON in cell",
    },
    {
      id: 2,
      label: "flat object (4+ keys)",
      payload: { id: 42, role: "admin", active: true, score: 99 },
      notes: "abbreviated as {id, role, ... +2}",
    },
    {
      id: 3,
      label: "nested object (3 levels)",
      payload: {
        user: {
          profile: { city: "Beijing", country: "CN" },
          prefs: { lang: "zh", theme: "dark" },
        },
        meta: { version: 2, flags: ["a", "b"] },
      },
      notes: "tree view shows recursive expand/collapse",
    },
    {
      id: 4,
      label: "array of primitives (10 items)",
      payload: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
      notes: "[10 items] in cell",
    },
    {
      id: 5,
      label: "array of objects (uniform shape)",
      payload: [
        { metric: "cpu", value: 72, unit: "%" },
        { metric: "mem", value: 48, unit: "%" },
        { metric: "disk", value: 91, unit: "%" },
      ],
      notes: "table view renders as multi-column table",
    },
    {
      id: 6,
      label: "mixed-type array",
      payload: ["text", 42, true, null, { nested: "obj" }, [1, 2]],
      notes: "table view falls back to index/value layout",
    },
    {
      id: 7,
      label: "empty containers",
      payload: {},
      notes: "verify {} and [] display correctly",
    },
    {
      id: 8,
      label: "null value",
      payload: null,
      notes: "should display NULL (italic), no expand icon",
    },
  ],
};

// Dedicated dataset for querying "SELECT * FROM pg_arrays" in mock mode.
// Simulates what PostgreSQL array columns look like after the backend fix.
export const mockArrayTypeData: QueryResult = {
  rowCount: 4,
  timeTakenMs: 8,
  success: true,
  columns: [
    { name: "id", type: "integer" },
    { name: "tags", type: "text[]" },
    { name: "scores", type: "int4[]" },
    { name: "flags", type: "bool[]" },
    { name: "readings", type: "float8[]" },
    { name: "metadata_list", type: "jsonb[]" },
  ],
  data: [
    {
      id: 1,
      tags: ["postgres", "arrays", "jsonb"],
      scores: [95, 87, 72],
      flags: [true, false, true],
      readings: [3.14, 2.72, 1.41],
      metadata_list: [
        { source: "web", valid: true },
        { source: "app", valid: false },
      ],
    },
    {
      id: 2,
      tags: ["empty-arrays-test"],
      scores: [],
      flags: [],
      readings: [],
      metadata_list: [],
    },
    {
      id: 3,
      tags: ["null-elements", null, "after-null"],
      scores: [1, null, 3],
      flags: [null, true],
      readings: [null, 9.99],
      metadata_list: [null, { key: "value" }],
    },
    {
      id: 4,
      tags: null,
      scores: null,
      flags: null,
      readings: null,
      metadata_list: null,
    },
  ],
};

export const mockQueryResult: QueryResult = {
  data: mockTableData.data,
  rowCount: 10,
  columns: [
    { name: "id", type: "integer" },
    { name: "username", type: "varchar" },
    { name: "email", type: "varchar" },
    { name: "password_hash", type: "varchar" },
    { name: "created_at", type: "timestamp" },
    { name: "updated_at", type: "timestamp" },
    { name: "metadata", type: "jsonb" },
    { name: "tags", type: "text[]" },
    { name: "settings", type: "jsonb" },
  ],
  timeTakenMs: 45,
  success: true,
};

export const mockMultipleResultSets: QueryResult = {
  data: [],
  rowCount: 0,
  columns: [],
  timeTakenMs: 120,
  success: true,
  resultSets: [
    {
      data: mockTableData.data.slice(0, 3),
      rowCount: 3,
      columns: [
        { name: "id", type: "integer" },
        { name: "username", type: "varchar" },
        { name: "email", type: "varchar" },
      ],
      index: 0,
      statement: "SELECT id, username, email FROM users LIMIT 3",
    },
    {
      data: mockTableData.data.slice(3, 6),
      rowCount: 3,
      columns: [
        { name: "id", type: "integer" },
        { name: "username", type: "varchar" },
        { name: "created_at", type: "timestamp" },
      ],
      index: 1,
      statement: "SELECT id, username, created_at FROM users LIMIT 3 OFFSET 3",
    },
    {
      data: mockTableData.data.slice(6, 8),
      rowCount: 2,
      columns: [
        { name: "id", type: "integer" },
        { name: "email", type: "varchar" },
      ],
      index: 2,
      statement: "SELECT id, email FROM users LIMIT 2 OFFSET 6",
    },
  ],
};

let mockSqlExecutionLogId = 1;
const mockSqlExecutionLogs: SqlExecutionLog[] = [];

function appendSqlExecutionLog(params: {
  sql: string;
  source?: string;
  connectionId?: number;
  database?: string;
  success: boolean;
  error?: string;
}) {
  mockSqlExecutionLogs.unshift({
    id: mockSqlExecutionLogId++,
    sql: params.sql,
    source: params.source || "unknown",
    connectionId: params.connectionId ?? null,
    database: params.database ?? null,
    success: params.success,
    error: params.error ?? null,
    executedAt: new Date().toISOString(),
  });

  if (mockSqlExecutionLogs.length > 100) {
    mockSqlExecutionLogs.length = 100;
  }
}

const mockRedisCommandLogs: RedisCommandLog[] = [];

export async function mockListRedisCommandLogs(
  limit?: number,
): Promise<RedisCommandLog[]> {
  const safeLimit = Math.min(Math.max(limit ?? 100, 1), 100);
  return mockRedisCommandLogs.slice(0, safeLimit);
}

/**
 * Mock query execution
 */
export async function mockExecuteQuery(
  id: number,
  query: string,
  database?: string,
  source?: string,
): Promise<QueryResult> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 100));

  const lower = query.toLowerCase();
  const failed = lower.includes("invalid") || lower.includes("error");
  if (failed) {
    const error = "Mock query execution failed";
    appendSqlExecutionLog({
      sql: query,
      source: source || "unknown",
      connectionId: id,
      database,
      success: false,
      error,
    });
    throw new Error(error);
  }

  // Check if query contains multiple statements (separated by semicolons)
  const statements = query
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const hasMultipleStatements = statements.length > 1;

  // Return different data based on query type
  if (lower.includes("select")) {
    // Check for multiple result sets request
    if (hasMultipleStatements || lower.includes("multiple")) {
      appendSqlExecutionLog({
        sql: query,
        source: source || "unknown",
        connectionId: id,
        database,
        success: true,
      });
      return mockMultipleResultSets;
    }

    // Dedicated array-type dataset: SELECT * FROM pg_arrays
    const isArrayQuery = lower.includes("pg_arrays") || lower.includes("array");
    // Dedicated complex-type dataset: SELECT * FROM json_test
    const isComplexQuery =
      !isArrayQuery &&
      (lower.includes("json_test") ||
        lower.includes("json") ||
        lower.includes("jsonb") ||
        lower.includes("complex"));
    const result = {
      ...(isArrayQuery
        ? mockArrayTypeData
        : isComplexQuery
          ? mockComplexTypeData
          : mockQueryResult),
      timeTakenMs: Math.floor(Math.random() * 100) + 20,
    };
    appendSqlExecutionLog({
      sql: query,
      source: source || "unknown",
      connectionId: id,
      database,
      success: true,
    });
    return result;
  }

  const result = {
    data: [],
    rowCount: 0,
    columns: [],
    timeTakenMs: Math.floor(Math.random() * 50) + 10,
    success: true,
  };
  appendSqlExecutionLog({
    sql: query,
    source: source || "unknown",
    connectionId: id,
    database,
    success: true,
  });
  return result;
}

/**
 * Mock query cancellation
 */
export async function mockCancelQuery(
  _uuid: string,
  _queryId: string,
): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return true;
}

/**
 * Mock query execution by connection info
 */
export async function mockExecuteByConn(
  form: ConnectionForm,
  sql: string,
): Promise<QueryResult> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  appendSqlExecutionLog({
    sql,
    source: "execute_by_conn",
    database: form.database,
    success: true,
  });
  return mockQueryResult;
}

export async function mockListSqlExecutionLogs(
  limit = 100,
): Promise<SqlExecutionLog[]> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  const safeLimit = Math.max(1, Math.min(100, limit));
  return mockSqlExecutionLogs.slice(0, safeLimit);
}

export function handleQuery(cmd: string, args?: any): Promise<any> | null {
  switch (cmd) {
    case COMMANDS.EXECUTE_QUERY:
      return mockExecuteQuery(args.id, args.query, args.database, args.source);
    case COMMANDS.CANCEL_QUERY:
      return mockCancelQuery(args.uuid, args.queryId);
    case COMMANDS.EXECUTE_BY_CONN:
      return mockExecuteByConn(args.form, args.sql);
    case COMMANDS.LIST_SQL_EXECUTION_LOGS:
      return mockListSqlExecutionLogs(args?.limit);
    case COMMANDS.LIST_REDIS_COMMAND_LOGS:
      return mockListRedisCommandLogs(args?.limit);
    default:
      return null;
  }
}
