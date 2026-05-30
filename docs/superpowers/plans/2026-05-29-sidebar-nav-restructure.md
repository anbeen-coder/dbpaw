# Sidebar Navigation Restructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the sidebar tree to show separate categories (Tables, Views, Functions, Procedures, Events/Sequences/Types) matching Navicat/DataGrip style for MySQL and PostgreSQL.

**Architecture:** Extend the existing `TreeConfig` with a `databaseGroups` field that defines per-database categories. Add new Rust backend APIs for MySQL events, PostgreSQL sequences, and PostgreSQL types. Refactor ConnectionList.tsx to render groups dynamically instead of hardcoded logic.

**Tech Stack:** Rust (Tauri backend), TypeScript/React (frontend), Lucide icons, i18n

---

## File Structure

### Backend (Rust)
| File | Change |
|------|--------|
| `src-tauri/src/models/mod.rs` | Add `EventInfo`, `SequenceInfo`, `TypeInfo` structs |
| `src-tauri/src/db/drivers/mod.rs` | Add `list_events`, `list_sequences`, `list_types` to `DatabaseDriver` trait |
| `src-tauri/src/db/drivers/mysql.rs` | Implement `list_events` |
| `src-tauri/src/db/drivers/postgres.rs` | Implement `list_sequences`, `list_types` |
| `src-tauri/src/commands/metadata.rs` | Add new Tauri commands |
| `src-tauri/src/lib.rs` | Register new commands |

### Frontend (TypeScript)
| File | Change |
|------|--------|
| `src/services/api.ts` | Add `EventInfo`, `SequenceInfo`, `TypeInfo` types + API methods |
| `src/services/mocks.ts` | Add mock implementations for new API methods |
| `src/lib/tree-adapters/types.tsx` | Add `DatabaseGroupConfig` interface, extend `TreeConfig` |
| `src/lib/tree-adapters/sql-adapter.tsx` | Define per-database groups, update `createSqlTreeConfig` |
| `src/lib/i18n/locales/en.ts` | Add new translation keys |
| `src/lib/i18n/locales/zh.ts` | Add new translation keys |
| `src/components/business/Sidebar/ConnectionList.tsx` | Refactor tree rendering to use `databaseGroups` |

---

## Task 1: Add Rust Data Models

**Files:**
- Modify: `src-tauri/src/models/mod.rs`

- [ ] **Step 1: Add EventInfo struct**

Add after the existing `RoutineInfo` struct (around line 165):

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventInfo {
    pub schema: String,
    pub name: String,
    pub status: String,
    pub event_type: String,
    pub execute_at: Option<String>,
    pub interval_value: Option<String>,
    pub last_executed: Option<String>,
    pub definition: Option<String>,
}
```

- [ ] **Step 2: Add SequenceInfo struct**

Add after `EventInfo`:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SequenceInfo {
    pub schema: String,
    pub name: String,
    pub data_type: String,
    pub start_value: Option<String>,
    pub increment: Option<String>,
}
```

- [ ] **Step 3: Add TypeInfo struct**

Add after `SequenceInfo`:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TypeInfo {
    pub schema: String,
    pub name: String,
    pub category: String,
}
```

- [ ] **Step 4: Verify compilation**

Run: `cargo check` (in `src-tauri/` directory)
Expected: PASS (no errors, structs are defined but unused yet)

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/models/mod.rs
git commit -m "feat: add EventInfo, SequenceInfo, TypeInfo models"
```

---

## Task 2: Extend DatabaseDriver Trait

**Files:**
- Modify: `src-tauri/src/db/drivers/mod.rs`

- [ ] **Step 1: Add imports for new models**

Add to the imports at the top of `mod.rs`:

```rust
use crate::models::{EventInfo, SequenceInfo, TypeInfo};
```

- [ ] **Step 2: Add list_events default method**

Add after the existing `list_routines` default method (around line 325):

```rust
async fn list_events(&self, _schema: Option<String>) -> Result<Vec<EventInfo>, String> {
    Ok(vec![])
}
```

- [ ] **Step 3: Add list_sequences default method**

Add after `list_events`:

```rust
async fn list_sequences(&self, _schema: Option<String>) -> Result<Vec<SequenceInfo>, String> {
    Ok(vec![])
}
```

- [ ] **Step 4: Add list_types default method**

Add after `list_sequences`:

```rust
async fn list_types(&self, _schema: Option<String>) -> Result<Vec<TypeInfo>, String> {
    Ok(vec![])
}
```

- [ ] **Step 5: Verify compilation**

Run: `cargo check` (in `src-tauri/` directory)
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/db/drivers/mod.rs
git commit -m "feat: add list_events, list_sequences, list_types to DatabaseDriver trait"
```

---

## Task 3: Implement MySQL list_events

**Files:**
- Modify: `src-tauri/src/db/drivers/mysql.rs`

- [ ] **Step 1: Add import for EventInfo**

Add to the imports in `mysql.rs`:

```rust
use crate::models::EventInfo;
```

- [ ] **Step 2: Implement list_events**

Add the implementation inside the `impl DatabaseDriver for MysqlDriver` block, after the existing `list_routines` method:

```rust
async fn list_events(&self, schema: Option<String>) -> Result<Vec<EventInfo>, String> {
    let target_schema = if let Some(s) = schema {
        s
    } else {
        self.current_database()
            .await
            .map_err(|e| format!("[QUERY_ERROR] Failed to get current database: {e}"))?
            .ok_or("[QUERY_ERROR] No database selected and no schema provided")?
    };

    let rows = self
        .fetch_all_with_str_params(
            "SELECT EVENT_SCHEMA, EVENT_NAME, STATUS, EVENT_TYPE, \
             EXECUTE_AT, INTERVAL_VALUE, LAST_EXECUTED, EVENT_DEFINITION \
             FROM information_schema.EVENTS \
             WHERE EVENT_SCHEMA = ? \
             ORDER BY EVENT_NAME",
            &[&target_schema],
        )
        .await?;

    let mut res = Vec::new();
    for row in rows {
        res.push(EventInfo {
            schema: decode_mysql_text_cell(&row, 0)?,
            name: decode_mysql_text_cell(&row, 1)?,
            status: decode_mysql_text_cell(&row, 2)?,
            event_type: decode_mysql_text_cell(&row, 3)?,
            execute_at: decode_mysql_text_cell_optional(&row, 4)?,
            interval_value: decode_mysql_text_cell_optional(&row, 5)?,
            last_executed: decode_mysql_text_cell_optional(&row, 6)?,
            definition: decode_mysql_text_cell_optional(&row, 7)?,
        });
    }
    Ok(res)
}
```

- [ ] **Step 3: Verify compilation**

Run: `cargo check` (in `src-tauri/` directory)
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/db/drivers/mysql.rs
git commit -m "feat: implement MySQL list_events"
```

---

## Task 4: Implement PostgreSQL list_sequences and list_types

**Files:**
- Modify: `src-tauri/src/db/drivers/postgres.rs`

- [ ] **Step 1: Add imports**

Add to the imports in `postgres.rs`:

```rust
use crate::models::{SequenceInfo, TypeInfo};
```

- [ ] **Step 2: Implement list_sequences**

Add inside `impl DatabaseDriver for PostgresDriver`:

```rust
async fn list_sequences(&self, schema: Option<String>) -> Result<Vec<SequenceInfo>, String> {
    let target_schema = schema.unwrap_or_else(|| "public".to_string());

    let rows = self
        .fetch_all(
            "SELECT schemaname, sequencename, data_type, start_value, increment_by \
             FROM pg_sequences \
             WHERE schemaname = $1 \
             ORDER BY sequencename",
            &[&target_schema],
        )
        .await?;

    let mut res = Vec::new();
    for row in rows {
        res.push(SequenceInfo {
            schema: row.try_get::<_, String>(0).unwrap_or_default(),
            name: row.try_get::<_, String>(1).unwrap_or_default(),
            data_type: row.try_get::<_, String>(2).unwrap_or_default(),
            start_value: row.try_get::<_, Option<String>>(3).ok().flatten(),
            increment: row.try_get::<_, Option<String>>(4).ok().flatten(),
        });
    }
    Ok(res)
}
```

- [ ] **Step 3: Implement list_types**

Add after `list_sequences`:

```rust
async fn list_types(&self, schema: Option<String>) -> Result<Vec<TypeInfo>, String> {
    let target_schema = schema.unwrap_or_else(|| "public".to_string());

    let rows = self
        .fetch_all(
            "SELECT n.nspname, t.typname, \
                    CASE t.typtype \
                      WHEN 'e' THEN 'enum' \
                      WHEN 'c' THEN 'composite' \
                      WHEN 'r' THEN 'range' \
                      ELSE t.typtype \
                    END as category \
             FROM pg_type t \
             JOIN pg_namespace n ON t.typnamespace = n.oid \
             WHERE n.nspname = $1 \
               AND t.typtype IN ('e', 'c', 'r') \
               AND NOT EXISTS ( \
                 SELECT 1 FROM pg_class WHERE reltype = t.oid AND relkind != 'c' \
               ) \
             ORDER BY t.typname",
            &[&target_schema],
        )
        .await?;

    let mut res = Vec::new();
    for row in rows {
        res.push(TypeInfo {
            schema: row.try_get::<_, String>(0).unwrap_or_default(),
            name: row.try_get::<_, String>(1).unwrap_or_default(),
            category: row.try_get::<_, String>(2).unwrap_or_default(),
        });
    }
    Ok(res)
}
```

- [ ] **Step 4: Verify compilation**

Run: `cargo check` (in `src-tauri/` directory)
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/db/drivers/postgres.rs
git commit -m "feat: implement PostgreSQL list_sequences and list_types"
```

---

## Task 5: Add Tauri Commands

**Files:**
- Modify: `src-tauri/src/commands/metadata.rs`

- [ ] **Step 1: Add import for new models**

Add to the imports in `metadata.rs`:

```rust
use crate::models::{EventInfo, SequenceInfo, TypeInfo};
```

- [ ] **Step 2: Add list_events command**

Add after the existing `list_routines` command:

```rust
#[tauri::command]
pub async fn list_events(
    app: tauri::AppHandle,
    connection_id: String,
    database: String,
) -> Result<Vec<EventInfo>, String> {
    let app_handle = app.clone();
    let database_clone = database.clone();
    super::with_connection(&app_handle, &connection_id, |driver| {
        let db = database_clone.clone();
        async move { driver.list_events(Some(db)).await }
    })
    .await
}
```

- [ ] **Step 3: Add list_sequences command**

Add after `list_events`:

```rust
#[tauri::command]
pub async fn list_sequences(
    app: tauri::AppHandle,
    connection_id: String,
    database: String,
) -> Result<Vec<SequenceInfo>, String> {
    let app_handle = app.clone();
    let database_clone = database.clone();
    super::with_connection(&app_handle, &connection_id, |driver| {
        let db = database_clone.clone();
        async move { driver.list_sequences(Some(db)).await }
    })
    .await
}
```

- [ ] **Step 4: Add list_types command**

Add after `list_sequences`:

```rust
#[tauri::command]
pub async fn list_types(
    app: tauri::AppHandle,
    connection_id: String,
    database: String,
) -> Result<Vec<TypeInfo>, String> {
    let app_handle = app.clone();
    let database_clone = database.clone();
    super::with_connection(&app_handle, &connection_id, |driver| {
        let db = database_clone.clone();
        async move { driver.list_types(Some(db)).await }
    })
    .await
}
```

- [ ] **Step 5: Register commands in lib.rs**

In `src-tauri/src/lib.rs`, add to the `generate_handler![]` macro:

```rust
commands::metadata::list_events,
commands::metadata::list_sequences,
commands::metadata::list_types,
```

- [ ] **Step 6: Verify compilation**

Run: `cargo check` (in `src-tauri/` directory)
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/commands/metadata.rs src-tauri/src/lib.rs
git commit -m "feat: add Tauri commands for list_events, list_sequences, list_types"
```

---

## Task 6: Add Frontend API Types and Methods

**Files:**
- Modify: `src/services/api.ts`
- Modify: `src/services/mocks.ts`

- [ ] **Step 1: Add EventInfo type**

Add to `src/services/api.ts` after the existing `RoutineInfo` interface:

```typescript
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
```

- [ ] **Step 2: Add SequenceInfo type**

Add after `EventInfo`:

```typescript
export interface SequenceInfo {
  schema: string;
  name: string;
  dataType: string;
  startValue: string | null;
  increment: string | null;
}
```

- [ ] **Step 3: Add TypeInfo type**

Add after `SequenceInfo`:

```typescript
export interface TypeInfo {
  schema: string;
  name: string;
  category: string;
}
```

- [ ] **Step 4: Add listEvents API method**

Add to the `api.metadata` object in `src/services/api.ts`:

```typescript
listEvents: (connectionId: string, database: string) =>
  invoke<EventInfo[]>("list_events", { connectionId, database }),
```

- [ ] **Step 5: Add listSequences API method**

Add after `listEvents`:

```typescript
listSequences: (connectionId: string, database: string) =>
  invoke<SequenceInfo[]>("list_sequences", { connectionId, database }),
```

- [ ] **Step 6: Add listTypes API method**

Add after `listSequences`:

```typescript
listTypes: (connectionId: string, database: string) =>
  invoke<TypeInfo[]>("list_types", { connectionId, database }),
```

- [ ] **Step 7: Add mock implementations**

In `src/services/mocks.ts`, add mock implementations for the new methods:

```typescript
listEvents: async (_connectionId: string, _database: string) => [],
listSequences: async (_connectionId: string, _database: string) => [],
listTypes: async (_connectionId: string, _database: string) => [],
```

- [ ] **Step 8: Verify TypeScript compilation**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/services/api.ts src/services/mocks.ts
git commit -m "feat: add frontend API types and methods for events, sequences, types"
```

---

## Task 7: Extend TreeConfig with DatabaseGroupConfig

**Files:**
- Modify: `src/lib/tree-adapters/types.tsx`

- [ ] **Step 1: Add DatabaseGroupConfig interface**

Add before the `TreeConfig` interface:

```typescript
export interface DatabaseGroupConfig {
  id: string;
  label: string;
  icon: ReactNode;
  leafIcon: ReactNode;
  source: "tables" | "routines" | "events" | "sequences" | "types";
  sourceFilter?: string;
  contextMenuItems?: (ctx: LeafContext) => TreeMenuItem[];
  onLeafActivate?: (ctx: LeafContext) => void;
}
```

- [ ] **Step 2: Add databaseGroups to TreeConfig**

Add the new field to the `TreeConfig` interface:

```typescript
databaseGroups: DatabaseGroupConfig[];
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `bun run typecheck`
Expected: PASS (may show errors in sql-adapter.tsx until we update it)

- [ ] **Step 4: Commit**

```bash
git add src/lib/tree-adapters/types.tsx
git commit -m "feat: add DatabaseGroupConfig interface to TreeConfig"
```

---

## Task 8: Update SQL Adapter with Per-Database Groups

**Files:**
- Modify: `src/lib/tree-adapters/sql-adapter.tsx`

- [ ] **Step 1: Add new icon imports**

Update the import statement to include new icons:

```typescript
import { Table, Database, FileCode, Download, RefreshCw, Eye, Cog, Clock, Hash, Type } from "lucide-react";
```

- [ ] **Step 2: Add imports for DatabaseGroupConfig**

Update the import from `./types`:

```typescript
import type {
  TreeConfig,
  TreeCallbacks,
  TreeMenuItem,
  DatabaseContext,
  LeafContext,
  DatabaseGroupConfig,
} from "./types";
```

- [ ] **Step 3: Create MySQL groups definition**

Add before the `createSqlTreeConfig` function:

```typescript
const mysqlGroups: DatabaseGroupConfig[] = [
  { id: "tables",     label: "connection.tree.tables",     icon: <Table className="w-4 h-4" />,  leafIcon: <Table className="w-4 h-4" />,  source: "tables" },
  { id: "views",      label: "connection.tree.views",      icon: <Eye className="w-4 h-4" />,    leafIcon: <Eye className="w-4 h-4" />,    source: "tables",  sourceFilter: "view" },
  { id: "functions",  label: "connection.tree.functions",  icon: <Cog className="w-4 h-4" />,    leafIcon: <Cog className="w-4 h-4" />,    source: "routines", sourceFilter: "function" },
  { id: "procedures", label: "connection.tree.procedures", icon: <Cog className="w-4 h-4" />,    leafIcon: <Cog className="w-4 h-4" />,    source: "routines", sourceFilter: "procedure" },
  { id: "events",     label: "connection.tree.events",     icon: <Clock className="w-4 h-4" />,  leafIcon: <Clock className="w-4 h-4" />,  source: "events" },
];
```

- [ ] **Step 4: Create PostgreSQL groups definition**

Add after `mysqlGroups`:

```typescript
const postgresGroups: DatabaseGroupConfig[] = [
  { id: "tables",     label: "connection.tree.tables",     icon: <Table className="w-4 h-4" />,  leafIcon: <Table className="w-4 h-4" />,  source: "tables" },
  { id: "views",      label: "connection.tree.views",      icon: <Eye className="w-4 h-4" />,    leafIcon: <Eye className="w-4 h-4" />,    source: "tables",  sourceFilter: "VIEW" },
  { id: "functions",  label: "connection.tree.functions",  icon: <Cog className="w-4 h-4" />,    leafIcon: <Cog className="w-4 h-4" />,    source: "routines", sourceFilter: "function" },
  { id: "procedures", label: "connection.tree.procedures", icon: <Cog className="w-4 h-4" />,    leafIcon: <Cog className="w-4 h-4" />,    source: "routines", sourceFilter: "procedure" },
  { id: "sequences",  label: "connection.tree.sequences",  icon: <Hash className="w-4 h-4" />,   leafIcon: <Hash className="w-4 h-4" />,   source: "sequences" },
  { id: "types",      label: "connection.tree.types",      icon: <Type className="w-4 h-4" />,   leafIcon: <Type className="w-4 h-4" />,   source: "types" },
];
```

- [ ] **Step 5: Create SQLite/DuckDB groups definition**

Add after `postgresGroups`:

```typescript
const sqliteGroups: DatabaseGroupConfig[] = [
  { id: "tables",     label: "connection.tree.tables",     icon: <Table className="w-4 h-4" />,  leafIcon: <Table className="w-4 h-4" />,  source: "tables" },
  { id: "views",      label: "connection.tree.views",      icon: <Eye className="w-4 h-4" />,    leafIcon: <Eye className="w-4 h-4" />,    source: "tables",  sourceFilter: "view" },
];
```

- [ ] **Step 6: Create default SQL groups (for other drivers)**

Add after `sqliteGroups`:

```typescript
const defaultSqlGroups: DatabaseGroupConfig[] = [
  { id: "tables",     label: "connection.tree.tables",     icon: <Table className="w-4 h-4" />,  leafIcon: <Table className="w-4 h-4" />,  source: "tables" },
  { id: "views",      label: "connection.tree.views",      icon: <Eye className="w-4 h-4" />,    leafIcon: <Eye className="w-4 h-4" />,    source: "tables",  sourceFilter: "view" },
  { id: "functions",  label: "connection.tree.functions",  icon: <Cog className="w-4 h-4" />,    leafIcon: <Cog className="w-4 h-4" />,    source: "routines", sourceFilter: "function" },
  { id: "procedures", label: "connection.tree.procedures", icon: <Cog className="w-4 h-4" />,    leafIcon: <Cog className="w-4 h-4" />,    source: "routines", sourceFilter: "procedure" },
];
```

- [ ] **Step 7: Update createSqlTreeConfig to accept driver parameter**

Change the function signature and add groups selection:

```typescript
export function createSqlTreeConfig(
  callbacks: TreeCallbacks = {},
  overrides?: Partial<TreeConfig>,
  driverId?: string,
): TreeConfig {
  const groups = driverId === "mysql" || driverId === "mariadb" || driverId === "tidb" || driverId === "starrocks" || driverId === "doris"
    ? mysqlGroups
    : driverId === "postgres"
      ? postgresGroups
      : driverId === "sqlite" || driverId === "duckdb"
        ? sqliteGroups
        : defaultSqlGroups;

  return {
    supportsSavedQueries: true,
    databaseExpandable: true,
    supportsSchemaNode: false,
    leafNodeType: "table",
    leafNodeIcon: () => <Table className="w-4 h-4" />,
    databaseNodeIcon: () => <Database className="w-4 h-4" />,
    databaseGroups: groups,
    getDatabaseContextMenuItems: (ctx) =>
      getSqlDatabaseContextMenuItems(ctx, callbacks),
    getLeafContextMenuItems: (ctx) =>
      getSqlLeafContextMenuItems(ctx, callbacks),
    ...overrides,
  };
}
```

- [ ] **Step 8: Update driver-registry.tsx to pass driverId**

In `src/lib/driver-registry.tsx`, update the MySQL treeConfig call:

```typescript
treeConfig: (callbacks) => createSqlTreeConfig(callbacks, undefined, "mysql"),
```

Update PostgreSQL:

```typescript
treeConfig: (callbacks) => createSqlTreeConfig(callbacks, { supportsSchemaNode: true }, "postgres"),
```

Update SQLite:

```typescript
treeConfig: (callbacks) => createSqlTreeConfig(callbacks, undefined, "sqlite"),
```

Update DuckDB:

```typescript
treeConfig: (callbacks) => createSqlTreeConfig(callbacks, undefined, "duckdb"),
```

Keep other drivers using the default (no driverId parameter).

- [ ] **Step 9: Verify TypeScript compilation**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add src/lib/tree-adapters/sql-adapter.tsx src/lib/driver-registry.tsx
git commit -m "feat: add per-database groups to SQL adapter"
```

---

## Task 9: Add i18n Keys

**Files:**
- Modify: `src/lib/i18n/locales/en.ts`
- Modify: `src/lib/i18n/locales/zh.ts`

- [ ] **Step 1: Add English keys**

In `src/lib/i18n/locales/en.ts`, add to the `tree` object:

```typescript
views: "Views",
events: "Events",
sequences: "Sequences",
types: "Types",
noViews: "No views",
noEvents: "No events",
noSequences: "No sequences",
noTypes: "No types",
```

- [ ] **Step 2: Add Chinese keys**

In `src/lib/i18n/locales/zh.ts`, add to the `tree` object:

```typescript
views: "视图",
events: "事件",
sequences: "序列",
types: "类型",
noViews: "暂无视图",
noEvents: "暂无事件",
noSequences: "暂无序列",
noTypes: "暂无类型",
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/locales/en.ts src/lib/i18n/locales/zh.ts
git commit -m "feat: add i18n keys for views, events, sequences, types"
```

---

## Task 10: Refactor ConnectionList.tsx to Use databaseGroups

**Files:**
- Modify: `src/components/business/Sidebar/ConnectionList.tsx`

This is the largest task. The key changes are:
1. Add state for new data types (events, sequences, types)
2. Add data loading functions for new APIs
3. Replace hardcoded rendering logic with group iteration

- [ ] **Step 1: Add new state variables**

Add after the existing `expandedRoutineGroups` state:

```typescript
const [expandedGroupNodes, setExpandedGroupNodes] = useState<Set<string>>(new Set());
const [databaseEvents, setDatabaseEvents] = useState<Map<string, EventInfo[]>>(new Map());
const [databaseSequences, setDatabaseSequences] = useState<Map<string, SequenceInfo[]>>(new Map());
const [databaseTypes, setDatabaseTypes] = useState<Map<string, TypeInfo[]>>(new Map());
```

- [ ] **Step 2: Add imports for new types**

Add to the imports at the top of ConnectionList.tsx:

```typescript
import type { EventInfo, SequenceInfo, TypeInfo } from "@/services/api";
```

- [ ] **Step 3: Add data loading functions**

Add after the existing `fetchSqlRoutinesAsRoutineInfo` function:

```typescript
const fetchEvents = async (
  connectionId: string,
  databaseName: string,
): Promise<EventInfo[]> => {
  try {
    return await api.metadata.listEvents(connectionId, databaseName);
  } catch (err) {
    console.error("Failed to fetch events:", err);
    return [];
  }
};

const fetchSequences = async (
  connectionId: string,
  databaseName: string,
): Promise<SequenceInfo[]> => {
  try {
    return await api.metadata.listSequences(connectionId, databaseName);
  } catch (err) {
    console.error("Failed to fetch sequences:", err);
    return [];
  }
};

const fetchTypes = async (
  connectionId: string,
  databaseName: string,
): Promise<TypeInfo[]> => {
  try {
    return await api.metadata.listTypes(connectionId, databaseName);
  } catch (err) {
    console.error("Failed to fetch types:", err);
    return [];
  }
};
```

- [ ] **Step 4: Update fetchAndSetTables to also load events/sequences/types**

Modify the `fetchAndSetTables` function to also load the new data types when expanding a database. Add after the existing routine loading logic:

```typescript
// Load events if the group exists
const eventsGroup = groups.find(g => g.source === "events");
if (eventsGroup) {
  const events = await fetchEvents(connectionId, databaseName);
  setDatabaseEvents(prev => new Map(prev).set(dbKey, events));
}

// Load sequences if the group exists
const sequencesGroup = groups.find(g => g.source === "sequences");
if (sequencesGroup) {
  const sequences = await fetchSequences(connectionId, databaseName);
  setDatabaseSequences(prev => new Map(prev).set(dbKey, sequences));
}

// Load types if the group exists
const typesGroup = groups.find(g => g.source === "types");
if (typesGroup) {
  const types = await fetchTypes(connectionId, databaseName);
  setDatabaseTypes(prev => new Map(prev).set(dbKey, types));
}
```

- [ ] **Step 5: Add helper to get group items**

Add a helper function to extract items for a specific group:

```typescript
const getGroupItems = (
  database: DatabaseInfo,
  group: DatabaseGroupConfig,
  dbKey: string,
): { name: string; [key: string]: any }[] => {
  switch (group.source) {
    case "tables": {
      const tables = database.tables || [];
      return group.sourceFilter
        ? tables.filter(t => t.type === group.sourceFilter)
        : tables.filter(t => t.type === "table" || t.type === "BASE TABLE");
    }
    case "routines": {
      const routines = database.routines || [];
      return group.sourceFilter
        ? routines.filter(r => r.type === group.sourceFilter)
        : routines;
    }
    case "events":
      return databaseEvents.get(dbKey) || [];
    case "sequences":
      return databaseSequences.get(dbKey) || [];
    case "types":
      return databaseTypes.get(dbKey) || [];
    default:
      return [];
  }
};
```

- [ ] **Step 6: Add toggleGroupNode helper**

Add a helper for toggling group expansion:

```typescript
const toggleGroupNode = (groupKey: string) => {
  setExpandedGroupNodes((prev) => {
    const next = new Set(prev);
    if (next.has(groupKey)) {
      next.delete(groupKey);
    } else {
      next.add(groupKey);
    }
    return next;
  });
};
```

- [ ] **Step 7: Add renderGroupNode function**

Add a function to render a single group node with its children:

```typescript
const renderGroupNode = (
  group: DatabaseGroupConfig,
  items: { name: string; schema?: string; type?: string; [key: string]: any }[],
  groupLevel: number,
  dbKey: string,
  connection: ConnectionInfo,
  database: DatabaseInfo,
) => {
  const groupNodeKey = `${dbKey}::${group.id}`;
  return (
    <TreeNode
      key={groupNodeKey}
      level={groupLevel}
      icon={group.icon}
      label={t(group.label)}
      isExpanded={expandedGroupNodes.has(groupNodeKey)}
      onToggle={() => toggleGroupNode(groupNodeKey)}
    >
      {items.length === 0 ? (
        <div
          className="px-2 py-1 text-xs text-muted-foreground"
          style={{ paddingLeft: `${(groupLevel + 1) * 12 + 8}px` }}
        >
          {t(`connection.tree.no${group.id.charAt(0).toUpperCase() + group.id.slice(1)}`)}
        </div>
      ) : (
        items.map((item) =>
          group.source === "events" ? (
            renderEventNode(item as EventInfo, groupLevel + 1, group)
          ) : group.source === "sequences" ? (
            renderSequenceNode(item as SequenceInfo, groupLevel + 1, group)
          ) : group.source === "types" ? (
            renderTypeNode(item as TypeInfo, groupLevel + 1, group)
          ) : (
            renderTableNode(
              { ...item, schema: item.schema || database.name } as TableInfo,
              groupLevel + 1,
              group.leafIcon,
            )
          )
        )
      )}
    </TreeNode>
  );
};
```

- [ ] **Step 8: Add renderEventNode, renderSequenceNode, renderTypeNode**

Add simple render functions for the new node types:

```typescript
const renderEventNode = (event: EventInfo, nodeLevel: number, group: DatabaseGroupConfig) => {
  const eventKey = `${connection.id}-${database.name}::event::${event.name}`;
  return (
    <TreeNode
      key={eventKey}
      level={nodeLevel}
      icon={group.leafIcon}
      label={event.name}
    />
  );
};

const renderSequenceNode = (sequence: SequenceInfo, nodeLevel: number, group: DatabaseGroupConfig) => {
  const seqKey = `${connection.id}-${database.name}::sequence::${sequence.name}`;
  return (
    <TreeNode
      key={seqKey}
      level={nodeLevel}
      icon={group.leafIcon}
      label={sequence.name}
    />
  );
};

const renderTypeNode = (typeInfo: TypeInfo, nodeLevel: number, group: DatabaseGroupConfig) => {
  const typeKey = `${connection.id}-${database.name}::type::${typeInfo.name}`;
  return (
    <TreeNode
      key={typeKey}
      level={nodeLevel}
      icon={group.leafIcon}
      label={typeInfo.name}
    />
  );
};
```

- [ ] **Step 9: Update renderTableNode to accept custom icon**

Modify the `renderTableNode` function signature to accept an optional icon parameter:

```typescript
const renderTableNode = (table: TableInfo, tableLevel: number, customIcon?: ReactNode) => {
```

And update the icon usage:

```typescript
icon={customIcon || datasourceAdapter.getItemIcon()}
```

- [ ] **Step 10: Replace hardcoded rendering with group iteration**

In the database node rendering section (the non-schema branch), replace the existing hardcoded logic with:

```typescript
// Get the groups for this driver
const groups = datasourceAdapter.databaseGroups || [];

// Render each group
groups.map((group) => {
  const items = getGroupItems(database, group, dbKey);
  return renderGroupNode(group, items, level + 1, dbKey, connection, database);
})
```

Remove the old hardcoded `renderTableGroup` and `renderRoutineGroup` calls in the non-schema branch.

- [ ] **Step 11: Update schema branch similarly**

For schema-based drivers (PostgreSQL), update the schema node rendering to use groups inside each schema.

- [ ] **Step 12: Verify TypeScript compilation**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 13: Run lint**

Run: `bun run lint`
Expected: PASS (or only pre-existing warnings)

- [ ] **Step 14: Commit**

```bash
git add src/components/business/Sidebar/ConnectionList.tsx
git commit -m "feat: refactor ConnectionList to use databaseGroups for tree rendering"
```

---

## Task 11: Final Verification

- [ ] **Step 1: Rust compilation check**

Run: `cargo check` (in `src-tauri/` directory)
Expected: PASS

- [ ] **Step 2: TypeScript compilation check**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 3: Lint check**

Run: `bun run lint`
Expected: PASS

- [ ] **Step 4: Manual testing checklist**

Verify with a MySQL connection:
- [ ] Database expands to show Tables, Views, Functions, Procedures, Events folders
- [ ] Tables folder shows only tables (no views)
- [ ] Views folder shows only views
- [ ] Functions/Procedures folders show correct items
- [ ] Events folder loads and shows events (or "No events" if empty)
- [ ] Double-click on table opens table tab
- [ ] Context menus work for each category

Verify with a PostgreSQL connection:
- [ ] Database expands to show Schema node
- [ ] Schema expands to show Tables, Views, Functions, Procedures, Sequences, Types folders
- [ ] Each folder shows correct items
- [ ] Empty folders show appropriate "No items" message

- [ ] **Step 5: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address review feedback for sidebar restructure"
```
