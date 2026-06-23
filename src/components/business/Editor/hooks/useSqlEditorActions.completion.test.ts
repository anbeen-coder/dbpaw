import { describe, expect, test } from "bun:test";
import { buildSqlContextualCompletion } from "../sqlCompletionContext";
import type { SchemaOverview } from "@/services/api";

const currentDbOverview: SchemaOverview = {
  tables: [
    {
      schema: "public",
      name: "users",
      columns: [
        { name: "id", type: "integer" },
        { name: "name", type: "text" },
      ],
    },
  ],
};

const crossDbOverview: SchemaOverview = {
  tables: [
    {
      schema: "other_db",
      name: "products",
      columns: [
        { name: "id", type: "integer" },
        { name: "title", type: "varchar" },
        { name: "price", type: "decimal" },
      ],
    },
    {
      schema: "other_db",
      name: "orders",
      columns: [
        { name: "id", type: "integer" },
        { name: "product_id", type: "integer" },
      ],
    },
  ],
};

function mergeSchemaOverviews(
  current: SchemaOverview | undefined,
  crossDbCache: Map<string, SchemaOverview>,
): SchemaOverview | undefined {
  if (!current && crossDbCache.size === 0) return undefined;
  if (crossDbCache.size === 0) return current;
  const merged: SchemaOverview = { tables: [...(current?.tables ?? [])] };
  for (const [, overview] of crossDbCache) {
    for (const table of overview.tables) {
      merged.tables.push(table);
    }
  }
  return merged;
}

describe("MySQL cross-db completion user path", () => {
  const crossDbCache = new Map([["other_db", crossDbOverview]]);
  const mergedOverview = mergeSchemaOverviews(currentDbOverview, crossDbCache)!;
  const availableDatabases = ["other_db"];

  test("FROM db. triggers table completions from that database", () => {
    const result = buildSqlContextualCompletion({
      textBeforeCursor: "SELECT * FROM other_db.",
      explicit: false,
      schemaOverview: mergedOverview,
      availableDatabases,
      driver: "mysql",
    });
    expect(result).not.toBeNull();
    const labels = result!.options.map((o) => o.label);
    expect(labels).toContain("other_db.products");
    expect(labels).toContain("other_db.orders");
  });

  test("FROM db.table WHERE triggers column completions from that table", () => {
    const result = buildSqlContextualCompletion({
      textBeforeCursor: "SELECT * FROM other_db.products WHERE ",
      explicit: false,
      schemaOverview: mergedOverview,
      availableDatabases,
      driver: "mysql",
    });
    expect(result).not.toBeNull();
    const labels = result!.options.map((o) => o.label);
    expect(labels).toContain("title");
    expect(labels).toContain("price");
    expect(labels).toContain("id");
  });

  test("FROM db.table JOIN db.table2 ON triggers column completions", () => {
    const result = buildSqlContextualCompletion({
      textBeforeCursor:
        "SELECT * FROM other_db.products p JOIN other_db.orders o ON ",
      explicit: false,
      schemaOverview: mergedOverview,
      availableDatabases,
      driver: "mysql",
    });
    expect(result).not.toBeNull();
    const labels = result!.options.map((o) => o.label);
    expect(labels).toContain("id");
    expect(labels).toContain("product_id");
  });

  test("non-MySQL driver does not trigger cross-db table completion", () => {
    const result = buildSqlContextualCompletion({
      textBeforeCursor: "SELECT * FROM other_db.",
      explicit: false,
      schemaOverview: mergedOverview,
      availableDatabases,
      driver: "postgres",
    });
    expect(result).toBeNull();
  });

  test("without schemaOverview returns null (non-blocking)", () => {
    const result = buildSqlContextualCompletion({
      textBeforeCursor: "SELECT * FROM other_db.",
      explicit: false,
      schemaOverview: undefined,
      availableDatabases,
      driver: "mysql",
    });
    expect(result).toBeNull();
  });
});
