import { describe, expect, test, mock, beforeEach } from "bun:test";

let capturedCmd = "";
let capturedArgs: any = null;
let mockReturn: any = undefined;

mock.module("./core", () => ({
  invoke: async (cmd: string, args?: any) => {
    capturedCmd = cmd;
    capturedArgs = args;
    return mockReturn;
  },
}));

import { queryApi } from "./query";

const g = globalThis as any;

beforeEach(() => {
  g.window = { __TAURI_INTERNALS__: {} };
  capturedCmd = "";
  capturedArgs = null;
  mockReturn = undefined;
});

describe("queryApi.query.execute", () => {
  test("invokes execute_query with all params", async () => {
    const expected = { data: [], rowCount: 0, columns: [], timeTakenMs: 5, success: true };
    mockReturn = expected;

    const result = await queryApi.query.execute(42, "SELECT 1", "mydb", "sql_editor", "qid-1");

    expect(capturedCmd).toBe("execute_query");
    expect(capturedArgs).toEqual({
      id: 42,
      query: "SELECT 1",
      database: "mydb",
      source: "sql_editor",
      queryId: "qid-1",
    });
    expect(result).toBe(expected);
  });

  test("works with optional params omitted", async () => {
    mockReturn = { data: [], rowCount: 0, columns: [], timeTakenMs: 1, success: true };

    await queryApi.query.execute(1, "SELECT * FROM t");

    expect(capturedArgs).toEqual({
      id: 1,
      query: "SELECT * FROM t",
      database: undefined,
      source: undefined,
      queryId: undefined,
    });
  });
});

describe("queryApi.query.cancel", () => {
  test("invokes cancel_query with uuid and queryId", async () => {
    mockReturn = true;

    const result = await queryApi.query.cancel("uuid-abc", "qid-2");

    expect(capturedCmd).toBe("cancel_query");
    expect(capturedArgs).toEqual({ uuid: "uuid-abc", queryId: "qid-2" });
    expect(result).toBe(true);
  });
});

describe("queryApi.query.executeByConn", () => {
  test("invokes execute_by_conn with form and sql", async () => {
    const form = { driver: "postgres", host: "localhost", port: 5432 };
    mockReturn = { data: [], rowCount: 0, columns: [], timeTakenMs: 2, success: true };

    await queryApi.query.executeByConn(form as any, "SELECT 1");

    expect(capturedCmd).toBe("execute_by_conn");
    expect(capturedArgs).toEqual({ form, sql: "SELECT 1" });
  });
});

describe("queryApi.sqlLogs.list", () => {
  test("invokes list_sql_execution_logs with default limit", async () => {
    mockReturn = [];

    await queryApi.sqlLogs.list();

    expect(capturedCmd).toBe("list_sql_execution_logs");
    expect(capturedArgs).toEqual({ limit: 100 });
  });

  test("invokes with custom limit", async () => {
    mockReturn = [];

    await queryApi.sqlLogs.list(50);

    expect(capturedArgs).toEqual({ limit: 50 });
  });
});
