import { ExportResult, ImportSqlResult } from "../types";
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
    case "export_table_data":
      return mockExportTableData(args);
    case "export_database_sql":
      return mockExportDatabaseSql(args);
    case "export_query_result":
      return mockExportQueryResult(args);
    case "import_sql_file":
      return mockImportSqlFile(args);
    default:
      return null;
  }
}
