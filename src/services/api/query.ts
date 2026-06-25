import { invoke } from "./core";
import { COMMANDS } from "@/services/commands";
import type {
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
      invoke(COMMANDS.EXECUTE_QUERY, {
        id,
        query,
        database,
        source,
        queryId,
      }),
    cancel: (uuid: string, queryId: string) =>
      invoke(COMMANDS.CANCEL_QUERY, { uuid, queryId }),
    executeByConn: (form: ConnectionForm, sql: string) =>
      invoke(COMMANDS.EXECUTE_BY_CONN, { form, sql }),
  },
  sqlLogs: {
    list: (limit = 100) =>
      invoke(COMMANDS.LIST_SQL_EXECUTION_LOGS, { limit }),
  },
};
