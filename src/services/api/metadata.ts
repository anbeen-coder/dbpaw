import { invoke } from "./core";
import type {
  ConnectionForm,
  RoutineInfo,
  RoutineType,
  TableMetadata,
  SchemaOverview,
  SchemaForeignKey,
  EventInfo,
  SequenceInfo,
  TypeInfo,
  SynonymInfo,
  PackageInfo,
} from "../types";

export const metadataApi = {
  metadata: {
    listTables: (id: number, database?: string, schema?: string) =>
      invoke<{ schema: string; name: string; type: string }[]>("list_tables", {
        id,
        database,
        schema,
      }),
    listRoutines: (id: number, database?: string, schema?: string) =>
      invoke<RoutineInfo[]>("list_routines", {
        id,
        database,
        schema,
      }),
    getTableStructure: (id: number, schema: string, table: string) =>
      invoke<{ columns: { name: string; type: string; nullable: boolean }[] }>(
        "get_table_structure",
        { id, schema, table },
      ),
    getTableDDL: (
      id: number,
      database: string | undefined,
      schema: string,
      table: string,
    ) => invoke<string>("get_table_ddl", { id, database, schema, table }),
    getRoutineDDL: (
      id: number,
      database: string | undefined,
      schema: string,
      name: string,
      routineType: RoutineType,
    ) =>
      invoke<string>("get_routine_ddl", {
        id,
        database,
        schema,
        name,
        routineType,
      }),
    getTableMetadata: (
      id: number,
      database: string | undefined,
      schema: string,
      table: string,
    ) =>
      invoke<TableMetadata>("get_table_metadata", {
        id,
        database,
        schema,
        table,
      }),
    listTablesByConn: (form: ConnectionForm) =>
      invoke<{ schema: string; name: string; type: string }[]>(
        "list_tables_by_conn",
        { form },
      ),
    listDatabases: (form: ConnectionForm) =>
      invoke<string[]>("list_databases", { form }),
    listDatabasesById: (id: number) =>
      invoke<string[]>("list_databases_by_id", { id }),
    getSchemaOverview: (id: number, database?: string, schema?: string) =>
      invoke<SchemaOverview>("get_schema_overview", { id, database, schema }),
    getSchemaForeignKeys: (id: number, database?: string, schema?: string) =>
      invoke<SchemaForeignKey[]>("get_schema_foreign_keys", {
        id,
        database,
        schema,
      }),
    listEvents: (connectionId: string, database: string) =>
      invoke<EventInfo[]>("list_events", { connectionId, database }),
    listSequences: (connectionId: string, database: string) =>
      invoke<SequenceInfo[]>("list_sequences", { connectionId, database }),
    listTypes: (connectionId: string, database: string) =>
      invoke<TypeInfo[]>("list_types", { connectionId, database }),
    listSynonyms: (connectionId: string, database: string) =>
      invoke<SynonymInfo[]>("list_synonyms", { connectionId, database }),
    listPackages: (connectionId: string, database: string) =>
      invoke<PackageInfo[]>("list_packages", { connectionId, database }),
    getCapabilities: (connectionId: number) =>
      invoke<number>("get_driver_capabilities", { id: connectionId }),
  },
  tableData: {
    get: (params: {
      id: number;
      database?: string;
      schema: string;
      table: string;
      page: number;
      limit: number;
      filter?: string;
      sortColumn?: string;
      sortDirection?: "asc" | "desc";
      orderBy?: string;
      includeTotal?: boolean;
    }) =>
      invoke<{
        data: any[];
        total: number | null;
        page: number;
        limit: number;
        executionTimeMs: number;
      }>("get_table_data", params),
    getByConn: (
      form: ConnectionForm,
      schema: string,
      table: string,
      page: number,
      limit: number,
      includeTotal?: boolean,
    ) =>
      invoke<{
        data: any[];
        total: number | null;
        page: number;
        limit: number;
        executionTimeMs: number;
      }>("get_table_data_by_conn", {
        form,
        schema,
        table,
        page,
        limit,
        includeTotal,
      }),
  },
};
