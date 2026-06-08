import { invoke } from "./core";
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
    }) => invoke<ExportResult>("export_table_data", params),
    exportDatabase: (params: {
      id: number;
      database: string;
      driver: string;
      format: "sql_dml" | "sql_ddl" | "sql_full";
      filePath?: string;
      chunkSize?: number;
    }) => invoke<ExportResult>("export_database_sql", params),
    exportQueryResult: (params: {
      id: number;
      database?: string;
      sql: string;
      driver: string;
      format: TransferFormat;
      filePath?: string;
    }) => invoke<ExportResult>("export_query_result", params),
    importSqlFile: (params: {
      id: number;
      database?: string;
      filePath: string;
      driver: string;
    }) => invoke<ImportSqlResult>("import_sql_file", params),
  },
  connections: {
    list: () => invoke<SavedConnection[]>("get_connections"),
    create: (form: ConnectionForm) =>
      invoke<SavedConnection>("create_connection", { form }),
    update: (id: number, form: ConnectionForm) =>
      invoke<SavedConnection>("update_connection", { id, form }),
    delete: (id: number) => invoke<void>("delete_connection", { id }),
    createDatabase: (id: number, payload: CreateDatabasePayload) =>
      invoke<void>("create_database_by_id", { id, payload }),
    getMysqlCharsets: (id: number) =>
      invoke<string[]>("get_mysql_charsets_by_id", { id }),
    getMysqlCollations: (id: number, charset?: string) =>
      invoke<string[]>("get_mysql_collations_by_id", { id, charset }),
    testEphemeral: (form: ConnectionForm) =>
      invoke<TestConnectionResult>("test_connection_ephemeral", { form }),
    listSqliteIssues: () =>
      invoke<SqliteConnectionIssue[]>("list_sqlite_issues"),
    importFromFile: (filePath: string) =>
      invoke<ImportResult>("import_connections", { filePath }),
  },
  queries: {
    list: () => invoke<SavedQuery[]>("get_saved_queries"),
    create: (data: {
      name: string;
      query: string;
      description?: string;
      connectionId?: number;
      database?: string;
    }) => invoke<SavedQuery>("save_query", data),
    update: (
      id: number,
      data: {
        name: string;
        query: string;
        description?: string;
        connectionId?: number;
        database?: string;
      },
    ) => invoke<SavedQuery>("update_saved_query", { id, ...data }),
    delete: (id: number) => invoke<void>("delete_saved_query", { id }),
  },
};
