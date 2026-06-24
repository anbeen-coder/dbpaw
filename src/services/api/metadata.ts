import { invoke } from "./core";
import { COMMANDS } from "@/services/commands";
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
      invoke<{ schema: string; name: string; type: string }[]>(COMMANDS.LIST_TABLES, {
        id,
        database,
        schema,
      }),
    listRoutines: (id: number, database?: string, schema?: string) =>
      invoke<RoutineInfo[]>(COMMANDS.LIST_ROUTINES, {
        id,
        database,
        schema,
      }),
    getTableStructure: (id: number, schema: string, table: string) =>
      invoke<{ columns: { name: string; type: string; nullable: boolean }[] }>(
        COMMANDS.GET_TABLE_STRUCTURE,
        { id, schema, table },
      ),
    getTableDDL: (
      id: number,
      database: string | undefined,
      schema: string,
      table: string,
    ) => invoke<string>(COMMANDS.GET_TABLE_DDL, { id, database, schema, table }),
    getRoutineDDL: (
      id: number,
      database: string | undefined,
      schema: string,
      name: string,
      routineType: RoutineType,
    ) =>
      invoke<string>(COMMANDS.GET_ROUTINE_DDL, {
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
      invoke<TableMetadata>(COMMANDS.GET_TABLE_METADATA, {
        id,
        database,
        schema,
        table,
      }),
    listTablesByConn: (form: ConnectionForm) =>
      invoke<{ schema: string; name: string; type: string }[]>(
        COMMANDS.LIST_TABLES_BY_CONN,
        { form },
      ),
    listDatabases: (form: ConnectionForm) =>
      invoke<string[]>(COMMANDS.LIST_DATABASES, { form }),
    listDatabasesById: (id: number) =>
      invoke<string[]>(COMMANDS.LIST_DATABASES_BY_ID, { id }),
    getSchemaOverview: (id: number, database?: string, schema?: string) =>
      invoke<SchemaOverview>(COMMANDS.GET_SCHEMA_OVERVIEW, { id, database, schema }),
    getSchemaForeignKeys: (id: number, database?: string, schema?: string) =>
      invoke<SchemaForeignKey[]>(COMMANDS.GET_SCHEMA_FOREIGN_KEYS, {
        id,
        database,
        schema,
      }),
    listEvents: (id: number, database?: string, schema?: string) =>
      invoke<EventInfo[]>(COMMANDS.LIST_EVENTS, { id, database, schema }),
    listSequences: (id: number, database?: string, schema?: string) =>
      invoke<SequenceInfo[]>(COMMANDS.LIST_SEQUENCES, { id, database, schema }),
    listTypes: (id: number, database?: string, schema?: string) =>
      invoke<TypeInfo[]>(COMMANDS.LIST_TYPES, { id, database, schema }),
    listSynonyms: (id: number, database?: string, schema?: string) =>
      invoke<SynonymInfo[]>(COMMANDS.LIST_SYNONYMS, { id, database, schema }),
    listPackages: (id: number, database?: string, schema?: string) =>
      invoke<PackageInfo[]>(COMMANDS.LIST_PACKAGES, { id, database, schema }),
    getCapabilities: (connectionId: number) =>
      invoke<number>(COMMANDS.GET_DRIVER_CAPABILITIES, { id: connectionId }),
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
      }>(COMMANDS.GET_TABLE_DATA, params),
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
      }>(COMMANDS.GET_TABLE_DATA_BY_CONN, {
        form,
        schema,
        table,
        page,
        limit,
        includeTotal,
      }),
  },
};
