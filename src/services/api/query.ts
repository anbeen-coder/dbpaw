import { invoke } from "./core";
import type {
  QueryResult,
  SqlExecutionLog,
  SqlExecutionSource,
  ConnectionForm,
} from "../types";

export const queryApi = {
  query: {
    execute: (
      id: number,
      query: string,
      database?: string,
      source?: SqlExecutionSource,
      queryId?: string,
    ) =>
      invoke<QueryResult>("execute_query", {
        id,
        query,
        database,
        source,
        queryId,
      }),
    cancel: (uuid: string, queryId: string) =>
      invoke<boolean>("cancel_query", { uuid, queryId }),
    executeByConn: (form: ConnectionForm, sql: string) =>
      invoke<QueryResult>("execute_by_conn", { form, sql }),
  },
  sqlLogs: {
    list: (limit = 100) =>
      invoke<SqlExecutionLog[]>("list_sql_execution_logs", { limit }),
  },
};
