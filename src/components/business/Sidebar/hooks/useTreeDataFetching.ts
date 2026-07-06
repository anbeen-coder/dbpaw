import { useState } from "react";
import { api } from "@/services/api";
import type {
  Connection,
  TableInfo,
  RoutineInfo,
  SchemaInfo,
  DatasourceTreeAdapter,
} from "../connection-list/types";
import type {
  EventInfo,
  SequenceInfo,
  TypeInfo,
  SynonymInfo,
  PackageInfo,
} from "@/services/api";
import { decodeCapabilities } from "@/lib/driver-capabilities";
import { groupSqlObjectsBySchema } from "../connection-list/helpers";
import { errorMessage } from "@/lib/errors";

function splitRoutinesByType(routines: RoutineInfo[]) {
  return {
    procedures: routines
      .filter((routine) => routine.type === "procedure")
      .sort((a, b) => a.name.localeCompare(b.name)),
    functions: routines
      .filter((routine) => routine.type === "function")
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

function mergeRoutinesIntoSchemas(
  schemas: SchemaInfo[],
  routines: RoutineInfo[],
): SchemaInfo[] {
  const routinesBySchema = routines.reduce<Record<string, RoutineInfo[]>>(
    (acc, routine) => {
      const schemaName = (routine.schema || "").trim() || "dbo";
      const current = acc[schemaName] || [];
      current.push(routine);
      acc[schemaName] = current;
      return acc;
    },
    {},
  );

  const existingSchemaNames = new Set(schemas.map((schema) => schema.name));
  const merged = schemas.map((schema) => ({
    ...schema,
    ...splitRoutinesByType(routinesBySchema[schema.name] || []),
  }));

  for (const [schemaName, schemaRoutines] of Object.entries(routinesBySchema)) {
    if (existingSchemaNames.has(schemaName)) continue;
    merged.push({
      name: schemaName,
      tables: [],
      ...splitRoutinesByType(schemaRoutines),
    });
  }

  return merged.sort((a, b) => a.name.localeCompare(b.name));
}

export function useTreeDataFetching(params: {
  connections: Connection[];
  setConnections: (fn: (prev: Connection[]) => Connection[]) => void;
  setExpandedSchemas: (fn: (prev: Set<string>) => Set<string>) => void;
  setExpandedTables: (fn: (prev: Set<string>) => Set<string>) => void;
  getAdapter: (connection: Connection) => DatasourceTreeAdapter;
}) {
  const {
    connections,
    setConnections,
    setExpandedSchemas,
    setExpandedTables,
    getAdapter,
  } = params;

  const [databaseEvents, setDatabaseEvents] = useState<
    Map<string, EventInfo[]>
  >(new Map());
  const [databaseSequences, setDatabaseSequences] = useState<
    Map<string, SequenceInfo[]>
  >(new Map());
  const [databaseTypes, setDatabaseTypes] = useState<Map<string, TypeInfo[]>>(
    new Map(),
  );
  const [databaseSynonyms, setDatabaseSynonyms] = useState<
    Map<string, SynonymInfo[]>
  >(new Map());
  const [databasePackages, setDatabasePackages] = useState<
    Map<string, PackageInfo[]>
  >(new Map());
  const [loadingDatabaseKeys, setLoadingDatabaseKeys] = useState<Set<string>>(
    new Set(),
  );
  const [loadingTableKeys, setLoadingTableKeys] = useState<Set<string>>(
    new Set(),
  );

  const fetchSqlTablesAsTableInfo = async (
    connectionId: string,
    databaseName: string,
  ): Promise<TableInfo[]> => {
    const tables = await api.metadata.listTables(
      Number(connectionId),
      databaseName,
    );
    return tables.map((table) => ({
      name: table.name,
      schema: table.schema,
      columns: [],
      type: table.type,
    }));
  };

  const fetchSqlRoutinesAsRoutineInfo = async (
    connectionId: string,
    databaseName: string,
  ): Promise<RoutineInfo[]> => {
    try {
      const caps = decodeCapabilities(
        await api.metadata.getCapabilities(Number(connectionId)),
      );
      if (!caps.routines) return [];
    } catch {
      return [];
    }
    try {
      const routines = await api.metadata.listRoutines(
        Number(connectionId),
        databaseName,
      );
      return routines.map((routine) => ({
        name: routine.name,
        schema: routine.schema,
        type: routine.type,
      }));
    } catch (e) {
      console.warn(
        "listRoutines failed",
        errorMessage(e),
      );
      return [];
    }
  };

  const fetchEvents = async (
    id: number,
    databaseName?: string,
    schema?: string,
  ): Promise<EventInfo[]> => {
    try {
      return await api.metadata.listEvents(id, databaseName, schema);
    } catch (err) {
      console.error("Failed to fetch events:", err);
      return [];
    }
  };

  const fetchSequences = async (
    id: number,
    databaseName?: string,
    schema?: string,
  ): Promise<SequenceInfo[]> => {
    try {
      return await api.metadata.listSequences(id, databaseName, schema);
    } catch (err) {
      console.error("Failed to fetch sequences:", err);
      return [];
    }
  };

  const fetchTypes = async (
    id: number,
    databaseName?: string,
    schema?: string,
  ): Promise<TypeInfo[]> => {
    try {
      return await api.metadata.listTypes(id, databaseName, schema);
    } catch (err) {
      console.error("Failed to fetch types:", err);
      return [];
    }
  };

  const fetchSynonyms = async (
    id: number,
    databaseName?: string,
    schema?: string,
  ): Promise<SynonymInfo[]> => {
    try {
      return await api.metadata.listSynonyms(id, databaseName, schema);
    } catch (err) {
      console.error("Failed to fetch synonyms:", err);
      return [];
    }
  };

  const fetchPackages = async (
    id: number,
    databaseName?: string,
    schema?: string,
  ): Promise<PackageInfo[]> => {
    try {
      return await api.metadata.listPackages(id, databaseName, schema);
    } catch (err) {
      console.error("Failed to fetch packages:", err);
      return [];
    }
  };

  const fetchAndSetTables = async (
    connectionId: string,
    databaseName: string,
    options?: { force?: boolean },
  ): Promise<TableInfo[]> => {
    try {
      const targetConnection = connections.find(
        (conn) => conn.id === connectionId,
      );
      if (!targetConnection) {
        return [];
      }
      const datasourceAdapter = getAdapter(targetConnection);
      if (!datasourceAdapter.isDatabaseExpandable) {
        await datasourceAdapter.loadDatabaseChildren(databaseName);
        return [];
      }
      const [nextTables, nextRoutines] = await Promise.all([
        datasourceAdapter.loadDatabaseChildren(databaseName),
        fetchSqlRoutinesAsRoutineInfo(
          connectionId,
          databaseName,
        ),
      ]);

      // Load events if the group exists
      const groups = datasourceAdapter.databaseGroups || [];
      const eventsGroup = groups.find((g) => g.source === "events");
      if (eventsGroup) {
        const events = await fetchEvents(Number(connectionId), databaseName);
        setDatabaseEvents((prev) =>
          new Map(prev).set(`${connectionId}-${databaseName}`, events),
        );
      }

      // Load sequences if the group exists
      const sequencesGroup = groups.find((g) => g.source === "sequences");
      if (sequencesGroup) {
        const sequences = await fetchSequences(Number(connectionId), databaseName);
        setDatabaseSequences((prev) =>
          new Map(prev).set(`${connectionId}-${databaseName}`, sequences),
        );
      }

      // Load types if the group exists
      const typesGroup = groups.find((g) => g.source === "types");
      if (typesGroup) {
        const types = await fetchTypes(Number(connectionId), databaseName);
        setDatabaseTypes((prev) =>
          new Map(prev).set(`${connectionId}-${databaseName}`, types),
        );
      }

      // Load synonyms if the group exists
      const synonymsGroup = groups.find((g) => g.source === "synonyms");
      if (synonymsGroup) {
        const synonyms = await fetchSynonyms(Number(connectionId), databaseName);
        setDatabaseSynonyms((prev) =>
          new Map(prev).set(`${connectionId}-${databaseName}`, synonyms),
        );
      }

      // Load packages if the group exists
      const packagesGroup = groups.find((g) => g.source === "packages");
      if (packagesGroup) {
        const packages = await fetchPackages(Number(connectionId), databaseName);
        setDatabasePackages((prev) =>
          new Map(prev).set(`${connectionId}-${databaseName}`, packages),
        );
      }
      setConnections((prev) =>
        prev.map((conn) => {
          if (conn.id !== connectionId) return conn;
          const supportsSchemaNode = datasourceAdapter.supportsSchemaNode;
          return {
            ...conn,
            databases: conn.databases.map((db) => {
              if (db.name !== databaseName) return db;
              if (
                !options?.force &&
                (supportsSchemaNode
                  ? db.schemas.length > 0
                  : db.tables.length > 0)
              ) {
                if (!supportsSchemaNode) {
                  return {
                    ...db,
                    routines: nextRoutines,
                  };
                }
                return {
                  ...db,
                  schemas: mergeRoutinesIntoSchemas(db.schemas, nextRoutines),
                };
              }
              if (!supportsSchemaNode) {
                return {
                  ...db,
                  schemas: [],
                  tables: nextTables,
                  routines: nextRoutines,
                };
              }
              return {
                ...db,
                schemas: groupSqlObjectsBySchema(nextTables, nextRoutines),
                tables: [],
              };
            }),
          };
        }),
      );
      return nextTables;
    } catch (e) {
      console.error(
        "listTables failed",
        errorMessage(e),
      );
      return [];
    }
  };

  const fetchAndSetTableColumns = async (
    connectionId: string,
    databaseName: string,
    schema: string,
    tableName: string,
  ) => {
    try {
      const metadata = await api.metadata.getTableMetadata(
        Number(connectionId),
        databaseName,
        schema,
        tableName,
      );
      setConnections((prev) =>
        prev.map((conn) => {
          if (conn.id !== connectionId) return conn;
          return {
            ...conn,
            databases: conn.databases.map((db) => {
              if (db.name !== databaseName) return db;
              return {
                ...db,
                schemas: db.schemas.map((schemaNode) => ({
                  ...schemaNode,
                  tables: schemaNode.tables.map((t) => {
                    if (t.name !== tableName || t.schema !== schema) return t;
                    if (t.columns.length > 0) return t;
                    return {
                      ...t,
                      columns: metadata.columns.map((c) => ({
                        name: c.name,
                        type: c.type,
                        isPrimaryKey: c.primaryKey,
                        nullable: c.nullable,
                      })),
                    };
                  }),
                })),
                tables: db.tables.map((t) => {
                  if (t.name !== tableName || t.schema !== schema) return t;
                  if (t.columns.length > 0) return t;
                  return {
                    ...t,
                    columns: metadata.columns.map((c) => ({
                      name: c.name,
                      type: c.type,
                      isPrimaryKey: c.primaryKey,
                      nullable: c.nullable,
                    })),
                  };
                }),
              };
            }),
          };
        }),
      );
    } catch (e) {
      console.error(
        "getTableMetadata failed",
        errorMessage(e),
      );
    }
  };

  const handleRefreshDatabaseTables = async (
    connectionId: string,
    databaseName: string,
  ) => {
    const databaseKey = `${connectionId}-${databaseName}`;
    const tableKeyPrefix = `${databaseKey}-`;
    const schemaKeyPrefix = `${databaseKey}::`;
    setExpandedSchemas((prev) => {
      const next = new Set(
        [...prev].filter((key) => !key.startsWith(schemaKeyPrefix)),
      );
      return next;
    });
    setExpandedTables((prev) => {
      const next = new Set(
        [...prev].filter((key) => !key.startsWith(tableKeyPrefix)),
      );
      return next;
    });

    await fetchAndSetTables(connectionId, databaseName, { force: true });
  };

  return {
    databaseEvents,
    setDatabaseEvents,
    databaseSequences,
    setDatabaseSequences,
    databaseTypes,
    setDatabaseTypes,
    databaseSynonyms,
    setDatabaseSynonyms,
    databasePackages,
    setDatabasePackages,
    loadingDatabaseKeys,
    setLoadingDatabaseKeys,
    loadingTableKeys,
    setLoadingTableKeys,
    fetchSqlTablesAsTableInfo,
    fetchSqlRoutinesAsRoutineInfo,
    fetchEvents,
    fetchSequences,
    fetchTypes,
    fetchSynonyms,
    fetchPackages,
    fetchAndSetTables,
    fetchAndSetTableColumns,
    handleRefreshDatabaseTables,
  };
}
