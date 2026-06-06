# Command Service Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move business logic from heavy Tauri command files into `src-tauri/src/services/` while preserving all command names and frontend API contracts.

**Architecture:** `commands/*` remains the Tauri transport layer and delegates to service functions. `services/*` owns local storage, connection, query, transfer, and Redis workflows using `&AppState` plus domain arguments, with no `#[tauri::command]` macros.

**Tech Stack:** Rust, Tauri, Tokio, Cargo

---

### Task 1: Add the service module shell

**Files:**
- Create: `src-tauri/src/services/mod.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Create `services/mod.rs`**

```rust
pub mod connection;
pub mod local_storage;
pub mod query;
pub mod redis;
pub mod transfer;
```

- [ ] **Step 2: Add empty service modules**

Create these files with a module-level comment only:

```rust
//! Business logic for connection commands.
```

Files:

- `src-tauri/src/services/connection.rs`
- `src-tauri/src/services/local_storage.rs`
- `src-tauri/src/services/query.rs`
- `src-tauri/src/services/redis.rs`
- `src-tauri/src/services/transfer.rs`

- [ ] **Step 3: Register the module in `lib.rs`**

Add this near the existing module declarations:

```rust
pub mod services;
```

- [ ] **Step 4: Verify Rust compilation**

Run:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

Expected: command exits successfully.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/lib.rs src-tauri/src/services
git commit -m "refactor: add backend services module shell"
```

---

### Task 2: Move saved query behavior into `services/local_storage.rs`

**Files:**
- Modify: `src-tauri/src/services/local_storage.rs`
- Modify: `src-tauri/src/commands/storage.rs`

- [ ] **Step 1: Move saved-query service functions**

`services/local_storage.rs` should contain the non-Tauri implementations currently represented by the `*_direct` functions in `commands/storage.rs`:

```rust
use crate::models::SavedQuery;
use crate::state::AppState;

pub async fn save_query(
    state: &AppState,
    name: String,
    query: String,
    description: Option<String>,
    connection_id: Option<i64>,
    database: Option<String>,
) -> Result<SavedQuery, String> {
    let local_db = state.local_db.lock().await;
    if let Some(db) = local_db.as_ref() {
        db.create_saved_query(name, query, description, connection_id, database)
            .await
    } else {
        Err("Local DB not initialized".to_string())
    }
}

pub async fn update_saved_query(
    state: &AppState,
    id: i64,
    name: String,
    query: String,
    description: Option<String>,
    connection_id: Option<i64>,
    database: Option<String>,
) -> Result<SavedQuery, String> {
    let local_db = state.local_db.lock().await;
    if let Some(db) = local_db.as_ref() {
        db.update_saved_query(id, name, query, description, connection_id, database)
            .await
    } else {
        Err("Local DB not initialized".to_string())
    }
}

pub async fn delete_saved_query(state: &AppState, id: i64) -> Result<(), String> {
    let local_db = state.local_db.lock().await;
    if let Some(db) = local_db.as_ref() {
        db.delete_saved_query(id).await
    } else {
        Err("Local DB not initialized".to_string())
    }
}

pub async fn get_saved_queries(state: &AppState) -> Result<Vec<SavedQuery>, String> {
    let local_db = state.local_db.lock().await;
    if let Some(db) = local_db.as_ref() {
        db.list_saved_queries().await
    } else {
        Err("Local DB not initialized".to_string())
    }
}
```

- [ ] **Step 2: Replace command bodies with service delegation**

`commands/storage.rs` keeps the same Tauri functions and direct functions, but each delegates:

```rust
use crate::models::SavedQuery;
use crate::services::local_storage;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn get_saved_queries(state: State<'_, AppState>) -> Result<Vec<SavedQuery>, String> {
    local_storage::get_saved_queries(state.inner()).await
}

pub async fn get_saved_queries_direct(state: &AppState) -> Result<Vec<SavedQuery>, String> {
    local_storage::get_saved_queries(state).await
}
```

Apply the same delegation pattern to `save_query`, `save_query_direct`, `update_saved_query`, `update_saved_query_direct`, `delete_saved_query`, and `delete_saved_query_direct`.

- [ ] **Step 3: Verify Rust compilation**

Run:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

Expected: command exits successfully.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/services/local_storage.rs src-tauri/src/commands/storage.rs
git commit -m "refactor: move saved query logic to local storage service"
```

---

### Task 3: Move connection workflows into `services/connection.rs`

**Files:**
- Modify: `src-tauri/src/services/connection.rs`
- Modify: `src-tauri/src/commands/connection.rs`

- [ ] **Step 1: Move pure connection helpers**

Move these helpers from `commands/connection.rs` to `services/connection.rs`:

- `CreateDatabasePayload`
- `validate_database_name`
- `is_safe_option_token`
- `normalize_option_token`
- `quote_mysql_ident`
- `quote_clickhouse_ident`
- `quote_pg_ident`
- `quote_mssql_ident`
- `quote_literal`
- `quote_nliteral`
- `quote_cql_ident`
- `build_mysql_create_database_sql`
- `build_postgres_create_database_sql`
- `build_mssql_create_database_sql`
- `build_clickhouse_create_database_sql`
- `build_cassandra_create_database_sql`
- `normalize_create_database_error`

Keep private helpers private unless `commands/connection.rs` still needs a type. `CreateDatabasePayload` should be `pub` because the command signature uses it.

- [ ] **Step 2: Move service functions**

Create service functions matching the command/direct behavior:

```rust
pub async fn list_databases(form: ConnectionForm) -> Result<Vec<String>, String>;
pub async fn list_databases_by_id(state: &AppState, id: i64) -> Result<Vec<String>, String>;
pub async fn create_database_by_id(
    state: &AppState,
    id: i64,
    database: Option<String>,
    payload: CreateDatabasePayload,
) -> Result<(), String>;
pub async fn test_connection_ephemeral(form: ConnectionForm) -> Result<TestConnectionResult, String>;
pub async fn get_mysql_charsets_by_id(state: &AppState, id: i64) -> Result<Vec<String>, String>;
pub async fn get_mysql_collations_by_id(
    state: &AppState,
    id: i64,
    charset: Option<String>,
) -> Result<Vec<String>, String>;
pub async fn get_connections(state: &AppState) -> Result<Vec<Connection>, String>;
pub async fn create_connection(state: &AppState, form: ConnectionForm) -> Result<Connection, String>;
pub async fn update_connection(
    state: &AppState,
    id: i64,
    form: ConnectionForm,
) -> Result<Connection, String>;
pub async fn delete_connection(state: &AppState, id: i64) -> Result<(), String>;
pub async fn import_connections(state: &AppState, source: String) -> Result<Vec<Connection>, String>;
```

Use the existing command bodies as the source of truth. Do not change validation behavior, pool removal behavior, import behavior, or error messages.

- [ ] **Step 3: Convert command functions to wrappers**

`commands/connection.rs` imports:

```rust
use crate::services::connection::{self, CreateDatabasePayload};
```

Each `#[tauri::command]` function should call the matching service function with `state.inner()` when it has `State<'_, AppState>`. Each existing `*_direct` function should call the same service function with `&AppState`.

- [ ] **Step 4: Move or preserve tests**

If existing unit tests in `commands/connection.rs` reference moved private helpers, move those tests to `services/connection.rs`. Add focused tests if the helpers are not already covered:

```rust
#[test]
fn validates_database_name_rejects_empty_names() {
    assert!(validate_database_name("   ").is_err());
}

#[test]
fn mysql_create_database_quotes_identifier_and_options() {
    let payload = CreateDatabasePayload {
        name: "my`db".to_string(),
        if_not_exists: Some(true),
        charset: Some("utf8mb4".to_string()),
        collation: Some("utf8mb4_unicode_ci".to_string()),
        encoding: None,
        lc_collate: None,
        lc_ctype: None,
    };
    let db_name = validate_database_name(&payload.name).unwrap();
    let sql = build_mysql_create_database_sql(&payload, &db_name).unwrap();
    assert_eq!(
        sql,
        "CREATE DATABASE IF NOT EXISTS `my``db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    );
}
```

- [ ] **Step 5: Verify Rust compilation and tests**

Run:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml connection
```

Expected: `cargo check` passes. The focused test command exits successfully or reports no matching tests.

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/services/connection.rs src-tauri/src/commands/connection.rs
git commit -m "refactor: move connection workflows to service layer"
```

---

### Task 4: Move query workflows into `services/query.rs`

**Files:**
- Modify: `src-tauri/src/services/query.rs`
- Modify: `src-tauri/src/commands/query.rs`

- [ ] **Step 1: Move query helpers and state**

Move these from `commands/query.rs` to `services/query.rs`:

- `DEFAULT_SELECT_LIMIT`
- `RunningQueryRegistry`
- `running_queries`
- `make_query_id`
- `normalize_for_guard`
- `statement_kind_for_limit_guard`
- `is_single_statement`
- `collect_top_level_keywords`
- `has_top_level_limit`
- `has_top_level_fetch_first_next_rows_only`
- `append_limit_1000`
- `insert_mssql_top_limit`
- `append_mssql_fetch_1000`
- `has_top_level_mssql_offset_clause`
- `has_top_level_mssql_top`
- `has_top_level_clickhouse_format_clause`
- `maybe_apply_default_limit`
- `resolve_driver_from_app_state`
- `supports_query_cancellation`
- `execute_cancel_query`
- `register_running_query`
- `unregister_running_query`
- `is_running_query`
- `append_sql_execution_log`
- `append_sql_execution_log_direct`
- `validate_page_limit`
- `clamp_sql_execution_logs_limit`

Keep helper visibility private except service entry points and any direct-call compatibility functions.

- [ ] **Step 2: Move service entry points**

Create these service functions:

```rust
pub async fn get_table_data_by_conn(
    form: ConnectionForm,
    table: String,
    page: i64,
    limit: i64,
) -> Result<TableDataResponse, String>;

pub async fn execute_query(
    state: &AppState,
    connection_id: i64,
    query: String,
    database: Option<String>,
    query_id: Option<String>,
) -> Result<QueryResult, String>;

pub async fn execute_query_by_id(
    state: &AppState,
    id: i64,
    query: String,
    database: Option<String>,
    query_id: Option<String>,
) -> Result<QueryResult, String>;

pub async fn execute_by_conn(
    form: ConnectionForm,
    query: String,
) -> Result<QueryResult, String>;

pub async fn get_table_data(
    state: &AppState,
    connection_id: i64,
    table: String,
    database: Option<String>,
    page: i64,
    limit: i64,
) -> Result<TableDataResponse, String>;

pub async fn cancel_query(
    state: &AppState,
    connection_id: i64,
    query_id: String,
) -> Result<(), String>;

pub async fn list_sql_execution_logs(
    state: &AppState,
    connection_id: Option<i64>,
    limit: Option<i64>,
) -> Result<Vec<SqlExecutionLog>, String>;
```

Use the existing command/direct behavior as the source of truth. Preserve query ID creation, cancellation semantics, log status values, default limit behavior, and pagination validation.

- [ ] **Step 3: Convert command functions to wrappers**

`commands/query.rs` imports:

```rust
use crate::services::query;
```

Each command delegates to the service. Existing direct functions such as `execute_query_by_id_direct`, `execute_by_conn_direct`, `list_sql_execution_logs_direct`, and `cancel_query_direct` should remain available and call the service.

- [ ] **Step 4: Move query unit tests**

Move existing `commands/query.rs` tests to `services/query.rs`. Ensure tests still cover:

```rust
#[test]
fn select_without_limit_gets_default_limit() {
    assert_eq!(
        maybe_apply_default_limit("select * from users", Some("postgres")),
        "select * from users LIMIT 1000"
    );
}

#[test]
fn select_with_existing_limit_is_unchanged() {
    assert_eq!(
        maybe_apply_default_limit("select * from users limit 25", Some("mysql")),
        "select * from users limit 25"
    );
}
```

Keep existing edge-case tests for comments, quotes, CTEs, SQL Server `TOP`/`OFFSET`, ClickHouse `FORMAT`, and multi-statement detection.

- [ ] **Step 5: Verify Rust compilation and tests**

Run:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml query
```

Expected: `cargo check` passes and focused query tests pass.

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/services/query.rs src-tauri/src/commands/query.rs
git commit -m "refactor: move query workflows to service layer"
```

---

### Task 5: Move transfer workflows into `services/transfer.rs`

**Files:**
- Modify: `src-tauri/src/services/transfer.rs`
- Modify: `src-tauri/src/commands/transfer.rs`

- [ ] **Step 1: Move transfer types and helpers**

Move these from `commands/transfer.rs` to `services/transfer.rs`:

- `ExportFormat`
- `ExportScope`
- `ExportResult`
- `ImportSqlResult`
- `ImportExecutionUnit`
- `PreparedImportPlan`
- `should_use_outer_import_transaction`
- `write_table_export`
- `do_table_export`
- `do_database_export`
- `import_transaction_sql`
- `normalize_driver_name`
- `prepare_import_plan`
- `build_statement_preview`
- `leading_sql_tokens`
- `statement_controls_transaction`
- `parse_mssql_go_line_count`
- `update_mssql_line_state`
- `parse_mssql_batches`
- `extension_for_format`
- `resolve_output_path`
- `validate_import_path`
- `validate_import_file_size`
- `SqlScanState`
- `starts_with_chars`
- `starts_with_chars_ignore_ascii_case`
- `line_start_index`
- `parse_mysql_delimiter_command`
- `sqlite_trigger_state`
- `oracle_plsql_state`
- `parse_oracle_slash_terminator`
- `parse_sql_statements`
- `parse_dollar_quote_tag`
- `starts_with_tag`
- `truncate_error_message`
- `validate_output_path`
- `default_output_path`
- `sanitize_filename`
- `ExportWriter`
- `csv_escape`
- `csv_value`
- `sql_value`
- `quote_ident`
- `quote_target`

Keep command-facing result and enum types `pub` because Tauri command signatures return them.

- [ ] **Step 2: Move service entry points**

Create these service functions:

```rust
pub async fn export_table_data(
    state: &AppState,
    connection_id: i64,
    table: String,
    database: Option<String>,
    format: ExportFormat,
    output_path: Option<String>,
) -> Result<ExportResult, String>;

pub async fn export_database_sql(
    state: &AppState,
    connection_id: i64,
    database: Option<String>,
    output_path: Option<String>,
) -> Result<ExportResult, String>;

pub async fn export_query_result(
    state: &AppState,
    connection_id: i64,
    query: String,
    database: Option<String>,
    format: ExportFormat,
    output_path: Option<String>,
) -> Result<ExportResult, String>;

pub async fn import_sql_file(
    state: &AppState,
    connection_id: i64,
    database: Option<String>,
    file_path: String,
) -> Result<ImportSqlResult, String>;
```

If current command signatures include `AppHandle` or path APIs, pass only the minimum Tauri value into the service and keep file dialog-specific behavior in the command wrapper.

- [ ] **Step 3: Convert command functions to wrappers**

`commands/transfer.rs` imports:

```rust
use crate::services::transfer::{self, ExportFormat, ExportResult, ImportSqlResult};
```

Each command delegates to the matching service. Existing direct functions remain and delegate to the service.

- [ ] **Step 4: Move transfer tests**

Move existing `commands/transfer.rs` parser and writer tests to `services/transfer.rs`. Ensure tests still cover:

```rust
#[test]
fn sanitizes_filename_for_export_paths() {
    assert_eq!(sanitize_filename("a/b:c*"), "a_b_c_");
}

#[test]
fn truncates_long_error_messages() {
    let message = "x".repeat(600);
    let truncated = truncate_error_message(&message);
    assert!(truncated.len() < message.len());
}
```

Keep existing tests for MySQL delimiters, MSSQL `GO`, SQLite triggers, Oracle PL/SQL slash terminators, dollar quotes, transaction-control detection, and import plan previews.

- [ ] **Step 5: Verify Rust compilation and tests**

Run:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml transfer
```

Expected: `cargo check` passes and focused transfer tests pass.

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/services/transfer.rs src-tauri/src/commands/transfer.rs
git commit -m "refactor: move transfer workflows to service layer"
```

---

### Task 6: Move Redis workflows into `services/redis.rs`

**Files:**
- Modify: `src-tauri/src/services/redis.rs`
- Modify: `src-tauri/src/commands/redis.rs`

- [ ] **Step 1: Move Redis connection/cache helpers**

Move these helpers from `commands/redis.rs` to `services/redis.rs`:

- `cache_key`
- `is_io_error`
- `acquire`
- `evict`
- `append_redis_command_log`
- `clamp_redis_command_logs_limit`

Preserve current cache key structure, cluster flag behavior, IO-error detection, and eviction behavior.

- [ ] **Step 2: Move Redis service entry points**

Create one service function for every current command. Each service function keeps the command function's current name, parameters after removing `State<'_, AppState>`, and return type. Add `state: &AppState` as the first parameter for functions that currently receive Tauri state.

The required service function names are:

```rust
redis_list_databases
redis_scan_keys
redis_get_key
redis_set_key
redis_update_key
redis_delete_key
redis_patch_key
redis_rename_key
redis_get_key_page
redis_set_ttl
redis_get_stream_range
redis_get_stream_view
redis_execute_raw
redis_bitmap_get_bit
redis_bitmap_count
redis_bitmap_pos
redis_hll_pfadd
redis_geo_add
redis_geo_pos
redis_geo_dist
redis_geo_search
redis_server_info
redis_server_config
redis_slowlog_get
redis_zrangebyscore
redis_zrank
redis_set_operation
redis_sismember
redis_smove
redis_xgroup_create
redis_xgroup_del
redis_xgroup_setid
redis_xack
redis_xpending
redis_xclaim
redis_xtrim
redis_xreadgroup
redis_batch_key_ops
redis_mget
redis_mset
redis_cluster_info
redis_zscore
redis_zmscore
redis_zrangebylex
redis_zlexcount
redis_zpopmin
redis_zpopmax
redis_lindex
redis_lpos
redis_ltrim
redis_linsert
redis_lmove
list_redis_command_logs
```

For example, `redis_set_key` becomes:

```rust
pub async fn redis_set_key(
    state: &AppState,
    id: i64,
    database: Option<String>,
    payload: RedisSetKeyPayload,
) -> Result<RedisMutationResult, String> {
    let form = {
        let local_db = {
            let lock = state.local_db.lock().await;
            lock.clone()
        };
        let db = local_db.ok_or("Local DB not initialized")?;
        let form = db.get_connection_form_by_id(id).await?;
        if form.driver != "redis" {
            return Err(format!(
                "[UNSUPPORTED] Connection {} is not a redis connection",
                id
            ));
        }
        form
    };
    let db = database.as_deref();
    let mut conn = acquire(state, id, &form, db).await?;
    match redis::set_key(&mut conn, payload.clone()).await {
        Err(ref e) if is_io_error(e) => {
            evict(state, id, &form, db).await;
            let mut conn = acquire(state, id, &form, db).await?;
            redis::set_key(&mut conn, payload).await
        }
        r => r,
    }
}
```

If several Redis service functions need this form-loading block, extract a private `get_redis_connection_form(state: &AppState, id: i64) -> Result<ConnectionForm, String>` helper inside `services/redis.rs`. Keep the driver check and the exact `"[UNSUPPORTED] Connection ... is not a redis connection"` error behavior.

- [ ] **Step 3: Convert Redis commands to wrappers**

`commands/redis.rs` imports:

```rust
use crate::services::redis;
```

Each `#[tauri::command]` function delegates to the matching service function and passes `state.inner()` when it receives Tauri state.

- [ ] **Step 4: Add or move focused Redis tests**

If no tests exist for pure helpers, add these in `services/redis.rs`:

```rust
#[test]
fn redis_log_limit_defaults_and_clamps() {
    assert_eq!(clamp_redis_command_logs_limit(None), 100);
    assert_eq!(clamp_redis_command_logs_limit(Some(0)), 1);
    assert_eq!(clamp_redis_command_logs_limit(Some(5000)), 1000);
}

#[test]
fn redis_cache_key_includes_database_and_cluster_flag() {
    assert_eq!(cache_key(7, Some("2"), false), "7:2");
    assert_eq!(cache_key(7, Some("2"), true), "7:cluster");
}
```

Adjust expected values only if the current helper uses different exact strings; preserve current behavior.

- [ ] **Step 5: Verify Rust compilation and tests**

Run:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml redis
```

Expected: `cargo check` passes and focused Redis tests pass.

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/services/redis.rs src-tauri/src/commands/redis.rs
git commit -m "refactor: move redis workflows to service layer"
```

---

### Task 7: Review command helpers after migration

**Files:**
- Inspect: `src-tauri/src/commands/mod.rs`
- Modify when moving helpers in this task: `src-tauri/src/services/connection_pool.rs`
- Modify when moving helpers in this task: `src-tauri/src/services/mod.rs`
- Modify when moving helpers in this task: command or service imports that use connection-pool helpers

- [ ] **Step 1: Inspect remaining helper ownership**

Review `src-tauri/src/commands/mod.rs`. If it still contains only module declarations plus connection-pool helpers used by services, decide whether to leave them for a separate cleanup or move them now.

Move them only if all service migrations are complete and the change is mechanical.

- [ ] **Step 2: Move to `services/connection_pool.rs` only if Task 7 chooses to move helpers now**

If moving now, create:

```rust
pub fn connection_pool_key(id: i64, database: &Option<String>) -> String {
    if let Some(db) = database {
        if !db.is_empty() {
            return format!("{}:{}", id, db);
        }
    }
    id.to_string()
}
```

Move the existing `get_connection_form_by_id`, `get_connection_form_by_id_with_driver_check`, `ensure_connection_with_db`, `ensure_connection_with_db_from_app_state`, `execute_with_retry`, and `execute_with_retry_from_app_state` functions with their tests unchanged.

Update `services/mod.rs`:

```rust
pub mod connection_pool;
```

Update call sites from `crate::commands::...` to `crate::services::connection_pool::...`.

- [ ] **Step 3: Verify Rust compilation and tests**

Run:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml connection_pool
```

Expected: `cargo check` passes. The focused test command exits successfully or reports no matching tests if the optional move was skipped.

- [ ] **Step 4: Commit**

If code moved:

```bash
git add src-tauri/src/commands/mod.rs src-tauri/src/services/mod.rs src-tauri/src/services/connection_pool.rs src-tauri/src/services/*.rs
git commit -m "refactor: move connection pool helpers to service layer"
```

If no code moved, do not create a commit. Report that helper ownership was reviewed and left unchanged.

---

### Task 8: Final verification

**Files:**
- Inspect: `src-tauri/src/lib.rs`
- Inspect: `src-tauri/src/commands/storage.rs`
- Inspect: `src-tauri/src/commands/connection.rs`
- Inspect: `src-tauri/src/commands/query.rs`
- Inspect: `src-tauri/src/commands/transfer.rs`
- Inspect: `src-tauri/src/commands/redis.rs`
- Inspect: `src-tauri/src/services/*.rs`

- [ ] **Step 1: Confirm command registration did not change**

Run:

```bash
git diff -- src-tauri/src/lib.rs
```

Expected: only `pub mod services;` was added, unless a later approved task intentionally changes command registration.

- [ ] **Step 2: Confirm command files are wrappers**

Run:

```bash
wc -l src-tauri/src/commands/storage.rs src-tauri/src/commands/connection.rs src-tauri/src/commands/query.rs src-tauri/src/commands/transfer.rs src-tauri/src/commands/redis.rs
```

Expected: line counts are materially lower than before migration, with most business logic in `src-tauri/src/services/*.rs`.

- [ ] **Step 3: Run full Rust verification**

Run:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected: both commands pass. Ignored integration tests remain ignored.

- [ ] **Step 4: Review frontend API impact**

Run:

```bash
git diff -- src/services/api.ts
```

Expected: no diff. If a diff exists, revert or justify it before completing because this refactor should preserve frontend command contracts.

- [ ] **Step 5: Commit final verification note if needed**

If Tasks 1-7 already committed all code and Task 8 made no changes, do not create a commit. Report the verification output in the final implementation summary.
