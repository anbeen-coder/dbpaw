# PostgreSQL Identifier Quoting Fix

## Problem

Tables with names starting with numbers (e.g., `"0a"`) or case-sensitive names (e.g., `"MyTable"`) fail when viewed or queried. PostgreSQL folds unquoted identifiers to lowercase, so `FROM public."0a"` becomes `FROM public.0a` which is invalid syntax.

The PostgreSQL driver (`src-tauri/src/db/drivers/postgres.rs`) has a `pg_quote_ident` function (line 939) that correctly wraps identifiers in double quotes, but it's only used in DDL generation (`render_pg_create_table_ddl`). Two data query functions use raw interpolation:

| Location | Code | Issue |
|----------|------|-------|
| `fetch_table_rows_as_json` (line 518) | `FROM {}.{} t` | schema and table not quoted |
| `get_table_data` count (line 1627) | `FROM {}.{}{}` | schema and table not quoted |
| `get_table_data` ORDER BY (line 1649) | `ORDER BY "{}" {}` | column name not escaped for embedded double quotes |

Other drivers (MySQL, SQLite, MSSQL, ClickHouse, DuckDB) already follow a consistent pattern: they have a `quote_ident` function AND a helper that builds qualified table references using it.

## Solution

### 1. Add `pg_qualified_table` helper (after line 943)

```rust
fn pg_qualified_table(schema: &str, table: &str) -> String {
    format!("{}.{}", pg_quote_ident(schema), pg_quote_ident(table))
}
```

Follows the same pattern as `mysql_qualified_table`, `sqlite_table_ref`, and `mssql::table_ref`.

### 2. Fix `fetch_table_rows_as_json` (line 517-519)

Before:
```rust
let query = format!(
    "SELECT to_jsonb(t) AS __row_json FROM {}.{} t{}{} LIMIT $1 OFFSET $2",
    schema, table, where_clause, order_clause
);
```

After:
```rust
let qt = pg_qualified_table(&schema, &table);
let query = format!(
    "SELECT to_jsonb(t) AS __row_json FROM {} t{}{} LIMIT $1 OFFSET $2",
    qt, where_clause, order_clause
);
```

### 3. Fix `get_table_data` count query (line 1627)

Before:
```rust
let count_query = format!("SELECT COUNT(*) FROM {}.{}{}", schema, table, where_clause);
```

After:
```rust
let qt = pg_qualified_table(&schema, &table);
let count_query = format!("SELECT COUNT(*) FROM {}{}", qt, where_clause);
```

### 4. Fix `get_table_data` ORDER BY (line 1649)

Before:
```rust
format!(" ORDER BY \"{}\" {}", col, dir)
```

After:
```rust
format!(" ORDER BY {} {}", pg_quote_ident(&col), dir)
```

## Impact

- Only modifies `src-tauri/src/db/drivers/postgres.rs`
- 1 new function, 3 edits
- No behavior change for normal table names (double-quoting is idempotent)
- Fixes broken behavior for: numeric-starting names, case-sensitive names, names with special characters, reserved words

## Files Changed

- `src-tauri/src/db/drivers/postgres.rs`
