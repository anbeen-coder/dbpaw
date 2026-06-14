# Changelog

## v0.5.4 (2026-06-14)

### 🚀 New Features

#### Driver Capabilities System
- Added `DriverCapabilities` bitflags for runtime capability discovery
- Split optional `DatabaseDriver` methods into 7 capability sub-traits:
  - `RoutineDriver` - stored procedures/functions
  - `EventDriver` - scheduled events
  - `SequenceDriver` - sequences
  - `SequenceDriver` - sequences
  - `TypeDriver` - custom types
  - `SynonymDriver` - synonyms
  - `PackageDriver` - packages (Oracle)
  - `ForeignKeyDriver` - foreign keys
- Added `get_driver_capabilities` Tauri command and `getDriverCapabilities` frontend API wrapper
- Added `useDriverCapabilities` hook with module-level cache for dynamic capability queries
- Integrated dynamic capabilities into `useTreeDataFetching` for tree view

#### Structured Logging
- Replaced all 35 `println!`/`eprintln!` calls with `tracing` macros
- Added `tracing` + `tracing-subscriber` + `tracing-appender` + `dirs` dependencies
- Created `src/log/mod.rs` with stderr (colored) + file (JSON) dual output
- Stored reload handle in `AppState` for runtime log level switching
- Added `set_log_level` Tauri command
- Daily file rotation via `tracing-appender`
- MCP binary uses env-based tracing init (`RUST_LOG`)

#### Error Handling
- Added `AlreadyExists` and `PermissionDenied` error variants to `AppError`
- Added `is_retryable()` method to `AppError` for structured error classification
- `AppError` now implements `Serialize` and crosses IPC boundary as structured JSON `{code, message, hint, category}`
- Removed ~162 `.map_err(String::from)` calls across 17 command files
- Deprecated `From<String>` for `AppError`

#### Redis ZSet Viewer
- Complete rewrite with modular hooks and components:
  - `useZSetRangeQuery` - range query logic
  - `useZSetEditing` - edit operations
  - `useZSetRankScore` - rank/score operations
  - `useZSetLexRange` - lexicographic range queries
  - `useZSetPop` - pop operations
  - `ZSetToolbar` - toolbar component
  - `ZSetQueryPanel` - query panel component
  - `ZSetRows` - rows display component

#### Other Features
- Added `max_retries` from config with structured error classification
- Added write lock release before closing connections in cleanup

---

### 🔧 Refactoring

#### Database Driver Modularization

**ClickHouse** (split into 5 modules):
- `connection.rs` - HTTP client and config
- `metadata.rs` - table metadata queries
- `query.rs` - query execution logic
- `table_data.rs` - pagination logic
- `helpers.rs` - utility functions
- `mod.rs` - integration

**DuckDB** (split into 5 modules):
- `connection.rs` - connection management
- `helpers.rs` - value conversion, quoting, formatting
- `metadata.rs` - schema/table introspection
- `query.rs` - data fetching and SQL execution
- `mod.rs` - driver struct + trait impl

**DB2** (split into 5 modules):
- `connection.rs` - Db2Config, SSH tunnel, ODBC connection
- `metadata.rs` - schema introspection, DDL rendering
- `query.rs` - query execution (single/multi-statement, read/write split)
- `table_data.rs` - paginated data reads
- `mod.rs` - driver composition + trait impls

**SQLite** (split into 5 modules):
- `connection.rs` - connection management
- `metadata.rs` - schema introspection
- `query.rs` - query execution
- `table_data.rs` - paginated data reads
- `mod.rs` - entry point

**PostgreSQL** (split into 5 modules):
- `connection/` - connection management
- `metadata/` - schema introspection
- `query/` - query execution
- `table_data/` - paginated data reads
- `mod.rs` - entry point with delegation pattern

**MySQL** (split into 4 modules):
- `connection.rs` - DSN, TLS, SSH, pool management
- `metadata.rs` - list_*, get_table_*, schema_overview, routines, events, foreign_keys
- `query.rs` - execute_query, describe, type decoding, JSON projection, thread registry
- `table_data.rs` - get_table_data/chunk, fetch_rows_as_json

**MSSQL** (split into 5 modules):
- `connection.rs` - pool manager, config, connect
- `metadata.rs` - schema introspection, DDL rendering
- `query.rs` - query execution, FOR JSON, result parsing
- `table_data.rs` - paginated data reads
- `mod.rs` - struct definition + trait impl delegation

**Elasticsearch** (split into 5 modules):
- `client.rs` - connection, auth, request handling
- `search.rs` - search, document, export operations
- `index.rs` - index CRUD and mapping
- `bulk.rs` - bulk import/export, NDJSON parsing
- `mod.rs` - types, re-exports, execute_raw escape hatch

#### Frontend Component Decomposition

**SqlEditor** (decomposed into hooks + components):
- Hooks: `useSqlResults`, `useSqlEditorForm`, `useSqlEditorApi`, `useSqlEditorActions`
- Components: `SqlToolbar`, `SqlResultsPanel`
- Theme data extracted to `sqlThemes.ts`

**ConnectionDialog** (decomposed into 6 components):
- `ConnectionTypeStep` - driver type selection
- `ConnectionSummaryHeader` - connection summary
- `ConnectionBasicFields` - basic form fields
- `ConnectionNetworkFields` - network settings
- `ConnectionSecurityFields` - security settings
- `ConnectionDialogFooter` - dialog footer

**RedisBrowserView** (decomposed from 757 to ~140 lines):
- Hooks: `useRedisKeyScan`, `useRedisSelection`, `useRedisBatchOps`, `useRedisDialogs`
- Components: `KeySearchPanel`, `KeyListPanel`, `BatchOperationsToolbar`, `DetailPanel`, `RedisBrowserDialogs`

#### API Layer
- Split 1048-line `api.ts` into 10 domain-specific modules under `services/api/`:
  - `core.ts` - only file importing `@tauri-apps/api/core`
  - `query.ts`, `metadata.ts`, `redis.ts`, `elasticsearch.ts`, `mongodb.ts`, `ai.ts`, `connections.ts`, `system.ts`
  - `index.ts` - composes same api object shape (zero consumer changes)

#### Command Registration
- Modularized with per-module macros:
  - `connection_commands!`, `metadata_commands!`, `query_commands!`, `storage_commands!`
  - `ai_commands!`, `transfer_commands!`, `redis_commands!`, `elasticsearch_commands!`
  - `mongodb_commands!`, `system_commands!`, `mcp_commands!`

#### Error Handling Migration
Migrated all database drivers from string-based errors to structured `AppError`:
- **PostgreSQL**: migrated `load_pg_constraints` return type
- **MySQL**: migrated all methods, replaced 28 tagged strings
- **MSSQL**: migrated all methods
- **Oracle**: migrated `connect()` and replaced all 46 tagged strings
- **DB2**: migrated `collect_cursor_data`, `connect`, `run_blocking`, replaced 40 tagged strings
- **SQLite**: migrated 5 methods, replaced 28 tagged strings
- **DuckDB**: migrated 3 methods, replaced 35 tagged strings
- **MongoDB**: migrated to `DriverResult`, removed tagged strings
- **Cassandra**: migrated to `DriverResult<AppError>`, replaced tagged strings
- **ClickHouse**: migrated 8 method signatures, replaced 16 tagged strings
- **Elasticsearch**: migrated datasource from String to AppError
- **Redis**: migrated all errors to AppError
- **SSH**: migrated `handle_connection` to AppError
- **Storage**: replaced raw string errors
- **MCP**: migrated module errors to AppError

Removed legacy error string tags: `[VALIDATION_ERROR]`, `[QUERY_ERROR]`, `[CONN_FAILED]`, `[NOT_FOUND]`, `[ALREADY_EXISTS]`, `[UNSUPPORTED]`, `[EXPORT_ERROR]`, `[IMPORT_ERROR]`, `[ELASTICSEARCH_ERROR]`, `[DB2_ERROR]`, `[CASSANDRA_ERROR]`, etc.

#### Other Refactoring
- Split `connection.rs` into `connection/` sub-modules: `create_database.rs`, `connection_crud.rs`, `import.rs`
- Split `db/local.rs` into focused submodules: `crypto.rs`, `connections.rs`, `saved_queries.rs`, `ai_providers.rs`, `ai_conversations.rs`, `logs.rs`
- Extracted migration system to `db/migrations.rs` with `schema_migrations` table
- Extracted core functions from command/direct pairs: `execute_query_core`, `execute_by_conn_core`, `cancel_query_core`, `list_sql_execution_logs_core`
- Merged duplicate helpers: `resolve_driver`, `append_sql_execution_log`
- Extracted business logic to service layer: `connection_service.rs`, `query_service.rs`, `metadata_service.rs`, `ai_service.rs`, `transfer_service.rs`
- Command files reduced to thin wrappers (e.g., `connection.rs`: 1094→149 lines)
- Structured `AppError` crosses IPC boundary directly (implements `Serialize`)

---

### 🐛 Bug Fixes

- **macOS Cmd+S**: Fixed shortcut not working in SQL editor
  - Improved `isMacOS()` detection to prefer `navigator.userAgentData.platform`
  - Added Meta-s fallback keybinding in CodeMirror keymap
- **Shortcut Recording**: Fixed modifier-only keydowns consumed during recording
  - Added `MODIFIER_KEYS` check to skip pure modifier keydowns
  - Handler remains armed until non-modifier key is pressed
- **Compilation Errors**: Fixed various compilation errors from refactoring
  - ClickHouse: added missing imports for `ClickHouseDriver`
  - SQLite: added `#[derive(Debug)]` to `SqliteConnection`
  - Elasticsearch: fixed import paths for `normalize_error`, `parse_docs_count`
  - Cleaned up unused imports across multiple files
- **TypeScript Errors**: Fixed type errors in refactored components
- **Test Failures**: Fixed all test failures on main (Rust + frontend + lint)
  - Fixed `build_test_dsn` path: `mysql` → `mysql::connection`
  - Fixed 15+ `&str` vs `String` type mismatches in elasticsearch tests
  - Fixed saved_query assertion to match `[GET_QUERY_ERROR]` error prefix
  - Enabled Bun `dom=true` in `bunfig.toml` for proper DOM environment
  - Used `Object.defineProperty` for `globalThis` setup in `test-setup.ts`
  - Ran unit test files individually to prevent `mock.module` leakage
- **Redis**: Removed dead `msetLoading` state from `useRedisDialogs` hook
- **Redis Selection**: Fixed code quality issues in `useRedisSelection`
  - Added `useEffect` to prune stale `selectedKeys` when keys change
  - Removed empty if block in `handleKeyDeleted` (dead code)
  - Wrapped all handlers in `useCallback` for render stability
- **Connection Pool**: Fixed write lock release before closing connections in cleanup
- **Cassandra**: Fixed tests for `AppError` return type
- **Cassandra Driver**: Removed unused `RoutineInfo` import

---

### 🧪 Testing

#### Behavior Tests
- **SqlEditor**: 15 tests (execute, results, status, toolbar)
- **ConnectionDialog**: 26 tests (driver forms, validation, button states)
- **TabContentRenderer**: 25 tests (all tab types, null guards, empty state)
- **useTabFactory**: 19 tests (tab creation, dedup, factory methods, export)
- **useTableClipboard**: behavioral tests for clipboard operations
- **useTableHotkeys**: behavioral tests for keyboard shortcuts

#### Shortcut Tests
- Expanded from 39 to 104 tests
- `recorder.tsx`: `isShortcutDisabled`, `matchesBinding`, `isModifierless`, `findConflict`, `validateRecording`
- `match.ts`: `comboToCodeMirror`, `normalizeCombo`, `matchShortcut`, `comboFromEvent`, `comboToDisplay`

#### Redis Tests
- Added hook and view tests for `useRedisSelection`, `useRedisKeyScan`, `useRedisBatchOps`, `RedisBrowserView`

#### ZSet Tests
- Added tests for all ZSet hooks: `useZSetRangeQuery`, `useZSetEditing`, `useZSetRankScore`, `useZSetLexRange`, `useZSetPop`

#### Error Migration Tests
- Migrated integration test error assertions to new error codes:
  - `[VALIDATION_ERROR]` → `[ERR-3001]` (26 assertions)
  - `[QUERY_ERROR]` → `[ERR-2001]` (5 assertions)
  - `[CONN_FAILED]` → `[ERR-1001]` (8 assertions)
- Updated 26 integration test files, zero old tags remain
- Migrated AppError assertions in unit tests

---

### 📚 Documentation

#### Design Specs
- ClickHouse driver modularization design spec
- Local migration system design spec
- Command/direct deduplication design spec
- SqlEditor decomposition design spec
- Component behavior tests design for 5 high-risk modules
- Command registry modularization design spec
- Integration test error code migration design spec

#### Implementation Plans
- ClickHouse driver modularization implementation plan
- Local migration system implementation plan
- Command/direct deduplication implementation plan
- SqlEditor decomposition implementation plan
- Component behavior tests implementation plan
- Command registry modularization implementation plan

#### Updates
- Updated AGENTS.md to reflect api.ts split into api/ directory
- Updated AppError convergence spec with shim status and remaining work
- Added error migration remaining work summary
- 精简 DatabaseDriver Trait 设计文档

#### Cleanup
- Removed Japanese translation references from documentation
- Removed AI-generated design docs and unrelated files (91 files, 1.6MB)

---

### 🌐 Internationalization

- Replaced hardcoded English strings in 4 components with i18n keys:
  - `ComplexValueViewer`: `datagrid.viewer.*` (4 keys)
  - `TableContextMenuContent`: `tableView.contextMenu.*` (24 keys)
  - `RedisBrowserView`: `redis.browser.*` (+10 keys)
  - `RedisGeoViewer`: `redis.geo.*` (+35 keys)
- All keys added to `en.ts`, `zh.ts`, `ja.ts`
- Removed unused Japanese locale file

---

### 📦 Dependencies

- Added `bitflags` for driver capability flags
- Added `tracing`, `tracing-subscriber`, `tracing-appender`, `dirs` for structured logging

---

## v0.5.3 (Previous Release)

See [GitHub Releases](https://github.com/codeErrorSleep/dbpaw/releases) for previous versions.
