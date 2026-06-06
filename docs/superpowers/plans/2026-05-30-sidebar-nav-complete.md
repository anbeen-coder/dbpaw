# Sidebar Navigation Complete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add missing sidebar navigation groups for ClickHouse (Materialized Views), IBM Db2 (Sequences), MSSQL (Synonyms), and Oracle (Packages, Sequences, Types).

**Architecture:** Follow the established `DatabaseGroupConfig` pattern. Each database gets its own groups array in `sql-adapter.tsx`. New source types (`synonyms`, `packages`) require frontend state management in `ConnectionList.tsx` and backend API methods.

**Tech Stack:** Rust (Tauri backend), TypeScript (React frontend), SQLx (database queries)

---

## File Map

| File | Changes |
|------|---------|
| `src/lib/tree-adapters/sql-adapter.tsx` | Add `clickhouseGroups`, `db2Groups`, `mssqlGroups`, `oracleGroups`; update `createSqlTreeConfig` |
| `src/lib/tree-adapters/types.tsx` | Add `"synonyms"` and `"packages"` to `source` union type |
| `src-tauri/src/models/mod.rs` | Add `SynonymInfo`, `PackageInfo` structs |
| `src-tauri/src/db/drivers/mod.rs` | Add `list_synonyms`, `list_packages` trait methods; import new models |
| `src-tauri/src/db/drivers/db2.rs` | Implement `list_sequences` |
| `src-tauri/src/db/drivers/mssql.rs` | Implement `list_synonyms` |
| `src-tauri/src/db/drivers/oracle.rs` | Implement `list_sequences`, `list_types`, `list_packages` |
| `src-tauri/src/commands/metadata.rs` | Add `list_synonyms`, `list_packages` commands |
| `src-tauri/src/lib.rs` | Register new commands |
| `src/services/api.ts` | Add `SynonymInfo`, `PackageInfo` types; add `listSynonyms`, `listPackages` methods |
| `src/services/mocks.ts` | Add mock implementations |
| `src/components/business/Sidebar/ConnectionList.tsx` | Add state/fetch/render for synonyms and packages |
| `src/lib/i18n/locales/en.ts` | Add translation keys |
| `src/lib/i18n/locales/zh.ts` | Add translation keys |

---

## Task 1: ClickHouse Materialized Views (Frontend Only)

**Files:**
- Modify: `src/lib/tree-adapters/sql-adapter.tsx`
- Modify: `src/lib/i18n/locales/en.ts`
- Modify: `src/lib/i18n/locales/zh.ts`

- [ ] **Step 1: Add clickhouseGroups to sql-adapter.tsx**

In `src/lib/tree-adapters/sql-adapter.tsx`, add after `sqliteGroups` (line ~31):

```typescript
const clickhouseGroups: DatabaseGroupConfig[] = [
  { id: "tables",            label: "connection.tree.tables",            icon: <Table className="w-4 h-4" />,  leafIcon: <Table className="w-4 h-4" />,  source: "tables" },
  { id: "views",             label: "connection.tree.views",             icon: <Eye className="w-4 h-4" />,    leafIcon: <Eye className="w-4 h-4" />,    source: "tables", sourceFilter: "View" },
  { id: "materializedViews", label: "connection.tree.materializedViews", icon: <Eye className="w-4 h-4" />,    leafIcon: <Eye className="w-4 h-4" />,    source: "tables", sourceFilter: "MaterializedView" },
];
```

- [ ] **Step 2: Update createSqlTreeConfig to use clickhouseGroups**

In `src/lib/tree-adapters/sql-adapter.tsx`, modify the groups selection (line ~45-51):

```typescript
const groups = driverId === "mysql" || driverId === "mariadb" || driverId === "tidb" || driverId === "starrocks" || driverId === "doris"
    ? mysqlGroups
    : driverId === "postgres"
      ? postgresGroups
      : driverId === "sqlite" || driverId === "duckdb"
        ? sqliteGroups
        : driverId === "clickhouse"
          ? clickhouseGroups
          : defaultSqlGroups;
```

- [ ] **Step 3: Add i18n keys to en.ts**

In `src/lib/i18n/locales/en.ts`, add in the `connection.tree` object (after line ~230):

```typescript
materializedViews: "Materialized Views",
noMaterializedViews: "No materialized views",
```

- [ ] **Step 4: Add i18n keys to zh.ts**

In `src/lib/i18n/locales/zh.ts`, find the `connection.tree` object and add:

```typescript
materializedViews: "物化视图",
noMaterializedViews: "没有物化视图",
```

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/tree-adapters/sql-adapter.tsx src/lib/i18n/locales/en.ts src/lib/i18n/locales/zh.ts
git commit -m "feat(sidebar): add ClickHouse materialized views group"
```

---

## Task 2: IBM Db2 Sequences (Backend + Frontend)

**Files:**
- Modify: `src-tauri/src/db/drivers/db2.rs`
- Modify: `src/lib/tree-adapters/sql-adapter.tsx`

- [ ] **Step 1: Implement list_sequences in db2.rs**

In `src-tauri/src/db/drivers/db2.rs`, add after the `list_routines` implementation (after line ~310):

```rust
async fn list_sequences(&self, schema: Option<String>) -> Result<Vec<SequenceInfo>, String> {
    let schema_upper = schema
        .map(|s| s.trim().to_uppercase())
        .filter(|s| !s.is_empty());
    self.run_blocking(move |conn| {
        let sql = if let Some(ref s) = schema_upper {
            format!(
                "SELECT SEQSCHEMA, SEQNAME, DATA_TYPE, CAST(START AS VARCHAR(64)), CAST(INCREMENT AS VARCHAR(64)) \
                 FROM SYSCAT.SEQUENCES \
                 WHERE SEQSCHEMA = '{}' \
                 ORDER BY SEQSCHEMA, SEQNAME",
                escape_literal(s)
            )
        } else {
            "SELECT SEQSCHEMA, SEQNAME, DATA_TYPE, CAST(START AS VARCHAR(64)), CAST(INCREMENT AS VARCHAR(64)) \
             FROM SYSCAT.SEQUENCES \
             ORDER BY SEQSCHEMA, SEQNAME"
                .to_string()
        };
        let cursor = conn
            .execute(&sql, ())
            .map_err(|e| format!("[QUERY_ERROR] {e}"))?;
        let mut result = Vec::new();
        if let Some(c) = cursor {
            let (_, rows) = collect_cursor_data(c)?;
            for row in &rows {
                if let Some(arr) = row.as_array() {
                    let schema_name = arr.first().and_then(|v| v.as_str()).unwrap_or("");
                    let seq_name = arr.get(1).and_then(|v| v.as_str()).unwrap_or("");
                    let data_type = arr.get(2).and_then(|v| v.as_str()).unwrap_or("");
                    let start_value = arr.get(3).and_then(|v| v.as_str()).unwrap_or("");
                    let increment = arr.get(4).and_then(|v| v.as_str()).unwrap_or("");
                    if !schema_name.is_empty() && !seq_name.is_empty() {
                        result.push(SequenceInfo {
                            schema: schema_name.to_string(),
                            name: seq_name.to_string(),
                            data_type: data_type.to_string(),
                            start_value: Some(start_value.to_string()),
                            increment: Some(increment.to_string()),
                        });
                    }
                }
            }
        }
        Ok(result)
    })
    .await
}
```

- [ ] **Step 2: Add db2Groups to sql-adapter.tsx**

In `src/lib/tree-adapters/sql-adapter.tsx`, add after `clickhouseGroups`:

```typescript
const db2Groups: DatabaseGroupConfig[] = [
  { id: "tables",     label: "connection.tree.tables",     icon: <Table className="w-4 h-4" />,  leafIcon: <Table className="w-4 h-4" />,  source: "tables" },
  { id: "views",      label: "connection.tree.views",      icon: <Eye className="w-4 h-4" />,    leafIcon: <Eye className="w-4 h-4" />,    source: "tables", sourceFilter: "view" },
  { id: "functions",  label: "connection.tree.functions",  icon: <Cog className="w-4 h-4" />,    leafIcon: <Cog className="w-4 h-4" />,    source: "routines", sourceFilter: "function" },
  { id: "procedures", label: "connection.tree.procedures", icon: <Cog className="w-4 h-4" />,    leafIcon: <Cog className="w-4 h-4" />,    source: "routines", sourceFilter: "procedure" },
  { id: "sequences",  label: "connection.tree.sequences",  icon: <Hash className="w-4 h-4" />,   leafIcon: <Hash className="w-4 h-4" />,   source: "sequences" },
];
```

- [ ] **Step 3: Update createSqlTreeConfig to use db2Groups**

In `src/lib/tree-adapters/sql-adapter.tsx`, update the groups selection:

```typescript
const groups = driverId === "mysql" || driverId === "mariadb" || driverId === "tidb" || driverId === "starrocks" || driverId === "doris"
    ? mysqlGroups
    : driverId === "postgres"
      ? postgresGroups
      : driverId === "sqlite" || driverId === "duckdb"
        ? sqliteGroups
        : driverId === "clickhouse"
          ? clickhouseGroups
          : driverId === "db2"
            ? db2Groups
            : defaultSqlGroups;
```

- [ ] **Step 4: Run cargo check**

Run: `cargo check`
Expected: PASS

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/db/drivers/db2.rs src/lib/tree-adapters/sql-adapter.tsx
git commit -m "feat(sidebar): add Db2 sequences support"
```

---

## Task 3: MSSQL Synonyms - Backend

**Files:**
- Modify: `src-tauri/src/models/mod.rs`
- Modify: `src-tauri/src/db/drivers/mod.rs`
- Modify: `src-tauri/src/db/drivers/mssql.rs`
- Modify: `src-tauri/src/commands/metadata.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add SynonymInfo model to models/mod.rs**

In `src-tauri/src/models/mod.rs`, add after `TypeInfo` (line ~196):

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SynonymInfo {
    pub schema: String,
    pub name: String,
    pub base_object_type: String,
}
```

- [ ] **Step 2: Add list_synonyms trait method to mod.rs**

In `src-tauri/src/db/drivers/mod.rs`, add `SynonymInfo` to the imports (line ~12):

```rust
use crate::models::{
    ConnectionForm, EventInfo, PackageInfo, QueryResult, RoutineInfo, SchemaForeignKey,
    SchemaOverview, SequenceInfo, SynonymInfo, TableDataResponse, TableInfo, TableMetadata,
    TableStructure, TypeInfo,
};
```

Add the trait method after `list_types` (line ~332):

```rust
async fn list_synonyms(&self, _schema: Option<String>) -> Result<Vec<SynonymInfo>, String> {
    Ok(vec![])
}
```

- [ ] **Step 3: Implement list_synonyms in mssql.rs**

In `src-tauri/src/db/drivers/mssql.rs`, add after `list_routines` implementation (after line ~1764):

```rust
async fn list_synonyms(&self, schema: Option<String>) -> Result<Vec<SynonymInfo>, String> {
    let schema_filter = schema
        .filter(|s| !s.trim().is_empty())
        .map(|s| format!("AND s.name = '{}'", escape_literal(s.trim())));

    let sql = format!(
        "SELECT s.name AS schema_name, o.name AS synonym_name, 'synonym' AS base_object_type \
         FROM sys.objects o \
         JOIN sys.schemas s ON s.schema_id = o.schema_id \
         WHERE o.type = 'SN' {} \
         ORDER BY s.name, o.name",
        schema_filter.unwrap_or_default(),
    );
    let rows = self.fetch_rows(&sql).await?;

    Ok(rows
        .into_iter()
        .map(|row| SynonymInfo {
            schema: Self::parse_string(&row, 0),
            name: Self::parse_string(&row, 1),
            base_object_type: Self::parse_string(&row, 2),
        })
        .collect())
}
```

- [ ] **Step 4: Add list_synonyms command to metadata.rs**

In `src-tauri/src/commands/metadata.rs`, add after `list_types` (line ~150):

```rust
#[tauri::command]
pub async fn list_synonyms(
    state: tauri::State<'_, crate::AppState>,
    connection_id: i64,
    database: String,
) -> Result<Vec<crate::models::SynonymInfo>, String> {
    let driver = state.get_driver(connection_id).await?;
    let schema = if database.is_empty() { None } else { Some(database) };
    driver.list_synonyms(schema).await
}
```

- [ ] **Step 5: Register command in lib.rs**

In `src-tauri/src/lib.rs`, find the `invoke_handler` macro and add `list_synonyms` to the list of commands.

- [ ] **Step 6: Run cargo check**

Run: `cargo check`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/models/mod.rs src-tauri/src/db/drivers/mod.rs src-tauri/src/db/drivers/mssql.rs src-tauri/src/commands/metadata.rs src-tauri/src/lib.rs
git commit -m "feat(backend): add MSSQL synonyms API"
```

---

## Task 4: MSSQL Synonyms - Frontend

**Files:**
- Modify: `src/services/api.ts`
- Modify: `src/services/mocks.ts`
- Modify: `src/lib/tree-adapters/types.tsx`
- Modify: `src/lib/tree-adapters/sql-adapter.tsx`
- Modify: `src/components/business/Sidebar/ConnectionList.tsx`
- Modify: `src/lib/i18n/locales/en.ts`
- Modify: `src/lib/i18n/locales/zh.ts`

- [ ] **Step 1: Add SynonymInfo type to api.ts**

In `src/services/api.ts`, add after `TypeInfo` (line ~654):

```typescript
export interface SynonymInfo {
  schema: string;
  name: string;
  baseObjectType: string;
}
```

- [ ] **Step 2: Add listSynonyms method to api.ts**

In `src/services/api.ts`, add after `listTypes` (line ~914):

```typescript
listSynonyms: (connectionId: string, database: string) =>
  invoke<SynonymInfo[]>("list_synonyms", { connectionId, database }),
```

- [ ] **Step 3: Add mock implementation to mocks.ts**

In `src/services/mocks.ts`, find the metadata mock object and add:

```typescript
listSynonyms: async () => [],
```

- [ ] **Step 4: Add synonyms to source union in types.tsx**

In `src/lib/tree-adapters/types.tsx`, update the `source` type (line ~72):

```typescript
source: "tables" | "routines" | "events" | "sequences" | "types" | "synonyms" | "packages";
```

- [ ] **Step 5: Add mssqlGroups to sql-adapter.tsx**

In `src/lib/tree-adapters/sql-adapter.tsx`, add `Link` to the lucide-react imports (line ~1):

```typescript
import { Table, Database, FileCode, Download, RefreshCw, Eye, Cog, Clock, Hash, Type, Link } from "lucide-react";
```

Add `mssqlGroups` after `db2Groups`:

```typescript
const mssqlGroups: DatabaseGroupConfig[] = [
  { id: "tables",     label: "connection.tree.tables",     icon: <Table className="w-4 h-4" />,  leafIcon: <Table className="w-4 h-4" />,  source: "tables" },
  { id: "views",      label: "connection.tree.views",      icon: <Eye className="w-4 h-4" />,    leafIcon: <Eye className="w-4 h-4" />,    source: "tables", sourceFilter: "view" },
  { id: "functions",  label: "connection.tree.functions",  icon: <Cog className="w-4 h-4" />,    leafIcon: <Cog className="w-4 h-4" />,    source: "routines", sourceFilter: "function" },
  { id: "procedures", label: "connection.tree.procedures", icon: <Cog className="w-4 h-4" />,    leafIcon: <Cog className="w-4 h-4" />,    source: "routines", sourceFilter: "procedure" },
  { id: "synonyms",   label: "connection.tree.synonyms",   icon: <Link className="w-4 h-4" />,   leafIcon: <Link className="w-4 h-4" />,   source: "synonyms" },
];
```

Update `createSqlTreeConfig` groups selection:

```typescript
const groups = driverId === "mysql" || driverId === "mariadb" || driverId === "tidb" || driverId === "starrocks" || driverId === "doris"
    ? mysqlGroups
    : driverId === "postgres"
      ? postgresGroups
      : driverId === "sqlite" || driverId === "duckdb"
        ? sqliteGroups
        : driverId === "clickhouse"
          ? clickhouseGroups
          : driverId === "db2"
            ? db2Groups
            : driverId === "mssql"
              ? mssqlGroups
              : defaultSqlGroups;
```

- [ ] **Step 6: Add synonyms state and fetch to ConnectionList.tsx**

In `src/components/business/Sidebar/ConnectionList.tsx`:

Add import for `SynonymInfo` (line ~76):

```typescript
import type {
  ConnectionForm,
  CreateDatabasePayload,
  Driver,
  RedisConnectionMode,
  RoutineType,
  SavedQuery,
  SavedConnection,
  EventInfo,
  SequenceInfo,
  TypeInfo,
  SynonymInfo,
} from "@/services/api";
```

Add state after `databaseTypes` (line ~633):

```typescript
const [databaseSynonyms, setDatabaseSynonyms] = useState<
  Map<string, SynonymInfo[]>
>(new Map());
```

Add fetch function after `fetchTypes` (line ~1420):

```typescript
const fetchSynonyms = async (
  connectionId: string,
  databaseName: string,
): Promise<SynonymInfo[]> => {
  try {
    return await api.metadata.listSynonyms(connectionId, databaseName);
  } catch (err) {
    console.error("Failed to fetch synonyms:", err);
    return [];
  }
};
```

- [ ] **Step 7: Update getGroupItems for synonyms**

In `src/components/business/Sidebar/ConnectionList.tsx`, add case in `getGroupItems` (after line ~2258):

```typescript
case "synonyms":
  return databaseSynonyms.get(dbKey) || [];
```

- [ ] **Step 8: Add renderSynonymNode function**

In `src/components/business/Sidebar/ConnectionList.tsx`, add after `renderTypeNode`:

```typescript
const renderSynonymNode = (
  item: SynonymInfo,
  level: number,
  group: DatabaseGroupConfig,
  conn: Connection,
  database: DatabaseInfo,
) => {
  const nodeKey = `${conn.id}-${database.name}-${item.schema}-${item.name}`;
  return (
    <TreeNode
      key={nodeKey}
      level={level}
      icon={group.leafIcon}
      label={item.name}
      isExpanded={expandedTables.has(nodeKey)}
      onToggle={() => toggleTable(nodeKey, conn.id, database.name, { name: item.name, schema: item.schema, columns: [] })}
    />
  );
};
```

- [ ] **Step 9: Update renderGroupNode for synonyms**

In `src/components/business/Sidebar/ConnectionList.tsx`, update `renderGroupNode` (line ~3251-3264):

```typescript
items.map((item) =>
  group.source === "events" ? (
    renderEventNode(item as EventInfo, groupLevel + 1, group, conn, database)
  ) : group.source === "sequences" ? (
    renderSequenceNode(item as SequenceInfo, groupLevel + 1, group, conn, database)
  ) : group.source === "types" ? (
    renderTypeNode(item as TypeInfo, groupLevel + 1, group, conn, database)
  ) : group.source === "synonyms" ? (
    renderSynonymNode(item as SynonymInfo, groupLevel + 1, group, conn, database)
  ) : (
    renderTableNode(
      { ...item, schema: item.schema || database.name } as TableInfo,
      groupLevel + 1,
      group.leafIcon,
    )
  )
)
```

- [ ] **Step 10: Load synonyms when expanding database**

In `src/components/business/Sidebar/ConnectionList.tsx`, add after loading types (line ~1875):

```typescript
// Load synonyms if the group exists
const synonymsGroup = groups.find((g) => g.source === "synonyms");
if (synonymsGroup) {
  const synonyms = await fetchSynonyms(connectionId, databaseName);
  setDatabaseSynonyms((prev) => new Map(prev).set(`${connectionId}-${databaseName}`, synonyms));
}
```

- [ ] **Step 11: Add i18n keys**

In `src/lib/i18n/locales/en.ts`, add in `connection.tree`:

```typescript
synonyms: "Synonyms",
noSynonyms: "No synonyms",
```

In `src/lib/i18n/locales/zh.ts`, add in `connection.tree`:

```typescript
synonyms: "同义词",
noSynonyms: "没有同义词",
```

- [ ] **Step 12: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 13: Commit**

```bash
git add src/services/api.ts src/services/mocks.ts src/lib/tree-adapters/types.tsx src/lib/tree-adapters/sql-adapter.tsx src/components/business/Sidebar/ConnectionList.tsx src/lib/i18n/locales/en.ts src/lib/i18n/locales/zh.ts
git commit -m "feat(sidebar): add MSSQL synonyms support"
```

---

## Task 5: Oracle Backend (Sequences, Types, Packages)

**Files:**
- Modify: `src-tauri/src/models/mod.rs`
- Modify: `src-tauri/src/db/drivers/mod.rs`
- Modify: `src-tauri/src/db/drivers/oracle.rs`
- Modify: `src-tauri/src/commands/metadata.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add PackageInfo model to models/mod.rs**

In `src-tauri/src/models/mod.rs`, add after `SynonymInfo`:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageInfo {
    pub schema: String,
    pub name: String,
    pub object_type: String,
}
```

- [ ] **Step 2: Add list_packages trait method to mod.rs**

In `src-tauri/src/db/drivers/mod.rs`, update imports:

```rust
use crate::models::{
    ConnectionForm, EventInfo, PackageInfo, QueryResult, RoutineInfo, SchemaForeignKey,
    SchemaOverview, SequenceInfo, SynonymInfo, TableDataResponse, TableInfo, TableMetadata,
    TableStructure, TypeInfo,
};
```

Add trait method after `list_synonyms`:

```rust
async fn list_packages(&self, _schema: Option<String>) -> Result<Vec<PackageInfo>, String> {
    Ok(vec![])
}
```

- [ ] **Step 3: Implement list_sequences in oracle.rs**

In `src-tauri/src/db/drivers/oracle.rs`, add after `list_tables` implementation (after line ~307):

```rust
async fn list_sequences(&self, schema: Option<String>) -> Result<Vec<SequenceInfo>, String> {
    let schema_upper = schema
        .map(|s| s.trim().to_uppercase())
        .filter(|s| !s.is_empty());
    self.run_blocking(move |conn| {
        let sql = if let Some(ref s) = schema_upper {
            format!(
                "SELECT SEQUENCE_OWNER, SEQUENCE_NAME, DATA_TYPE, CAST(MIN_VALUE AS VARCHAR2(64)), CAST(INCREMENT_BY AS VARCHAR2(64)) \
                 FROM ALL_SEQUENCES \
                 WHERE SEQUENCE_OWNER = '{}' \
                 ORDER BY SEQUENCE_OWNER, SEQUENCE_NAME",
                escape_literal(s)
            )
        } else {
            "SELECT SEQUENCE_OWNER, SEQUENCE_NAME, DATA_TYPE, CAST(MIN_VALUE AS VARCHAR2(64)), CAST(INCREMENT_BY AS VARCHAR2(64)) \
             FROM ALL_SEQUENCES \
             ORDER BY SEQUENCE_OWNER, SEQUENCE_NAME"
                .to_string()
        };
        let rows = conn
            .query(&sql, &[] as &[&dyn oracle::sql_type::ToSql])
            .map_err(|e| format!("[QUERY_ERROR] {e}"))?;
        let mut result = Vec::new();
        for row_result in rows {
            let row = row_result.map_err(|e| format!("[QUERY_ERROR] {e}"))?;
            let schema_name: Option<String> = row.get(0).ok().flatten();
            let seq_name: Option<String> = row.get(1).ok().flatten();
            let data_type: Option<String> = row.get(2).ok().flatten();
            let start_value: Option<String> = row.get(3).ok().flatten();
            let increment: Option<String> = row.get(4).ok().flatten();
            if let (Some(s), Some(n)) = (schema_name, seq_name) {
                result.push(SequenceInfo {
                    schema: s,
                    name: n,
                    data_type: data_type.unwrap_or_default(),
                    start_value,
                    increment,
                });
            }
        }
        Ok(result)
    })
    .await
}
```

- [ ] **Step 4: Implement list_types in oracle.rs**

In `src-tauri/src/db/drivers/oracle.rs`, add after `list_sequences`:

```rust
async fn list_types(&self, schema: Option<String>) -> Result<Vec<TypeInfo>, String> {
    let schema_upper = schema
        .map(|s| s.trim().to_uppercase())
        .filter(|s| !s.is_empty());
    self.run_blocking(move |conn| {
        let sql = if let Some(ref s) = schema_upper {
            format!(
                "SELECT OWNER, TYPE_NAME, TYPECODE \
                 FROM ALL_TYPES \
                 WHERE OWNER = '{}' \
                 ORDER BY OWNER, TYPE_NAME",
                escape_literal(s)
            )
        } else {
            "SELECT OWNER, TYPE_NAME, TYPECODE \
             FROM ALL_TYPES \
             ORDER BY OWNER, TYPE_NAME"
                .to_string()
        };
        let rows = conn
            .query(&sql, &[] as &[&dyn oracle::sql_type::ToSql])
            .map_err(|e| format!("[QUERY_ERROR] {e}"))?;
        let mut result = Vec::new();
        for row_result in rows {
            let row = row_result.map_err(|e| format!("[QUERY_ERROR] {e}"))?;
            let schema_name: Option<String> = row.get(0).ok().flatten();
            let type_name: Option<String> = row.get(1).ok().flatten();
            let type_code: Option<String> = row.get(2).ok().flatten();
            if let (Some(s), Some(n)) = (schema_name, type_name) {
                result.push(TypeInfo {
                    schema: s,
                    name: n,
                    category: type_code.unwrap_or_default(),
                });
            }
        }
        Ok(result)
    })
    .await
}
```

- [ ] **Step 5: Implement list_packages in oracle.rs**

In `src-tauri/src/db/drivers/oracle.rs`, add after `list_types`:

```rust
async fn list_packages(&self, schema: Option<String>) -> Result<Vec<PackageInfo>, String> {
    let schema_upper = schema
        .map(|s| s.trim().to_uppercase())
        .filter(|s| !s.is_empty());
    self.run_blocking(move |conn| {
        let sql = if let Some(ref s) = schema_upper {
            format!(
                "SELECT OWNER, OBJECT_NAME, OBJECT_TYPE \
                 FROM ALL_OBJECTS \
                 WHERE OBJECT_TYPE = 'PACKAGE' AND OWNER = '{}' \
                 ORDER BY OWNER, OBJECT_NAME",
                escape_literal(s)
            )
        } else {
            "SELECT OWNER, OBJECT_NAME, OBJECT_TYPE \
             FROM ALL_OBJECTS \
             WHERE OBJECT_TYPE = 'PACKAGE' \
             ORDER BY OWNER, OBJECT_NAME"
                .to_string()
        };
        let rows = conn
            .query(&sql, &[] as &[&dyn oracle::sql_type::ToSql])
            .map_err(|e| format!("[QUERY_ERROR] {e}"))?;
        let mut result = Vec::new();
        for row_result in rows {
            let row = row_result.map_err(|e| format!("[QUERY_ERROR] {e}"))?;
            let schema_name: Option<String> = row.get(0).ok().flatten();
            let pkg_name: Option<String> = row.get(1).ok().flatten();
            let obj_type: Option<String> = row.get(2).ok().flatten();
            if let (Some(s), Some(n)) = (schema_name, pkg_name) {
                result.push(PackageInfo {
                    schema: s,
                    name: n,
                    object_type: obj_type.unwrap_or_default(),
                });
            }
        }
        Ok(result)
    })
    .await
}
```

- [ ] **Step 6: Add list_packages command to metadata.rs**

In `src-tauri/src/commands/metadata.rs`, add after `list_synonyms`:

```rust
#[tauri::command]
pub async fn list_packages(
    state: tauri::State<'_, crate::AppState>,
    connection_id: i64,
    database: String,
) -> Result<Vec<crate::models::PackageInfo>, String> {
    let driver = state.get_driver(connection_id).await?;
    let schema = if database.is_empty() { None } else { Some(database) };
    driver.list_packages(schema).await
}
```

- [ ] **Step 7: Register command in lib.rs**

In `src-tauri/src/lib.rs`, find the `invoke_handler` macro and add `list_packages` to the list of commands.

- [ ] **Step 8: Run cargo check**

Run: `cargo check`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src-tauri/src/models/mod.rs src-tauri/src/db/drivers/mod.rs src-tauri/src/db/drivers/oracle.rs src-tauri/src/commands/metadata.rs src-tauri/src/lib.rs
git commit -m "feat(backend): add Oracle sequences, types, and packages API"
```

---

## Task 6: Oracle Frontend (Packages, Sequences, Types)

**Files:**
- Modify: `src/services/api.ts`
- Modify: `src/services/mocks.ts`
- Modify: `src/lib/tree-adapters/types.tsx`
- Modify: `src/lib/tree-adapters/sql-adapter.tsx`
- Modify: `src/components/business/Sidebar/ConnectionList.tsx`
- Modify: `src/lib/i18n/locales/en.ts`
- Modify: `src/lib/i18n/locales/zh.ts`

- [ ] **Step 1: Add PackageInfo type to api.ts**

In `src/services/api.ts`, add after `SynonymInfo`:

```typescript
export interface PackageInfo {
  schema: string;
  name: string;
  objectType: string;
}
```

- [ ] **Step 2: Add listPackages method to api.ts**

In `src/services/api.ts`, add after `listSynonyms`:

```typescript
listPackages: (connectionId: string, database: string) =>
  invoke<PackageInfo[]>("list_packages", { connectionId, database }),
```

- [ ] **Step 3: Add mock implementation to mocks.ts**

In `src/services/mocks.ts`, find the metadata mock object and add:

```typescript
listPackages: async () => [],
```

- [ ] **Step 4: Add packages to source union in types.tsx**

In `src/lib/tree-adapters/types.tsx`, the `source` type was already updated in Task 4 to include `"packages"`.

- [ ] **Step 5: Add oracleGroups to sql-adapter.tsx**

In `src/lib/tree-adapters/sql-adapter.tsx`, add `Package` to the lucide-react imports (line ~1):

```typescript
import { Table, Database, FileCode, Download, RefreshCw, Eye, Cog, Clock, Hash, Type, Link, Package } from "lucide-react";
```

Add `oracleGroups` after `mssqlGroups`:

```typescript
const oracleGroups: DatabaseGroupConfig[] = [
  { id: "tables",     label: "connection.tree.tables",     icon: <Table className="w-4 h-4" />,  leafIcon: <Table className="w-4 h-4" />,  source: "tables" },
  { id: "views",      label: "connection.tree.views",      icon: <Eye className="w-4 h-4" />,    leafIcon: <Eye className="w-4 h-4" />,    source: "tables", sourceFilter: "view" },
  { id: "functions",  label: "connection.tree.functions",  icon: <Cog className="w-4 h-4" />,    leafIcon: <Cog className="w-4 h-4" />,    source: "routines", sourceFilter: "function" },
  { id: "procedures", label: "connection.tree.procedures", icon: <Cog className="w-4 h-4" />,    leafIcon: <Cog className="w-4 h-4" />,    source: "routines", sourceFilter: "procedure" },
  { id: "packages",   label: "connection.tree.packages",   icon: <Package className="w-4 h-4" />, leafIcon: <Package className="w-4 h-4" />, source: "packages" },
  { id: "sequences",  label: "connection.tree.sequences",  icon: <Hash className="w-4 h-4" />,   leafIcon: <Hash className="w-4 h-4" />,   source: "sequences" },
  { id: "types",      label: "connection.tree.types",      icon: <Type className="w-4 h-4" />,   leafIcon: <Type className="w-4 h-4" />,   source: "types" },
];
```

Update `createSqlTreeConfig` groups selection:

```typescript
const groups = driverId === "mysql" || driverId === "mariadb" || driverId === "tidb" || driverId === "starrocks" || driverId === "doris"
    ? mysqlGroups
    : driverId === "postgres"
      ? postgresGroups
      : driverId === "sqlite" || driverId === "duckdb"
        ? sqliteGroups
        : driverId === "clickhouse"
          ? clickhouseGroups
          : driverId === "db2"
            ? db2Groups
            : driverId === "mssql"
              ? mssqlGroups
              : driverId === "oracle"
                ? oracleGroups
                : defaultSqlGroups;
```

- [ ] **Step 6: Add packages state and fetch to ConnectionList.tsx**

In `src/components/business/Sidebar/ConnectionList.tsx`:

Add import for `PackageInfo` (line ~76):

```typescript
import type {
  ConnectionForm,
  CreateDatabasePayload,
  Driver,
  RedisConnectionMode,
  RoutineType,
  SavedQuery,
  SavedConnection,
  EventInfo,
  SequenceInfo,
  TypeInfo,
  SynonymInfo,
  PackageInfo,
} from "@/services/api";
```

Add state after `databaseSynonyms`:

```typescript
const [databasePackages, setDatabasePackages] = useState<
  Map<string, PackageInfo[]>
>(new Map());
```

Add fetch function after `fetchSynonyms`:

```typescript
const fetchPackages = async (
  connectionId: string,
  databaseName: string,
): Promise<PackageInfo[]> => {
  try {
    return await api.metadata.listPackages(connectionId, databaseName);
  } catch (err) {
    console.error("Failed to fetch packages:", err);
    return [];
  }
};
```

- [ ] **Step 7: Update getGroupItems for packages**

In `src/components/business/Sidebar/ConnectionList.tsx`, add case in `getGroupItems` (after `synonyms` case):

```typescript
case "packages":
  return databasePackages.get(dbKey) || [];
```

- [ ] **Step 8: Add renderPackageNode function**

In `src/components/business/Sidebar/ConnectionList.tsx`, add after `renderSynonymNode`:

```typescript
const renderPackageNode = (
  item: PackageInfo,
  level: number,
  group: DatabaseGroupConfig,
  conn: Connection,
  database: DatabaseInfo,
) => {
  const nodeKey = `${conn.id}-${database.name}-${item.schema}-${item.name}`;
  return (
    <TreeNode
      key={nodeKey}
      level={level}
      icon={group.leafIcon}
      label={item.name}
      isExpanded={expandedTables.has(nodeKey)}
      onToggle={() => toggleTable(nodeKey, conn.id, database.name, { name: item.name, schema: item.schema, columns: [] })}
    />
  );
};
```

- [ ] **Step 9: Update renderGroupNode for packages**

In `src/components/business/Sidebar/ConnectionList.tsx`, update `renderGroupNode`:

```typescript
items.map((item) =>
  group.source === "events" ? (
    renderEventNode(item as EventInfo, groupLevel + 1, group, conn, database)
  ) : group.source === "sequences" ? (
    renderSequenceNode(item as SequenceInfo, groupLevel + 1, group, conn, database)
  ) : group.source === "types" ? (
    renderTypeNode(item as TypeInfo, groupLevel + 1, group, conn, database)
  ) : group.source === "synonyms" ? (
    renderSynonymNode(item as SynonymInfo, groupLevel + 1, group, conn, database)
  ) : group.source === "packages" ? (
    renderPackageNode(item as PackageInfo, groupLevel + 1, group, conn, database)
  ) : (
    renderTableNode(
      { ...item, schema: item.schema || database.name } as TableInfo,
      groupLevel + 1,
      group.leafIcon,
    )
  )
)
```

- [ ] **Step 10: Load packages when expanding database**

In `src/components/business/Sidebar/ConnectionList.tsx`, add after loading synonyms:

```typescript
// Load packages if the group exists
const packagesGroup = groups.find((g) => g.source === "packages");
if (packagesGroup) {
  const packages = await fetchPackages(connectionId, databaseName);
  setDatabasePackages((prev) => new Map(prev).set(`${connectionId}-${databaseName}`, packages));
}
```

- [ ] **Step 11: Add i18n keys**

In `src/lib/i18n/locales/en.ts`, add in `connection.tree`:

```typescript
packages: "Packages",
noPackages: "No packages",
```

In `src/lib/i18n/locales/zh.ts`, add in `connection.tree`:

```typescript
packages: "包",
noPackages: "没有包",
```

- [ ] **Step 12: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 13: Commit**

```bash
git add src/services/api.ts src/services/mocks.ts src/lib/tree-adapters/types.tsx src/lib/tree-adapters/sql-adapter.tsx src/components/business/Sidebar/ConnectionList.tsx src/lib/i18n/locales/en.ts src/lib/i18n/locales/zh.ts
git commit -m "feat(sidebar): add Oracle packages, sequences, and types support"
```

---

## Task 7: Final Verification

- [ ] **Step 1: Run cargo check**

Run: `cargo check`
Expected: PASS

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS (or only pre-existing warnings)

- [ ] **Step 4: Update sidebar-nav-restructure-guide.md**

Update the "当前各数据库状态" section to mark all databases as completed.

- [ ] **Step 5: Final commit**

```bash
git add docs/sidebar-nav-restructure-guide.md
git commit -m "docs: update sidebar nav guide with completion status"
```
