export type CellValue = unknown;

export type TableRow = Record<string, CellValue>;

export interface TableContext {
  connectionId: number;
  database: string;
  schema: string;
  table: string;
  driver: string;
}

export interface SelectedCell {
  row: number;
  col: string;
}
