import { describe, expect, it } from "bun:test";
import { renderHook, waitFor } from "@testing-library/react";
import type { Connection, TableInfo } from "../connection-list/types";
import { useConnectionRevealSync } from "./useConnectionRevealSync";

function makeConnection(): Connection {
  return {
    id: "1",
    name: "local",
    type: "postgres",
    host: "localhost",
    port: "5432",
    username: "postgres",
    databases: [
      {
        name: "app",
        schemas: [
          {
            name: "public",
            tables: [{ name: "users", schema: "public", columns: [] }],
            procedures: [],
            functions: [],
          },
        ],
        tables: [],
        routines: [],
      },
    ],
    isConnected: true,
    connectState: "success",
  };
}

describe("useConnectionRevealSync", () => {
  it("does not rewrite expanded state when only callback identities change", async () => {
    const connections = [makeConnection()];
    const connectionsRef = { current: connections };
    const expandedDatabasesRef = { current: new Set<string>() };
    const activeTableTarget = {
      connectionId: 1,
      database: "app",
      table: "users",
      schema: "public",
    };
    let expandedConnectionWrites = 0;
    let expandedDatabaseWrites = 0;
    let expandedSchemaWrites = 0;

    const setExpandedConnections = (
      updater: React.SetStateAction<Set<string>>,
    ) => {
      expandedConnectionWrites += 1;
      if (typeof updater === "function") {
        updater(new Set(["1"]));
      }
    };
    const setExpandedDatabases = (
      updater: React.SetStateAction<Set<string>>,
    ) => {
      expandedDatabaseWrites += 1;
      if (typeof updater === "function") {
        updater(new Set(["1-app"]));
      }
    };
    const setExpandedSchemas = (updater: React.SetStateAction<Set<string>>) => {
      expandedSchemaWrites += 1;
      if (typeof updater === "function") {
        updater(new Set(["1-app::public"]));
      }
    };

    const makeProps = () => ({
      activeTableTarget,
      connections,
      connectionsRef,
      expandedDatabasesRef,
      searchTerm: "",
      setExpandedConnections,
      setExpandedDatabases,
      setExpandedSchemas,
      fetchAndSetTables: async (): Promise<TableInfo[]> => [],
      loadRedisKeysPage: async (): Promise<TableInfo[]> => [],
    });

    const { rerender } = renderHook(
      (props: ReturnType<typeof makeProps>) => useConnectionRevealSync(props),
      { initialProps: makeProps() },
    );

    await waitFor(() => expect(expandedSchemaWrites).toBe(1));

    rerender(makeProps());

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(expandedConnectionWrites).toBe(1);
    expect(expandedDatabaseWrites).toBe(1);
    expect(expandedSchemaWrites).toBe(1);
  });
});
