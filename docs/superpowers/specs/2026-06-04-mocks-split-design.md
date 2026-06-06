# Mocks Split Design

## Problem

`src/services/mocks.ts` is 2514 lines with a single `invokeMock` switch containing 86+ cases. Hard to navigate, maintain, or extend.

## Solution

Split into domain-specific modules under `src/services/mocks/`, matching `api.ts`'s domain structure. `invokeMock` becomes a thin router.

## File Structure

```
src/services/mocks/
  index.ts          — invokeMock router, re-exports
  query.ts          — execute_query, cancel_query, execute_by_conn, list_sql_execution_logs, list_redis_command_logs
  redis.ts          — redis_* commands
  metadata.ts       — list_tables, list_routines, get_table_structure, get_table_ddl, get_routine_ddl, get_table_metadata, list_tables_by_conn, list_databases, list_databases_by_id, get_schema_overview, get_schema_foreign_keys, list_events, list_sequences, list_types, list_synonyms, list_packages
  tableData.ts      — get_table_data, get_table_data_by_conn
  connections.ts    — get_connections, create_connection, update_connection, delete_connection, import_connections, test_connection_ephemeral, create_database_by_id, get_mysql_charsets_by_id, get_mysql_collations_by_id
  queries.ts        — get_saved_queries, save_query, update_saved_query, delete_saved_query
  transfer.ts       — export_table_data, export_database_sql, export_query_result, import_sql_file
  elasticsearch.ts  — elasticsearch_* commands
  mongodb.ts        — mongodb_* commands
  ai.ts             — ai_* commands
  system.ts         — list_system_fonts
  mcp.ts            — mcp_* commands
```

## Domain File Contract

Each domain file exports:

1. **Mock data** — the `export const mockXxx` data arrays/objects that were in the old file
2. **Mock handler** — `export function handleXxx(cmd: string, args?: any): Promise<any> | null`
   - Returns `Promise<any>` if the handler recognizes the command
   - Returns `null` if the command doesn't belong to this domain

Example (`mocks/query.ts`):

```typescript
import { QueryResult, SqlExecutionLog, RedisCommandLog } from "../api";

export const mockQueryResult: QueryResult = { ... };

export async function mockExecuteQuery(...): Promise<QueryResult> { ... }

export function handleQuery(cmd: string, args?: any): Promise<any> | null {
  switch (cmd) {
    case "execute_query": return mockExecuteQuery(...);
    case "cancel_query": return mockCancelQuery(...);
    ...
    default: return null;
  }
}
```

## Router (`mocks/index.ts`)

```typescript
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

const handlers = [
  handleQuery,
  handleRedis,
  handleMetadata,
  handleTableData,
  handleConnections,
  handleQueries,
  handleTransfer,
  handleElasticsearch,
  handleMongodb,
  handleAi,
  handleSystem,
  handleMcp,
];

export async function invokeMock<T>(cmd: string, args?: any): Promise<T> {
  console.log(`[Mock] ${cmd}`, args);
  for (const handler of handlers) {
    const result = handler(cmd, args);
    if (result !== null) return result as Promise<T>;
  }
  console.warn(`[Mock] Unknown command: ${cmd}`);
  throw new Error(`Mock: Unknown command '${cmd}'`);
}

// Re-export all mock data for backward compatibility
export { mockConnections } from "./connections";
export { mockTables, mockTableStructure, mockTableMetadata, ... } from "./metadata";
export { mockQueryResult, mockMultipleResultSets, ... } from "./query";
// ... etc
```

## Import Path Changes

| Old import | New import |
|---|---|
| `import { invokeMock } from "./mocks"` | No change (resolves to `mocks/index.ts`) |
| `import { mockConnections } from "./mocks"` | `import { mockConnections } from "./mocks/connections"` or via re-export |

The re-exports in `index.ts` keep backward compatibility for any external imports of mock data.

## Test File Updates

`mocks.service.test.ts` imports `invokeMock` and `mockGetMysqlCharsets` from `./mocks`. After the split:

- `invokeMock` import path stays the same
- `mockGetMysqlCharsets` import changes to `./mocks/connections`

## Verification

1. `bun run typecheck` — no type errors
2. `bun test src/services/mocks.service.test.ts` — existing tests pass
3. `VITE_USE_MOCK=true bun run dev` — mock mode still works
