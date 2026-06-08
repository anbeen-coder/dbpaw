import { mock } from "bun:test";

const mockExportTable = mock(() =>
  Promise.resolve({ rowCount: 10, filePath: "/tmp/out.csv" }),
);
const mockExportDatabase = mock(() =>
  Promise.resolve({ rowCount: 50, filePath: "/tmp/out.sql" }),
);

mock.module("@/services/api", () => ({
  api: {
    transfer: {
      exportTable: mockExportTable,
      exportDatabase: mockExportDatabase,
    },
  },
}));

mock.module("sonner", () => ({
  toast: { success: mock(), error: mock() },
}));

mock.module("react-i18next", () => ({
  useTranslation: () => ({ t: (s: string) => s }),
}));

import { describe, test, expect, beforeEach } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import { useTabFactory } from "./useTabFactory";
import type { TabItem, EditorTabItem } from "@/types/tab";

function makeEditorTab(id: string): EditorTabItem {
  return { id, type: "editor", title: `Tab ${id}` };
}

describe("useTabFactory", () => {
  let tabs: TabItem[];
  let activeTab: string;
  let setTabs: React.Dispatch<React.SetStateAction<TabItem[]>>;
  let setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  const t = (s: string) => s;

  beforeEach(() => {
    tabs = [];
    activeTab = "";
    setTabs = (updater) => {
      tabs = typeof updater === "function" ? updater(tabs) : updater;
    };
    setActiveTab = (v) => {
      activeTab = typeof v === "function" ? v(activeTab) : v;
    };
    mockExportTable.mockClear();
    mockExportDatabase.mockClear();
  });

  function renderFactory() {
    return renderHook(() =>
      useTabFactory({ tabs, setTabs, setActiveTab, t }),
    );
  }

  describe("openOrCreateTab (via openRedisConsole)", () => {
    test("creates new tab and sets it active", () => {
      const { result } = renderFactory();
      act(() =>
        result.current.openRedisConsole("conn1", "db0", 1, "redis"),
      );

      expect(tabs).toHaveLength(1);
      expect(tabs[0].id).toBe("redis-console-1-db0");
      expect(tabs[0].type).toBe("redis-console");
      expect(activeTab).toBe("redis-console-1-db0");
    });

    test("activates existing tab without duplication", () => {
      tabs = [
        {
          id: "redis-console-1-db0",
          type: "redis-console",
          title: "Console · db0",
          connection: "conn1",
          database: "db0",
          connectionId: 1,
          driver: "redis",
        },
      ];
      const { result } = renderFactory();
      act(() =>
        result.current.openRedisConsole("conn1", "db0", 1, "redis"),
      );

      expect(tabs).toHaveLength(1);
      expect(activeTab).toBe("redis-console-1-db0");
    });
  });

  describe("openRedisConsole", () => {
    test("generates correct tab ID and type", () => {
      const { result } = renderFactory();
      act(() =>
        result.current.openRedisConsole("conn1", "db2", 5, "redis"),
      );

      expect(tabs[0].id).toBe("redis-console-5-db2");
      expect(tabs[0].type).toBe("redis-console");
      expect(tabs[0].title).toBe("Console · db2");
    });
  });

  describe("openRedisBrowser", () => {
    test("generates correct tab ID and type", () => {
      const { result } = renderFactory();
      act(() =>
        result.current.openRedisBrowser("conn1", "db0", 3, "redis"),
      );

      expect(tabs[0].id).toBe("redis-browser-3-db0");
      expect(tabs[0].type).toBe("redis-browser");
      expect(tabs[0].title).toBe("Browser · db0");
    });
  });

  describe("openRedisServerInfo", () => {
    test("generates correct tab ID and type", () => {
      const { result } = renderFactory();
      act(() =>
        result.current.openRedisServerInfo("conn1", "db0", 2, "redis"),
      );

      expect(tabs[0].id).toBe("redis-server-info-2-db0");
      expect(tabs[0].type).toBe("redis-server-info");
    });
  });

  describe("openRedisKey", () => {
    test("generates correct tab ID", () => {
      const { result } = renderFactory();
      act(() =>
        result.current.openRedisKey("conn1", "db0", "mykey", 1, "redis"),
      );

      expect(tabs[0].id).toBe("redis-1-db0-mykey");
      expect(tabs[0].type).toBe("redis-key");
      expect(tabs[0].title).toBe("mykey");
    });

    test("uses fallback title for empty key", () => {
      const { result } = renderFactory();
      act(() =>
        result.current.openRedisKey("conn1", "db0", "", 1, "redis"),
      );

      expect(tabs[0].title).toBe("New Redis key");
    });
  });

  describe("openElasticsearchIndex", () => {
    test("generates correct tab ID", () => {
      const { result } = renderFactory();
      act(() =>
        result.current.openElasticsearchIndex("conn1", "my-index", 7, "elasticsearch"),
      );

      expect(tabs[0].id).toBe("elasticsearch-7-my-index");
      expect(tabs[0].type).toBe("elasticsearch-index");
    });
  });

  describe("openTableDDL", () => {
    test("generates correct tab ID", () => {
      const { result } = renderFactory();
      act(() =>
        result.current.openTableDDL({
          connectionId: 1,
          database: "mydb",
          schema: "public",
          table: "users",
        }),
      );

      expect(tabs[0].id).toBe("ddl-1-mydb-public-users");
      expect(tabs[0].type).toBe("ddl");
    });
  });

  describe("openRoutine", () => {
    test("generates correct tab ID for function", () => {
      const { result } = renderFactory();
      act(() =>
        result.current.openRoutine(
          "conn1",
          "mydb",
          "public",
          "get_user",
          "function",
          1,
          "postgres",
        ),
      );

      expect(tabs[0].id).toBe("routine-1-mydb-public-function-get_user");
      expect(tabs[0].type).toBe("routine");
    });
  });

  describe("openCreateTable", () => {
    test("generates tab ID with timestamp suffix", () => {
      const { result } = renderFactory();

      act(() => {
        result.current.openCreateTable(1, "mydb", "public", "postgres");
      });

      expect(tabs[0].id).toMatch(/^create-table-1-mydb-public-\d+$/);
      expect(tabs[0].type).toBe("create-table");
    });

    test("each call creates a new tab", async () => {
      const { result } = renderFactory();

      act(() => {
        result.current.openCreateTable(1, "mydb", "public", "postgres");
      });
      await Bun.sleep(2);
      act(() => {
        result.current.openCreateTable(1, "mydb", "public", "postgres");
      });

      expect(tabs).toHaveLength(2);
      expect(tabs[0].id).not.toBe(tabs[1].id);
    });
  });

  describe("openAlterTable", () => {
    test("generates correct tab ID", () => {
      const { result } = renderFactory();
      act(() =>
        result.current.openAlterTable(1, "mydb", "public", "users", "postgres"),
      );

      expect(tabs[0].id).toBe("alter-table-1-mydb-public-users");
      expect(tabs[0].type).toBe("alter-table");
    });
  });

  describe("openERDiagram", () => {
    test("generates correct tab ID", () => {
      const { result } = renderFactory();
      act(() =>
        result.current.openERDiagram({ connectionId: 1, database: "mydb" }),
      );

      expect(tabs[0].id).toBe("er-diagram-mydb");
      expect(tabs[0].type).toBe("er-diagram");
    });

    test("returns early when connectionId missing", () => {
      const { result } = renderFactory();
      act(() => result.current.openERDiagram({ database: "mydb" }));
      expect(tabs).toHaveLength(0);
    });

    test("returns early when database missing", () => {
      const { result } = renderFactory();
      act(() => result.current.openERDiagram({ connectionId: 1 }));
      expect(tabs).toHaveLength(0);
    });
  });

  describe("exportTable", () => {
    test("calls API and shows success toast", async () => {
      const { result } = renderFactory();
      await act(async () => {
        await result.current.exportTable(
          {
            connectionId: 1,
            database: "mydb",
            schema: "public",
            table: "users",
            driver: "postgres",
          },
          "csv",
          "/tmp/out.csv",
        );
      });

      expect(mockExportTable).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          database: "mydb",
          schema: "public",
          table: "users",
          driver: "postgres",
          format: "csv",
          filePath: "/tmp/out.csv",
        }),
      );
    });

    test("shows error toast on API failure", async () => {
      mockExportTable.mockRejectedValueOnce(new Error("disk full"));
      const { result } = renderFactory();

      await act(async () => {
        await result.current.exportTable(
          {
            connectionId: 1,
            database: "mydb",
            schema: "public",
            table: "users",
            driver: "postgres",
          },
          "csv",
          "/tmp/out.csv",
        );
      });
    });
  });

  describe("exportDatabase", () => {
    test("calls API with correct params", async () => {
      const { result } = renderFactory();
      await act(async () => {
        await result.current.exportDatabase({
          connectionId: 1,
          database: "mydb",
          driver: "postgres",
          format: "sql_ddl",
          filePath: "/tmp/out.sql",
        });
      });

      expect(mockExportDatabase).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          database: "mydb",
          driver: "postgres",
          format: "sql_ddl",
          filePath: "/tmp/out.sql",
        }),
      );
    });
  });
});
