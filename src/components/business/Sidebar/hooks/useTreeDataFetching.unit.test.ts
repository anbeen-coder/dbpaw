import { mock, describe, expect, it } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import type {
  Connection,
  DatasourceTreeAdapter,
  TableInfo,
} from "../connection-list/types";
import type { DatabaseGroupConfig } from "@/lib/tree-adapters/types";

const metadataApi = {
  getCapabilities: mock(() => Promise.resolve(1)),
  listRoutines: mock(() =>
    Promise.resolve([{ name: "sp_refresh", schema: "app", type: "procedure" }]),
  ),
};

mock.module("@/services/api", () => ({
  api: {
    metadata: metadataApi,
  },
}));

import { useTreeDataFetching } from "./useTreeDataFetching";

function makeConnection(): Connection {
  return {
    id: "1",
    name: "local",
    type: "mariadb",
    host: "localhost",
    port: "3306",
    username: "root",
    databases: [
      {
        name: "app",
        schemas: [],
        tables: [{ name: "users", schema: "app", columns: [] }],
        routines: [],
      },
    ],
    isConnected: true,
    connectState: "success",
  };
}

function makeAdapter(): DatasourceTreeAdapter {
  const groups: DatabaseGroupConfig[] = [
    {
      id: "procedures",
      label: "connection.tree.procedures",
      icon: null,
      leafIcon: null,
      source: "routines",
      sourceFilter: "procedure",
    },
  ];

  return {
    supportsSchemaNode: false,
    isDatabaseExpandable: true,
    listDatabases: async () => ["app"],
    loadDatabaseChildren: async (): Promise<TableInfo[]> => [
      { name: "users", schema: "app", columns: [] },
    ],
    shouldSkipTableColumns: false,
    getItemIcon: () => null,
    onItemActivate: () => {},
    getDatabaseRowActions: () => undefined,
    renderDatabaseFooter: () => null,
    renderTableContextMenu: () => null,
    databaseGroups: groups,
  };
}

describe("useTreeDataFetching", () => {
  it("updates routines even when a database already has cached tables", async () => {
    let connections = [makeConnection()];
    const setConnections = mock((updater: (prev: Connection[]) => Connection[]) => {
      connections = updater(connections);
    });

    const { result } = renderHook(() =>
      useTreeDataFetching({
        connections,
        setConnections,
        setExpandedSchemas: () => {},
        setExpandedTables: () => {},
        getAdapter: () => makeAdapter(),
      }),
    );

    await act(async () => {
      await result.current.fetchAndSetTables("1", "app");
    });

    expect(metadataApi.listRoutines).toHaveBeenCalledWith(1, "app");
    expect(connections[0].databases[0].routines).toEqual([
      { name: "sp_refresh", schema: "app", type: "procedure" },
    ]);
  });
});
