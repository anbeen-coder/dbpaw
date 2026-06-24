import { invoke } from "./core";
import { COMMANDS } from "@/services/commands";
import type {
  ConnectionForm,
  CreateDatabasePayload,
  ExportResult,
  ExportScope,
  ImportResult,
  ImportSqlResult,
  SavedConnection,
  SavedQuery,
  SqliteConnectionIssue,
  TestConnectionResult,
  TransferFormat,
} from "../types";

export const connectionsApi = {
  transfer: {
    exportTable: (params: {
      id: number;
      database?: string;
      schema: string;
      table: string;
      driver: string;
      format: TransferFormat;
      scope: Exclude<ExportScope, "query_result">;
      filter?: string;
      orderBy?: string;
      sortColumn?: string;
      sortDirection?: "asc" | "desc";
      page?: number;
      limit?: number;
      filePath?: string;
      chunkSize?: number;
    }) => invoke<ExportResult>(COMMANDS.EXPORT_TABLE_DATA, params),
    exportDatabase: (params: {
      id: number;
      database: string;
      driver: string;
      format: "sql_dml" | "sql_ddl" | "sql_full";
      filePath?: string;
      chunkSize?: number;
    }) => invoke<ExportResult>(COMMANDS.EXPORT_DATABASE_SQL, params),
    exportQueryResult: (params: {
      id: number;
      database?: string;
      sql: string;
      driver: string;
      format: TransferFormat;
      filePath?: string;
    }) => invoke<ExportResult>(COMMANDS.EXPORT_QUERY_RESULT, params),
    importSqlFile: (params: {
      id: number;
      database?: string;
      filePath: string;
      driver: string;
    }) => invoke<ImportSqlResult>(COMMANDS.IMPORT_SQL_FILE, params),
  },
  connections: {
    list: () => invoke<SavedConnection[]>(COMMANDS.GET_CONNECTIONS),
    create: (form: ConnectionForm) =>
      invoke<SavedConnection>(COMMANDS.CREATE_CONNECTION, { form }),
    update: (id: number, form: ConnectionForm) =>
      invoke<SavedConnection>(COMMANDS.UPDATE_CONNECTION, { id, form }),
    delete: (id: number) => invoke<void>(COMMANDS.DELETE_CONNECTION, { id }),
    createDatabase: (id: number, payload: CreateDatabasePayload) =>
      invoke<void>(COMMANDS.CREATE_DATABASE_BY_ID, { id, payload }),
    getMysqlCharsets: (id: number) =>
      invoke<string[]>(COMMANDS.GET_MYSQL_CHARSETS_BY_ID, { id }),
    getMysqlCollations: (id: number, charset?: string) =>
      invoke<string[]>(COMMANDS.GET_MYSQL_COLLATIONS_BY_ID, { id, charset }),
    testEphemeral: (form: ConnectionForm) =>
      invoke<TestConnectionResult>(COMMANDS.TEST_CONNECTION_EPHEMERAL, { form }),
    listSqliteIssues: () =>
      invoke<SqliteConnectionIssue[]>(COMMANDS.LIST_SQLITE_ISSUES),
    importFromFile: (filePath: string) =>
      invoke<ImportResult>(COMMANDS.IMPORT_CONNECTIONS, { filePath }),
  },
  queries: {
    list: () => invoke<SavedQuery[]>(COMMANDS.GET_SAVED_QUERIES),
    create: (data: {
      name: string;
      query: string;
      description?: string;
      connectionId?: number;
      database?: string;
    }) => invoke<SavedQuery>(COMMANDS.SAVE_QUERY, data),
    update: (
      id: number,
      data: {
        name: string;
        query: string;
        description?: string;
        connectionId?: number;
        database?: string;
      },
    ) => invoke<SavedQuery>(COMMANDS.UPDATE_SAVED_QUERY, { id, ...data }),
    delete: (id: number) => invoke<void>(COMMANDS.DELETE_SAVED_QUERY, { id }),
  },
};
