# Integration Test Error Code Migration

**Date:** 2026-06-07
**Scope:** Update 39 integration test assertions from old error tags to new error codes.

## Background

The error handling system uses numeric error codes (`[ERR-XXXX]` format). A backward-compatibility layer in `error.rs` converts old string tags to new codes at runtime. However, 42 integration test assertions still assert old tag formats.

This task updates the **core three types** of assertions:
- `[VALIDATION_ERROR]` → `[ERR-3001]` (26 assertions)
- `[QUERY_ERROR]` → `[ERR-2001]` (5 assertions)
- `[CONN_FAILED]` → `[ERR-1001]` (8 assertions)

## Out of Scope

- Source code migration (driver/command layer still producing old tags)
- `[UNSUPPORTED]` → `[ERR-5001]` (3 assertions)
- Double-prefix bug in `conn_failed_error()`
- Non-integration tests

## Replacement Rules

Direct string replacement in test assertions:

```rust
// Before
assert!(err.contains("[VALIDATION_ERROR]"));
assert!(err.contains("[QUERY_ERROR]"));
assert!(err.contains("[CONN_FAILED]"));

// After
assert!(err.contains("[ERR-3001]"));
assert!(err.contains("[ERR-2001]"));
assert!(err.contains("[ERR-1001]"));
```

## Files to Modify (26 files)

### 4 assertions each:
- `src-tauri/tests/sqlite_integration.rs`
- `src-tauri/tests/postgres_integration.rs`
- `src-tauri/tests/mssql_integration.rs`
- `src-tauri/tests/duckdb_integration.rs`

### 3 assertions:
- `src-tauri/tests/sqlite_stateful_command_integration.rs`

### 2 assertions:
- `src-tauri/tests/mysql_stateful_command_integration.rs`
- `src-tauri/tests/mariadb_stateful_command_integration.rs`

### 1 assertion each:
- `src-tauri/tests/starrocks_stateful_command_integration.rs`
- `src-tauri/tests/starrocks_integration.rs`
- `src-tauri/tests/starrocks_command_integration.rs`
- `src-tauri/tests/sqlite_command_integration.rs`
- `src-tauri/tests/redis_integration.rs`
- `src-tauri/tests/postgres_stateful_command_integration.rs`
- `src-tauri/tests/postgres_command_integration.rs`
- `src-tauri/tests/oracle_integration.rs`
- `src-tauri/tests/oracle_command_integration.rs`
- `src-tauri/tests/mysql_integration.rs`
- `src-tauri/tests/mysql_command_integration.rs`
- `src-tauri/tests/mssql_stateful_command_integration.rs`
- `src-tauri/tests/mssql_command_integration.rs`
- `src-tauri/tests/mariadb_integration.rs`
- `src-tauri/tests/mariadb_command_integration.rs`
- `src-tauri/tests/duckdb_command_integration.rs`
- `src-tauri/tests/doris_command_integration.rs`
- `src-tauri/tests/clickhouse_integration.rs`
- `src-tauri/tests/clickhouse_command_integration.rs`

## Verification

- `cargo check` must pass
- Grep for remaining old tags: `rg '\[VALIDATION_ERROR\]|\[QUERY_ERROR\]|\[CONN_FAILED\]' src-tauri/tests/` should return 0 matches
