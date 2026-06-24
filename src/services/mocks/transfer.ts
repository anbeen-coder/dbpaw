import { ExportResult, ImportSqlResult } from "../types";
import { COMMANDS } from "../commands";
import { mockTableData } from "./tableData";
import { mockQueryResult } from "./query";

export async function mockExportTableData(_params: any): Promise<ExportResult> {
  await new Promise((resolve) => setTimeout(resolve, 120));
  return {
    filePath: `/tmp/dbpaw-table-export-${Date.now()}.csv`,
    rowCount: mockTableData.total,
  };
}

export async function mockExportDatabaseSql(
  params: any,
): Promise<ExportResult> {
  await new Promise((resolve) => setTimeout(resolve, 120));
  const suffix =
    params?.format === "sql_ddl"
      ? "ddl"
      : params?.format === "sql_dml"
        ? "dml"
        : "full";
  return {
    filePath:
      params?.filePath ||
      `/tmp/dbpaw-database-export-${suffix}-${Date.now()}.sql`,
    rowCount: mockTableData.total,
  };
}

export async function mockExportQueryResult(
  _params: any,
): Promise<ExportResult> {
  await new Promise((resolve) => setTimeout(resolve, 120));
  return {
    filePath: `/tmp/dbpaw-query-export-${Date.now()}.csv`,
    rowCount: mockQueryResult.rowCount,
  };
}

export async function mockImportSqlFile(
  _params: any,
): Promise<ImportSqlResult> {
  await new Promise((resolve) => setTimeout(resolve, 160));
  return {
    filePath: _params?.filePath || `/tmp/dbpaw-import-${Date.now()}.sql`,
    totalStatements: 3,
    successStatements: 3,
    failedAt: undefined,
    error: undefined,
    timeTakenMs: 120,
    rolledBack: false,
  };
}

export function handleTransfer(cmd: string, args?: any): Promise<any> | null {
  switch (cmd) {
    case COMMANDS.EXPORT_TABLE_DATA:
      return mockExportTableData(args);
    case COMMANDS.EXPORT_DATABASE_SQL:
      return mockExportDatabaseSql(args);
    case COMMANDS.EXPORT_QUERY_RESULT:
      return mockExportQueryResult(args);
    case COMMANDS.IMPORT_SQL_FILE:
      return mockImportSqlFile(args);
    default:
      return null;
  }
}
