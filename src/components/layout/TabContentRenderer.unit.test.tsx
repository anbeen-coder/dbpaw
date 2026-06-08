import { mock } from "bun:test";

const mockT = (s: string) => s;

mock.module("react-i18next", () => ({
  useTranslation: () => ({ t: mockT }),
}));

const editorCalls: any[] = [];
const tableCalls: any[] = [];
const redisKeyCalls: any[] = [];
const redisConsoleCalls: any[] = [];
const redisBrowserCalls: any[] = [];
const redisServerInfoCalls: any[] = [];
const elasticsearchCalls: any[] = [];
const erDiagramCalls: any[] = [];
const createTableCalls: any[] = [];
const alterTableCalls: any[] = [];
const routineMetadataCalls: any[] = [];
const tableMetadataCalls: any[] = [];

mock.module("@/components/business/Editor/SqlEditor", () => ({
  SqlEditor: (props: any) => {
    editorCalls.push(props);
    return <div data-testid="sql-editor" />;
  },
}));

mock.module("@/components/business/DataGrid/TableView", () => ({
  TableView: (props: any) => {
    tableCalls.push(props);
    return <div data-testid="table-view" />;
  },
}));

mock.module("@/components/business/Redis/RedisKeyView", () => ({
  RedisKeyView: (props: any) => {
    redisKeyCalls.push(props);
    return <div data-testid="redis-key-view" />;
  },
}));

mock.module("@/components/business/Redis/RedisConsole", () => ({
  RedisConsole: (props: any) => {
    redisConsoleCalls.push(props);
    return <div data-testid="redis-console" />;
  },
}));

mock.module("@/components/business/Redis/RedisBrowserView", () => ({
  RedisBrowserView: (props: any) => {
    redisBrowserCalls.push(props);
    return <div data-testid="redis-browser-view" />;
  },
}));

mock.module("@/components/business/Redis/RedisServerInfoView", () => ({
  RedisServerInfoView: (props: any) => {
    redisServerInfoCalls.push(props);
    return <div data-testid="redis-server-info" />;
  },
}));

mock.module(
  "@/components/business/Elasticsearch/ElasticsearchIndexView",
  () => ({
    ElasticsearchIndexView: (props: any) => {
      elasticsearchCalls.push(props);
      return <div data-testid="elasticsearch-view" />;
    },
  }),
);

mock.module("@/components/business/ERDiagram/ERDiagramView", () => ({
  default: (props: any) => {
    erDiagramCalls.push(props);
    return <div data-testid="er-diagram" />;
  },
}));

mock.module("@/components/business/CreateTable/CreateTableView", () => ({
  CreateTableView: (props: any) => {
    createTableCalls.push(props);
    return <div data-testid="create-table-view" />;
  },
}));

mock.module("@/components/business/CreateTable/AlterTableView", () => ({
  AlterTableView: (props: any) => {
    alterTableCalls.push(props);
    return <div data-testid="alter-table-view" />;
  },
}));

mock.module("@/components/business/Metadata/RoutineMetadataView", () => ({
  RoutineMetadataView: (props: any) => {
    routineMetadataCalls.push(props);
    return <div data-testid="routine-metadata" />;
  },
}));

mock.module("@/components/business/Metadata/TableMetadataView", () => ({
  TableMetadataView: (props: any) => {
    tableMetadataCalls.push(props);
    return <div data-testid="table-metadata" />;
  },
}));

mock.module("@/lib/driver-registry", () => ({
  resolveTableScope: (_driver: string, database: string, schema?: string) => ({
    database,
    schema: schema || "public",
  }),
}));

mock.module("@/components/ui/tabs", () => ({
  TabsContent: ({ children, ...props }: any) => (
    <div data-testid="tabs-content" {...props}>
      {children}
    </div>
  ),
}));

mock.module("@/services/api", () => ({
  api: { query: { cancel: () => Promise.resolve(false) } },
}));

import { describe, test, expect, beforeEach } from "bun:test";
import { render, act } from "@testing-library/react";
import {
  TabContentRenderer,
  shouldMountTabContent,
} from "./TabContentRenderer";
import type {
  TabItem,
  EditorTabItem,
  TableTabItem,
  RedisKeyTabItem,
  RedisConsoleTabItem,
  RedisBrowserTabItem,
  RedisServerInfoTabItem,
  ElasticsearchIndexTabItem,
  ERDiagramTabItem,
  CreateTableTabItem,
  AlterTableTabItem,
  RoutineTabItem,
  DdlTabItem,
} from "@/types/tab";

const NOOP = () => {};
const ASYNC_NOOP = () => Promise.resolve();

const defaultProps = {
  handleExecuteQuery: ASYNC_NOOP,
  handleSqlChange: NOOP,
  handleEditorDatabaseChange: ASYNC_NOOP,
  handlePageChange: ASYNC_NOOP,
  handlePageSizeChange: ASYNC_NOOP,
  handleSortChange: ASYNC_NOOP,
  handleFilterChange: ASYNC_NOOP,
  handleTableRefresh: ASYNC_NOOP,
  handleOpenTableDDL: NOOP,
  handleOpenERDiagram: NOOP,
  handleCreateQuery: NOOP,
  handleCloseTab: NOOP,
  handleCreateTableSuccess: NOOP,
  handleAlterTableSuccess: NOOP,
  handleOpenRedisConsole: NOOP,
  notifyRedisRefresh: NOOP,
  setQueriesLastUpdated: NOOP,
  setTabs: NOOP,
  isDefaultQueryTitle: () => false,
  showColumnComments: false,
  showRowNumbers: true,
  showZebraStripes: false,
};

describe("shouldMountTabContent", () => {
  test("mounts only the active tab", () => {
    expect(shouldMountTabContent("a", "a")).toBe(true);
    expect(shouldMountTabContent("b", "a")).toBe(false);
  });

  test("returns false for empty strings", () => {
    expect(shouldMountTabContent("", "")).toBe(true);
    expect(shouldMountTabContent("a", "")).toBe(false);
  });
});

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe("TabContentRenderer", () => {
  beforeEach(() => {
    editorCalls.length = 0;
    tableCalls.length = 0;
    redisKeyCalls.length = 0;
    redisConsoleCalls.length = 0;
    redisBrowserCalls.length = 0;
    redisServerInfoCalls.length = 0;
    elasticsearchCalls.length = 0;
    erDiagramCalls.length = 0;
    createTableCalls.length = 0;
    alterTableCalls.length = 0;
    routineMetadataCalls.length = 0;
    tableMetadataCalls.length = 0;
  });

  test("renders empty hint when tabs array is empty", () => {
    const { container } = render(
      <TabContentRenderer tabs={[]} activeTab="" {...defaultProps} />,
    );
    expect(container.textContent).toContain("app.empty.hint");
  });

  test("renders editor tab for active editor tab", async () => {
    const tab: EditorTabItem = {
      id: "ed-1",
      type: "editor",
      title: "Query 1",
      database: "mydb",
      sqlContent: "SELECT 1",
    };
    render(
      <TabContentRenderer tabs={[tab]} activeTab="ed-1" {...defaultProps} />,
    );
    await flush();
    expect(editorCalls).toHaveLength(1);
    expect(editorCalls[0].databaseName).toBe("mydb");
  });

  test("renders table tab for active table tab", async () => {
    const tab: TableTabItem = {
      id: "tbl-1",
      type: "table",
      title: "users",
      data: [],
      columns: ["id", "name"],
    };
    render(
      <TabContentRenderer tabs={[tab]} activeTab="tbl-1" {...defaultProps} />,
    );
    await flush();
    expect(tableCalls).toHaveLength(1);
    expect(tableCalls[0].columns).toEqual(["id", "name"]);
  });

  test("redis-key tab returns null when connectionId missing", () => {
    const tab: RedisKeyTabItem = {
      id: "rk-1",
      type: "redis-key",
      title: "mykey",
      database: "db0",
      redisKey: "mykey",
    };
    render(
      <TabContentRenderer tabs={[tab]} activeTab="rk-1" {...defaultProps} />,
    );
    expect(redisKeyCalls).toHaveLength(0);
  });

  test("redis-key tab renders when all fields present", async () => {
    const tab: RedisKeyTabItem = {
      id: "rk-1",
      type: "redis-key",
      title: "mykey",
      connectionId: 1,
      database: "db0",
      redisKey: "mykey",
      connection: "conn1",
      driver: "redis",
    };
    render(
      <TabContentRenderer tabs={[tab]} activeTab="rk-1" {...defaultProps} />,
    );
    await flush();
    expect(redisKeyCalls).toHaveLength(1);
    expect(redisKeyCalls[0].connectionId).toBe(1);
    expect(redisKeyCalls[0].redisKey).toBe("mykey");
  });

  test("redis-console tab returns null when database missing", () => {
    const tab: RedisConsoleTabItem = {
      id: "rc-1",
      type: "redis-console",
      title: "Console",
      connectionId: 1,
    };
    render(
      <TabContentRenderer tabs={[tab]} activeTab="rc-1" {...defaultProps} />,
    );
    expect(redisConsoleCalls).toHaveLength(0);
  });

  test("redis-console tab renders when fields present", async () => {
    const tab: RedisConsoleTabItem = {
      id: "rc-1",
      type: "redis-console",
      title: "Console",
      connectionId: 1,
      database: "db0",
      connection: "conn1",
      driver: "redis",
    };
    render(
      <TabContentRenderer tabs={[tab]} activeTab="rc-1" {...defaultProps} />,
    );
    await flush();
    expect(redisConsoleCalls).toHaveLength(1);
  });

  test("redis-browser tab returns null when driver missing", () => {
    const tab: RedisBrowserTabItem = {
      id: "rb-1",
      type: "redis-browser",
      title: "Browser",
      connectionId: 1,
      database: "db0",
      connection: "conn1",
    };
    render(
      <TabContentRenderer tabs={[tab]} activeTab="rb-1" {...defaultProps} />,
    );
    expect(redisBrowserCalls).toHaveLength(0);
  });

  test("redis-browser tab renders when all fields present", async () => {
    const tab: RedisBrowserTabItem = {
      id: "rb-1",
      type: "redis-browser",
      title: "Browser",
      connectionId: 1,
      database: "db0",
      connection: "conn1",
      driver: "redis",
    };
    render(
      <TabContentRenderer tabs={[tab]} activeTab="rb-1" {...defaultProps} />,
    );
    await flush();
    expect(redisBrowserCalls).toHaveLength(1);
  });

  test("redis-server-info tab returns null when connectionId missing", () => {
    const tab: RedisServerInfoTabItem = {
      id: "rs-1",
      type: "redis-server-info",
      title: "Server Info",
      database: "db0",
    };
    render(
      <TabContentRenderer tabs={[tab]} activeTab="rs-1" {...defaultProps} />,
    );
    expect(redisServerInfoCalls).toHaveLength(0);
  });

  test("redis-server-info tab renders when fields present", async () => {
    const tab: RedisServerInfoTabItem = {
      id: "rs-1",
      type: "redis-server-info",
      title: "Server Info",
      connectionId: 1,
      database: "db0",
    };
    render(
      <TabContentRenderer tabs={[tab]} activeTab="rs-1" {...defaultProps} />,
    );
    await flush();
    expect(redisServerInfoCalls).toHaveLength(1);
  });

  test("elasticsearch tab returns null when index missing", () => {
    const tab: ElasticsearchIndexTabItem = {
      id: "es-1",
      type: "elasticsearch-index",
      title: "my-index",
      connectionId: 1,
    };
    render(
      <TabContentRenderer tabs={[tab]} activeTab="es-1" {...defaultProps} />,
    );
    expect(elasticsearchCalls).toHaveLength(0);
  });

  test("elasticsearch tab renders when fields present", async () => {
    const tab: ElasticsearchIndexTabItem = {
      id: "es-1",
      type: "elasticsearch-index",
      title: "my-index",
      connectionId: 1,
      elasticsearchIndex: "my-index",
    };
    render(
      <TabContentRenderer tabs={[tab]} activeTab="es-1" {...defaultProps} />,
    );
    await flush();
    expect(elasticsearchCalls).toHaveLength(1);
    expect(elasticsearchCalls[0].index).toBe("my-index");
  });

  test("er-diagram tab returns null when connectionId missing", () => {
    const tab: ERDiagramTabItem = {
      id: "er-1",
      type: "er-diagram",
      title: "ER",
      database: "mydb",
    };
    render(
      <TabContentRenderer tabs={[tab]} activeTab="er-1" {...defaultProps} />,
    );
    expect(erDiagramCalls).toHaveLength(0);
  });

  test("er-diagram tab renders when connectionId present", async () => {
    const tab: ERDiagramTabItem = {
      id: "er-1",
      type: "er-diagram",
      title: "ER",
      connectionId: 1,
      database: "mydb",
    };
    render(
      <TabContentRenderer tabs={[tab]} activeTab="er-1" {...defaultProps} />,
    );
    await flush();
    expect(erDiagramCalls).toHaveLength(1);
  });

  test("create-table tab returns null when driver missing", () => {
    const tab: CreateTableTabItem = {
      id: "ct-1",
      type: "create-table",
      title: "Create Table",
      connectionId: 1,
      database: "mydb",
    };
    render(
      <TabContentRenderer tabs={[tab]} activeTab="ct-1" {...defaultProps} />,
    );
    expect(createTableCalls).toHaveLength(0);
  });

  test("create-table tab renders when fields present", async () => {
    const tab: CreateTableTabItem = {
      id: "ct-1",
      type: "create-table",
      title: "Create Table",
      connectionId: 1,
      database: "mydb",
      schema: "public",
      driver: "postgres",
    };
    render(
      <TabContentRenderer tabs={[tab]} activeTab="ct-1" {...defaultProps} />,
    );
    await flush();
    expect(createTableCalls).toHaveLength(1);
  });

  test("alter-table tab returns null when tableName missing", () => {
    const tab: AlterTableTabItem = {
      id: "at-1",
      type: "alter-table",
      title: "Alter Table",
      connectionId: 1,
      database: "mydb",
      driver: "postgres",
    };
    render(
      <TabContentRenderer tabs={[tab]} activeTab="at-1" {...defaultProps} />,
    );
    expect(alterTableCalls).toHaveLength(0);
  });

  test("alter-table tab renders when fields present", async () => {
    const tab: AlterTableTabItem = {
      id: "at-1",
      type: "alter-table",
      title: "Alter Table",
      connectionId: 1,
      database: "mydb",
      schema: "public",
      tableName: "users",
      driver: "postgres",
    };
    render(
      <TabContentRenderer tabs={[tab]} activeTab="at-1" {...defaultProps} />,
    );
    await flush();
    expect(alterTableCalls).toHaveLength(1);
  });

  test("routine tab returns null when routineName missing", () => {
    const tab: RoutineTabItem = {
      id: "rt-1",
      type: "routine",
      title: "my_func",
      connectionId: 1,
      database: "mydb",
      schema: "public",
    };
    render(
      <TabContentRenderer tabs={[tab]} activeTab="rt-1" {...defaultProps} />,
    );
    expect(routineMetadataCalls).toHaveLength(0);
  });

  test("routine tab renders when fields present", async () => {
    const tab: RoutineTabItem = {
      id: "rt-1",
      type: "routine",
      title: "my_func",
      connectionId: 1,
      database: "mydb",
      schema: "public",
      routineName: "my_func",
      routineType: "function",
    };
    render(
      <TabContentRenderer tabs={[tab]} activeTab="rt-1" {...defaultProps} />,
    );
    await flush();
    expect(routineMetadataCalls).toHaveLength(1);
  });

  test("ddl tab renders TableMetadataView", async () => {
    const tab: DdlTabItem = {
      id: "ddl-1",
      type: "ddl",
      title: "DDL",
      connectionId: 1,
      database: "mydb",
      schema: "public",
      tableName: "users",
    };
    render(
      <TabContentRenderer tabs={[tab]} activeTab="ddl-1" {...defaultProps} />,
    );
    await flush();
    expect(tableMetadataCalls).toHaveLength(1);
  });

  test("only active tab content is mounted", async () => {
    const tabs: TabItem[] = [
      { id: "ed-1", type: "editor", title: "Q1", database: "db1" },
      { id: "ed-2", type: "editor", title: "Q2", database: "db2" },
    ];
    render(
      <TabContentRenderer tabs={tabs} activeTab="ed-1" {...defaultProps} />,
    );
    await flush();
    expect(editorCalls).toHaveLength(1);
    expect(editorCalls[0].databaseName).toBe("db1");
  });
});
