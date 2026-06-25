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

import { metadataApi } from "./metadata";

const g = globalThis as any;

beforeEach(() => {
  g.window = { __TAURI_INTERNALS__: {} };
  capturedCmd = "";
  capturedArgs = null;
  mockReturn = undefined;
});

describe("metadataApi.metadata.listTables", () => {
  test("invokes list_tables with id, database, schema", async () => {
    mockReturn = [{ schema: "public", name: "users", type: "table" }];

    const result = await metadataApi.metadata.listTables(1, "mydb", "public");

    expect(capturedCmd).toBe("list_tables");
    expect(capturedArgs).toEqual({ id: 1, database: "mydb", schema: "public" });
    expect(result).toHaveLength(1);
  });

  test("works without optional params", async () => {
    mockReturn = [];

    await metadataApi.metadata.listTables(5);

    expect(capturedArgs).toEqual({ id: 5, database: undefined, schema: undefined });
  });
});

describe("metadataApi.metadata.listRoutines", () => {
  test("invokes list_routines", async () => {
    mockReturn = [{ name: "fn_test", type: "function" }];

    await metadataApi.metadata.listRoutines(2, "db1", "public");

    expect(capturedCmd).toBe("list_routines");
    expect(capturedArgs).toEqual({ id: 2, database: "db1", schema: "public" });
  });
});

describe("metadataApi.metadata.getTableStructure", () => {
  test("invokes get_table_structure", async () => {
    mockReturn = { columns: [{ name: "id", type: "int", nullable: false }] };

    const result = await metadataApi.metadata.getTableStructure(1, "public", "users");

    expect(capturedCmd).toBe("get_table_structure");
    expect(capturedArgs).toEqual({ id: 1, schema: "public", table: "users" });
    expect(result.columns).toHaveLength(1);
  });
});

describe("metadataApi.metadata.getTableDDL", () => {
  test("invokes get_table_ddl", async () => {
    mockReturn = "CREATE TABLE users (id INT);";

    const result = await metadataApi.metadata.getTableDDL(1, "mydb", "public", "users");

    expect(capturedCmd).toBe("get_table_ddl");
    expect(capturedArgs).toEqual({ id: 1, database: "mydb", schema: "public", table: "users" });
    expect(result).toBe("CREATE TABLE users (id INT);");
  });
});

describe("metadataApi.metadata.getRoutineDDL", () => {
  test("invokes get_routine_ddl", async () => {
    mockReturn = "CREATE FUNCTION fn() RETURNS void AS $$ BEGIN END; $$ LANGUAGE plpgsql;";

    await metadataApi.metadata.getRoutineDDL(1, "db", "public", "fn", "function");

    expect(capturedCmd).toBe("get_routine_ddl");
    expect(capturedArgs).toEqual({
      id: 1,
      database: "db",
      schema: "public",
      name: "fn",
      routineType: "function",
    });
  });
});

describe("metadataApi.metadata.getTableMetadata", () => {
  test("invokes get_table_metadata", async () => {
    mockReturn = { columns: [], indexes: [], foreignKeys: [] };

    await metadataApi.metadata.getTableMetadata(1, "db", "public", "users");

    expect(capturedCmd).toBe("get_table_metadata");
    expect(capturedArgs).toEqual({ id: 1, database: "db", schema: "public", table: "users" });
  });
});

describe("metadataApi.metadata.listTablesByConn", () => {
  test("invokes list_tables_by_conn with form", async () => {
    const form = { driver: "postgres" };
    mockReturn = [];

    await metadataApi.metadata.listTablesByConn(form as any);

    expect(capturedCmd).toBe("list_tables_by_conn");
    expect(capturedArgs).toEqual({ form });
  });
});

describe("metadataApi.metadata.listDatabases", () => {
  test("invokes list_databases with form", async () => {
    const form = { driver: "mysql" };
    mockReturn = ["db1", "db2"];

    const result = await metadataApi.metadata.listDatabases(form as any);

    expect(capturedCmd).toBe("list_databases");
    expect(capturedArgs).toEqual({ form });
    expect(result).toEqual(["db1", "db2"]);
  });
});

describe("metadataApi.metadata.listDatabasesById", () => {
  test("invokes list_databases_by_id", async () => {
    mockReturn = ["db1"];

    await metadataApi.metadata.listDatabasesById(7);

    expect(capturedCmd).toBe("list_databases_by_id");
    expect(capturedArgs).toEqual({ id: 7 });
  });
});

describe("metadataApi.metadata.listSchemas", () => {
  test("invokes list_schemas with id and database", async () => {
    mockReturn = ["public", "auth", "analytics"];

    const result = await metadataApi.metadata.listSchemas(1, "testdb");

    expect(capturedCmd).toBe("list_schemas");
    expect(capturedArgs).toEqual({ id: 1, database: "testdb" });
    expect(result).toEqual(["public", "auth", "analytics"]);
  });

  test("invokes list_schemas without database", async () => {
    mockReturn = ["public"];

    await metadataApi.metadata.listSchemas(5);

    expect(capturedCmd).toBe("list_schemas");
    expect(capturedArgs).toEqual({ id: 5, database: undefined });
  });
});

describe("metadataApi.metadata.getSchemaOverview", () => {
  test("invokes get_schema_overview", async () => {
    mockReturn = { tables: [] };

    await metadataApi.metadata.getSchemaOverview(1, "db", "public");

    expect(capturedCmd).toBe("get_schema_overview");
    expect(capturedArgs).toEqual({ id: 1, database: "db", schema: "public" });
  });
});

describe("metadataApi.metadata.getSchemaForeignKeys", () => {
  test("invokes get_schema_foreign_keys", async () => {
    mockReturn = [];

    await metadataApi.metadata.getSchemaForeignKeys(1, "db", "public");

    expect(capturedCmd).toBe("get_schema_foreign_keys");
    expect(capturedArgs).toEqual({ id: 1, database: "db", schema: "public" });
  });
});

describe("metadataApi.metadata.listEvents", () => {
  test("invokes list_events", async () => {
    mockReturn = [];

    await metadataApi.metadata.listEvents(1, "db", "public");

    expect(capturedCmd).toBe("list_events");
    expect(capturedArgs).toEqual({ id: 1, database: "db", schema: "public" });
  });
});

describe("metadataApi.metadata.listSequences", () => {
  test("invokes list_sequences", async () => {
    mockReturn = [];

    await metadataApi.metadata.listSequences(1, "db", "public");

    expect(capturedCmd).toBe("list_sequences");
    expect(capturedArgs).toEqual({ id: 1, database: "db", schema: "public" });
  });
});

describe("metadataApi.metadata.listTypes", () => {
  test("invokes list_types", async () => {
    mockReturn = [];

    await metadataApi.metadata.listTypes(1, "db", "public");

    expect(capturedCmd).toBe("list_types");
    expect(capturedArgs).toEqual({ id: 1, database: "db", schema: "public" });
  });
});

describe("metadataApi.metadata.listSynonyms", () => {
  test("invokes list_synonyms", async () => {
    mockReturn = [];

    await metadataApi.metadata.listSynonyms(1, "db", "public");

    expect(capturedCmd).toBe("list_synonyms");
    expect(capturedArgs).toEqual({ id: 1, database: "db", schema: "public" });
  });
});

describe("metadataApi.metadata.listPackages", () => {
  test("invokes list_packages", async () => {
    mockReturn = [];

    await metadataApi.metadata.listPackages(1, "db", "public");

    expect(capturedCmd).toBe("list_packages");
    expect(capturedArgs).toEqual({ id: 1, database: "db", schema: "public" });
  });
});

describe("metadataApi.metadata.getCapabilities", () => {
  test("invokes get_driver_capabilities", async () => {
    mockReturn = 0b1111;

    const result = await metadataApi.metadata.getCapabilities(42);

    expect(capturedCmd).toBe("get_driver_capabilities");
    expect(capturedArgs).toEqual({ id: 42 });
    expect(result).toBe(0b1111);
  });
});

describe("metadataApi.tableData.get", () => {
  test("invokes get_table_data with all params", async () => {
    mockReturn = { data: [{ id: 1 }], total: 100, page: 1, limit: 20, executionTimeMs: 5 };

    const result = await metadataApi.tableData.get({
      id: 1,
      database: "db",
      schema: "public",
      table: "users",
      page: 1,
      limit: 20,
      filter: "active = true",
      sortColumn: "id",
      sortDirection: "desc",
      orderBy: "id DESC",
      includeTotal: true,
    });

    expect(capturedCmd).toBe("get_table_data");
    expect(capturedArgs).toEqual({
      id: 1,
      database: "db",
      schema: "public",
      table: "users",
      page: 1,
      limit: 20,
      filter: "active = true",
      sortColumn: "id",
      sortDirection: "desc",
      orderBy: "id DESC",
      includeTotal: true,
    });
    expect(result.data).toHaveLength(1);
  });
});

describe("metadataApi.tableData.getByConn", () => {
  test("invokes get_table_data_by_conn", async () => {
    const form = { driver: "postgres" };
    mockReturn = { data: [], total: 0, page: 1, limit: 50, executionTimeMs: 3 };

    await metadataApi.tableData.getByConn(form as any, "public", "users", 1, 50, true);

    expect(capturedCmd).toBe("get_table_data_by_conn");
    expect(capturedArgs).toEqual({
      form,
      schema: "public",
      table: "users",
      page: 1,
      limit: 50,
      includeTotal: true,
    });
  });
});
