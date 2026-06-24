import { invoke } from "./core";
import { COMMANDS } from "@/services/commands";
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
      invoke<QueryResult>(COMMANDS.EXECUTE_QUERY, {
        id,
        query,
        database,
        source,
        queryId,
      }),
    cancel: (uuid: string, queryId: string) =>
      invoke<boolean>(COMMANDS.CANCEL_QUERY, { uuid, queryId }),
    executeByConn: (form: ConnectionForm, sql: string) =>
      invoke<QueryResult>(COMMANDS.EXECUTE_BY_CONN, { form, sql }),
  },
  sqlLogs: {
    list: (limit = 100) =>
      invoke<SqlExecutionLog[]>(COMMANDS.LIST_SQL_EXECUTION_LOGS, { limit }),
  },
};
