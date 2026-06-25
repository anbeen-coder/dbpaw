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

import { connectionsApi } from "./connections";

const g = globalThis as any;

beforeEach(() => {
  g.window = { __TAURI_INTERNALS__: {} };
  capturedCmd = "";
  capturedArgs = null;
  mockReturn = undefined;
});

// ─── transfer ────────────────────────────────────────────────────────────────

describe("connectionsApi.transfer.exportTable", () => {
  test("invokes export_table_data with all params", async () => {
    mockReturn = { filePath: "/tmp/out.csv", rowCount: 100 };

    const result = await connectionsApi.transfer.exportTable({
      id: 1,
      database: "db",
      schema: "public",
      table: "users",
      driver: "postgres",
      format: "csv",
      scope: "all",
      filter: "active = true",
      orderBy: "id",
      sortColumn: "id",
      sortDirection: "asc",
      page: 1,
      limit: 50,
      filePath: "/tmp/out.csv",
      chunkSize: 1000,
    });

    expect(capturedCmd).toBe("export_table_data");
    expect(capturedArgs).toEqual({
      id: 1,
      database: "db",
      schema: "public",
      table: "users",
      driver: "postgres",
      format: "csv",
      scope: "all",
      filter: "active = true",
      orderBy: "id",
      sortColumn: "id",
      sortDirection: "asc",
      page: 1,
      limit: 50,
      filePath: "/tmp/out.csv",
      chunkSize: 1000,
    });
    expect(result.filePath).toBe("/tmp/out.csv");
  });
});

describe("connectionsApi.transfer.exportDatabase", () => {
  test("invokes export_database_sql", async () => {
    mockReturn = { filePath: "/tmp/db.sql", rowCount: 0 };

    await connectionsApi.transfer.exportDatabase({
      id: 7,
      database: "analytics",
      driver: "postgres",
      format: "sql_full",
      filePath: "/tmp/db.sql",
      chunkSize: 500,
    });

    expect(capturedCmd).toBe("export_database_sql");
    expect(capturedArgs).toEqual({
      id: 7,
      database: "analytics",
      driver: "postgres",
      format: "sql_full",
      filePath: "/tmp/db.sql",
      chunkSize: 500,
    });
  });
});

describe("connectionsApi.transfer.exportQueryResult", () => {
  test("invokes export_query_result", async () => {
    mockReturn = { filePath: "/tmp/query.csv", rowCount: 10 };

    await connectionsApi.transfer.exportQueryResult({
      id: 1,
      database: "db",
      sql: "SELECT * FROM users",
      driver: "postgres",
      format: "csv",
      filePath: "/tmp/query.csv",
    });

    expect(capturedCmd).toBe("export_query_result");
    expect(capturedArgs).toEqual({
      id: 1,
      database: "db",
      sql: "SELECT * FROM users",
      driver: "postgres",
      format: "csv",
      filePath: "/tmp/query.csv",
    });
  });
});

describe("connectionsApi.transfer.importSqlFile", () => {
  test("invokes import_sql_file", async () => {
    mockReturn = { statementsExecuted: 5, errors: [] };

    await connectionsApi.transfer.importSqlFile({
      id: 1,
      database: "db",
      filePath: "/tmp/dump.sql",
      driver: "postgres",
    });

    expect(capturedCmd).toBe("import_sql_file");
    expect(capturedArgs).toEqual({
      id: 1,
      database: "db",
      filePath: "/tmp/dump.sql",
      driver: "postgres",
    });
  });
});

// ─── connections ─────────────────────────────────────────────────────────────

describe("connectionsApi.connections.list", () => {
  test("invokes get_connections", async () => {
    mockReturn = [{ id: 1, name: "local" }];

    const result = await connectionsApi.connections.list();

    expect(capturedCmd).toBe("get_connections");
    expect(capturedArgs).toBeUndefined();
    expect(result).toHaveLength(1);
  });
});

describe("connectionsApi.connections.create", () => {
  test("invokes create_connection with form", async () => {
    const form = { driver: "postgres", host: "localhost", port: 5432 };
    mockReturn = { id: 2, ...form };

    await connectionsApi.connections.create(form as any);

    expect(capturedCmd).toBe("create_connection");
    expect(capturedArgs).toEqual({ form });
  });
});

describe("connectionsApi.connections.update", () => {
  test("invokes update_connection with id and form", async () => {
    const form = { driver: "mysql", host: "127.0.0.1", port: 3306 };
    mockReturn = { id: 3, ...form };

    await connectionsApi.connections.update(3, form as any);

    expect(capturedCmd).toBe("update_connection");
    expect(capturedArgs).toEqual({ id: 3, form });
  });
});

describe("connectionsApi.connections.delete", () => {
  test("invokes delete_connection with id", async () => {
    mockReturn = undefined;

    await connectionsApi.connections.delete(5);

    expect(capturedCmd).toBe("delete_connection");
    expect(capturedArgs).toEqual({ id: 5 });
  });
});

describe("connectionsApi.connections.createDatabase", () => {
  test("invokes create_database_by_id", async () => {
    const payload = { name: "newdb", charset: "utf8mb4", collation: "utf8mb4_unicode_ci" };
    mockReturn = undefined;

    await connectionsApi.connections.createDatabase(1, payload as any);

    expect(capturedCmd).toBe("create_database_by_id");
    expect(capturedArgs).toEqual({ id: 1, payload });
  });
});

describe("connectionsApi.connections.getMysqlCharsets", () => {
  test("invokes get_mysql_charsets_by_id", async () => {
    mockReturn = ["utf8mb4", "latin1"];

    const result = await connectionsApi.connections.getMysqlCharsets(1);

    expect(capturedCmd).toBe("get_mysql_charsets_by_id");
    expect(capturedArgs).toEqual({ id: 1 });
    expect(result).toEqual(["utf8mb4", "latin1"]);
  });
});

describe("connectionsApi.connections.getMysqlCollations", () => {
  test("invokes get_mysql_collations_by_id with charset", async () => {
    mockReturn = ["utf8mb4_unicode_ci", "utf8mb4_general_ci"];

    await connectionsApi.connections.getMysqlCollations(1, "utf8mb4");

    expect(capturedCmd).toBe("get_mysql_collations_by_id");
    expect(capturedArgs).toEqual({ id: 1, charset: "utf8mb4" });
  });

  test("works without charset", async () => {
    mockReturn = [];

    await connectionsApi.connections.getMysqlCollations(1);

    expect(capturedArgs).toEqual({ id: 1, charset: undefined });
  });
});

describe("connectionsApi.connections.testEphemeral", () => {
  test("invokes test_connection_ephemeral", async () => {
    const form = { driver: "postgres" };
    mockReturn = { success: true };

    await connectionsApi.connections.testEphemeral(form as any);

    expect(capturedCmd).toBe("test_connection_ephemeral");
    expect(capturedArgs).toEqual({ form });
  });
});

describe("connectionsApi.connections.listSqliteIssues", () => {
  test("invokes list_sqlite_issues", async () => {
    mockReturn = [];

    await connectionsApi.connections.listSqliteIssues();

    expect(capturedCmd).toBe("list_sqlite_issues");
    expect(capturedArgs).toBeUndefined();
  });
});

describe("connectionsApi.connections.importFromFile", () => {
  test("invokes import_connections", async () => {
    mockReturn = { imported: 3, skipped: 1 };

    await connectionsApi.connections.importFromFile("/tmp/connections.json");

    expect(capturedCmd).toBe("import_connections");
    expect(capturedArgs).toEqual({ filePath: "/tmp/connections.json" });
  });
});

// ─── queries ─────────────────────────────────────────────────────────────────

describe("connectionsApi.queries.list", () => {
  test("invokes get_saved_queries", async () => {
    mockReturn = [{ id: 1, name: "test query", query: "SELECT 1" }];

    const result = await connectionsApi.queries.list();

    expect(capturedCmd).toBe("get_saved_queries");
    expect(capturedArgs).toBeUndefined();
    expect(result).toHaveLength(1);
  });
});

describe("connectionsApi.queries.create", () => {
  test("invokes save_query with data", async () => {
    const data = { name: "q1", query: "SELECT 1", description: "test", connectionId: 1, database: "db" };
    mockReturn = { id: 10, ...data };

    await connectionsApi.queries.create(data);

    expect(capturedCmd).toBe("save_query");
    expect(capturedArgs).toEqual(data);
  });
});

describe("connectionsApi.queries.update", () => {
  test("invokes update_saved_query with id and data", async () => {
    const data = { name: "q2", query: "SELECT 2" };
    mockReturn = { id: 10, ...data };

    await connectionsApi.queries.update(10, data);

    expect(capturedCmd).toBe("update_saved_query");
    expect(capturedArgs).toEqual({ id: 10, ...data });
  });
});

describe("connectionsApi.queries.delete", () => {
  test("invokes delete_saved_query with id", async () => {
    mockReturn = undefined;

    await connectionsApi.queries.delete(10);

    expect(capturedCmd).toBe("delete_saved_query");
    expect(capturedArgs).toEqual({ id: 10 });
  });
});
