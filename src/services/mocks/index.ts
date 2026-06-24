import { handleQuery } from "./query";
import { handleRedis } from "./redis";
import { handleMetadata } from "./metadata";
import { handleTableData } from "./tableData";
import { handleConnections } from "./connections";
import { handleQueries } from "./queries";
import { handleTransfer } from "./transfer";
import { handleElasticsearch } from "./elasticsearch";
import { handleMongodb } from "./mongodb";
import { handleAi } from "./ai";
import { handleSystem } from "./system";
import { handleMcp } from "./mcp";
import type { CommandMap, CommandArgs, CommandReturn } from "../commands";

type Handler = (cmd: string, args: any) => Promise<any> | null;

const handlers: Handler[] = [
  handleQuery as Handler,
  handleRedis as unknown as Handler,
  handleMetadata as Handler,
  handleTableData,
  handleConnections as unknown as Handler,
  handleQueries,
  handleTransfer,
  handleElasticsearch as unknown as Handler,
  handleMongodb as unknown as Handler,
  handleAi as unknown as Handler,
  handleSystem as unknown as Handler,
  handleMcp,
];

export function invokeMock<T extends keyof CommandMap>(
  cmd: T,
  args: CommandArgs<T>
): Promise<CommandReturn<T>>;
export function invokeMock(cmd: string, args?: Record<string, unknown>): Promise<unknown>;
export async function invokeMock(cmd: string, args?: any): Promise<any> {
  console.log(`[Mock] ${cmd}`, args);
  for (const handler of handlers) {
    const result = handler(cmd, args);
    if (result !== null) return result;
  }
  console.warn(`[Mock] Unknown command: ${cmd}`);
  throw new Error(`Mock: Unknown command '${cmd}'`);
}

// Re-export mock data for backward compatibility
export { mockConnections, mockGetMysqlCharsets, mockGetMysqlCollations, mockTestConnectionEphemeral } from "./connections";
export {
  mockTables, mockTableStructure, mockTableMetadata, mockSchemaForeignKeys,
  mockSchemaOverview, mockDatabases, mockListTables, mockGetTableStructure,
  mockGetTableDDL, mockListEvents, mockListSequences, mockListTypes,
  mockListSynonyms, mockListPackages, mockListRoutines, mockGetRoutineDDL,
  mockGetTableMetadata, mockGetSchemaForeignKeys, mockListTablesByConn,
  mockListDatabases, mockListDatabasesById, mockGetSchemaOverview,
} from "./metadata";
export {
  mockQueryResult, mockMultipleResultSets, mockComplexTypeData, mockArrayTypeData,
  mockExecuteQuery, mockCancelQuery, mockExecuteByConn,
  mockListSqlExecutionLogs, mockListRedisCommandLogs,
} from "./query";
export { mockTableData, mockGetTableData, mockGetTableDataByConn } from "./tableData";
export { mockSavedQueries, mockGetSavedQueries, mockSaveQuery, mockUpdateSavedQuery, mockDeleteSavedQuery } from "./queries";
export { mockExportTableData, mockExportDatabaseSql, mockExportQueryResult, mockImportSqlFile } from "./transfer";
export {
  mockRedisListDatabases, mockRedisScanKeys, mockRedisGetKey, mockRedisSetKey,
  mockRedisDeleteKey, mockRedisRenameKey, mockRedisSetTtl, mockRedisServerInfo,
  mockRedisServerConfig, mockRedisSlowlogGet, mockRedisExecuteRaw,
} from "./redis";
export {
  mockMcpStatus, mockMcpStart, mockMcpStop, mockMcpGetTools,
  mockMcpDetectClients, mockMcpConfigureClient,
} from "./mcp";
