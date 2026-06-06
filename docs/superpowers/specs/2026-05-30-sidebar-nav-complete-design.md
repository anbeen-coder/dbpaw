# Design: Complete Sidebar Navigation for MSSQL, Oracle, ClickHouse, Db2

## Summary

Add missing sidebar navigation groups for four databases: ClickHouse (Materialized Views), IBM Db2 (Sequences), MSSQL (Synonyms), and Oracle (Packages, Sequences, Types). All changes follow the established `DatabaseGroupConfig` pattern.

---

## 1. ClickHouse - Materialized Views

**Difficulty**: Simple  
**Backend changes**: None

ClickHouse's `list_tables` already returns the engine type in the `type` field. Materialized views have `type = "MaterializedView"`.

### Frontend Changes

**`src/lib/tree-adapters/sql-adapter.tsx`**:
- Add `clickhouseGroups` array with Materialized Views using `sourceFilter: "MaterializedView"`
- Update `createSqlTreeConfig` to use `clickhouseGroups` for `driverId === "clickhouse"`

```typescript
const clickhouseGroups: DatabaseGroupConfig[] = [
  { id: "tables",              label: "connection.tree.tables",              icon: <Table />,  leafIcon: <Table />,  source: "tables" },
  { id: "views",               label: "connection.tree.views",               icon: <Eye />,    leafIcon: <Eye />,    source: "tables", sourceFilter: "View" },
  { id: "materializedViews",   label: "connection.tree.materializedViews",   icon: <Eye />,    leafIcon: <Eye />,    source: "tables", sourceFilter: "MaterializedView" },
];
```

Note: ClickHouse returns engine types with capital letters (`"View"`, `"MaterializedView"`), unlike MySQL which returns lowercase `"view"`.

**`src/lib/i18n/locales/en.ts`** and **`zh.ts`**:
- Add `materializedViews: "Materialized Views"` / `"物化视图"`
- Add `noMaterializedViews: "No materialized views"` / `"没有物化视图"`

---

## 2. IBM Db2 - Sequences

**Difficulty**: Simple  
**Backend changes**: Implement `list_sequences`

### Rust Backend

**`src-tauri/src/db/drivers/db2.rs`**:
- Implement `list_sequences` using `SYSCAT.SEQUENCES`:

```sql
SELECT SEQSCHEMA, SEQNAME, DATA_TYPE, START, INCREMENT
FROM SYSCAT.SEQUENCES
WHERE SEQSCHEMA = 'schema_name'
ORDER BY SEQNAME
```

### Frontend Changes

**`src/lib/tree-adapters/sql-adapter.tsx`**:
- Add `db2Groups` with sequences

```typescript
const db2Groups: DatabaseGroupConfig[] = [
  { id: "tables",     label: "connection.tree.tables",     icon: <Table />,  leafIcon: <Table />,  source: "tables" },
  { id: "views",      label: "connection.tree.views",      icon: <Eye />,    leafIcon: <Eye />,    source: "tables", sourceFilter: "view" },
  { id: "functions",  label: "connection.tree.functions",  icon: <Cog />,    leafIcon: <Cog />,    source: "routines", sourceFilter: "function" },
  { id: "procedures", label: "connection.tree.procedures", icon: <Cog />,    leafIcon: <Cog />,    source: "routines", sourceFilter: "procedure" },
  { id: "sequences",  label: "connection.tree.sequences",  icon: <Hash />,   leafIcon: <Hash />,   source: "sequences" },
];
```

- Update `createSqlTreeConfig` to use `db2Groups` for `driverId === "db2"`

---

## 3. MSSQL - Synonyms

**Difficulty**: Medium  
**Backend changes**: New model, new trait method, new API

### Rust Backend

**`src-tauri/src/models/mod.rs`**:
- Add `SynonymInfo` model:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SynonymInfo {
    pub schema: String,
    pub name: String,
    pub base_object_type: String,
}
```

**`src-tauri/src/db/drivers/mod.rs`**:
- Add `list_synonyms` trait method with default empty implementation
- Add `SynonymInfo` to imports

**`src-tauri/src/db/drivers/mssql.rs`**:
- Implement `list_synonyms`:

```sql
SELECT s.name AS schema_name, o.name AS synonym_name,
       CASE o.type
         WHEN 'SN' THEN 'synonym'
       END AS base_object_type
FROM sys.objects o
JOIN sys.schemas s ON s.schema_id = o.schema_id
WHERE o.type = 'SN'
ORDER BY s.name, o.name
```

**`src-tauri/src/commands/metadata.rs`**:
- Add `list_synonyms` Tauri command

**`src-tauri/src/lib.rs`**:
- Register `list_synonyms` command

### Frontend Changes

**`src/services/api.ts`**:
- Add `SynonymInfo` interface
- Add `listSynonyms` method in metadata namespace

**`src/services/mocks.ts`**:
- Add mock implementation for `listSynonyms`

**`src/lib/tree-adapters/types.tsx`**:
- Add `"synonyms"` to the `source` union type

**`src/components/business/Sidebar/ConnectionList.tsx`**:
- Add `databaseSynonyms` state (similar to `databaseEvents`)
- Add `fetchSynonyms` function
- Update `getGroupItems` to handle `source === "synonyms"`
- Add `renderSynonymNode` function
- Load synonyms when expanding database if synonyms group exists

**`src/lib/tree-adapters/sql-adapter.tsx`**:
- Add `mssqlGroups` with synonyms

```typescript
const mssqlGroups: DatabaseGroupConfig[] = [
  { id: "tables",     label: "connection.tree.tables",     icon: <Table />,  leafIcon: <Table />,  source: "tables" },
  { id: "views",      label: "connection.tree.views",      icon: <Eye />,    leafIcon: <Eye />,    source: "tables", sourceFilter: "view" },
  { id: "functions",  label: "connection.tree.functions",  icon: <Cog />,    leafIcon: <Cog />,    source: "routines", sourceFilter: "function" },
  { id: "procedures", label: "connection.tree.procedures", icon: <Cog />,    leafIcon: <Cog />,    source: "routines", sourceFilter: "procedure" },
  { id: "synonyms",   label: "connection.tree.synonyms",   icon: <Link />,   leafIcon: <Link />,   source: "synonyms" },
];
```

- Update `createSqlTreeConfig` to use `mssqlGroups` for `driverId === "mssql"`

**`src/lib/i18n/locales/en.ts`** and **`zh.ts`**:
- Add `synonyms: "Synonyms"` / `"同义词"`
- Add `noSynonyms: "No synonyms"` / `"没有同义词"`

---

## 4. Oracle - Packages, Sequences, Types

**Difficulty**: Most complex  
**Backend changes**: New model, new trait method, 3 method implementations

### Rust Backend

**`src-tauri/src/models/mod.rs`**:
- Add `PackageInfo` model:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageInfo {
    pub schema: String,
    pub name: String,
    pub object_type: String,
}
```

**`src-tauri/src/db/drivers/mod.rs`**:
- Add `list_packages` trait method with default empty implementation
- Add `PackageInfo` to imports

**`src-tauri/src/db/drivers/oracle.rs`**:
- Implement `list_sequences` using `ALL_SEQUENCES`:

```sql
SELECT SEQUENCE_OWNER, SEQUENCE_NAME, DATA_TYPE, MIN_VALUE, INCREMENT_BY
FROM ALL_SEQUENCES
WHERE SEQUENCE_OWNER = 'schema_name'
ORDER BY SEQUENCE_NAME
```

- Implement `list_types` using `ALL_TYPES`:

```sql
SELECT OWNER, TYPE_NAME, TYPECODE
FROM ALL_TYPES
WHERE OWNER = 'schema_name'
ORDER BY TYPE_NAME
```

- Implement `list_packages` using `ALL_OBJECTS`:

```sql
SELECT OWNER, OBJECT_NAME, OBJECT_TYPE
FROM ALL_OBJECTS
WHERE OBJECT_TYPE = 'PACKAGE' AND OWNER = 'schema_name'
ORDER BY OBJECT_NAME
```

**`src-tauri/src/commands/metadata.rs`**:
- Add `list_packages` Tauri command

**`src-tauri/src/lib.rs`**:
- Register `list_packages` command

### Frontend Changes

**`src/services/api.ts`**:
- Add `PackageInfo` interface
- Add `listPackages` method in metadata namespace

**`src/services/mocks.ts`**:
- Add mock implementation for `listPackages`

**`src/lib/tree-adapters/types.tsx`**:
- Add `"packages"` to the `source` union type

**`src/components/business/Sidebar/ConnectionList.tsx`**:
- Add `databasePackages` state (similar to `databaseEvents`)
- Add `fetchPackages` function
- Update `getGroupItems` to handle `source === "packages"`
- Add `renderPackageNode` function
- Load packages when expanding database if packages group exists

**`src/lib/tree-adapters/sql-adapter.tsx`**:
- Add `oracleGroups` with packages, sequences, types

```typescript
const oracleGroups: DatabaseGroupConfig[] = [
  { id: "tables",     label: "connection.tree.tables",     icon: <Table />,  leafIcon: <Table />,  source: "tables" },
  { id: "views",      label: "connection.tree.views",      icon: <Eye />,    leafIcon: <Eye />,    source: "tables", sourceFilter: "view" },
  { id: "functions",  label: "connection.tree.functions",  icon: <Cog />,    leafIcon: <Cog />,    source: "routines", sourceFilter: "function" },
  { id: "procedures", label: "connection.tree.procedures", icon: <Cog />,    leafIcon: <Cog />,    source: "routines", sourceFilter: "procedure" },
  { id: "packages",   label: "connection.tree.packages",   icon: <PackageIcon />, leafIcon: <PackageIcon />, source: "packages" },
  { id: "sequences",  label: "connection.tree.sequences",  icon: <Hash />,   leafIcon: <Hash />,   source: "sequences" },
  { id: "types",      label: "connection.tree.types",      icon: <Type />,   leafIcon: <Type />,   source: "types" },
];
```

- Update `createSqlTreeConfig` to use `oracleGroups` for `driverId === "oracle"`

**`src/lib/i18n/locales/en.ts`** and **`zh.ts`**:
- Add `packages: "Packages"` / `"包"`
- Add `noPackages: "No packages"` / `"没有包"`

---

## Implementation Order

1. **ClickHouse** (simplest - no backend changes)
2. **Db2** (simple - one new method)
3. **MSSQL** (medium - new source type)
4. **Oracle** (most complex - three new methods + new source type)

---

## Testing

- Verify each database connects and shows the correct groups
- Verify empty groups show "No xxx" message
- Verify items render with correct icons
- Run `cargo check` after Rust changes
- Run `npm run typecheck` after TypeScript changes
