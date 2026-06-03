import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  Database,
  Table2 as TableIcon,
  Key,
  Copy,
  Edit3,
  Plus,
  RefreshCw,
  Play,
  Loader2,
  Trash2,
  FileCode,
  Search,
  Download,
  FolderOpen,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { api, getImportDriverCapability } from "@/services/api";
import type {
  ConnectionForm,
  Driver,
  RoutineType,
  SavedQuery,
  EventInfo,
  SequenceInfo,
  TypeInfo,
  SynonymInfo,
  PackageInfo,
} from "@/services/api";
import type { DatabaseGroupConfig } from "@/lib/tree-adapters/types";
import {
  getConnectionIcon,
  supportsSchemaBrowsing,
  getTreeConfig,
} from "@/lib/driver-registry";
import type { TreeCallbacks } from "@/lib/tree-adapters/types.tsx";
import { toast } from "sonner";
import { TreeNode } from "./connection-list/TreeNode";
import { ConnectionDialog } from "./connection-list/ConnectionDialog";
import { ImportDialog } from "./ImportDialog";
import { ConnectionContextMenu } from "./ConnectionContextMenu";
import { renderConnectionStatusIndicator } from "./connection-list/helpers";
import { useConnectionCrud } from "./hooks/useConnectionCrud";
import { useTreeDataFetching } from "./hooks/useTreeDataFetching";
import { useConnectionForm } from "./hooks/useConnectionForm";
import { useTranslation } from "react-i18next";
import { CreateElasticsearchIndexDialog } from "@/components/business/Elasticsearch/CreateElasticsearchIndexDialog";
import {
  elasticsearchIndexActionSuccessMessage,
  executeElasticsearchIndexAction,
  type ElasticsearchIndexAction,
} from "@/components/business/Elasticsearch/elasticsearch-index-management";
import type {
  TableInfo,
  SchemaInfo,
  DatabaseInfo,
  DatabaseExportFormat,
  Connection,
  SelectedTableNode,
  DatasourceTreeAdapter,
} from "./connection-list/types";
import { useTreeExpansion } from "./hooks/useTreeExpansion";
import { useRedisKeys } from "./hooks/useRedisKeys";
import { useImportExport } from "./hooks/useImportExport";
import { useCreateDatabase } from "./hooks/useCreateDatabase";
import { CreateDatabaseDialog } from "./connection-list/CreateDatabaseDialog";
import { TableExportDialog, DatabaseExportDialog } from "./connection-list/ExportDialogs";
import { ImportConfirmDialog } from "./connection-list/ImportConfirmDialog";

interface ConnectionListProps {
  onTableSelect?: (
    connection: string,
    database: string,
    table: string,
    connectionId: number,
    driver: string,
    schema?: string,
  ) => void;
  onConnect?: (form: ConnectionForm) => void;
  onCreateQuery?: (
    connectionId: number,
    databaseName: string,
    driver: string,
  ) => void;
  onRoutineSelect?: (
    connection: string,
    database: string,
    schema: string,
    name: string,
    routineType: RoutineType,
    connectionId: number,
    driver: string,
  ) => void;
  onExportTable?: (
    ctx: {
      connectionId: number;
      database: string;
      schema: string;
      table: string;
      driver: string;
    },
    format: "csv" | "json" | "sql_dml" | "sql_ddl" | "sql_full",
    filePath: string,
  ) => void;
  onExportDatabase?: (ctx: {
    connectionId: number;
    database: string;
    driver: string;
    format: DatabaseExportFormat;
    filePath: string;
  }) => void;
  onCreateTable?: (
    connectionId: number,
    database: string,
    schema: string,
    driver: string,
  ) => void;
  onAlterTable?: (
    connectionId: number,
    database: string,
    schema: string,
    table: string,
    driver: string,
  ) => void;
  activeTableTarget?: {
    connectionId: number;
    database: string;
    table: string;
    schema?: string;
  };
  sidebarRevealRequest?: {
    id: number;
    connectionId: number;
    database: string;
    table: string;
    schema?: string;
  };
  onSelectSavedQuery?: (query: SavedQuery) => void;
  lastUpdated?: number;
  showSavedQueriesInTree?: boolean;
  redisRefreshRequest?: RedisRefreshRequest;
  treeCallbacks?: TreeCallbacks;
  simpleMode?: boolean;
}

export interface RedisRefreshRequest {
  id: number;
  connectionId: number;
  database: string;
}

export function ConnectionList({
  onTableSelect,
  onConnect,
  onCreateQuery,
  onExportTable,
  onExportDatabase,
  onCreateTable,
  onAlterTable,
  activeTableTarget,
  sidebarRevealRequest,
  onSelectSavedQuery,
  lastUpdated,
  showSavedQueriesInTree = false,
  redisRefreshRequest,
  treeCallbacks,
  simpleMode = false,
}: ConnectionListProps) {
  const { t } = useTranslation();
  const tableNodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const handledRevealRequestIdRef = useRef<number | null>(null);
  const handledRedisRefreshIdRef = useRef<number | null>(null);
  const {
    expandedConnections,
    setExpandedConnections,
    expandedDatabases,
    setExpandedDatabases,
    expandedDatabaseGroups,
    setExpandedDatabaseGroups,
    expandedQueryGroups,
    setExpandedQueryGroups,
    expandedSchemas,
    setExpandedSchemas,
    expandedGroupNodes,
    expandedTables,
    setExpandedTables,
    connectionsRef,
    expandedDatabasesRef,
    toggleConnection,
    toggleDatabase,
    toggleQueryGroup,
    toggleDatabaseGroup,
    toggleSchema,
    toggleGroupNode,
    toggleTable,
  } = useTreeExpansion();

  const {
    connections,
    setConnections,
    isLoadingConnections,
    isDeleting,
    deleteTargetConnectionId,
    setDeleteTargetConnectionId,
    fetchConnections,
    connectConnection,
    fetchAndSetDatabases,
    clearConnectionTreeCache,
    handleReconnect,
    handleDuplicateConnection,
    handleDeleteConnection,
  } = useConnectionCrud({
    setExpandedConnections,
    setExpandedDatabases,
    setExpandedSchemas,
    setExpandedTables,
    listDatabases: (connection) =>
      getDatasourceTreeAdapter(connection).listDatabases(),
  });

  const {
    databaseEvents,
    databaseSequences,
    databaseTypes,
    databaseSynonyms,
    databasePackages,
    loadingDatabaseKeys,
    setLoadingDatabaseKeys,
    loadingTableKeys,
    setLoadingTableKeys,
    fetchSqlTablesAsTableInfo,
    fetchAndSetTables,
    fetchAndSetTableColumns,
    handleRefreshDatabaseTables,
  } = useTreeDataFetching({
    connections,
    setConnections,
    setExpandedSchemas,
    setExpandedTables,
    getAdapter: (connection) => getDatasourceTreeAdapter(connection),
  });

  const {
    isDialogOpen,
    setIsDialogOpen,
    isImportDialogOpen,
    setIsImportDialogOpen,
    dialogMode,
    createStep,
    setCreateStep,
    form,
    setForm,
    validationMsg,
    testMsg,
    requiredOk,
    isTesting,
    isConnecting,
    isSavingEdit,
    handleTestConnection,
    handleDialogSubmit,
    closeConnectionDialog,
    openCreateDialog,
    openEditDialog,
    handleCreateDriverSelect,
    handlePickSslCaCertFile,
    handlePickSshKeyFile,
    handlePickDatabaseFile,
  } = useConnectionForm({
    connections,
    setConnections,
    fetchConnections,
    onConnect,
  });

  const {
    isCreatingDatabase,
    isCreateDbDialogOpen,
    showCreateDbAdvanced,
    setShowCreateDbAdvanced,
    createDbValidationMsg,
    createDbForm,
    setCreateDbForm,
    mysqlCharsets,
    mysqlCollations,
    loadingMysqlOptions,
    supportsCreateDatabaseForDriver,
    isMySqlFamilyCreateDb,
    isPostgresCreateDb,
    isMssqlCreateDb,
    openCreateDatabaseDialog,
    handleCreateDatabase,
    closeCreateDbDialog,
  } = useCreateDatabase({
    connections,
    setExpandedConnections,
    clearConnectionTreeCache,
    fetchAndSetDatabases,
  });

  // Update refs every render so effects can read latest values without
  // listing them as deps (avoids re-firing on every connection state update).
  connectionsRef.current = connections;
  expandedDatabasesRef.current = expandedDatabases;
  const [selectedTableNode, setSelectedTableNode] =
    useState<SelectedTableNode | null>(null);
  const selectedTableKey = selectedTableNode?.key ?? null;
  const [autoScrollRequest, setAutoScrollRequest] = useState<{
    key: string;
    id: number;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    connectionId: string | null;
    databaseName?: string | null;
    schemaName?: string | null;
    type: "connection" | "database" | "schema";
  }>({ visible: false, x: 0, y: 0, connectionId: null, type: "connection"   });
  const loadingSpinner = (
    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
  );
  const [showElasticsearchSystemIndices, setShowElasticsearchSystemIndices] =
    useState(false);
  const [showMongoSystemCollections, setShowMongoSystemCollections] =
    useState(false);
  const [createEsIndexConnectionId, setCreateEsIndexConnectionId] = useState<
    string | null
  >(null);
  const [isCreateEsIndexDialogOpen, setIsCreateEsIndexDialogOpen] =
    useState(false);
  const [isLoadingQueries, setIsLoadingQueries] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { loadRedisKeysPage } = useRedisKeys({
    connectionsRef,
    setConnections,
    searchTerm,
  });
  const [savedQueriesByConnection, setSavedQueriesByConnection] = useState<
    Record<string, SavedQuery[]>
  >({});

  const {
    isImportingSql,
    pendingImport,
    setPendingImport,
    isImportConfirmOpen,
    setIsImportConfirmOpen,
    pendingDatabaseExport,
    setPendingDatabaseExport,
    isDatabaseExportDialogOpen,
    setIsDatabaseExportDialogOpen,
    isExportingDatabaseSql,
    pendingTableExport,
    setPendingTableExport,
    isTableExportDialogOpen,
    setIsTableExportDialogOpen,
    isExportingTable,
    tableExportFormat,
    setTableExportFormat,
    handleTableExportDialog,
    handleTableExportConfirm,
    handleDatabaseImport,
    handleDatabaseExport,
    handleConfirmDatabaseExport,
    handleConfirmImport,
  } = useImportExport({
    connections,
    onExportTable,
    onExportDatabase,
    handleRefreshDatabaseTables,
  });


  const supportsSchemaNodeForDriver = (driver: Driver) =>
    supportsSchemaBrowsing(driver);
  const getSchemaNodeKey = (databaseKey: string, schema: string) =>
    `${databaseKey}::${schema}`;
  const getTableNodeKey = (
    connectionId: string,
    databaseName: string,
    schemaName: string,
    tableName: string,
  ) => `${connectionId}-${databaseName}-${schemaName}-${tableName}`;

  const getConnectionStatusLabel = (connection: Connection) => {
    if (connection.connectState === "success") {
      return t("connection.status.connected");
    }
    if (connection.connectState === "error") {
      if (connection.connectError) {
        return t("connection.status.failedWithReason", {
          error: connection.connectError,
        });
      }
      return t("connection.status.failed");
    }
    if (connection.connectState === "connecting") {
      return t("connection.status.connecting");
    }
    return t("connection.status.idle");
  };

  const filteredConnections = useMemo(() => {
    if (!searchTerm) return connections;
    const lowerTerm = searchTerm.toLowerCase();
    return connections
      .map((conn) => {
        const filteredDbs = conn.databases
          .map((db) => {
            const filteredSchemas = db.schemas
              .map((schema) => {
                const filteredTables = schema.tables.filter((t) =>
                  t.name.toLowerCase().includes(lowerTerm),
                );
                const filteredProcedures = schema.procedures.filter((routine) =>
                  routine.name.toLowerCase().includes(lowerTerm),
                );
                const filteredFunctions = schema.functions.filter((routine) =>
                  routine.name.toLowerCase().includes(lowerTerm),
                );
                if (
                  filteredTables.length > 0 ||
                  filteredProcedures.length > 0 ||
                  filteredFunctions.length > 0
                ) {
                  return {
                    ...schema,
                    tables: filteredTables,
                    procedures: filteredProcedures,
                    functions: filteredFunctions,
                  };
                }
                return null;
              })
              .filter(Boolean) as SchemaInfo[];
            const filteredTables = db.tables.filter((t) =>
              t.name.toLowerCase().includes(lowerTerm),
            );
            if (filteredSchemas.length > 0 || filteredTables.length > 0) {
              return {
                ...db,
                schemas: filteredSchemas,
                tables: filteredTables,
              };
            }
            return null;
          })
          .filter(Boolean) as DatabaseInfo[];

        const hasMatchingQuery =
          showSavedQueriesInTree &&
          (savedQueriesByConnection[conn.id] || []).some((query) =>
            query.name.toLowerCase().includes(lowerTerm),
          );

        if (filteredDbs.length > 0 || hasMatchingQuery) {
          return { ...conn, databases: filteredDbs };
        }
        return null;
      })
      .filter(Boolean) as Connection[];
  }, [
    connections,
    savedQueriesByConnection,
    searchTerm,
    showSavedQueriesInTree,
  ]);

  useEffect(() => {
    if (searchTerm) {
      setExpandedConnections((prev) => {
        const next = new Set(prev);
        filteredConnections.forEach((conn) => {
          next.add(conn.id);
        });
        return next;
      });
      setExpandedDatabases((prev) => {
        const next = new Set(prev);
        filteredConnections.forEach((conn) => {
          conn.databases.forEach((db) => {
            next.add(`${conn.id}-${db.name}`);
          });
        });
        return next;
      });
      setExpandedSchemas((prev) => {
        const next = new Set(prev);
        filteredConnections.forEach((conn) => {
          conn.databases.forEach((db) => {
            const databaseKey = `${conn.id}-${db.name}`;
            db.schemas.forEach((schema) => {
              next.add(getSchemaNodeKey(databaseKey, schema.name));
            });
          });
      });
      return next;
    });
    if (showSavedQueriesInTree) {
        setExpandedDatabaseGroups((prev) => {
          const next = new Set(prev);
          filteredConnections.forEach((conn) => {
            next.add(`${conn.id}::databases`);
          });
          return next;
        });
        setExpandedQueryGroups((prev) => {
          const next = new Set(prev);
          filteredConnections.forEach((conn) => {
            next.add(`${conn.id}::queries`);
          });
          return next;
        });
      }
    }
  }, [searchTerm, filteredConnections, showSavedQueriesInTree]);

  useEffect(() => {
    fetchConnections();
  }, []);

  useEffect(() => {
    if (!showSavedQueriesInTree) return;
    void fetchSavedQueriesByConnection();
  }, [showSavedQueriesInTree, lastUpdated]);

  const fetchSavedQueriesByConnection = async () => {
    setIsLoadingQueries(true);
    try {
      const queries = await api.queries.list();
      const grouped: Record<string, SavedQuery[]> = {};
      queries.forEach((query) => {
        if (!query.connectionId) return;
        const key = String(query.connectionId);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(query);
      });
      Object.values(grouped).forEach((items) =>
        items.sort((a, b) => a.name.localeCompare(b.name)),
      );
      setSavedQueriesByConnection(grouped);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("Failed to fetch saved queries for tree", message);
      toast.error(t("connection.toast.loadQueriesFailed"), {
        description: message,
      });
    } finally {
      setIsLoadingQueries(false);
    }
  };

  useEffect(() => {
    connectionsRef.current.forEach((conn) => {
      if (getDatasourceTreeAdapter(conn).isDatabaseExpandable) return;
      conn.databases.forEach((db) => {
        const dbKey = `${conn.id}-${db.name}`;
        if (!expandedDatabasesRef.current.has(dbKey) || db.tables.length === 0)
          return;
        void loadRedisKeysPage(conn.id, db.name, "0", false);
      });
    });
  }, [searchTerm, loadRedisKeysPage]);

  const openCreateElasticsearchIndexDialog = (
    connectionId: string,
    _databaseName = "Indices",
  ) => {
    const connection = connections.find((conn) => conn.id === connectionId);
    if (!connection || connection.type !== "elasticsearch") return;
    setCreateEsIndexConnectionId(connectionId);
    setIsCreateEsIndexDialogOpen(true);
  };

  const handleElasticsearchIndexAction = async (
    connectionId: string,
    databaseName: string,
    index: string,
    action: ElasticsearchIndexAction,
  ) => {
    if (action === "delete" && !window.confirm(`Delete index "${index}"?`)) {
      return;
    }

    try {
      await executeElasticsearchIndexAction(
        Number(connectionId),
        index,
        action,
      );
      toast.success(elasticsearchIndexActionSuccessMessage(action, index));
      await handleRefreshDatabaseTables(connectionId, databaseName);
    } catch (e) {
      toast.error(`Failed to ${action} Elasticsearch index`, {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const handleOpenERDiagram = useCallback(
    (connectionId: string, database: string) => {
      treeCallbacks?.onOpenERDiagram?.({
        connectionId,
        connectionName: "",
        connectionType: "" as any,
        driverKind: "sql" as any,
        databaseName: database,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const getDatasourceTreeAdapter = (
    connection: Connection,
  ): DatasourceTreeAdapter => {
    const config = getTreeConfig(connection.type, treeCallbacks);
    const driverKind =
      connection.type === "redis"
        ? "kv"
        : connection.type === "elasticsearch"
          ? "search"
          : connection.type === "mongodb"
            ? "document"
            : "sql";

    // Build context for callbacks
    const buildContext = () => ({
      connectionId: connection.id,
      connectionName: connection.name,
      connectionType: connection.type,
      driverKind: driverKind as any,
    });

    // Wrap treeCallbacks with ConnectionList internal functions
    const enhancedCallbacks = {
      ...treeCallbacks,
      onOpenERDiagram: (ctx: any) => {
        handleOpenERDiagram(ctx.connectionId, ctx.databaseName);
      },
      onCreateIndex: (ctx: any) => {
        openCreateElasticsearchIndexDialog(ctx.connectionId, ctx.databaseName);
        treeCallbacks?.onCreateIndex?.(ctx);
      },
      onIndexAction: async (
        ctx: any,
        action: "refresh" | "open" | "close" | "delete",
      ) => {
        await handleElasticsearchIndexAction(
          ctx.connectionId,
          ctx.databaseName,
          ctx.leafName,
          action,
        );
        treeCallbacks?.onIndexAction?.(ctx, action);
      },
    };

    const configWithEnhancedCallbacks = getTreeConfig(
      connection.type,
      enhancedCallbacks,
    );

    return {
      supportsSchemaNode: config.supportsSchemaNode,
      isDatabaseExpandable: config.databaseExpandable,
      listDatabases: async () => {
        if (config.virtualDatabases) {
          return config.virtualDatabases;
        }
        if (connection.type === "redis") {
          return (await api.redis.listDatabases(Number(connection.id))).map(
            (db) => db.name,
          );
        }
        if (connection.type === "mongodb") {
          return (await api.mongodb.listDatabases(Number(connection.id))).map(
            (db) => db.name,
          );
        }
        return api.metadata.listDatabasesById(Number(connection.id));
      },
      loadDatabaseChildren: async (databaseName: string) => {
        if (connection.type === "redis") {
          await loadRedisKeysPage(connection.id, databaseName, "0", false);
          return [];
        }
        if (connection.type === "elasticsearch") {
          const indices = await api.elasticsearch.listIndices(
            Number(connection.id),
          );
          return indices
            .filter(
              (index) =>
                showElasticsearchSystemIndices ||
                !index.isSystem ||
                searchTerm.trim().startsWith("."),
            )
            .map((index) => ({
              name: index.name,
              schema: "Indices",
              columns: [],
              isSystem: index.isSystem,
              indexStatus: index.status,
            }));
        }
        if (connection.type === "mongodb") {
          const collections = await api.mongodb.listCollections(
            Number(connection.id),
            databaseName,
          );
          return collections
            .filter(
              (col) =>
                showMongoSystemCollections ||
                !col.name.startsWith("system.") ||
                searchTerm.trim().startsWith("system"),
            )
            .map((col) => ({
              name: col.name,
              schema: databaseName,
              columns: [],
              isSystem: col.name.startsWith("system."),
            }));
        }
        return fetchSqlTablesAsTableInfo(connection.id, databaseName);
      },
      shouldSkipTableColumns: driverKind !== "sql",
      getItemIcon: config.leafNodeIcon,
      onItemActivate: (database, table) => {
        const ctx = {
          ...buildContext(),
          databaseName: database.name,
          leafName: table.name,
          leafSchema: table.schema,
          leafMeta: {
            isSystem: table.isSystem,
            indexStatus: table.indexStatus,
          },
        };

        if (configWithEnhancedCallbacks.onLeafActivate) {
          configWithEnhancedCallbacks.onLeafActivate(ctx);
          return;
        }

        // Default SQL behavior
        if (driverKind === "sql") {
          onTableSelect?.(
            connection.name,
            database.name,
            table.name,
            Number(connection.id),
            connection.type,
            table.schema,
          );
        }
      },
      getDatabaseRowActions: (database) => {
        if (!configWithEnhancedCallbacks.getDatabaseActions) return undefined;
        const ctx = {
          ...buildContext(),
          databaseName: database.name,
          databaseMeta: {
            redisKeyCount: database.redisKeyCount,
            redisCursor: database.redisCursor,
            redisIsPartial: database.redisIsPartial,
            redisRequiresPattern: database.redisRequiresPattern,
          },
        };
        return configWithEnhancedCallbacks.getDatabaseActions(ctx);
      },
      onDatabaseDoubleClick: configWithEnhancedCallbacks.onDatabaseDoubleClick
        ? (database) => {
            const ctx = {
              ...buildContext(),
              databaseName: database.name,
              databaseMeta: {
                redisKeyCount: database.redisKeyCount,
              },
            };
            configWithEnhancedCallbacks.onDatabaseDoubleClick!(ctx);
          }
        : undefined,
      renderDatabaseFooter: (database, level) => {
        // Redis footer with pagination
        if (connection.type === "redis") {
          const indent = `${(level + 1) * 12 + 8}px`;
          if (database.redisRequiresPattern) {
            return (
              <span
                key="redis-pattern-required"
                className="block px-3 py-1 text-xs text-muted-foreground"
                style={{ paddingLeft: indent }}
              >
                Enter a search pattern to browse cluster keys safely
              </span>
            );
          }
          if (!database.redisIsPartial) return null;
          return database.redisCursor !== "0" ? (
            <button
              key="redis-load-more"
              className="block w-full px-3 py-1 text-left text-xs text-muted-foreground hover:text-foreground"
              style={{ paddingLeft: indent }}
              onClick={() =>
                void loadRedisKeysPage(
                  connection.id,
                  database.name,
                  database.redisCursor!,
                  true,
                )
              }
            >
              Load more…
            </button>
          ) : (
            <span
              key="redis-capped"
              className="block px-3 py-1 text-xs text-muted-foreground"
              style={{ paddingLeft: indent }}
            >
              Results capped — use a pattern to narrow down
            </span>
          );
        }

        // Elasticsearch footer with system indices toggle
        if (connection.type === "elasticsearch") {
          return (
            <label
              key="elasticsearch-system-indices"
              className="flex items-center gap-2 px-3 py-1 text-xs text-muted-foreground"
              style={{ paddingLeft: `${(level + 1) * 12 + 8}px` }}
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={showElasticsearchSystemIndices}
                onCheckedChange={(checked) =>
                  setShowElasticsearchSystemIndices(checked === true)
                }
              />
              Show system indices
            </label>
          );
        }

        // MongoDB footer with system collections toggle
        if (connection.type === "mongodb") {
          return (
            <label
              key="mongodb-system-collections"
              className="flex items-center gap-2 px-3 py-1 text-xs text-muted-foreground"
              style={{ paddingLeft: `${(level + 1) * 12 + 8}px` }}
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={showMongoSystemCollections}
                onCheckedChange={(checked) =>
                  setShowMongoSystemCollections(checked === true)
                }
              />
              Show system collections
            </label>
          );
        }

        return null;
      },
      renderTableContextMenu: (database, table) => {
        // SQL class databases - use internal functions for export
        if (driverKind === "sql") {
          return (
            <>
              <ContextMenuItem
                onClick={() =>
                  handleCreateQueryFromContext(connection.id, database.name)
                }
              >
                <FileCode className="mr-2 h-4 w-4" />
                {t("connection.menu.newQuery")}
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() =>
                  handleTableExportDialog(connection, database, table)
                }
              >
                <Download className="mr-2 h-4 w-4" />
                {t("connection.menu.exportTable")}
              </ContextMenuItem>
              {onAlterTable ? (
                <ContextMenuItem
                  onClick={() =>
                    onAlterTable(
                      Number(connection.id),
                      database.name,
                      table.schema ?? "",
                      table.name,
                      connection.type,
                    )
                  }
                >
                  <TableIcon className="mr-2 h-4 w-4" />
                  {t("connection.menu.alterTable")}
                </ContextMenuItem>
              ) : null}
            </>
          );
        }

        // Non-SQL databases - use treeConfig
        if (!configWithEnhancedCallbacks.getLeafContextMenuItems) return null;
        const ctx = {
          ...buildContext(),
          databaseName: database.name,
          leafName: table.name,
          leafSchema: table.schema,
          leafMeta: {
            isSystem: table.isSystem,
            indexStatus: table.indexStatus,
          },
        };
        const items = configWithEnhancedCallbacks.getLeafContextMenuItems(ctx);
        if (items.length === 0) return null;
        return (
          <>
            {items.map((item) => (
              <ContextMenuItem
                key={item.key}
                className={item.destructive ? "text-destructive" : ""}
                onClick={item.onClick}
              >
                {item.icon}
                {item.label}
              </ContextMenuItem>
            ))}
          </>
        );
      },
      renderDatabaseContextMenu:
        configWithEnhancedCallbacks.getDatabaseContextMenuItems
          ? (databaseName) => {
              const ctx = {
                ...buildContext(),
                databaseName,
              };
              const items =
                configWithEnhancedCallbacks.getDatabaseContextMenuItems!(ctx);
              return (
                <>
                  {items.map((item) => (
                    <button
                      key={item.key}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                      onClick={() => {
                        item.onClick();
                        setContextMenu((prev) => ({ ...prev, visible: false }));
                      }}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
                </>
              );
            }
          : undefined,
      databaseGroups: config.databaseGroups,
    };
  };

  // Sync UI state (expansion, selection) and load data if needed.
  useEffect(() => {
    if (!activeTableTarget) {
      setSelectedTableNode(null);
      return;
    }

    const connectionId = String(activeTableTarget.connectionId);
    const databaseName = activeTableTarget.database;
    const tableName = activeTableTarget.table;
    const schemaName = activeTableTarget.schema || "";
    const dbKey = `${connectionId}-${databaseName}`;
    let cancelled = false;

    setExpandedConnections((prev) => {
      const next = new Set(prev);
      next.add(connectionId);
      return next;
    });
    setExpandedDatabases((prev) => {
      const next = new Set(prev);
      next.add(dbKey);
      return next;
    });

    const ensureDatabaseTablesLoaded = async () => {
      const targetConnection = connections.find(
        (conn) => conn.id === connectionId,
      );
      const targetDatabase = targetConnection?.databases.find(
        (db) => db.name === databaseName,
      );
      if (!targetDatabase) return;

      const supportsSchemaNode = supportsSchemaNodeForDriver(
        targetConnection?.type || "postgres",
      );
      const hasLoadedTables = supportsSchemaNode
        ? targetDatabase.schemas.length > 0
        : targetDatabase.tables.length > 0;
      let availableTables = supportsSchemaNode
        ? targetDatabase.schemas.flatMap((schema) => schema.tables)
        : targetDatabase.tables;
      if (!hasLoadedTables) {
        availableTables = await fetchAndSetTables(connectionId, databaseName);
      }
      if (cancelled) return;
      const resolvedSchema =
        schemaName ||
        availableTables.find((table) => table.name === tableName)?.schema ||
        "";
      if (supportsSchemaNode && resolvedSchema) {
        setExpandedSchemas((prev) => {
          const next = new Set(prev);
          next.add(getSchemaNodeKey(dbKey, resolvedSchema));
          return next;
        });
      }
      const resolvedTableKey = getTableNodeKey(
        connectionId,
        databaseName,
        resolvedSchema,
        tableName,
      );
      setSelectedTableNode({
        key: resolvedTableKey,
        connectionId: activeTableTarget.connectionId,
        database: databaseName,
        table: tableName,
        schema: resolvedSchema,
      });
    };

    void ensureDatabaseTablesLoaded();
    return () => {
      cancelled = true;
    };
  }, [activeTableTarget, connections]);

  useEffect(() => {
    if (!sidebarRevealRequest || !activeTableTarget || !selectedTableNode)
      return;
    if (handledRevealRequestIdRef.current === sidebarRevealRequest.id) return;
    if (
      sidebarRevealRequest.connectionId !== activeTableTarget.connectionId ||
      sidebarRevealRequest.database !== activeTableTarget.database ||
      sidebarRevealRequest.table !== activeTableTarget.table
    ) {
      return;
    }
    if (
      selectedTableNode.connectionId !== sidebarRevealRequest.connectionId ||
      selectedTableNode.database !== sidebarRevealRequest.database ||
      selectedTableNode.table !== sidebarRevealRequest.table
    ) {
      return;
    }
    if (
      sidebarRevealRequest.schema &&
      sidebarRevealRequest.schema !== selectedTableNode.schema
    ) {
      return;
    }

    handledRevealRequestIdRef.current = sidebarRevealRequest.id;
    setAutoScrollRequest({
      key: selectedTableNode.key,
      id: sidebarRevealRequest.id,
    });
  }, [activeTableTarget, selectedTableNode, sidebarRevealRequest]);

  useEffect(() => {
    if (!redisRefreshRequest) return;
    if (handledRedisRefreshIdRef.current === redisRefreshRequest.id) return;
    handledRedisRefreshIdRef.current = redisRefreshRequest.id;
    const dbKey = `${String(redisRefreshRequest.connectionId)}-${redisRefreshRequest.database}`;
    if (!expandedDatabasesRef.current.has(dbKey)) return;
    void loadRedisKeysPage(
      String(redisRefreshRequest.connectionId),
      redisRefreshRequest.database,
      "0",
      false,
    );
  }, [redisRefreshRequest, loadRedisKeysPage]);

  useEffect(() => {
    if (!autoScrollRequest) return;
    let cancelled = false;
    let retriesLeft = 12;
    let frame1 = 0;
    let frame2 = 0;

    const run = () => {
      frame1 = requestAnimationFrame(() => {
        frame2 = requestAnimationFrame(() => {
          if (cancelled) return;
          const target = tableNodeRefs.current[autoScrollRequest.key];
          if (target) {
            target.scrollIntoView({
              block: "center",
              inline: "nearest",
              behavior: "auto",
            });
            setAutoScrollRequest((prev) =>
              prev?.id === autoScrollRequest.id ? null : prev,
            );
            return;
          }

          retriesLeft -= 1;
          if (retriesLeft > 0) {
            run();
            return;
          }

          setAutoScrollRequest((prev) =>
            prev?.id === autoScrollRequest.id ? null : prev,
          );
        });
      });
    };

    run();

    return () => {
      cancelled = true;
      if (frame1) cancelAnimationFrame(frame1);
      if (frame2) cancelAnimationFrame(frame2);
    };
  }, [autoScrollRequest]);

  useEffect(() => {
    connections
      .filter(
        (connection) =>
          connection.type === "elasticsearch" &&
          connection.connectState === "success" &&
          expandedDatabases.has(`${connection.id}-Indices`),
      )
      .forEach((connection) => {
        void handleRefreshDatabaseTables(connection.id, "Indices");
      });
    // Re-apply the client-side system-index filter for already opened ES trees.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showElasticsearchSystemIndices]);

  useEffect(() => {
    connections
      .filter(
        (connection) =>
          connection.type === "mongodb" &&
          connection.connectState === "success",
      )
      .forEach((connection) => {
        connection.databases.forEach((db) => {
          if (expandedDatabases.has(`${connection.id}-${db.name}`)) {
            void handleRefreshDatabaseTables(connection.id, db.name);
          }
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMongoSystemCollections]);

  const getGroupItems = (
    database: DatabaseInfo,
    group: DatabaseGroupConfig,
    dbKey: string,
    schema?: SchemaInfo,
  ): { name: string; [key: string]: any }[] => {
    switch (group.source) {
      case "tables": {
        const tables = schema ? schema.tables : (database.tables || []);
        return group.sourceFilter
          ? tables.filter((t) => t.type === group.sourceFilter)
          : tables.filter(
              (t) => t.type === "table" || t.type === "BASE TABLE",
            );
      }
      case "routines": {
        if (schema) {
          const routines = group.sourceFilter === "procedure" 
            ? schema.procedures 
            : schema.functions;
          return routines;
        }
        const routines = database.routines || [];
        return group.sourceFilter
          ? routines.filter((r) => r.type === group.sourceFilter)
          : routines;
      }
      case "events":
        return databaseEvents.get(dbKey) || [];
      case "sequences":
        return databaseSequences.get(dbKey) || [];
      case "types":
        return databaseTypes.get(dbKey) || [];
      case "synonyms":
        return databaseSynonyms.get(dbKey) || [];
      case "packages":
        return databasePackages.get(dbKey) || [];
      default:
        return [];
    }
  };

  const handleTableClick = (
    connection: Connection,
    database: DatabaseInfo,
    table: TableInfo,
  ) => {
    getDatasourceTreeAdapter(connection).onItemActivate(database, table);
  };

  const handleCreateQueryFromContext = (
    connectionId: string | null | undefined,
    databaseName?: string | null,
  ) => {
    if (!onCreateQuery || !connectionId) return;
    const connection = connections.find((c) => c.id === connectionId);
    if (!connection) return;

    const explicitDatabaseName = (databaseName || "").trim();
    const fallbackDatabaseName =
      (connection.database || "").trim() ||
      connection.databases.find((db) => db.name.trim().length > 0)?.name ||
      (connection.type === "sqlite" || connection.type === "duckdb"
        ? "main"
        : "");
    const resolvedDatabaseName = explicitDatabaseName || fallbackDatabaseName;

    if (!resolvedDatabaseName) {
      toast.error(t("connection.toast.newQueryNoDatabase"));
      return;
    }

    onCreateQuery(Number(connectionId), resolvedDatabaseName, connection.type);
  };

  const contextMenuConnection = contextMenu.connectionId
    ? connections.find((conn) => conn.id === contextMenu.connectionId)
    : null;
  const contextMenuDatabaseConnection = contextMenu.connectionId
    ? connections.find((conn) => conn.id === contextMenu.connectionId)
    : null;
  const contextMenuDatabaseAdapter = contextMenuDatabaseConnection
    ? getDatasourceTreeAdapter(contextMenuDatabaseConnection)
    : null;

  return (
    <div className="h-full flex flex-col bg-background border-r border-border">
      <div className="px-2 py-1 border-b border-border flex items-center justify-between h-8">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-sm">{t("connection.title")}</h2>
          {isLoadingQueries && (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={fetchConnections}
            loading={isLoadingConnections}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <ConnectionDialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              if (!open) {
                closeConnectionDialog();
                return;
              }
              setIsDialogOpen(true);
            }}
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={openCreateDialog}
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            }
            dialogMode={dialogMode}
            createStep={createStep}
            form={form}
            setForm={setForm}
            validationMsg={validationMsg}
            testMsg={testMsg}
            requiredOk={requiredOk}
            isTesting={isTesting}
            isConnecting={isConnecting}
            isSavingEdit={isSavingEdit}
            onSubmit={handleDialogSubmit}
            onClose={closeConnectionDialog}
            onTestConnection={handleTestConnection}
            onCreateDriverSelect={handleCreateDriverSelect}
            onBackToType={() => setCreateStep("type")}
            onPickSslCaCertFile={() => void handlePickSslCaCertFile()}
            onPickSshKeyFile={() => void handlePickSshKeyFile()}
            onPickDatabaseFile={(driver) => void handlePickDatabaseFile(driver)}
          />
          <ImportDialog
            open={isImportDialogOpen}
            onOpenChange={setIsImportDialogOpen}
            onImported={fetchConnections}
          />
        </div>
      </div>

      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("connection.searchTables")}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
            className="pl-8"
          />
        </div>
      </div>
      <ConnectionContextMenu
        onNewConnection={openCreateDialog}
        onImportConnection={() => setIsImportDialogOpen(true)}
      >
        {({ onContextMenu }) => (
          <div
            className="flex-1 overflow-auto"
            onClick={() => setContextMenu((prev) => ({ ...prev, visible: false }))}
            onContextMenu={onContextMenu}
          >
            {filteredConnections.map((connection) => {
          const datasourceAdapter = getDatasourceTreeAdapter(connection);
          const queriesForConnection = (
            savedQueriesByConnection[connection.id] || []
          ).filter((query) =>
            query.name.toLowerCase().includes(searchTerm.toLowerCase()),
          );
          const visibleDatabases = connection.databases.filter(
            (database) =>
              !["information_schema", "performance_schema"].includes(
                database.name.toLowerCase(),
              ),
          );

          const renderDatabaseTreeNode = (
            database: DatabaseInfo,
            level: number,
          ) => {
            const dbKey = `${connection.id}-${database.name}`;
            const supportsSchemaNode = datasourceAdapter.supportsSchemaNode;
            const renderTableNode = (table: TableInfo, tableLevel: number, customIcon?: ReactNode) => {
              const tableKey = getTableNodeKey(
                connection.id,
                database.name,
                table.schema,
                table.name,
              );
              return (
                <ContextMenu key={tableKey}>
                  <ContextMenuTrigger asChild>
                    <div
                      ref={(el) => {
                        tableNodeRefs.current[tableKey] = el;
                      }}
                    >
                      <TreeNode
                        level={tableLevel}
                        icon={customIcon || datasourceAdapter.getItemIcon()}
                        label={table.name}
                        isSelected={selectedTableKey === tableKey}
                        isExpanded={expandedTables.has(tableKey)}
                        toggleOnRowClick={false}
                        onToggle={() => {
                          toggleTable(tableKey, () => {
                            const conn = connections.find((c) => c.id === connection.id);
                            if (conn && getDatasourceTreeAdapter(conn).shouldSkipTableColumns) {
                              return;
                            }
                            if (table.columns.length === 0) {
                              setLoadingTableKeys((prev) => new Set(prev).add(tableKey));
                              fetchAndSetTableColumns(
                                connection.id,
                                database.name,
                                table.schema,
                                table.name,
                              ).finally(() => {
                                setLoadingTableKeys((prev) => {
                                  const next = new Set(prev);
                                  next.delete(tableKey);
                                  return next;
                                });
                              });
                            }
                          });
                        }}
                        onDoubleClick={() => {
                          handleTableClick(connection, database, table);
                        }}
                        statusIndicator={
                          loadingTableKeys.has(tableKey) ||
                          table.isSystem ||
                          table.indexStatus === "close" ? (
                            <span className="inline-flex items-center gap-1">
                              {table.indexStatus === "close" ? (
                                <span className="rounded border px-1 text-[10px] leading-4 text-muted-foreground">
                                  closed
                                </span>
                              ) : null}
                              {table.isSystem ? (
                                <span className="rounded border px-1 text-[10px] leading-4 text-muted-foreground">
                                  system
                                </span>
                              ) : null}
                              {loadingTableKeys.has(tableKey)
                                ? loadingSpinner
                                : null}
                            </span>
                          ) : undefined
                        }
                        actions={
                          <div onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() =>
                                handleTableClick(connection, database, table)
                              }
                            >
                              <Play className="w-3 h-3" />
                            </Button>
                          </div>
                        }
                      >
                        {table.columns.map((column) => (
                          <div
                            key={column.name}
                            className="flex items-center gap-1 px-2 py-1 hover:bg-accent text-xs"
                            style={{
                              paddingLeft: `${(tableLevel + 1) * 12 + 8}px`,
                            }}
                          >
                            <span className="w-4" />
                            {column.isPrimaryKey ? (
                              <Key className="w-3 h-3 text-yellow-600 shrink-0" />
                            ) : (
                              <span className="w-3 shrink-0" />
                            )}
                            <span className="flex-1 truncate text-foreground">
                              {column.name}
                            </span>
                            <span className="text-muted-foreground text-xs shrink-0">
                              {column.type}
                            </span>
                          </div>
                        ))}
                      </TreeNode>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    {datasourceAdapter.renderTableContextMenu(database, table)}
                  </ContextMenuContent>
                </ContextMenu>
              );
            };

            const renderEventNode = (
              event: EventInfo,
              nodeLevel: number,
              group: DatabaseGroupConfig,
              conn: Connection,
              database: DatabaseInfo,
            ) => {
              const eventKey = `${conn.id}-${database.name}::event::${event.name}`;
              return (
                <TreeNode
                  key={eventKey}
                  level={nodeLevel}
                  icon={group.leafIcon}
                  label={event.name}
                  hideToggle
                >
                  {null}
                </TreeNode>
              );
            };

            const renderSequenceNode = (
              sequence: SequenceInfo,
              nodeLevel: number,
              group: DatabaseGroupConfig,
              conn: Connection,
              database: DatabaseInfo,
            ) => {
              const seqKey = `${conn.id}-${database.name}::sequence::${sequence.name}`;
              return (
                <TreeNode
                  key={seqKey}
                  level={nodeLevel}
                  icon={group.leafIcon}
                  label={sequence.name}
                  hideToggle
                >
                  {null}
                </TreeNode>
              );
            };

            const renderTypeNode = (
              typeInfo: TypeInfo,
              nodeLevel: number,
              group: DatabaseGroupConfig,
              conn: Connection,
              database: DatabaseInfo,
            ) => {
              const typeKey = `${conn.id}-${database.name}::type::${typeInfo.name}`;
              return (
                <TreeNode
                  key={typeKey}
                  level={nodeLevel}
                  icon={group.leafIcon}
                  label={typeInfo.name}
                  hideToggle
                >
                  {null}
                </TreeNode>
              );
            };

            const renderSynonymNode = (
              item: SynonymInfo,
              nodeLevel: number,
              group: DatabaseGroupConfig,
              conn: Connection,
              database: DatabaseInfo,
            ) => {
              const nodeKey = `${conn.id}-${database.name}-${item.schema}-${item.name}`;
              return (
                <TreeNode
                  key={nodeKey}
                  level={nodeLevel}
                  icon={group.leafIcon}
                  label={item.name}
                  isExpanded={expandedTables.has(nodeKey)}
                  onToggle={() => toggleTable(nodeKey, () => {
                    const c = connections.find((x) => x.id === conn.id);
                    if (c && getDatasourceTreeAdapter(c).shouldSkipTableColumns) {
                      return;
                    }
                    setLoadingTableKeys((prev) => new Set(prev).add(nodeKey));
                    fetchAndSetTableColumns(
                      conn.id,
                      database.name,
                      item.schema,
                      item.name,
                    ).finally(() => {
                      setLoadingTableKeys((prev) => {
                        const next = new Set(prev);
                        next.delete(nodeKey);
                        return next;
                      });
                    });
                  })}
                >
                  {null}
                </TreeNode>
              );
            };

            const renderPackageNode = (
              item: PackageInfo,
              nodeLevel: number,
              group: DatabaseGroupConfig,
              conn: Connection,
              database: DatabaseInfo,
            ) => {
              const nodeKey = `${conn.id}-${database.name}-${item.schema}-${item.name}`;
              return (
                <TreeNode
                  key={nodeKey}
                  level={nodeLevel}
                  icon={group.leafIcon}
                  label={item.name}
                  isExpanded={expandedTables.has(nodeKey)}
                  onToggle={() => toggleTable(nodeKey, () => {
                    const c = connections.find((x) => x.id === conn.id);
                    if (c && getDatasourceTreeAdapter(c).shouldSkipTableColumns) {
                      return;
                    }
                    setLoadingTableKeys((prev) => new Set(prev).add(nodeKey));
                    fetchAndSetTableColumns(
                      conn.id,
                      database.name,
                      item.schema,
                      item.name,
                    ).finally(() => {
                      setLoadingTableKeys((prev) => {
                        const next = new Set(prev);
                        next.delete(nodeKey);
                        return next;
                      });
                    });
                  })}
                >
                  {null}
                </TreeNode>
              );
            };

            const renderGroupNode = (
              group: DatabaseGroupConfig,
              items: { name: string; schema?: string; type?: string; [key: string]: any }[],
              groupLevel: number,
              dbKey: string,
              conn: Connection,
              database: DatabaseInfo,
            ) => {
              const groupNodeKey = `${dbKey}::${group.id}`;
              return (
                <TreeNode
                  key={groupNodeKey}
                  level={groupLevel}
                  icon={group.icon}
                  label={t(group.label)}
                  isExpanded={expandedGroupNodes.has(groupNodeKey)}
                  onToggle={() => toggleGroupNode(groupNodeKey)}
                >
                  {items.length === 0 ? (
                    <div
                      className="px-2 py-1 text-xs text-muted-foreground"
                      style={{ paddingLeft: `${(groupLevel + 1) * 12 + 8}px` }}
                    >
                      {t(`connection.tree.no${group.id.charAt(0).toUpperCase() + group.id.slice(1)}`)}
                    </div>
                  ) : (
                    items.map((item) =>
                      group.source === "events" ? (
                        renderEventNode(item as EventInfo, groupLevel + 1, group, conn, database)
                      ) : group.source === "sequences" ? (
                        renderSequenceNode(item as SequenceInfo, groupLevel + 1, group, conn, database)
                      ) : group.source === "types" ? (
                        renderTypeNode(item as TypeInfo, groupLevel + 1, group, conn, database)
                      ) : group.source === "synonyms" ? (
                        renderSynonymNode(item as SynonymInfo, groupLevel + 1, group, conn, database)
                      ) : group.source === "packages" ? (
                        renderPackageNode(item as PackageInfo, groupLevel + 1, group, conn, database)
                      ) : (
                        renderTableNode(
                          { ...item, schema: item.schema || database.name } as TableInfo,
                          groupLevel + 1,
                          group.leafIcon,
                        )
                      )
                    )
                  )}
                </TreeNode>
              );
            };

            return (
              <TreeNode
                key={dbKey}
                level={level}
                icon={<Database className="w-4 w-4" />}
                label={
                  <>
                    {(connection.type === "sqlite" ||
                      connection.type === "duckdb") &&
                    database.name === "main"
                      ? t(
                          connection.type === "duckdb"
                            ? "connection.duckdbMainLabel"
                            : "connection.sqliteMainLabel",
                        )
                      : database.name}
                    {connection.type === "redis" &&
                      database.redisKeyCount != null && (
                        <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">
                          · {database.redisKeyCount.toLocaleString()}
                        </span>
                      )}
                  </>
                }
                isExpanded={
                  datasourceAdapter.isDatabaseExpandable
                    ? expandedDatabases.has(dbKey)
                    : false
                }
                onToggle={() => toggleDatabase(dbKey, (connId, dbName, key) => {
                  const conn = connections.find((c) => c.id === connId);
                  if (conn) {
                    const db = conn.databases.find((d) => d.name === dbName);
                    if (
                      db &&
                      (supportsSchemaNodeForDriver(conn.type)
                        ? db.schemas.length === 0
                        : db.tables.length === 0)
                    ) {
                      setLoadingDatabaseKeys((prev) => new Set(prev).add(key));
                      fetchAndSetTables(connId, dbName).finally(() => {
                        setLoadingDatabaseKeys((prev) => {
                          const next = new Set(prev);
                          next.delete(key);
                          return next;
                        });
                      });
                    }
                  }
                })}
                toggleOnRowClick={datasourceAdapter.isDatabaseExpandable}
                hideToggle={!datasourceAdapter.isDatabaseExpandable}
                statusIndicator={
                  loadingDatabaseKeys.has(dbKey) ? loadingSpinner : undefined
                }
                actions={datasourceAdapter.getDatabaseRowActions(database)}
                onDoubleClick={
                  datasourceAdapter.onDatabaseDoubleClick
                    ? () => datasourceAdapter.onDatabaseDoubleClick?.(database)
                    : undefined
                }
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu({
                    visible: true,
                    x: e.clientX,
                    y: e.clientY,
                    connectionId: connection.id,
                    databaseName: database.name,
                    type: "database",
                  });
                }}
              >
                {(() => {
                  const allGroups = datasourceAdapter.databaseGroups || [];
                  const dbGroups = simpleMode
                    ? allGroups.filter((g) => g.source === "tables" && !g.sourceFilter)
                    : allGroups;
                  return supportsSchemaNode ? (
                    database.schemas.map((schemaNode) => {
                      const schemaKey = getSchemaNodeKey(dbKey, schemaNode.name);
                      return (
                        <TreeNode
                          key={schemaKey}
                          level={level + 1}
                          icon={<FolderOpen className="w-4 h-4" />}
                          label={schemaNode.name}
                          isExpanded={expandedSchemas.has(schemaKey)}
                          onToggle={() => toggleSchema(schemaKey)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setContextMenu({
                              visible: true,
                              x: e.clientX,
                              y: e.clientY,
                              connectionId: connection.id,
                              databaseName: database.name,
                              schemaName: schemaNode.name,
                              type: "schema",
                            });
                          }}
                        >
                          {dbGroups.map((group) => {
                            const items = getGroupItems(database, group, dbKey, schemaNode);
                            return renderGroupNode(group, items, level + 2, dbKey, connection, database);
                          })}
                        </TreeNode>
                      );
                    })
                  ) : (
                    <>
                      {dbGroups.map((group) => {
                        const items = getGroupItems(database, group, dbKey);
                        return renderGroupNode(group, items, level + 1, dbKey, connection, database);
                      })}
                    {datasourceAdapter.renderDatabaseFooter(database, level)}
                  </>
                  );
                })()}
              </TreeNode>
            );
          };

          return (
            <TreeNode
              key={connection.id}
              level={0}
              icon={getConnectionIcon(connection.type)}
              label={connection.name}
              isExpanded={expandedConnections.has(connection.id)}
              toggleOnRowClick={connection.connectState === "success"}
              onToggle={() => toggleConnection(connection.id, connections)}
              onDoubleClick={() => {
                void connectConnection(connection.id);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({
                  visible: true,
                  x: e.clientX,
                  y: e.clientY,
                  connectionId: connection.id,
                  type: "connection",
                });
              }}
              leadingIndicator={
                <span
                  className="inline-flex items-center justify-center shrink-0"
                  role="status"
                  aria-label={getConnectionStatusLabel(connection)}
                  title={getConnectionStatusLabel(connection)}
                >
                  {renderConnectionStatusIndicator(connection)}
                </span>
              }
            >
              <>
                {showSavedQueriesInTree ? (
                  <TreeNode
                    level={1}
                    icon={<FileCode className="w-4 h-4" />}
                    label={t("connection.tree.queries")}
                    isExpanded={expandedQueryGroups.has(
                      `${connection.id}::queries`,
                    )}
                    onToggle={() =>
                      toggleQueryGroup(`${connection.id}::queries`)
                    }
                    forceShowToggle={queriesForConnection.length > 0}
                    canToggle={queriesForConnection.length > 0}
                  >
                    {queriesForConnection.map((query) => (
                      <TreeNode
                        key={`conn-query-${query.id}`}
                        level={2}
                        icon={<FileCode className="w-4 h-4" />}
                        label={query.name}
                        toggleOnRowClick={false}
                        canToggle={false}
                        onDoubleClick={() => onSelectSavedQuery?.(query)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        {null}
                      </TreeNode>
                    ))}
                  </TreeNode>
                ) : null}

                {connection.connectState === "success" ? (
                  showSavedQueriesInTree ? (
                    <TreeNode
                      level={1}
                      icon={<Database className="w-4 h-4" />}
                      label={t("connection.tree.database")}
                      isExpanded={expandedDatabaseGroups.has(
                        `${connection.id}::databases`,
                      )}
                      onToggle={() =>
                        toggleDatabaseGroup(`${connection.id}::databases`)
                      }
                      forceShowToggle={visibleDatabases.length > 0}
                      canToggle={visibleDatabases.length > 0}
                    >
                      {visibleDatabases.map((database) =>
                        renderDatabaseTreeNode(database, 2),
                      )}
                    </TreeNode>
                  ) : (
                    visibleDatabases.map((database) =>
                      renderDatabaseTreeNode(database, 1),
                    )
                  )
                ) : null}
              </>
            </TreeNode>
          );
        })}
          </div>
        )}
      </ConnectionContextMenu>

      {contextMenu.visible && (
        <div
          className="fixed z-50 min-w-[140px] bg-popover border border-border rounded-md shadow-lg py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.type === "connection" ? (
            <>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                onClick={() => {
                  if (contextMenu.connectionId) {
                    openEditDialog(contextMenu.connectionId);
                  }
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
              >
                <Edit3 className="w-4 h-4" />
                {t("connection.menu.edit")}
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                onClick={async () => {
                  if (contextMenu.connectionId) {
                    await handleDuplicateConnection(contextMenu.connectionId);
                  }
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
              >
                <Copy className="w-4 h-4" />
                {t("connection.menu.copy")}
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                onClick={async () => {
                  if (contextMenu.connectionId) {
                    await handleReconnect(contextMenu.connectionId);
                  }
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
              >
                <RefreshCw className="w-4 h-4" />
                {t("connection.menu.refresh")}
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                onClick={() => {
                  handleCreateQueryFromContext(contextMenu.connectionId);
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
              >
                <FileCode className="w-4 h-4" />
                {t("connection.menu.newQuery")}
              </button>
              {contextMenuConnection &&
              supportsCreateDatabaseForDriver(contextMenuConnection.type) ? (
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                  onClick={() => {
                    openCreateDatabaseDialog(contextMenuConnection.id);
                    setContextMenu((prev) => ({ ...prev, visible: false }));
                  }}
                >
                  <Plus className="w-4 h-4" />
                  {t("connection.menu.newDatabase")}
                </button>
              ) : null}
              <div className="h-px bg-border my-1" />
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent text-destructive flex items-center gap-2"
                onClick={() => {
                  if (contextMenu.connectionId) {
                    setDeleteTargetConnectionId(contextMenu.connectionId);
                  }
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
              >
                <Trash2 className="w-4 h-4" />
                {t("connection.menu.delete")}
              </button>
            </>
          ) : contextMenu.type === "database" ? (
            <>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                onClick={async () => {
                  if (contextMenu.connectionId && contextMenu.databaseName) {
                    await handleRefreshDatabaseTables(
                      contextMenu.connectionId,
                      contextMenu.databaseName,
                    );
                  }
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
              >
                <RefreshCw className="w-4 h-4" />
                {t("connection.menu.refreshTables")}
              </button>
              {contextMenuDatabaseAdapter?.renderDatabaseContextMenu &&
              contextMenu.databaseName ? (
                contextMenuDatabaseAdapter.renderDatabaseContextMenu(
                  contextMenu.databaseName,
                )
              ) : (
                <>
                  {contextMenu.connectionId &&
                  contextMenu.databaseName &&
                  contextMenuDatabaseConnection &&
                  getImportDriverCapability(
                    contextMenuDatabaseConnection.type,
                  ) !== "unsupported" ? (
                    <button
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                      disabled={
                        getImportDriverCapability(
                          contextMenuDatabaseConnection.type,
                        ) === "read_only_not_supported"
                      }
                      onClick={async () => {
                        await handleDatabaseImport(
                          contextMenu.connectionId!,
                          contextMenu.databaseName!,
                        );
                        setContextMenu((prev) => ({ ...prev, visible: false }));
                      }}
                    >
                      <Upload className="w-4 h-4" />
                      {getImportDriverCapability(
                        contextMenuDatabaseConnection.type,
                      ) === "read_only_not_supported"
                        ? t("connection.menu.importSqlReadOnly")
                        : t("connection.menu.importSql")}
                    </button>
                  ) : null}
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                    onClick={async () => {
                      if (
                        contextMenu.connectionId &&
                        contextMenu.databaseName
                      ) {
                        const connection = connections.find(
                          (conn) => conn.id === contextMenu.connectionId,
                        );
                        const database = connection?.databases.find(
                          (db) => db.name === contextMenu.databaseName,
                        );
                        if (connection && database) {
                          await handleDatabaseExport(connection, database);
                        }
                      }
                      setContextMenu((prev) => ({ ...prev, visible: false }));
                    }}
                  >
                    <Download className="w-4 h-4" />
                    {t("connection.menu.exportDatabaseSql")}
                  </button>
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                    onClick={() => {
                      handleCreateQueryFromContext(
                        contextMenu.connectionId,
                        contextMenu.databaseName,
                      );
                      setContextMenu((prev) => ({ ...prev, visible: false }));
                    }}
                  >
                    <FileCode className="w-4 h-4" />
                    {t("connection.menu.newQuery")}
                  </button>
                  {contextMenu.connectionId &&
                  contextMenu.databaseName &&
                  contextMenuDatabaseConnection &&
                  onCreateTable ? (
                    <button
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                      onClick={() => {
                        onCreateTable(
                          Number(contextMenu.connectionId),
                          contextMenu.databaseName!,
                          "",
                          contextMenuDatabaseConnection.type,
                        );
                        setContextMenu((prev) => ({ ...prev, visible: false }));
                      }}
                    >
                      <TableIcon className="w-4 h-4" />
                      {t("connection.menu.newTable")}
                    </button>
                  ) : null}
                </>
              )}
            </>
          ) : contextMenu.type === "schema" ? (
            <>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                onClick={async () => {
                  if (contextMenu.connectionId && contextMenu.databaseName) {
                    await handleRefreshDatabaseTables(
                      contextMenu.connectionId,
                      contextMenu.databaseName,
                    );
                  }
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
              >
                <RefreshCw className="w-4 h-4" />
                {t("connection.menu.refreshTables")}
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                onClick={() => {
                  handleCreateQueryFromContext(
                    contextMenu.connectionId,
                    contextMenu.databaseName,
                  );
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
              >
                <FileCode className="w-4 h-4" />
                {t("connection.menu.newQuery")}
              </button>
              {contextMenu.connectionId &&
              contextMenu.databaseName &&
              contextMenuConnection &&
              onCreateTable ? (
                <button
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
                  onClick={() => {
                    onCreateTable(
                      Number(contextMenu.connectionId),
                      contextMenu.databaseName!,
                      contextMenu.schemaName ?? "",
                      contextMenuConnection.type,
                    );
                    setContextMenu((prev) => ({ ...prev, visible: false }));
                  }}
                >
                  <TableIcon className="w-4 h-4" />
                  {t("connection.menu.newTable")}
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      )}
      <CreateElasticsearchIndexDialog
        open={isCreateEsIndexDialogOpen}
        connectionId={
          createEsIndexConnectionId ? Number(createEsIndexConnectionId) : null
        }
        onOpenChange={(open) => {
          setIsCreateEsIndexDialogOpen(open);
          if (!open) setCreateEsIndexConnectionId(null);
        }}
        onCreated={async () => {
          if (createEsIndexConnectionId) {
            await handleRefreshDatabaseTables(
              createEsIndexConnectionId,
              "Indices",
            );
          }
        }}
      />
      <CreateDatabaseDialog
        isOpen={isCreateDbDialogOpen}
        onClose={closeCreateDbDialog}
        form={createDbForm}
        setForm={setCreateDbForm}
        showAdvanced={showCreateDbAdvanced}
        setShowAdvanced={setShowCreateDbAdvanced}
        validationMsg={createDbValidationMsg}
        isCreating={isCreatingDatabase}
        mysqlCharsets={mysqlCharsets}
        mysqlCollations={mysqlCollations}
        loadingMysqlOptions={loadingMysqlOptions}
        isMySqlFamily={isMySqlFamilyCreateDb}
        isPostgres={isPostgresCreateDb}
        isMssql={isMssqlCreateDb}
        onCreate={handleCreateDatabase}
      />
      <AlertDialog
        open={!!deleteTargetConnectionId}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTargetConnectionId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("connection.deleteDialog.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("connection.deleteDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting || !deleteTargetConnectionId}
              onClick={async (e) => {
                e.preventDefault();
                if (!deleteTargetConnectionId) return;
                await handleDeleteConnection(deleteTargetConnectionId);
              }}
            >
              {isDeleting
                ? t("connection.deleteDialog.deleting")
                : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ImportConfirmDialog
        isOpen={isImportConfirmOpen}
        isImporting={isImportingSql}
        databaseName={pendingImport?.databaseName}
        filePath={pendingImport?.filePath}
        onConfirm={handleConfirmImport}
        onCancel={() => {
          setIsImportConfirmOpen(false);
          if (!isImportingSql) {
            setPendingImport(null);
          }
        }}
      />
      <TableExportDialog
        isOpen={isTableExportDialogOpen}
        onClose={() => {
          setIsTableExportDialogOpen(false);
          if (!isExportingTable) {
            setPendingTableExport(null);
          }
        }}
        format={tableExportFormat}
        setFormat={setTableExportFormat}
        isExporting={isExportingTable}
        onConfirm={handleTableExportConfirm}
        tableName={pendingTableExport?.table.name}
      />
      <DatabaseExportDialog
        isOpen={isDatabaseExportDialogOpen}
        onClose={() => {
          setIsDatabaseExportDialogOpen(false);
          if (!isExportingDatabaseSql) {
            setPendingDatabaseExport(null);
          }
        }}
        isExporting={isExportingDatabaseSql}
        onConfirm={handleConfirmDatabaseExport}
        databaseName={pendingDatabaseExport?.databaseName}
        format={pendingDatabaseExport?.format || "sql_full"}
        onFormatChange={(value: DatabaseExportFormat) =>
          setPendingDatabaseExport((prev) =>
            prev ? { ...prev, format: value } : prev,
          )
        }
      />
    </div>
  );
}
