# Error Handling Migration — Progress & Remaining Work

## Overview

Full migration from `Result<_, String>` to `Result<_, AppError>` across the Rust backend.

## Completed

### Core Infrastructure
- `src-tauri/src/error.rs` — Added `AlreadyExists` (3004), `PermissionDenied` (3005) variants with constructors
- `src-tauri/src/commands/mod.rs` — `execute_with_retry_core` and all wrappers return `Result<T, AppError>`
- `From<String> for AppError` marked `#[deprecated]`

### Data Layer (fully migrated)
- `src-tauri/src/db/local.rs` — ~50 functions, all migration errors use `AppError::internal()`
- `src-tauri/src/commands/transfer/writer.rs` — 7 functions
- `src-tauri/src/commands/transfer/export_service.rs` — 4 functions
- `src-tauri/src/commands/transfer/import_service.rs` — 2 functions
- `src-tauri/src/commands/transfer/import_plan.rs` — 4 functions
- `src-tauri/src/datasources/elasticsearch.rs` — ~25 functions
- `src-tauri/src/ssh.rs` — `handle_connection` migrated

### Command Layer (callers fixed)
- `src-tauri/src/commands/connection.rs` — `normalize_create_database_error` returns `AppError`, all `execute_with_retry` callers add `.map_err(String::from)`
- `src-tauri/src/commands/query.rs` — callers fixed
- `src-tauri/src/commands/metadata.rs` — callers fixed
- `src-tauri/src/commands/transfer.rs` — callers fixed

### Error Tags Eliminated
- `[ALREADY_EXISTS]` → `AppError::already_exists()`
- `[PERMISSION_DENIED]` → `AppError::permission_denied()`
- `[MIGRATION_XXX_ERROR]` → `AppError::internal()`
- `[LOCAL_DB_INIT]` → `AppError::internal_with()`
- `[CHECK_EXIST_ERROR]` → `AppError::internal_with()`
- `[AI_KEY_DECRYPT]` / `[AI_KEY_UTF8]` → `AppError::internal_with()`

## Remaining Work

The following command files still have internal helper functions returning `Result<_, String>`. The `#[tauri::command]` functions already work because `From<AppError> for String` handles conversion, but the internal helpers should be migrated for consistency.

### commands/ai.rs (~30 functions)
- `normalize_provider_type`, `ensure_provider_enabled`, `validate_ai_input`, `get_db`, `get_db_from_app_state`
- All `ai_*` command helpers

### commands/redis/ (~55 functions across 10 files)
- `redis/connection.rs` — `redis_execute_with_retry`, `with_redis_conn`, `with_redis_retry`
- `redis/console_logs.rs` — 5 functions
- `redis/cluster.rs` — 1 function
- `redis/stream_commands.rs` — 8 functions
- `redis/collections.rs` — 8 functions
- `redis/zset.rs` — 8 functions
- `redis/stream_view.rs` — 2 functions
- `redis/key_value.rs` — 8 functions
- `redis/bitmap_geo.rs` — 8 functions
- `redis/database_scan.rs` — 2 functions

### commands/mongodb.rs (~6 functions)
- `driver_from_id`, `get_connection_form`
- All `mongodb_*` command helpers

### commands/mcp.rs (~6 functions)
- `mcp_status`, `mcp_stop`, `mcp_get_tools`, `mcp_detect_clients`

### commands/storage.rs (~8 functions)
- All `saved_query_*` command helpers

### commands/elasticsearch.rs (~17 functions)
- All `elasticsearch_*` command helpers (call `ElasticsearchClient` which is already migrated)

### commands/system.rs (1 function)
- `list_system_fonts` — low priority, no structured error needed

## Migration Pattern

For each remaining file:

1. Change internal helper return types: `Result<_, String>` → `Result<_, AppError>`
2. Replace `.map_err(|e| format!(...))` with `AppError::internal()` / `AppError::internal_with()`
3. Add `use crate::error::AppError;` if not present
4. Command functions keep `Result<_, String>` — the `?` operator auto-converts via `From<AppError> for String`

## Verification

After completing remaining work:
```bash
cargo check          # Must compile
cargo test           # All tests must pass
rg '\[ALREADY_EXISTS\]|\[MIGRATION_|\[PERMISSION_DENIED\]' src-tauri/src/  # Must return nothing
```
