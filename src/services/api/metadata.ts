import { invoke } from "./core";
import { COMMANDS } from "@/services/commands";
import type {
  ConnectionForm,
  RoutineType,
} from "../types";

export const metadataApi = {
  metadata: {
    listTables: (id: number, database?: string, schema?: string) =>
      invoke(COMMANDS.LIST_TABLES, {
        id,
        database,
        schema,
      }),
    listRoutines: (id: number, database?: string, schema?: string) =>
      invoke(COMMANDS.LIST_ROUTINES, {
        id,
        database,
        schema,
      }),
    getTableStructure: (id: number, schema: string, table: string) =>
      invoke(COMMANDS.GET_TABLE_STRUCTURE, { id, schema, table }),
    getTableDDL: (
      id: number,
      database: string | undefined,
      schema: string,
      table: string,
    ) => invoke(COMMANDS.GET_TABLE_DDL, { id, database, schema, table }),
    getRoutineDDL: (
      id: number,
      database: string | undefined,
      schema: string,
      name: string,
      routineType: RoutineType,
    ) =>
      invoke(COMMANDS.GET_ROUTINE_DDL, {
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
      invoke(COMMANDS.GET_TABLE_METADATA, {
        id,
        database,
        schema,
        table,
      }),
    listTablesByConn: (form: ConnectionForm) =>
      invoke(COMMANDS.LIST_TABLES_BY_CONN, { form }),
    listDatabases: (form: ConnectionForm) =>
      invoke(COMMANDS.LIST_DATABASES, { form }),
    listDatabasesById: (id: number) =>
      invoke(COMMANDS.LIST_DATABASES_BY_ID, { id }),
    getSchemaOverview: (id: number, database?: string, schema?: string) =>
      invoke(COMMANDS.GET_SCHEMA_OVERVIEW, { id, database, schema }),
    getSchemaForeignKeys: (id: number, database?: string, schema?: string) =>
      invoke(COMMANDS.GET_SCHEMA_FOREIGN_KEYS, {
        id,
        database,
        schema,
      }),
    listEvents: (id: number, database?: string, schema?: string) =>
      invoke(COMMANDS.LIST_EVENTS, { id, database, schema }),
    listSequences: (id: number, database?: string, schema?: string) =>
      invoke(COMMANDS.LIST_SEQUENCES, { id, database, schema }),
    listTypes: (id: number, database?: string, schema?: string) =>
      invoke(COMMANDS.LIST_TYPES, { id, database, schema }),
    listSynonyms: (id: number, database?: string, schema?: string) =>
      invoke(COMMANDS.LIST_SYNONYMS, { id, database, schema }),
    listPackages: (id: number, database?: string, schema?: string) =>
      invoke(COMMANDS.LIST_PACKAGES, { id, database, schema }),
    getCapabilities: (connectionId: number) =>
      invoke(COMMANDS.GET_DRIVER_CAPABILITIES, { id: connectionId }),
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
    }) => invoke(COMMANDS.GET_TABLE_DATA, params),
    getByConn: (
      form: ConnectionForm,
      schema: string,
      table: string,
      page: number,
      limit: number,
      includeTotal?: boolean,
    ) =>
      invoke(COMMANDS.GET_TABLE_DATA_BY_CONN, {
        form,
        schema,
        table,
        page,
        limit,
        includeTotal,
      }),
  },
};
