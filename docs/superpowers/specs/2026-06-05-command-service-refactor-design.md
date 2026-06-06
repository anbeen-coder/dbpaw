# Command Service Refactor Design

## Problem

The Tauri command layer has grown into the main backend business layer. `src-tauri/src/lib.rs` has a long `generate_handler!` registration list, but the larger issue is that several command files mix Tauri parameter handling with domain behavior:

- `src-tauri/src/commands/transfer.rs` contains export/import orchestration, SQL import parsing, output path validation, and writer logic.
- `src-tauri/src/commands/redis.rs` contains Redis connection acquisition, retry/eviction behavior, key operations, advanced Redis commands, and command logging.
- `src-tauri/src/commands/query.rs` contains query execution, default limit guards, running query registration, cancellation, pagination, and execution logging.
- `src-tauri/src/commands/connection.rs` contains connection CRUD, database creation SQL generation, ephemeral testing, import workflows, and driver-specific option handling.
- `src-tauri/src/commands/storage.rs` contains saved query persistence and direct-call helpers.

This makes the command layer hard to navigate and hard to test without going through Tauri command wrappers. It also spreads reusable behavior across files that should mostly be transport adapters.

## Goal

Create a `src-tauri/src/services/` layer and move business behavior out of the heavy command files while preserving the existing Tauri command names, TypeScript API contract, and command registration shape. Commands should receive Tauri parameters, perform only basic parameter adaptation, and call services.

## Non-Goals

- Do not rename existing Tauri commands.
- Do not change `src/services/api.ts` command strings or frontend payload shapes.
- Do not redesign `generate_handler!` in this refactor. It may remain long until command grouping is addressed separately.
- Do not change driver behavior, pooling semantics, SQL parsing semantics, or Redis command behavior.
- Do not remove ignored integration test markers.

## Target Structure

```
src-tauri/src/
  services/
    mod.rs
    local_storage.rs
    connection.rs
    query.rs
    transfer.rs
    redis.rs
  commands/
    storage.rs
    connection.rs
    query.rs
    transfer.rs
    redis.rs
```

`lib.rs` will add `pub mod services;`. `commands/*` will continue to expose the same `#[tauri::command]` functions registered in `generate_handler!`.

## Command Layer Contract

Each command function keeps its current public name and Tauri signature unless an implementation task proves a narrow signature cleanup is required. The command layer may:

- Accept `State<'_, AppState>`, `AppHandle`, and other Tauri-bound arguments.
- Trim or reject obviously invalid primitive inputs when the validation is specific to command transport.
- Convert `State<'_, AppState>` to `&AppState`.
- Call a matching `services::*` function.
- Return `Result<T, String>` unchanged.

The command layer should not:

- Build SQL statements.
- Parse SQL import files.
- Manage Redis connection cache behavior.
- Append query or Redis execution logs directly.
- Own retry, cancellation, export, import, or CRUD workflows.

## Service Layer Contract

Services are regular Rust modules without `#[tauri::command]`. Their public functions use `&AppState`, `&AppHandle` only when file dialogs or app path APIs are genuinely needed, and plain domain arguments. Services can call shared command helpers during the transition, but the end state should place reusable helpers outside `commands/*`.

Service functions should use current error strings and result types so frontend behavior does not change. When connection failures are introduced or modified, they must continue to use existing connection error normalization rules such as `conn_failed_error()` where applicable.

## Module Boundaries

### `services/local_storage.rs`

Owns saved query CRUD:

- `save_query`
- `update_saved_query`
- `delete_saved_query`
- `get_saved_queries`

`commands/storage.rs` becomes thin wrappers. This is the first migration because it is small, stable, and already has `*_direct` functions that model non-Tauri callers.

### `services/connection.rs`

Owns connection-level workflows:

- Connection CRUD and local DB access.
- Import connections workflow.
- Ephemeral connection testing.
- List databases by connection form and by saved connection ID.
- Create database by saved connection ID.
- MySQL charset and collation lookup.
- Database-name validation, option-token validation, identifier quoting helpers, create-database SQL builders, and create-database error normalization.

The service should preserve the existing `CreateDatabasePayload` shape. The type can move to `services::connection` and be re-exported or imported by `commands::connection`.

### `services/query.rs`

Owns SQL query workflows:

- `execute_query`
- `execute_query_by_id`
- `execute_by_conn`
- `get_table_data`
- `get_table_data_by_conn`
- `cancel_query`
- `list_sql_execution_logs`

It also owns the running-query registry, query ID creation, cancellation support checks, SQL execution log appenders, pagination limit validation, default select limit injection, and helper logic used by those workflows.

The default limit guard should remain behavior-compatible for PostgreSQL, MySQL-family drivers, SQLite, SQL Server, ClickHouse, and CTE cases. Tests should move with the guard logic.

### `services/transfer.rs`

Owns transfer workflows:

- Table export.
- Database SQL export.
- Query result export.
- SQL file import.
- Export output path resolution and validation.
- Export writer and format handling.
- SQL import planning, statement splitting, MSSQL `GO` handling, MySQL delimiter handling, SQLite trigger handling, Oracle PL/SQL slash handling, and transaction-control detection.

Transfer is high-risk because much of the file is parser-like pure logic. It should be migrated after query and connection so the service patterns are already established.

### `services/redis.rs`

Owns Redis workflows:

- Redis datasource acquisition, cache key generation, IO-error detection, and eviction.
- Database/key/value operations.
- Stream, bitmap, HyperLogLog, geo, zset, set, list, cluster, server, config, slowlog, batch, mget/mset, and raw command operations.
- Redis command logging and log limit clamping.

Redis should migrate last because it has many command wrappers and a large command surface. The first pass can keep one `services/redis.rs`; a later pass may split it into `services/redis/{connection,keys,streams,advanced,logs}.rs` if the single service file becomes too large.

## Shared Helpers

`commands/mod.rs` currently exposes reusable connection-pool helpers such as `ensure_connection_with_db` and `execute_with_retry`. During the first refactor pass, services may continue to call these helpers to reduce risk.

After the five service modules exist, a follow-up can move those helpers into `services/connection_pool.rs` or `db/pool_manager.rs` if they still make the command module feel like a service module.

## Migration Order

1. Add `services/mod.rs` and `services/local_storage.rs`.
2. Move saved query behavior from `commands/storage.rs` into `services/local_storage.rs`.
3. Move connection CRUD and database creation behavior into `services/connection.rs`.
4. Move query execution, default limit guard, cancellation, pagination, and SQL execution logs into `services/query.rs`.
5. Move transfer export/import behavior and parser tests into `services/transfer.rs`.
6. Move Redis behavior into `services/redis.rs`.
7. Review `commands/mod.rs` helpers and decide whether they should move in a later dedicated cleanup.

This order starts with the smallest module, then moves shared connection behavior before query and transfer, and leaves the broad Redis surface for last.

## Testing Strategy

Every task that modifies Rust must run:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

Focused tests should run after moving pure logic:

- Local storage: existing Rust tests are enough if no saved-query unit tests exist; `cargo check` is the minimum.
- Connection: run unit tests covering create-database SQL builders and validation.
- Query: run unit tests covering default limit guard, single-statement detection, query log limit clamping, and running-query registry behavior if tests exist.
- Transfer: run unit tests covering SQL import parser, delimiter handling, transaction planning, output path validation, and export writer formatting if tests exist.
- Redis: run unit tests covering log limit clamping and pure helper functions if tests exist.

Integration tests remain ignored. If a developer chooses to run them manually, use the documented `IT_DB=<name>` and `IT_REUSE_LOCAL_DB=1` conventions without changing test attributes.

## Acceptance Criteria

- `src-tauri/src/services/mod.rs` exists and declares `local_storage`, `connection`, `query`, `transfer`, and `redis`.
- The five command files still expose the same Tauri command functions used by `generate_handler!`.
- Business logic for saved queries, connections, queries, transfer, and Redis lives in `services/*`.
- `commands/*` files are materially smaller and mostly wrappers.
- Existing frontend command strings and payload contracts are unchanged.
- `cargo check --manifest-path src-tauri/Cargo.toml` passes after each Rust task.
- Focused unit tests pass for moved pure logic.
