import type { RoutineType, SchemaOverview } from "@/services/api";
import type { SingleResultState } from "@/lib/queryExecutionState";

export interface TabItem {
  id: string;
  type:
    | "editor"
    | "table"
    | "ddl"
    | "routine"
    | "create-table"
    | "alter-table"
    | "redis-key"
    | "redis-console"
    | "redis-browser"
    | "redis-server-info"
    | "elasticsearch-index"
    | "er-diagram";
  title: string;
  connection?: string;
  database?: string;
  schema?: string;
  tableName?: string;
  routineName?: string;
  routineType?: RoutineType;
  redisKey?: string;
  elasticsearchIndex?: string;
  data?: any[];
  columns?: string[];
  total?: number;
  page?: number;
  pageSize?: number;
  executionTimeMs?: number;
  connectionId?: number;
  driver?: string;
  sqlContent?: string;
  lastSavedSql?: string;
  isDirty?: boolean;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  filter?: string;
  orderBy?: string;
  queryResults?: {
    data: any[];
    columns: string[];
    executionTime: string;
    error?: string;
    resultSets?: SingleResultState[];
    activeResultSetIndex?: number;
  } | null;
  activeQueryId?: string;
  lastQueryId?: string;
  schemaOverview?: SchemaOverview;
  savedQueryId?: number;
  savedQueryDescription?: string;
  availableDatabases?: string[];
  isLoading?: boolean;
}
