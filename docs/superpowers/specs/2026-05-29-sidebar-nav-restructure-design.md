# Sidebar Navigation Restructure Design

## Problem

The sidebar tree hierarchy for MySQL currently mixes views with tables inside a "Tables" folder, and shows "Procedures" and "Functions" as separate folders. This doesn't match the intuitive structure used by Navicat and DataGrip, where Tables, Views, Functions, Procedures, and Events are peer-level categories under each database.

PostgreSQL has similar issues — no separate Views, Sequences, or Types categories.

## Goal

Restructure the sidebar to match the native tool style for MySQL and PostgreSQL:

**MySQL:**
```
Connection
  └── Database
        ├── Tables
        ├── Views
        ├── Functions
        ├── Procedures
        └── Events
```

**PostgreSQL:**
```
Connection
  └── Database
        └── Schema (public)
              ├── Tables
              ├── Views
              ├── Functions
              ├── Procedures
              ├── Sequences
              └── Types
```

**SQLite / DuckDB** (no backend changes, frontend filtering):
```
Connection
  └── Database (main)
        ├── Tables
        └── Views
```

## Approach

Extend the existing `TreeConfig` architecture with a new `databaseGroups` field. Each database type defines its own set of categories. This keeps changes localized within the existing framework rather than introducing a new abstraction layer.

## Backend Changes (Rust)

### New Data Models (`src-tauri/src/models/mod.rs`)

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventInfo {
    pub schema: String,
    pub name: String,
    pub status: String,       // ENABLED / DISABLED
    pub event_type: String,   // ONE TIME / RECURRING
    pub execute_at: Option<String>,
    pub interval_value: Option<String>,
    pub last_executed: Option<String>,
    pub definition: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SequenceInfo {
    pub schema: String,
    pub name: String,
    pub data_type: String,
    pub start_value: Option<String>,
    pub increment: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TypeInfo {
    pub schema: String,
    pub name: String,
    pub category: String,     // enum, composite, range, etc.
}
```

### Extend DatabaseDriver Trait (`src-tauri/src/db/drivers/mod.rs`)

Add three optional methods with default implementations returning empty vecs:

```rust
async fn list_events(&self, _schema: Option<String>) -> Result<Vec<EventInfo>, String> {
    Ok(vec![])
}
async fn list_sequences(&self, _schema: Option<String>) -> Result<Vec<SequenceInfo>, String> {
    Ok(vec![])
}
async fn list_types(&self, _schema: Option<String>) -> Result<Vec<TypeInfo>, String> {
    Ok(vec![])
}
```

### MySQL: `list_events` (`src-tauri/src/db/drivers/mysql.rs`)

Query `information_schema.EVENTS`:

```sql
SELECT EVENT_SCHEMA, EVENT_NAME, STATUS, EVENT_TYPE,
       EXECUTE_AT, INTERVAL_VALUE, LAST_EXECUTED, EVENT_DEFINITION
FROM information_schema.EVENTS
WHERE EVENT_SCHEMA = ?
ORDER BY EVENT_NAME
```

### PostgreSQL: `list_sequences` (`src-tauri/src/db/drivers/postgres.rs`)

```sql
SELECT schemaname, sequencename, data_type, start_value, increment_by
FROM pg_sequences
WHERE schemaname = ?
ORDER BY sequencename
```

### PostgreSQL: `list_types` (`src-tauri/src/db/drivers/postgres.rs`)

```sql
SELECT n.nspname, t.typname,
       CASE t.typtype
         WHEN 'e' THEN 'enum'
         WHEN 'c' THEN 'composite'
         WHEN 'r' THEN 'range'
         ELSE t.typtype
       END as category
FROM pg_type t
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE n.nspname = ?
  AND t.typtype IN ('e', 'c', 'r')
  AND NOT EXISTS (
    SELECT 1 FROM pg_class WHERE reltype = t.oid AND relkind != 'c'
  )
ORDER BY t.typname
```

### New Tauri Commands (`src-tauri/src/commands/metadata.rs`)

```rust
#[tauri::command]
pub async fn list_events(
    app: tauri::AppHandle,
    connection_id: String,
    database: String,
) -> Result<Vec<EventInfo>, String> { ... }

#[tauri::command]
pub async fn list_sequences(
    app: tauri::AppHandle,
    connection_id: String,
    database: String,
) -> Result<Vec<SequenceInfo>, String> { ... }

#[tauri::command]
pub async fn list_types(
    app: tauri::AppHandle,
    connection_id: String,
    database: String,
) -> Result<Vec<TypeInfo>, String> { ... }
```

Register in `src-tauri/src/lib.rs` `generate_handler![]`.

## Frontend Changes (TypeScript)

### New API Types and Methods (`src/services/api.ts`)

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

// Add to api.metadata:
listEvents(connectionId: string, database: string): Promise<EventInfo[]>
listSequences(connectionId: string, database: string): Promise<SequenceInfo[]>
listTypes(connectionId: string, database: string): Promise<TypeInfo[]>
```

### Extend TreeConfig (`src/lib/tree-adapters/types.tsx`)

Add `databaseGroups` field to `TreeConfig`:

```typescript
interface DatabaseGroupConfig {
  id: string;                    // "tables" | "views" | "functions" | "procedures" | "events" | "sequences" | "types"
  label: string;                 // i18n key
  icon: ReactNode;
  leafIcon: ReactNode;
  source: "tables" | "routines" | "events" | "sequences" | "types";
  sourceFilter?: string;         // filter value, e.g. "view", "procedure", "function", "VIEW"
  contextMenuItems?: (ctx: LeafContext) => TreeMenuItem[];
  onLeafActivate?: (ctx: LeafContext) => void;
}

interface TreeConfig {
  // ... existing fields
  databaseGroups: DatabaseGroupConfig[];
}
```

### Update SQL Adapter (`src/lib/tree-adapters/sql-adapter.tsx`)

**MySQL default groups:**
```typescript
[
  { id: "tables",     label: "connection.tree.tables",     icon: <Table />,     leafIcon: <Table />,     source: "tables" },
  { id: "views",      label: "connection.tree.views",      icon: <Eye />,       leafIcon: <Eye />,       source: "tables",  sourceFilter: "view" },
  { id: "functions",  label: "connection.tree.functions",  icon: <Function />,  leafIcon: <Function />,  source: "routines", sourceFilter: "function" },
  { id: "procedures", label: "connection.tree.procedures", icon: <Cog />,       leafIcon: <Cog />,       source: "routines", sourceFilter: "procedure" },
  { id: "events",     label: "connection.tree.events",     icon: <Clock />,     leafIcon: <Clock />,     source: "events" },
]
```

**PostgreSQL groups:**
```typescript
[
  { id: "tables",     label: "connection.tree.tables",     icon: <Table />,     leafIcon: <Table />,     source: "tables" },
  { id: "views",      label: "connection.tree.views",      icon: <Eye />,       leafIcon: <Eye />,       source: "tables",  sourceFilter: "VIEW" },
  { id: "functions",  label: "connection.tree.functions",  icon: <Function />,  leafIcon: <Function />,  source: "routines", sourceFilter: "function" },
  { id: "procedures", label: "connection.tree.procedures", icon: <Cog />,       leafIcon: <Cog />,       source: "routines", sourceFilter: "procedure" },
  { id: "sequences",  label: "connection.tree.sequences",  icon: <Hash />,      leafIcon: <Hash />,      source: "sequences" },
  { id: "types",      label: "connection.tree.types",      icon: <Type />,      leafIcon: <Type />,      source: "types" },
]
```

**SQLite / DuckDB groups:**
```typescript
[
  { id: "tables",     label: "connection.tree.tables",     icon: <Table />,     leafIcon: <Table />,     source: "tables" },
  { id: "views",      label: "connection.tree.views",      icon: <Eye />,       leafIcon: <Eye />,       source: "tables",  sourceFilter: "view" },
]
```

**Other SQL drivers (MariaDB, TiDB, StarRocks, Doris, ClickHouse, MSSQL, Oracle, Db2):** Use the same MySQL-style groups minus Events (or with appropriate categories). These can be refined in follow-up work.

### ConnectionList.tsx Refactor

Replace the hardcoded `supportsRoutines` branching logic with a loop over `treeConfig.databaseGroups`:

**Data loading:**
- `source: "tables"` → Filter from existing `listTables` results by `type` field
- `source: "routines"` → Filter from existing `listRoutines` results by `type` field
- `source: "events"` → Call `api.metadata.listEvents()`
- `source: "sequences"` → Call `api.metadata.listSequences()`
- `source: "types"` → Call `api.metadata.listTypes()`

**Rendering:**
```typescript
// Old: hardcoded
if (supportsRoutines) {
  renderTableGroup(...)
  renderRoutineGroup("procedure")
  renderRoutineGroup("function")
}

// New: iterate groups
for (const group of treeConfig.databaseGroups) {
  const items = getGroupItems(database, group);
  renderGroupNode(group, items, level);
}
```

Expand state keys need updating to support the new group IDs (e.g., `"connectionId-dbName::views"` instead of hardcoded `"procedure"` / `"function"`).

### i18n Keys

Add to locale files:

```
connection.tree.views = "Views"
connection.tree.events = "Events"
connection.tree.sequences = "Sequences"
connection.tree.types = "Types"
connection.tree.noViews = "No views"
connection.tree.noEvents = "No events"
connection.tree.noSequences = "No sequences"
connection.tree.noTypes = "No types"
```

## Files to Modify

### Backend (Rust)
1. `src-tauri/src/models/mod.rs` — Add EventInfo, SequenceInfo, TypeInfo structs
2. `src-tauri/src/db/drivers/mod.rs` — Add list_events, list_sequences, list_types to trait
3. `src-tauri/src/db/drivers/mysql.rs` — Implement list_events
4. `src-tauri/src/db/drivers/postgres.rs` — Implement list_sequences, list_types
5. `src-tauri/src/commands/metadata.rs` — Add new Tauri commands
6. `src-tauri/src/lib.rs` — Register new commands

### Frontend (TypeScript)
7. `src/services/api.ts` — Add new types and API methods
8. `src/lib/tree-adapters/types.tsx` — Add DatabaseGroupConfig interface, extend TreeConfig
9. `src/lib/tree-adapters/sql-adapter.tsx` — Define per-database groups, update createSqlTreeConfig
10. `src/components/business/Sidebar/ConnectionList.tsx` — Refactor tree rendering to use databaseGroups
11. i18n locale files — Add new translation keys

## Scope

- MySQL and PostgreSQL are the primary targets
- SQLite/DuckDB get Views support via frontend filtering (no backend changes)
- Other SQL drivers (MariaDB, TiDB, etc.) can reuse the MySQL-style groups minus unsupported features
- Redis, MongoDB, Elasticsearch, Cassandra are out of scope — they already have appropriate structures

## Verification

1. `cargo check` — Rust compilation
2. `npm run typecheck` — TypeScript compilation
3. `npm run lint` — Code style
4. Manual testing with MySQL and PostgreSQL connections:
   - Verify Tables, Views, Functions, Procedures, Events (MySQL) / Sequences, Types (PostgreSQL) appear as separate categories
   - Verify double-click on items opens the correct tab type
   - Verify context menus work for each category
   - Verify empty categories show appropriate "No items" messages
