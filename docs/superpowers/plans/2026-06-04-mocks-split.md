# Mocks Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the 2514-line `src/services/mocks.ts` into 12 domain-specific modules under `src/services/mocks/`, with a thin router in `index.ts`.

**Architecture:** Each domain file exports mock data + a `handleXxx(cmd, args)` function that returns `Promise<any>` for recognized commands or `null` otherwise. `index.ts` iterates handlers and re-exports all mock data for backward compatibility.

**Tech Stack:** TypeScript, Bun

---

### Task 1: Create directory and query.ts

**Files:**
- Create: `src/services/mocks/query.ts`

- [ ] **Step 1: Create the mocks directory**

```bash
mkdir -p src/services/mocks
```

- [ ] **Step 2: Create query.ts**

Extract from `mocks.ts` lines 432–648 (mock data) and lines 862–985 (handler functions). The file contains:
- `mockQueryResult`, `mockMultipleResultSets`, `mockComplexTypeData`, `mockArrayTypeData` (data)
- `mockSqlExecutionLogs`, `mockSqlExecutionLogId`, `appendSqlExecutionLog` (internal state)
- `mockExecuteQuery`, `mockCancelQuery`, `mockExecuteByConn`, `mockListSqlExecutionLogs` (functions)
- `mockRedisCommandLogs`, `mockListRedisCommandLogs` (redis logs — grouped with query per api.ts `sqlLogs`/`redisLogs`)
- `handleQuery(cmd, args)` — routes: `execute_query`, `cancel_query`, `execute_by_conn`, `list_sql_execution_logs`, `list_redis_command_logs`

Import types from `../api`: `QueryResult`, `SqlExecutionLog`, `RedisCommandLog`, `ConnectionForm`

- [ ] **Step 3: Verify file compiles**

```bash
bun run typecheck 2>&1 | head -20
```

Expected: No errors from `mocks/query.ts` (other files will error until complete)

- [ ] **Step 4: Commit**

```bash
git add src/services/mocks/query.ts
git commit -m "refactor: extract query mocks to mocks/query.ts"
```

---

### Task 2: Create redis.ts

**Files:**
- Create: `src/services/mocks/redis.ts`

- [ ] **Step 1: Create redis.ts**

Extract from `mocks.ts` lines 1686–1831 (redis mock functions) and the redis handler switch cases (lines 1919–1950). Contains:
- `mockRedisListDatabases`, `mockRedisScanKeys`, `mockRedisGetKey`, `mockRedisSetKey`, `mockRedisDeleteKey`, `mockRedisRenameKey`, `mockRedisSetTtl`, `mockRedisServerInfo`, `mockRedisServerConfig`, `mockRedisSlowlogGet`, `mockRedisExecuteRaw`
- `handleRedis(cmd, args)` — routes all `redis_*` commands

- [ ] **Step 2: Verify file compiles**

```bash
bun run typecheck 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/services/mocks/redis.ts
git commit -m "refactor: extract redis mocks to mocks/redis.ts"
```

---

### Task 3: Create metadata.ts

**Files:**
- Create: `src/services/mocks/metadata.ts`

- [ ] **Step 1: Create metadata.ts**

Extract from `mocks.ts`:
- Data: `mockTables` (line 71), `mockTableStructure` (line 99), `mockTableMetadata` (line 109), `mockSchemaForeignKeys` (line 189), `mockSchemaOverview` (line 219), `mockDatabases` (line 557), `mockDDL` (line 844), `mockJsonTestTableMetadata` (line 1108), `mockArrayTestTableMetadata` (line 1120), `mockSpecialTypeTableMetadata` (line 1139)
- Functions: `mockListTables`, `mockGetTableStructure`, `mockGetTableDDL`, `mockListEvents`, `mockListSequences`, `mockListTypes`, `mockListSynonyms`, `mockListPackages`, `mockListRoutines`, `mockGetRoutineDDL`, `mockGetTableMetadata`, `mockGetSchemaForeignKeys`, `mockListTablesByConn`, `mockListDatabases`, `mockListDatabasesById`, `mockGetSchemaOverview`
- `handleMetadata(cmd, args)` — routes: `list_tables`, `list_routines`, `list_events`, `list_sequences`, `list_types`, `list_synonyms`, `list_packages`, `get_table_structure`, `get_table_ddl`, `get_routine_ddl`, `get_table_metadata`, `list_tables_by_conn`, `list_databases`, `list_databases_by_id`, `get_schema_overview`, `get_schema_foreign_keys`

Import types from `../api`: `TableMetadata`, `SchemaForeignKey`, `SchemaOverview`, `ConnectionForm`

- [ ] **Step 2: Verify file compiles**

```bash
bun run typecheck 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/services/mocks/metadata.ts
git commit -m "refactor: extract metadata mocks to mocks/metadata.ts"
```

---

### Task 4: Create tableData.ts

**Files:**
- Create: `src/services/mocks/tableData.ts`

- [ ] **Step 1: Create tableData.ts**

Extract from `mocks.ts`:
- Data: `mockTableData` (line 256) — note: `mockComplexTypeData` and `mockArrayTypeData` are in query.ts, import them
- Functions: `mockGetTableData`, `mockGetTableDataByConn`
- `handleTableData(cmd, args)` — routes: `get_table_data`, `get_table_data_by_conn`

Import `mockComplexTypeData` and `mockArrayTypeData` from `./query` (they're used to determine data source based on table name).

Import types from `../api`: `ConnectionForm`

- [ ] **Step 2: Verify file compiles**

```bash
bun run typecheck 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/services/mocks/tableData.ts
git commit -m "refactor: extract tableData mocks to mocks/tableData.ts"
```

---

### Task 5: Create connections.ts

**Files:**
- Create: `src/services/mocks/connections.ts`

- [ ] **Step 1: Create connections.ts**

Extract from `mocks.ts`:
- Data: `mockConnections` (line 25)
- Functions: `mockGetConnections`, `mockCreateConnection`, `mockUpdateConnection`, `mockDeleteConnection`, `mockCreateDatabaseById`, `mockGetMysqlCharsets`, `mockGetMysqlCollations`, `mockTestConnectionEphemeral`
- `handleConnections(cmd, args)` — routes: `get_connections`, `create_connection`, `update_connection`, `delete_connection`, `import_connections`, `create_database_by_id`, `get_mysql_charsets_by_id`, `get_mysql_collations_by_id`, `test_connection_ephemeral`

Import types from `../api`: `ConnectionForm`, `TestConnectionResult`

- [ ] **Step 2: Verify file compiles**

```bash
bun run typecheck 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/services/mocks/connections.ts
git commit -m "refactor: extract connections mocks to mocks/connections.ts"
```

---

### Task 6: Create queries.ts (saved queries)

**Files:**
- Create: `src/services/mocks/queries.ts`

- [ ] **Step 1: Create queries.ts**

Extract from `mocks.ts`:
- Data: `mockSavedQueries` (line 565)
- Functions: `mockGetSavedQueries`, `mockSaveQuery`, `mockUpdateSavedQuery`, `mockDeleteSavedQuery`
- `handleQueries(cmd, args)` — routes: `get_saved_queries`, `save_query`, `update_saved_query`, `delete_saved_query`

Import types from `../api`: `SavedQuery`

- [ ] **Step 2: Verify file compiles**

```bash
bun run typecheck 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/services/mocks/queries.ts
git commit -m "refactor: extract saved queries mocks to mocks/queries.ts"
```

---

### Task 7: Create transfer.ts

**Files:**
- Create: `src/services/mocks/transfer.ts`

- [ ] **Step 1: Create transfer.ts**

Extract from `mocks.ts`:
- Functions: `mockExportTableData`, `mockExportDatabaseSql`, `mockExportQueryResult`, `mockImportSqlFile`
- `handleTransfer(cmd, args)` — routes: `export_table_data`, `export_database_sql`, `export_query_result`, `import_sql_file`

Import `mockTableData` from `./tableData` and `mockQueryResult` from `./query` (used for `rowCount` in export results).

Import types from `../api`: `ExportResult`, `ImportSqlResult`

- [ ] **Step 2: Verify file compiles**

```bash
bun run typecheck 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/services/mocks/transfer.ts
git commit -m "refactor: extract transfer mocks to mocks/transfer.ts"
```

---

### Task 8: Create elasticsearch.ts

**Files:**
- Create: `src/services/mocks/elasticsearch.ts`

- [ ] **Step 1: Create elasticsearch.ts**

Extract from `mocks.ts` lines 2099–2260 (elasticsearch switch cases). All mock data is inline in the switch cases (no separate data constants). Contains:
- `handleElasticsearch(cmd, args)` — routes: `elasticsearch_test_connection`, `elasticsearch_test_connection_ephemeral`, `elasticsearch_list_indices`, `elasticsearch_get_index_mapping`, `elasticsearch_create_index`, `elasticsearch_delete_index`, `elasticsearch_refresh_index`, `elasticsearch_open_index`, `elasticsearch_close_index`, `elasticsearch_search_documents`, `elasticsearch_get_document`, `elasticsearch_upsert_document`, `elasticsearch_delete_document`, `elasticsearch_execute_raw`

- [ ] **Step 2: Verify file compiles**

```bash
bun run typecheck 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/services/mocks/elasticsearch.ts
git commit -m "refactor: extract elasticsearch mocks to mocks/elasticsearch.ts"
```

---

### Task 9: Create mongodb.ts

**Files:**
- Create: `src/services/mocks/mongodb.ts`

- [ ] **Step 1: Create mongodb.ts**

Extract from `mocks.ts` lines 2262–2287 (mongodb switch cases). All mock data is inline. Contains:
- `handleMongodb(cmd, args)` — routes: `mongodb_test_connection`, `mongodb_test_connection_ephemeral`, `mongodb_list_databases`, `mongodb_list_collections`

- [ ] **Step 2: Verify file compiles**

```bash
bun run typecheck 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/services/mocks/mongodb.ts
git commit -m "refactor: extract mongodb mocks to mocks/mongodb.ts"
```

---

### Task 10: Create ai.ts

**Files:**
- Create: `src/services/mocks/ai.ts`

- [ ] **Step 1: Create ai.ts**

Extract from `mocks.ts`:
- Data: `mockAiProviders` (line 684), `mockAiConversations` (line 726), `mockAiMessages` (line 765)
- Functions: all `ai_*` switch cases (lines 2289–2489)
- `handleAi(cmd, args)` — routes: `ai_list_providers`, `ai_create_provider`, `ai_update_provider`, `ai_delete_provider`, `ai_set_default_provider`, `ai_list_conversations`, `ai_get_conversation`, `ai_delete_conversation`, `ai_chat_start`, `ai_chat_continue`

Import types from `../api`: `AIProviderConfig`, `AIConversation`, `AIConversationDetail`

- [ ] **Step 2: Verify file compiles**

```bash
bun run typecheck 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/services/mocks/ai.ts
git commit -m "refactor: extract ai mocks to mocks/ai.ts"
```

---

### Task 11: Create system.ts and mcp.ts

**Files:**
- Create: `src/services/mocks/system.ts`
- Create: `src/services/mocks/mcp.ts`

- [ ] **Step 1: Create system.ts**

Extract from `mocks.ts` lines 2380–2400 (`list_system_fonts` case). Contains:
- `handleSystem(cmd, args)` — routes: `list_system_fonts`

- [ ] **Step 2: Create mcp.ts**

Extract from `mocks.ts` lines 1833–1888 (mcp functions) and lines 2492–2508 (mcp switch cases). Contains:
- `mockMcpStatus`, `mockMcpStart`, `mockMcpStop`, `mockMcpGetTools`, `mockMcpDetectClients`, `mockMcpConfigureClient`
- `handleMcp(cmd, args)` — routes: `mcp_status`, `mcp_start`, `mcp_stop`, `mcp_get_tools`, `mcp_detect_clients`, `mcp_configure_client`

- [ ] **Step 3: Verify files compile**

```bash
bun run typecheck 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add src/services/mocks/system.ts src/services/mocks/mcp.ts
git commit -m "refactor: extract system and mcp mocks"
```

---

### Task 12: Create index.ts router and re-exports

**Files:**
- Create: `src/services/mocks/index.ts`

- [ ] **Step 1: Create index.ts**

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

// Re-export mock data for backward compatibility
export { mockConnections } from "./connections";
export {
  mockGetMysqlCharsets,
  mockGetMysqlCollations,
  mockTestConnectionEphemeral,
} from "./connections";
export {
  mockTables,
  mockTableStructure,
  mockTableMetadata,
  mockSchemaForeignKeys,
  mockSchemaOverview,
  mockDatabases,
  mockListTables,
  mockGetTableStructure,
  mockGetTableDDL,
  mockListEvents,
  mockListSequences,
  mockListTypes,
  mockListSynonyms,
  mockListPackages,
  mockListRoutines,
  mockGetRoutineDDL,
  mockGetTableMetadata,
  mockGetSchemaForeignKeys,
  mockListTablesByConn,
  mockListDatabases,
  mockListDatabasesById,
  mockGetSchemaOverview,
} from "./metadata";
export {
  mockQueryResult,
  mockMultipleResultSets,
  mockComplexTypeData,
  mockArrayTypeData,
  mockExecuteQuery,
  mockCancelQuery,
  mockExecuteByConn,
  mockListSqlExecutionLogs,
  mockListRedisCommandLogs,
} from "./query";
export { mockTableData, mockGetTableData, mockGetTableDataByConn } from "./tableData";
export {
  mockSavedQueries,
  mockGetSavedQueries,
  mockSaveQuery,
  mockUpdateSavedQuery,
  mockDeleteSavedQuery,
} from "./queries";
export {
  mockExportTableData,
  mockExportDatabaseSql,
  mockExportQueryResult,
  mockImportSqlFile,
} from "./transfer";
export {
  mockRedisListDatabases,
  mockRedisScanKeys,
  mockRedisGetKey,
  mockRedisSetKey,
  mockRedisDeleteKey,
  mockRedisRenameKey,
  mockRedisSetTtl,
  mockRedisServerInfo,
  mockRedisServerConfig,
  mockRedisSlowlogGet,
  mockRedisExecuteRaw,
} from "./redis";
export {
  mockMcpStatus,
  mockMcpStart,
  mockMcpStop,
  mockMcpGetTools,
  mockMcpDetectClients,
  mockMcpConfigureClient,
} from "./mcp";
```

- [ ] **Step 2: Verify file compiles**

```bash
bun run typecheck 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/services/mocks/index.ts
git commit -m "refactor: add mocks router and re-exports in index.ts"
```

---

### Task 13: Delete old mocks.ts and update test imports

**Files:**
- Delete: `src/services/mocks.ts`
- Modify: `src/services/mocks.service.test.ts`

- [ ] **Step 1: Delete old mocks.ts**

```bash
rm src/services/mocks.ts
```

- [ ] **Step 2: Update mocks.service.test.ts imports**

Change line 2-6 from:
```typescript
import {
  invokeMock,
  mockGetMysqlCharsets,
  mockGetMysqlCollations,
} from "./mocks";
```
to:
```typescript
import { invokeMock } from "./mocks";
import { mockGetMysqlCharsets, mockGetMysqlCollations } from "./mocks/connections";
```

- [ ] **Step 3: Run typecheck**

```bash
bun run typecheck
```

Expected: No errors

- [ ] **Step 4: Run all mock-related tests**

```bash
bun test src/services/mocks.service.test.ts src/services/query.service.test.ts src/services/connections.service.test.ts src/services/metadata.service.test.ts src/services/redis.service.test.ts src/services/elasticsearch.service.test.ts src/services/mongodb.service.test.ts src/services/ai.service.test.ts
```

Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/services/mocks.service.test.ts
git rm src/services/mocks.ts
git commit -m "refactor: remove old mocks.ts, update test imports"
```

---

### Task 14: Final verification

- [ ] **Step 1: Run full typecheck**

```bash
bun run typecheck
```

Expected: No errors

- [ ] **Step 2: Run full test suite**

```bash
bun test
```

Expected: All tests pass

- [ ] **Step 3: Verify file structure**

```bash
ls -la src/services/mocks/
```

Expected: 12 files (index.ts + 11 domain files)

- [ ] **Step 4: Verify no leftover references to old path**

```bash
grep -r "from.*\"./mocks\"" src/services/ --include="*.ts" | grep -v "mocks/"
```

Expected: No results (all imports now go through `mocks/` or `mocks/index.ts`)

- [ ] **Step 5: Commit final state if needed**

```bash
git status
```
