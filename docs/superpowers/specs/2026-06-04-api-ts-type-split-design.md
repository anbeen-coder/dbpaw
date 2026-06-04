# Design: Split api.ts Types by Domain

## Problem

`src/services/api.ts` is 1771 lines. ~820 lines are type/interface definitions spanning Redis, Elasticsearch, MongoDB, AI, MCP, SQL, and export domains. The remaining ~920 lines are utility functions and the `api` object. This makes the file hard to navigate and violates single-responsibility.

## Goal

Extract all type definitions from `api.ts` into domain-specific files under `src/services/types/`. Keep `api.ts` as the home for functions only. Preserve backward compatibility via re-exports so no existing imports break.

## File Structure

```
src/services/types/
  redis.ts           # ~245 lines — 30 interfaces/types
  elasticsearch.ts   # ~80 lines — 10 interfaces
  mongodb.ts         # ~18 lines — 3 interfaces
  sql.ts             # ~300 lines — ~25 interfaces (QueryColumn, QueryResult, ConnectionForm, etc.)
  ai.ts              # ~95 lines — ~12 interfaces
  mcp.ts             # ~25 lines — 4 types
  export.ts          # ~53 lines — 3 interfaces
  index.ts           # barrel: export * from each domain file
```

## Domain Assignments

### redis.ts (lines 56–300)
All `Redis*` prefixed types: `RedisDatabaseInfo`, `RedisServerInfo`, `RedisSlowlogEntry`, `RedisKeyInfo`, `RedisScanResponse`, `RedisConnectionMode`, `RedisValue`, `RedisBitmapBit`, `RedisGeoMember`, `RedisGeoPosition`, `RedisGeoSearchResult`, `RedisKeyExtra`, `RedisKeyValue`, `RedisSetKeyPayload`, `RedisMutationResult`, `RedisListSetItem`, `RedisStreamEntry`, `RedisStreamGroup`, `RedisStreamView`, `RedisXPendingSummary`, `RedisXPendingEntry`, `RedisXClaimEntry`, `RedisKeyPatchPayload`, `RedisRawResult`, `RedisZRangeByScoreResult`, `RedisZRangeByLexResult`, `RedisSetOperation`, `RedisLInsertPosition`, `RedisLMoveDirection`, `RedisBatchKeyOp`, `RedisBatchKeyOpResult`, `RedisMgetEntry`, `RedisClusterNode`, `RedisClusterInfo`.

Also: `RedisCommandLog` (line 417).

### elasticsearch.ts (lines 301–381)
All `Elasticsearch*` prefixed types: `ElasticsearchConnectionInfo`, `ElasticsearchIndexInfo`, `ElasticsearchSearchHit`, `ElasticsearchSearchResponse`, `ElasticsearchDocument`, `ElasticsearchMutationResult`, `ElasticsearchIndexOperationResult`, `ElasticsearchRawResponse`, `ElasticsearchBulkExportResult`, `ElasticsearchBulkImportResult`.

### mongodb.ts (lines 382–399)
`MongodbConnectionInfo`, `MongodbDatabaseInfo`, `MongodbCollectionInfo`.

### sql.ts (lines 33–55, 400–700)
Core relational/SQL types: `QueryColumn`, `SingleResultSet`, `QueryResult`, `SqlExecutionSource`, `SqlExecutionLog`, `ConnectionForm`, `SavedConnection`, `ImportResult`, `CreateDatabasePayload`, `TestConnectionResult`, `ColumnSchema`, `ColumnInfo`, `IndexInfo`, `ForeignKeyInfo`, `ClickHouseTableExtra`, `CassandraTableExtra`, `SpecialTypeCategory`, `SpecialTypeSummary`, `TableMetadata`, `SchemaForeignKey`, `RoutineType`, `RoutineInfo`, `EventInfo`, `SequenceInfo`, `TypeInfo`, `SynonymInfo`, `PackageInfo`, `TableSchema`, `SchemaOverview`, `SavedQuery`, `SqliteConnectionIssue`.

Also: re-export `Driver` and `ImportDriverCapability` from `@/lib/driver-registry`.

### ai.ts (lines 705–800)
All `AI*` prefixed types: `AIProviderConfig`, `AIProviderType`, `AIProviderForm`, `AIUsage`, `AIConversation`, `AIMessage`, `AIConversationDetail`, `AITableSummary`, `AISchemaOverview`, `AISelectedTableRef`, `AIChatRequest`, `AIChatResponse`.

### mcp.ts (lines 812–837)
`McpStatus`, `McpConfig`, `McpToolInfo`, `McpDetectedClient`.

### export.ts (lines 800–853)
`TransferFormat`, `ExportScope`, `ExportResult`, `ImportSqlResult`.

## api.ts After Extraction

What remains in `src/services/api.ts` (~920 lines):

```typescript
import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { invokeMock } from "./mocks";

// Re-export all types for backward compatibility
export * from "./types";

// Helpers
export const isTauri = () => { ... };
const useMockMode = () => { ... };
const invoke = async <T>(cmd: string, args?: any): Promise<T> => { ... };

// Utility functions
export const normalizeImportDriver = (driver: string): string => { ... };
export const getImportDriverCapability = (...) => { ... };

// API methods
export const api = { ... };
```

## Migration Rules

1. Move type/interface declarations to the appropriate domain file.
2. Types that reference other types within the same domain file — no change needed.
3. Types that reference types in a different domain file — add an import from the other domain file.
4. `index.ts` barrel re-exports all domain files.
5. `api.ts` adds `export * from './types'` at the top.
6. Zero changes to any of the 35 consuming files.

## Cross-Domain Dependencies

Check during implementation: some types in `sql.ts` may reference types from other domains (e.g., `RedisCommandLog` references nothing cross-domain, but `SavedConnection` might reference `Driver` from `@/lib/driver-registry`). These imports stay within their domain files as needed.

## Verification

1. `npx tsc --noEmit` — must pass with zero errors
2. All 35 files that import from `@/services/api` must continue to work unchanged
3. `api.ts` line count should drop from 1771 to ~920
4. Each type file should be under 300 lines
