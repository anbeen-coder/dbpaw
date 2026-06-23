import { describe, expect, test } from "bun:test";
import type { SchemaOverview } from "@/services/api";
import {
  buildSqlContextualCompletion,
  detectSqlCompletionContext,
  extractReferencedTables,
} from "./sqlCompletionContext";

const schemaOverview: SchemaOverview = {
  tables: [
    {
      schema: "public",
      name: "users",
      columns: [
        { name: "id", type: "integer" },
        { name: "name", type: "text" },
      ],
    },
    {
      schema: "public",
      name: "orders",
      columns: [
        { name: "id", type: "integer" },
        { name: "user_id", type: "integer" },
      ],
    },
    {
      schema: "public",
      name: "profiles",
      columns: [
        { name: "id", type: "integer" },
        { name: "user_id", type: "integer" },
        { name: "bio", type: "text" },
      ],
    },
  ],
};

describe("detectSqlCompletionContext", () => {
  test("detects table completion after FROM", () => {
    expect(detectSqlCompletionContext("SELECT * FROM ")).toEqual({
      clause: "table",
      from: 14,
    });
  });

  test("detects table completion while typing after JOIN", () => {
    expect(
      detectSqlCompletionContext("SELECT * FROM users u JOIN ord"),
    ).toEqual({
      clause: "table",
      from: 27,
    });
  });

  test("detects column completion after WHERE", () => {
    expect(detectSqlCompletionContext("SELECT * FROM users WHERE ")).toEqual({
      clause: "column",
      from: 26,
    });
  });

  test("detects column completion after ORDER BY", () => {
    expect(
      detectSqlCompletionContext("SELECT * FROM users ORDER BY na"),
    ).toEqual({
      clause: "column",
      from: 29,
    });
  });

  test("does not hijack dotted completion", () => {
    expect(detectSqlCompletionContext("SELECT u.")).toEqual({
      clause: null,
      from: 9,
    });
  });
});

describe("buildSqlContextualCompletion", () => {
  test("returns table candidates after FROM space", () => {
    const result = buildSqlContextualCompletion({
      textBeforeCursor: "SELECT * FROM ",
      explicit: false,
      schemaOverview,
    });

    expect(result?.from).toBe(14);
    expect(result?.options.map((option) => option.label)).toEqual([
      "users",
      "public.users",
      "orders",
      "public.orders",
      "profiles",
      "public.profiles",
    ]);
  });

  test("returns only column candidates after WHERE space", () => {
    const result = buildSqlContextualCompletion({
      textBeforeCursor: "SELECT * FROM users WHERE ",
      explicit: false,
      schemaOverview,
    });

    expect(result?.options.map((option) => option.label)).toEqual([
      "id",
      "name",
      "id",
      "user_id",
      "id",
      "user_id",
      "bio",
    ]);
    expect(result?.options.every((option) => option.type === "property")).toBe(
      true,
    );
    expect(result?.options.slice(0, 2).map((option) => option.detail)).toEqual([
      "users",
      "users",
    ]);
  });

  test("prioritizes FROM table columns before JOIN table columns", () => {
    const result = buildSqlContextualCompletion({
      textBeforeCursor:
        "SELECT * FROM users u JOIN orders o ON u.id = o.user_id WHERE ",
      explicit: false,
      schemaOverview,
    });

    expect(result?.options.slice(0, 4).map((option) => option.detail)).toEqual([
      "users",
      "users",
      "orders",
      "orders",
    ]);
  });

  test("does not auto-open outside supported clause boundaries", () => {
    expect(
      buildSqlContextualCompletion({
        textBeforeCursor: "SELECT * ",
        explicit: false,
        schemaOverview,
      }),
    ).toBeNull();
  });

  test("returns null for dotted prefixes so default SQL completion can handle them", () => {
    expect(
      buildSqlContextualCompletion({
        textBeforeCursor: "SELECT u.",
        explicit: false,
        schemaOverview,
      }),
    ).toBeNull();
  });

  test("keeps unreferenced tables after referenced ones", () => {
    const result = buildSqlContextualCompletion({
      textBeforeCursor: "SELECT * FROM users WHERE ",
      explicit: false,
      schemaOverview,
    });

    const lastOption = result?.options[result.options.length - 1];
    expect(lastOption?.detail).toBe("profiles");
  });
});

describe("extractReferencedTables", () => {
  test("extracts FROM and JOIN tables in query order", () => {
    expect(
      extractReferencedTables(
        "SELECT * FROM users u LEFT JOIN orders AS o ON u.id = o.user_id WHERE ",
        schemaOverview,
      ),
    ).toEqual([
      {
        schema: "public",
        name: "users",
        alias: "u",
        order: 0,
      },
      {
        schema: "public",
        name: "orders",
        alias: "o",
        order: 1,
      },
    ]);
  });

  test("resolves schema-qualified table references", () => {
    expect(
      extractReferencedTables(
        "SELECT * FROM public.users WHERE ",
        schemaOverview,
      ),
    ).toEqual([
      {
        schema: "public",
        name: "users",
        alias: undefined,
        order: 0,
      },
    ]);
  });
});

describe("cross-database reference detection", () => {
  const crossDbOverview: SchemaOverview = {
    tables: [
      {
        schema: "other_db",
        name: "products",
        columns: [
          { name: "id", type: "integer" },
          { name: "name", type: "varchar" },
        ],
      },
    ],
  };

  test("extractReferencedTables resolves cross-DB table with availableDatabases", () => {
    const result = extractReferencedTables(
      "SELECT * FROM users JOIN other_db.products p ON ",
      schemaOverview,
      ["other_db"],
    );
    expect(result).toEqual([
      { schema: "public", name: "users", alias: undefined, order: 0 },
      { database: "other_db", name: "products", alias: "p", order: 1 },
    ]);
  });

  test("extractReferencedTables ignores unknown database names", () => {
    const result = extractReferencedTables(
      "SELECT * FROM unknown_db.table1",
      schemaOverview,
      ["other_db"],
    );
    expect(result).toEqual([]);
  });

  test("extractReferencedTables falls back to schema match before DB check", () => {
    const result = extractReferencedTables(
      "SELECT * FROM public.users",
      schemaOverview,
      ["public"],
    );
    expect(result).toEqual([
      { schema: "public", name: "users", alias: undefined, order: 0 },
    ]);
  });

  test("buildSqlContextualCompletion includes cross-DB tables after FROM", () => {
    const mergedOverview: SchemaOverview = {
      tables: [...schemaOverview.tables, ...crossDbOverview.tables],
    };
    const result = buildSqlContextualCompletion({
      textBeforeCursor: "SELECT * FROM ",
      explicit: false,
      schemaOverview: mergedOverview,
    });
    expect(result?.options.map((o) => o.label)).toContain("other_db.products");
  });

  test("buildSqlContextualCompletion includes cross-DB columns in WHERE", () => {
    const mergedOverview: SchemaOverview = {
      tables: [...schemaOverview.tables, ...crossDbOverview.tables],
    };
    const result = buildSqlContextualCompletion({
      textBeforeCursor:
        "SELECT * FROM users JOIN other_db.products p WHERE ",
      explicit: false,
      schemaOverview: mergedOverview,
    });
    const labels = result?.options.map((o) => o.label) ?? [];
    expect(labels).toContain("name");
    expect(labels).toContain("id");
  });
});
