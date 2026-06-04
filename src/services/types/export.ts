export type TransferFormat =
  | "csv"
  | "json"
  | "sql_dml"
  | "sql_ddl"
  | "sql_full";

export type ExportScope =
  | "current_page"
  | "filtered"
  | "full_table"
  | "query_result";

export interface ExportResult {
  filePath: string;
  rowCount: number;
}

export interface ImportSqlResult {
  filePath: string;
  totalStatements: number;
  successStatements: number;
  failedAt?: number;
  failedBatch?: number;
  failedStatementPreview?: string;
  error?: string;
  timeTakenMs: number;
  rolledBack: boolean;
}
