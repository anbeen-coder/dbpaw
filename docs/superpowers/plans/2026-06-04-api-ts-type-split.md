# api.ts Type Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract all type definitions from `src/services/api.ts` into domain-specific files under `src/services/types/`, reducing api.ts from 1771 lines to ~920 lines.

**Architecture:** Create 7 domain type files + 1 barrel index. `api.ts` re-exports everything via `export * from './types'` so all 35 consuming files keep working unchanged.

**Tech Stack:** TypeScript, Vite, Tauri

---

### Task 1: Create `src/services/types/redis.ts`

**Files:**
- Create: `src/services/types/redis.ts`

- [ ] **Step 1: Create redis.ts with all Redis types**

Create the file with every `Redis*` type from api.ts lines 56–299 and `RedisCommandLog` from lines 417–425:

```typescript
export interface RedisDatabaseInfo {
  index: number;
  name: string;
  selected: boolean;
  keyCount?: number;
}

export interface RedisServerInfo {
  sections: Record<string, Record<string, string>>;
  dbsize: number;
}

export interface RedisSlowlogEntry {
  id: number;
  timestamp: number;
  durationMs: number;
  command: string;
}

export interface RedisKeyInfo {
  key: string;
  keyType: string;
  ttl: number;
}

export interface RedisScanResponse {
  cursor: string;
  keys: RedisKeyInfo[];
  isPartial: boolean;
}

export type RedisConnectionMode = "standalone" | "cluster" | "sentinel";

export type RedisValue =
  | { kind: "string"; value: string }
  | { kind: "hash"; value: Record<string, string> }
  | { kind: "list"; value: string[] }
  | { kind: "set"; value: string[] }
  | { kind: "zSet"; value: { member: string; score: number }[] }
  | { kind: "stream"; value: { id: string; fields: Record<string, string> }[] }
  | { kind: "json"; value: string }
  | { kind: "none"; value?: null };

export interface RedisBitmapBit {
  offset: number;
  value: boolean;
}

export interface RedisGeoMember {
  member: string;
  longitude: number;
  latitude: number;
}

export interface RedisGeoPosition {
  longitude: number;
  latitude: number;
}

export interface RedisGeoSearchResult {
  member: string;
  distance?: number;
  hash?: number;
  position?: RedisGeoPosition;
}

export interface RedisKeyExtra {
  subtype?: string | null;
  streamInfo?: {
    length: number;
    radixTreeKeys: number;
    radixTreeNodes: number;
    groups: number;
    lastGeneratedId: string;
    firstEntry?: { id: string; fields: Record<string, string> } | null;
    lastEntry?: { id: string; fields: Record<string, string> } | null;
  } | null;
  streamGroups?: RedisStreamGroup[] | null;
  hllCount?: number | null;
  geoCount?: number | null;
  bitmapCount?: number | null;
}

export interface RedisKeyValue {
  key: string;
  keyType: string;
  ttl: number;
  value: RedisValue;
  valueTotalLen: number | null;
  valueOffset: number;
  isBinary?: boolean;
  extra?: RedisKeyExtra | null;
  objectEncoding?: string | null;
  memoryUsage?: number | null;
  objectIdletime?: number | null;
  objectRefcount?: number | null;
  keyExists?: boolean | null;
}

export interface RedisSetKeyPayload {
  key: string;
  value: RedisValue;
  ttlSeconds?: number | null;
  setNx?: boolean;
  setXx?: boolean;
  setPx?: number | null;
  setKeepttl?: boolean;
}

export interface RedisMutationResult {
  success: boolean;
  affected: number;
}

export interface RedisListSetItem {
  index: number;
  value: string;
}

export interface RedisStreamEntry {
  id: string;
  fields: Record<string, string>;
}

export interface RedisStreamGroup {
  name: string;
  consumers: number;
  pending: number;
  lastDeliveredId: string;
  entriesRead?: number | null;
  lag?: number | null;
}

export interface RedisStreamView {
  entries: RedisStreamEntry[];
  totalLen: number;
  startId: string;
  endId: string;
  count: number;
  nextStartId?: string | null;
  streamInfo?: RedisKeyExtra["streamInfo"];
  groups: RedisStreamGroup[];
}

export interface RedisXPendingSummary {
  count: number;
  minId: string;
  maxId: string;
  consumers: [string, number][];
}

export interface RedisXPendingEntry {
  id: string;
  consumer: string;
  idleMs: number;
  deliveryCount: number;
}

export interface RedisXClaimEntry {
  id: string;
  fields: Record<string, string>;
  idleMs?: number;
  deliveryCount?: number;
}

export interface RedisKeyPatchPayload {
  key: string;
  ttlSeconds: number | null;
  hashSet?: Record<string, string>;
  hashDel?: string[];
  setAdd?: string[];
  setRem?: string[];
  zsetAdd?: { member: string; score: number }[];
  zsetRem?: string[];
  listRpush?: string[];
  listLpush?: string[];
  listSet?: RedisListSetItem[];
  listRem?: string[];
  listLpop?: number;
  listRpop?: number;
  streamAdd?: RedisStreamEntry[];
  streamDel?: string[];
  bitmapSet?: RedisBitmapBit[];
  stringIncrBy?: string;
  hashIncrBy?: Record<string, string>;
  zsetIncrBy?: { member: string; score: number }[];
  stringIncrByInt?: number;
}

export interface RedisRawResult {
  output: string;
}

export interface RedisZRangeByScoreResult {
  members: { member: string; score: number }[];
  total: number;
}

export interface RedisZRangeByLexResult {
  members: string[];
  total: number;
}

export type RedisSetOperation = "inter" | "union" | "diff";

export type RedisLInsertPosition = "before" | "after";

export type RedisLMoveDirection = "left" | "right";

export interface RedisBatchKeyOp {
  op: "del" | "unlink" | "expire" | "persist";
  key: string;
  ttlSeconds?: number;
}

export interface RedisBatchKeyOpResult {
  key: string;
  op: string;
  success: boolean;
  affected: number;
}

export interface RedisMgetEntry {
  key: string;
  value: string | null;
  exists: boolean;
}

export interface RedisClusterNode {
  id: string;
  addr: string;
  flags: string[];
  masterId: string | null;
  pingSent: number;
  pongRecv: number;
  configEpoch: number;
  linkState: string;
  slotRange: string | null;
}

export interface RedisClusterInfo {
  info: Record<string, string>;
  nodes: RedisClusterNode[];
}

export interface RedisCommandLog {
  id: number;
  command: string;
  connectionId?: number | null;
  database?: string | null;
  success: boolean;
  error?: string | null;
  executedAt: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/types/redis.ts
git commit -m "refactor: extract Redis types to services/types/redis.ts"
```

---

### Task 2: Create `src/services/types/elasticsearch.ts`

**Files:**
- Create: `src/services/types/elasticsearch.ts`

- [ ] **Step 1: Create elasticsearch.ts with all Elasticsearch types**

```typescript
export interface ElasticsearchConnectionInfo {
  clusterName?: string | null;
  clusterUuid?: string | null;
  version?: string | null;
  tagline?: string | null;
}

export interface ElasticsearchIndexInfo {
  name: string;
  health?: string | null;
  status?: string | null;
  uuid?: string | null;
  primaryShards?: string | null;
  replicaShards?: string | null;
  docsCount?: number | null;
  storeSize?: string | null;
  isSystem: boolean;
}

export interface ElasticsearchSearchHit {
  index: string;
  id: string;
  score?: number | null;
  source: any;
  fields?: any;
}

export interface ElasticsearchSearchResponse {
  hits: ElasticsearchSearchHit[];
  total: number;
  tookMs: number;
  aggregations?: any;
}

export interface ElasticsearchDocument {
  index: string;
  id: string;
  found: boolean;
  source?: any;
  fields?: any;
}

export interface ElasticsearchMutationResult {
  index?: string | null;
  id?: string | null;
  result?: string | null;
  status: number;
}

export interface ElasticsearchIndexOperationResult {
  index?: string | null;
  acknowledged?: boolean | null;
  shardsAcknowledged?: boolean | null;
  status: number;
}

export interface ElasticsearchRawResponse {
  status: number;
  body: string;
  json?: any;
  tookMs: number;
}

export interface ElasticsearchBulkExportResult {
  filePath: string;
  index: string;
  documents: number;
  batches: number;
  timeTakenMs: number;
}

export interface ElasticsearchBulkImportResult {
  filePath: string;
  index: string;
  totalActions: number;
  successful: number;
  failed: number;
  errors: string[];
  timeTakenMs: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/types/elasticsearch.ts
git commit -m "refactor: extract Elasticsearch types to services/types/elasticsearch.ts"
```

---

### Task 3: Create `src/services/types/mongodb.ts`

**Files:**
- Create: `src/services/types/mongodb.ts`

- [ ] **Step 1: Create mongodb.ts with all MongoDB types**

```typescript
export interface MongodbConnectionInfo {
  version?: string;
  nodeCount?: number;
}

export interface MongodbDatabaseInfo {
  name: string;
  sizeOnDisk?: number;
  empty?: boolean;
}

export interface MongodbCollectionInfo {
  name: string;
  database: string;
  documentCount?: number;
  size?: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/types/mongodb.ts
git commit -m "refactor: extract MongoDB types to services/types/mongodb.ts"
```

---

### Task 4: Create `src/services/types/sql.ts`

**Files:**
- Create: `src/services/types/sql.ts`

This file contains all relational/SQL types. `ConnectionForm` and `SavedConnection` reference `RedisConnectionMode` — import it from `./redis`. Also re-export `Driver` and `ImportDriverCapability` from `@/lib/driver-registry`.

- [ ] **Step 1: Create sql.ts with all SQL/general types**

```typescript
import type { RedisConnectionMode } from "./redis";
import type { Driver, ImportDriverCapability } from "@/lib/driver-registry";

export type { Driver, ImportDriverCapability } from "@/lib/driver-registry";

export interface QueryColumn {
  name: string;
  type: string;
}

export interface SingleResultSet {
  data: any[];
  rowCount: number;
  columns: QueryColumn[];
  index: number;
  statement: string;
}

export interface QueryResult {
  data: any[];
  rowCount: number;
  columns: QueryColumn[];
  timeTakenMs: number;
  success: boolean;
  error?: string;
  resultSets?: SingleResultSet[];
}

export type SqlExecutionSource =
  | "sql_editor"
  | "table_view_save"
  | "execute_by_conn"
  | "unknown";

export interface SqlExecutionLog {
  id: number;
  sql: string;
  source?: string | null;
  connectionId?: number | null;
  database?: string | null;
  success: boolean;
  error?: string | null;
  executedAt: string;
}

export interface ConnectionForm {
  driver: Driver;
  name?: string;
  host?: string;
  port?: number;
  database?: string;
  schema?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  sslMode?: "require" | "verify_ca";
  sslCaCert?: string;
  filePath?: string;
  sshEnabled?: boolean;
  sshHost?: string;
  sshPort?: number;
  sshUsername?: string;
  sshPassword?: string;
  sshKeyPath?: string;
  mode?: RedisConnectionMode;
  seedNodes?: string[];
  sentinels?: string[];
  connectTimeoutMs?: number;
  serviceName?: string;
  sentinelPassword?: string;
  authMode?: string;
  apiKeyId?: string;
  apiKeySecret?: string;
  apiKeyEncoded?: string;
  cloudId?: string;
  authSource?: string;
}

export interface SavedConnection {
  id: number;
  uuid: string;
  name: string;
  dbType: string;
  host: string;
  port: number;
  database: string;
  username: string;
  ssl: boolean;
  sslMode?: "require" | "verify_ca";
  sslCaCert?: string | null;
  filePath?: string | null;
  sshEnabled: boolean;
  sshHost?: string | null;
  sshPort?: number | null;
  sshUsername?: string | null;
  sshPassword?: string | null;
  sshKeyPath?: string | null;
  mode?: RedisConnectionMode | null;
  seedNodes?: string[] | null;
  sentinels?: string[] | null;
  connectTimeoutMs?: number | null;
  serviceName?: string | null;
  sentinelPassword?: string | null;
  authMode?: "none" | "basic" | "api_key" | null;
  apiKeyId?: string | null;
  apiKeySecret?: string | null;
  apiKeyEncoded?: string | null;
  cloudId?: string | null;
  authSource?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImportResult {
  imported: SavedConnection[];
  skipped: number;
}

export interface CreateDatabasePayload {
  name: string;
  ifNotExists?: boolean;
  charset?: string;
  collation?: string;
  encoding?: string;
  lcCollate?: string;
  lcCtype?: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  latencyMs?: number;
}

export interface ColumnSchema {
  name: string;
  type: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string | null;
  primaryKey: boolean;
  comment?: string | null;
  defaultConstraintName?: string | null;
}

export interface IndexInfo {
  name: string;
  unique: boolean;
  indexType?: string | null;
  columns: string[];
}

export interface ForeignKeyInfo {
  name: string;
  column: string;
  referencedSchema?: string | null;
  referencedTable: string;
  referencedColumn: string;
  onUpdate?: string | null;
  onDelete?: string | null;
}

export interface ClickHouseTableExtra {
  engine: string;
  partitionKey?: string | null;
  sortingKey?: string | null;
  primaryKeyExpr?: string | null;
  samplingKey?: string | null;
  ttlExpr?: string | null;
  createTableQuery?: string | null;
}

export interface CassandraTableExtra {
  partitionKey: string[];
  clusteringColumns: string[];
  compactionStrategy: string;
  bloomFilterFpChance: number;
  caching: any;
  gcGraceSeconds: number;
  defaultTimeToLive: number;
}

export type SpecialTypeCategory = "bitmap" | "geo" | "hyperloglog";

export interface SpecialTypeSummary {
  columnName: string;
  category: SpecialTypeCategory;
  typeName: string;
  declaredLength?: string | null;
  memoryUsageBytes?: number | null;
  memoryUsageDisplay?: string | null;
  rawType: string;
  notes?: string | null;
}

export interface TableMetadata {
  columns: ColumnInfo[];
  indexes: IndexInfo[];
  foreignKeys: ForeignKeyInfo[];
  clickhouseExtra?: ClickHouseTableExtra | null;
  cassandraExtra?: CassandraTableExtra | null;
  specialTypeSummaries: SpecialTypeSummary[];
}

export interface SchemaForeignKey {
  name: string;
  sourceTable: string;
  sourceSchema?: string | null;
  sourceColumn: string;
  targetTable: string;
  targetSchema?: string | null;
  targetColumn: string;
  onUpdate?: string | null;
  onDelete?: string | null;
}

export type RoutineType = "procedure" | "function";

export interface RoutineInfo {
  schema: string;
  name: string;
  type: RoutineType;
}

export interface EventInfo {
  schema: string;
  name: string;
  status: string;
  eventType: string;
  executeAt: string | null;
  intervalValue: string | null;
  lastExecuted: string | null;
  definition: string | null;
}

export interface SequenceInfo {
  schema: string;
  name: string;
  dataType: string;
  startValue: string | null;
  increment: string | null;
}

export interface TypeInfo {
  schema: string;
  name: string;
  category: string;
}

export interface SynonymInfo {
  schema: string;
  name: string;
  baseObjectType: string;
}

export interface PackageInfo {
  schema: string;
  name: string;
  objectType: string;
}

export interface TableSchema {
  schema: string;
  name: string;
  columns: ColumnSchema[];
}

export interface SchemaOverview {
  tables: TableSchema[];
}

export interface SavedQuery {
  id: number;
  name: string;
  query: string;
  description?: string | null;
  connectionId?: number | null;
  database?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SqliteConnectionIssue {
  id: number;
  connectionId: number;
  connectionName: string;
  filePath: string;
  issueType:
    | "locked"
    | "corrupted"
    | "permission_denied"
    | "not_found"
    | string;
  description: string;
  detectedAt: string;
  resolvedAt?: string | null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/types/sql.ts
git commit -m "refactor: extract SQL/general types to services/types/sql.ts"
```

---

### Task 5: Create `src/services/types/ai.ts`

**Files:**
- Create: `src/services/types/ai.ts`

- [ ] **Step 1: Create ai.ts with all AI types**

```typescript
export type AIProviderType = string;

export interface AIProviderConfig {
  id: number;
  name: string;
  providerType: AIProviderType;
  baseUrl: string;
  model: string;
  hasApiKey: boolean;
  isDefault: boolean;
  enabled: boolean;
  extraJson?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AIProviderForm {
  name: string;
  providerType?: AIProviderType;
  baseUrl: string;
  model: string;
  apiKey?: string;
  isDefault?: boolean;
  enabled?: boolean;
  extraJson?: string;
}

export interface AIUsage {
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
}

export interface AIConversation {
  id: number;
  title: string;
  scenario: string;
  connectionId?: number | null;
  database?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AIMessage {
  id: number;
  conversationId: number;
  role: "system" | "developer" | "user" | "assistant" | "tool" | string;
  content: string;
  promptVersion?: string | null;
  model?: string | null;
  tokenIn?: number | null;
  tokenOut?: number | null;
  latencyMs?: number | null;
  createdAt: string;
}

export interface AIConversationDetail {
  conversation: AIConversation;
  messages: AIMessage[];
}

export interface AITableSummary {
  schema: string;
  name: string;
  columns: { name: string; type: string; nullable?: boolean }[];
}

export interface AISchemaOverview {
  tables: AITableSummary[];
}

export interface AISelectedTableRef {
  schema: string;
  name: string;
}

export interface AIChatRequest {
  requestId: string;
  providerId?: number;
  conversationId?: number;
  scenario: "sql_generate" | "sql_optimize" | "sql_explain" | string;
  input: string;
  title?: string;
  connectionId?: number;
  database?: string;
  schemaOverview?: AISchemaOverview;
  selectedTables?: AISelectedTableRef[];
}

export interface AIChatResponse {
  conversationId: number;
  userMessageId: number;
  assistantMessageId: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/types/ai.ts
git commit -m "refactor: extract AI types to services/types/ai.ts"
```

---

### Task 6: Create `src/services/types/mcp.ts`

**Files:**
- Create: `src/services/types/mcp.ts`

- [ ] **Step 1: Create mcp.ts with all MCP types**

```typescript
export type McpStatus = {
  running: boolean;
  pid: number | null;
  transport: string;
  port: number | null;
  host: string | null;
};

export type McpConfig = {
  transport: string;
  port: number;
  host: string;
};

export type McpToolInfo = {
  name: string;
  description: string;
};

export type McpDetectedClient = {
  name: string;
  path: string;
  exists: boolean;
  configured: boolean;
};
```

- [ ] **Step 2: Commit**

```bash
git add src/services/types/mcp.ts
git commit -m "refactor: extract MCP types to services/types/mcp.ts"
```

---

### Task 7: Create `src/services/types/export.ts`

**Files:**
- Create: `src/services/types/export.ts`

- [ ] **Step 1: Create export.ts with all export/import types**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/services/types/export.ts
git commit -m "refactor: extract export/import types to services/types/export.ts"
```

---

### Task 8: Create barrel `src/services/types/index.ts`

**Files:**
- Create: `src/services/types/index.ts`

- [ ] **Step 1: Create index.ts barrel file**

```typescript
export * from "./redis";
export * from "./elasticsearch";
export * from "./mongodb";
export * from "./sql";
export * from "./ai";
export * from "./mcp";
export * from "./export";
```

- [ ] **Step 2: Commit**

```bash
git add src/services/types/index.ts
git commit -m "refactor: add barrel index for services/types"
```

---

### Task 9: Update `src/services/api.ts` — remove types, add re-export

**Files:**
- Modify: `src/services/api.ts`

- [ ] **Step 1: Remove all type definitions from api.ts**

Remove lines 33–853 (all `export interface`, `export type`, and the `Driver`/`ImportDriverCapability` re-export). Keep:
- Line 1–32: imports, `isTauri`, `useMockMode`, `invoke`
- Lines 434–448: `normalizeImportDriver`, `getImportDriverCapability` (these are functions, not types)
- Lines 855–1771: the `api` object

The `DRIVER_REGISTRY` import (line 427–431) is needed by `normalizeImportDriver`/`getImportDriverCapability`, so keep it. Remove only the `export type { Driver, ImportDriverCapability }` re-export since that moves to `sql.ts`.

- [ ] **Step 2: Add re-export at top of api.ts**

Add this line after the existing imports (after line 2):

```typescript
export * from "./types";
```

- [ ] **Step 3: Add type imports needed by api.ts functions**

The `api` object uses these types: `SqlExecutionSource`, `QueryResult`, `ConnectionForm`, `SqlExecutionLog`, `RedisCommandLog`, `RoutineType`, `TableMetadata`, `SchemaOverview`, `SchemaForeignKey`, `EventInfo`, `SequenceInfo`, `TypeInfo`, `SynonymInfo`, `SavedQuery`, `SavedConnection`, `ImportResult`, `CreateDatabasePayload`, `TestConnectionResult`, `TransferFormat`, `ExportScope`, `ExportResult`, `ImportSqlResult`, `AIProviderConfig`, `AIProviderForm`, `AIChatRequest`, `AIChatResponse`, `AIConversation`, `AIConversationDetail`, `McpStatus`, `McpConfig`, `McpToolInfo`, `McpDetectedClient`, `MongodbCollectionInfo`, `ElasticsearchIndexInfo`, `ElasticsearchSearchResponse`, `ElasticsearchDocument`, `ElasticsearchMutationResult`, `ElasticsearchIndexOperationResult`, `ElasticsearchRawResponse`, `ElasticsearchBulkExportResult`, `ElasticsearchBulkImportResult`, `ElasticsearchConnectionInfo`, `MongodbConnectionInfo`, `MongodbDatabaseInfo`, `RedisDatabaseInfo`, `RedisServerInfo`, `RedisSlowlogEntry`, `RedisKeyInfo`, `RedisScanResponse`, `RedisKeyValue`, `RedisSetKeyPayload`, `RedisMutationResult`, `RedisStreamEntry`, `RedisStreamView`, `RedisXPendingSummary`, `RedisXPendingEntry`, `RedisXClaimEntry`, `RedisKeyPatchPayload`, `RedisRawResult`, `RedisZRangeByScoreResult`, `RedisZRangeByLexResult`, `RedisBatchKeyOp`, `RedisBatchKeyOpResult`, `RedisMgetEntry`, `RedisClusterInfo`.

Since `export * from "./types"` re-exports everything, these types are already available within the file scope. No additional import statements are needed — TypeScript resolves re-exported types in the same file.

- [ ] **Step 4: Verify the final api.ts structure**

The file should now contain only:

```typescript
import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { invokeMock } from "./mocks";
import {
  DRIVER_REGISTRY,
  type Driver,
  type ImportDriverCapability,
} from "@/lib/driver-registry";

export * from "./types";

export const isTauri = () => { ... };
const useMockMode = () => { ... };
const invoke = async <T>(cmd: string, args?: any): Promise<T> => { ... };

export const normalizeImportDriver = (driver: string): string => { ... };
export const getImportDriverCapability = (driver: string): ImportDriverCapability => { ... };

export const api = { ... };
```

- [ ] **Step 5: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors. If there are errors, they indicate missing imports or misplaced types — fix accordingly.

- [ ] **Step 6: Commit**

```bash
git add src/services/api.ts
git commit -m "refactor: remove types from api.ts, re-export from types/"
```

---

### Task 10: Verify no regressions

**Files:**
- None (verification only)

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: successful build.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: no new warnings.

- [ ] **Step 4: Verify api.ts line count**

```bash
wc -l src/services/api.ts
```

Expected: ~920 lines (down from 1771).

- [ ] **Step 5: Verify type file sizes**

```bash
wc -l src/services/types/*.ts
```

Expected: each file under 300 lines.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "refactor: api.ts type split complete — types moved to services/types/"
```
