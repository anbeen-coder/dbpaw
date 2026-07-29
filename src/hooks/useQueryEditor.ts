import { useCallback, useRef } from "react";
import { api, SavedQuery, SchemaOverview } from "@/services/api";
import { toast } from "sonner";
import { errorMessage } from "@/lib/errors";
import {
  isKeyValueDriver,
  isRegisteredDriver,
  supportsSchemaBrowsing,
} from "@/lib/driver-registry";
import { reduceQueryExecutionState } from "@/lib/queryExecutionState";
import {
  normalizeDatabaseOptions,
  resolvePreferredDatabase,
} from "@/lib/sqlEditorDatabase";
import type { TabItem, EditorTabItem } from "@/types/tab";
import {
  useSqlExecution,
  type SqlExecutionTarget,
} from "@/components/business/Editor/hooks/useSqlExecution";

const DEFAULT_SQL = "";

interface UseQueryEditorParams {
  tabs: TabItem[];
  setTabs: React.Dispatch<React.SetStateAction<TabItem[]>>;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  setQueriesLastUpdated: React.Dispatch<React.SetStateAction<number>>;
  t: (key: string, options?: any) => string;
}

export function useQueryEditor({
  tabs,
  setTabs,
  setActiveTab,
  setQueriesLastUpdated,
  t,
}: UseQueryEditorParams) {
  const schemaOverviewRequestKeysRef = useRef<Map<string, string>>(new Map());
  const sqlExecution = useSqlExecution({ tabs, setTabs, t });

  const fetchEditorDatabases = useCallback(
    async (connectionId: number, fallbackDatabase?: string) => {
      const databases = await api.metadata.listDatabasesById(connectionId);
      return normalizeDatabaseOptions(databases, fallbackDatabase);
    },
    [],
  );

  const fetchEditorSchemaOverview = useCallback(
    async (connectionId: number, database?: string, schema?: string) =>
      api.metadata.getSchemaOverview(connectionId, database, schema),
    [],
  );

  const fetchEditorSchemas = useCallback(
    async (connectionId: number, database?: string) => {
      try {
        return await api.metadata.listSchemas(connectionId, database);
      } catch {
        return [];
      }
    },
    [],
  );

  const handleCreateQuery = useCallback(
    (connectionId: number, databaseName: string, driver: string) => {
      if (isRegisteredDriver(driver) && isKeyValueDriver(driver)) {
        toast.info(
          "Redis connections don't support SQL queries. Use the Redis key view to browse and edit keys.",
        );
        return;
      }
      if (driver === "elasticsearch") {
        toast.info(
          "Elasticsearch connections don't support SQL queries. Open an index to search documents.",
        );
        return;
      }
      const normalizedDatabaseName = databaseName.trim();
      const fallbackDatabaseLabel = t("app.tab.defaultDatabase");
      const initialDatabase = normalizedDatabaseName || undefined;
      const titleDatabase = normalizedDatabaseName || fallbackDatabaseLabel;
      const canBrowseSchemas =
        isRegisteredDriver(driver) && supportsSchemaBrowsing(driver);
      const newTabId = `query-${connectionId}-${titleDatabase}-${Date.now()}`;
      const newTab: EditorTabItem = {
        id: newTabId,
        type: "editor",
        title: t("app.tab.queryTitle", { database: titleDatabase }),
        connectionId,
        database: initialDatabase,
        driver,
        availableDatabases: normalizeDatabaseOptions(
          initialDatabase ? [initialDatabase] : [],
          initialDatabase,
        ),
        sqlContent: DEFAULT_SQL,
        lastSavedSql: DEFAULT_SQL,
        isDirty: false,
        documentRevision: 0,
        contextRevision: 0,
        queryResults: null,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTab(newTabId);

      Promise.allSettled([
        fetchEditorDatabases(connectionId, initialDatabase),
        fetchEditorSchemaOverview(connectionId, initialDatabase),
        canBrowseSchemas
          ? fetchEditorSchemas(connectionId, initialDatabase)
          : Promise.resolve([]),
      ]).then(
        ([availableDatabasesResult, schemaOverviewResult, schemasResult]) => {
          if (availableDatabasesResult.status === "rejected") {
            console.error(
              "Failed to load editor databases:",
              errorMessage(availableDatabasesResult.reason),
            );
          }
          if (schemaOverviewResult.status === "rejected") {
            console.error(
              "Failed to load schema overview:",
              errorMessage(schemaOverviewResult.reason),
            );
          }

          const availableDatabases =
            availableDatabasesResult.status === "fulfilled"
              ? availableDatabasesResult.value
              : normalizeDatabaseOptions(
                  initialDatabase ? [initialDatabase] : [],
                  initialDatabase,
                );
          const schemaOverview =
            schemaOverviewResult.status === "fulfilled"
              ? schemaOverviewResult.value
              : undefined;
          const availableSchemas =
            schemasResult.status === "fulfilled" ? schemasResult.value : [];
          const currentSchema =
            availableSchemas.length > 0 ? availableSchemas[0] : undefined;

          setTabs((prev) =>
            prev.map((t) =>
              t.id === newTabId
                ? {
                    ...t,
                    database: resolvePreferredDatabase({
                      preferredDatabase: initialDatabase,
                      connectionDatabase: initialDatabase,
                      availableDatabases,
                    }),
                    availableDatabases,
                    schemaOverview,
                    availableSchemas,
                    currentSchema,
                  }
                : t,
            ),
          );
        },
      );
    },
    [
      fetchEditorDatabases,
      fetchEditorSchemaOverview,
      fetchEditorSchemas,
      setActiveTab,
      setTabs,
      t,
    ],
  );

  const handleOpenSavedQuery = useCallback(
    async (query: SavedQuery) => {
      const newTabId = `saved-query-${query.id}`;

      const existingTab = tabs.find(
        (t) =>
          t.id === newTabId ||
          (t.type === "editor" && t.savedQueryId === query.id),
      );
      if (existingTab) {
        setActiveTab(existingTab.id);
        return;
      }

      let connectionId = query.connectionId || undefined;
      let driver: string | undefined = undefined;
      let database: string | undefined = query.database || undefined;

      if (connectionId) {
        try {
          const conns = await api.connections.list();
          const conn = conns.find((c: any) => c.id === connectionId);
          if (conn) {
            driver = conn.dbType;
            if (!database) {
              database = conn.database;
            }

            let availableDatabases = normalizeDatabaseOptions(
              database ? [database] : [],
              conn.database || database,
            );
            try {
              availableDatabases = await fetchEditorDatabases(
                connectionId,
                conn.database || database,
              );
            } catch (e) {
              console.error(
                "Failed to load editor databases for saved query",
                errorMessage(e),
              );
            }
            database = resolvePreferredDatabase({
              preferredDatabase: query.database || undefined,
              connectionDatabase: conn.database || undefined,
              availableDatabases,
            });

            let schemaOverview: SchemaOverview | undefined;
            if (database) {
              try {
                schemaOverview = await fetchEditorSchemaOverview(
                  connectionId,
                  database,
                );
              } catch (e) {
                console.error(
                  "Failed to load schema overview for saved query",
                  errorMessage(e),
                );
              }
            }

            const newTab: EditorTabItem = {
              id: newTabId,
              type: "editor",
              title: query.name,
              connectionId,
              database,
              driver,
              availableDatabases,
              schemaOverview,
              sqlContent: query.query,
              lastSavedSql: query.query,
              isDirty: false,
              documentRevision: 0,
              contextRevision: 0,
              savedQueryId: query.id,
              savedQueryDescription: query.description || undefined,
              queryResults: null,
            };
            setTabs((prev) => [...prev, newTab]);
            setActiveTab(newTabId);
            return;
          }
        } catch (e) {
          console.error(
            "Failed to fetch connection details for saved query",
            e,
          );
        }
      }

      const newTab: EditorTabItem = {
        id: newTabId,
        type: "editor",
        title: query.name,
        connectionId,
        database,
        driver,
        availableDatabases: normalizeDatabaseOptions(
          database ? [database] : [],
          database,
        ),
        sqlContent: query.query,
        lastSavedSql: query.query,
        isDirty: false,
        documentRevision: 0,
        contextRevision: 0,
        savedQueryId: query.id,
        savedQueryDescription: query.description || undefined,
        queryResults: null,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTab(newTabId);
    },
    [
      fetchEditorDatabases,
      fetchEditorSchemaOverview,
      setActiveTab,
      setTabs,
      tabs,
    ],
  );

  const handleSqlChange = useCallback(
    (tabId: string, sql: string) => {
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== tabId) return t;
          if (t.type !== "editor") return t;
          return {
            ...t,
            sqlContent: sql,
            documentRevision: (t.documentRevision ?? 0) + 1,
            isDirty: sql !== (t.lastSavedSql ?? ""),
          };
        }),
      );
    },
    [setTabs],
  );

  const handleExecuteQuery = useCallback(
    async (tabId: string, target: SqlExecutionTarget) => {
      await sqlExecution.execute(tabId, target);
    },
    [sqlExecution],
  );

  const handleCancelQuery = useCallback(
    (tabId: string) => sqlExecution.cancel(tabId),
    [sqlExecution],
  );

  const handleEditorDatabaseChange = useCallback(
    async (tabId: string, database: string) => {
      const tab = tabs.find((item) => item.id === tabId);
      if (!tab || tab.type !== "editor" || !tab.connectionId) return;

      const requestKey = `${tab.connectionId}:${database}:${Date.now()}:${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      schemaOverviewRequestKeysRef.current.set(tabId, requestKey);

      const nextRevision = (tab.contextRevision ?? 0) + 1;
      if (tab.activeExecution) {
        void api.query.cancel(
          String(tab.connectionId),
          tab.activeExecution.snapshot.executionId,
        );
      }
      setTabs((prev) =>
        prev.map((item) =>
          item.id === tabId && item.type === "editor"
            ? {
                ...item,
                title: isDefaultQueryTitle(item.title)
                  ? t("app.tab.queryTitle", { database })
                  : item.title,
                database,
                ...reduceQueryExecutionState(
                  {
                    contextRevision: item.contextRevision ?? 0,
                    activeExecution: item.activeExecution,
                    queryResults: item.queryResults,
                  },
                  {
                    type: "CONTEXT_CHANGED",
                    contextRevision: nextRevision,
                  },
                ),
                schemaOverview: undefined,
                crossDbSchemaCache: undefined,
                availableSchemas: undefined,
                currentSchema: undefined,
              }
            : item,
        ),
      );

      try {
        const canBrowseSchemas =
          isRegisteredDriver(tab.driver) && supportsSchemaBrowsing(tab.driver);
        const schemas = canBrowseSchemas
          ? await fetchEditorSchemas(tab.connectionId, database)
          : [];
        if (schemaOverviewRequestKeysRef.current.get(tabId) !== requestKey)
          return;
        const currentSchema = schemas.length > 0 ? schemas[0] : undefined;

        const schemaOverview =
          canBrowseSchemas && currentSchema
            ? await fetchEditorSchemaOverview(
                tab.connectionId,
                database,
                currentSchema,
              )
            : await fetchEditorSchemaOverview(tab.connectionId, database);
        if (schemaOverviewRequestKeysRef.current.get(tabId) !== requestKey)
          return;

        setTabs((prev) =>
          prev.map((item) =>
            item.id === tabId
              ? {
                  ...item,
                  schemaOverview,
                  availableSchemas: schemas,
                  currentSchema,
                }
              : item,
          ),
        );
      } catch (e) {
        if (schemaOverviewRequestKeysRef.current.get(tabId) !== requestKey)
          return;
        const message = errorMessage(e);
        console.error("Failed to switch editor database", message);
        toast.error(t("app.error.loadSchemaOverview"), {
          description: message,
        });
      }
    },
    [fetchEditorSchemaOverview, fetchEditorSchemas, t, tabs, setTabs],
  );

  const handleCrossDbSchemaLoad = useCallback(
    async (tabId: string, dbName: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab || tab.type !== "editor" || !tab.connectionId) return;

      try {
        const schemaOverview = await fetchEditorSchemaOverview(
          tab.connectionId,
          dbName,
        );
        setTabs((prev) =>
          prev.map((t) =>
            t.id === tabId && t.type === "editor"
              ? {
                  ...t,
                  crossDbSchemaCache: new Map([
                    ...(t.crossDbSchemaCache || []),
                    [dbName, schemaOverview],
                  ]),
                }
              : t,
          ),
        );
      } catch (e) {
        console.error(
          `Failed to load schema overview for cross-DB "${dbName}":`,
          errorMessage(e),
        );
      }
    },
    [fetchEditorSchemaOverview, setTabs, tabs],
  );

  const handleEditorSchemaChange = useCallback(
    async (tabId: string, schema: string) => {
      const tab = tabs.find((item) => item.id === tabId);
      if (!tab || tab.type !== "editor" || !tab.connectionId) return;

      const nextRevision = (tab.contextRevision ?? 0) + 1;
      if (tab.activeExecution) {
        void api.query.cancel(
          String(tab.connectionId),
          tab.activeExecution.snapshot.executionId,
        );
      }
      setTabs((prev) =>
        prev.map((item) =>
          item.id === tabId && item.type === "editor"
            ? {
                ...item,
                currentSchema: schema,
                ...reduceQueryExecutionState(
                  {
                    contextRevision: item.contextRevision ?? 0,
                    activeExecution: item.activeExecution,
                    queryResults: item.queryResults,
                  },
                  {
                    type: "CONTEXT_CHANGED",
                    contextRevision: nextRevision,
                  },
                ),
              }
            : item,
        ),
      );

      try {
        const schemaOverview = await fetchEditorSchemaOverview(
          tab.connectionId,
          tab.database,
          schema,
        );
        setTabs((prev) =>
          prev.map((item) =>
            item.id === tabId ? { ...item, schemaOverview } : item,
          ),
        );
      } catch (e) {
        console.error(
          "Failed to load schema overview for schema:",
          schema,
          errorMessage(e),
        );
      }
    },
    [fetchEditorSchemaOverview, setTabs, tabs],
  );

  const saveEditorTab = useCallback(
    async (tab: EditorTabItem, name: string, description: string) => {
      try {
        const query = tab.sqlContent || "";
        const payload = {
          name,
          description,
          query,
          connectionId: tab.connectionId || undefined,
          database: tab.database,
        };

        const savedQuery = tab.savedQueryId
          ? await api.queries.update(tab.savedQueryId, payload)
          : await api.queries.create(payload);

        setQueriesLastUpdated(Date.now());
        setTabs((prev) =>
          prev.map((t) =>
            t.id === tab.id
              ? {
                  ...t,
                  savedQueryId: savedQuery.id,
                  title: savedQuery.name,
                  savedQueryDescription: savedQuery.description || undefined,
                  sqlContent: savedQuery.query,
                  lastSavedSql: savedQuery.query,
                  isDirty: false,
                }
              : t,
          ),
        );
      } catch (e) {
        toast.error(t("app.error.saveQuery"), {
          description: errorMessage(e),
        });
        throw e;
      }
    },
    [setQueriesLastUpdated, setTabs, t],
  );

  return {
    fetchEditorDatabases,
    fetchEditorSchemaOverview,
    handleCreateQuery,
    handleOpenSavedQuery,
    handleSqlChange,
    handleExecuteQuery,
    handleCancelQuery,
    handleEditorDatabaseChange,
    handleEditorSchemaChange,
    handleCrossDbSchemaLoad,
    saveEditorTab,
  };
}

function isDefaultQueryTitle(title?: string) {
  return !!title && /^(Query \(|查询（|クエリ（)/.test(title);
}
