# Elasticsearch Test Coverage Improvement Design

**Date:** 2026-05-28
**Scope:** Rust unit tests for helper functions + split integration test into independent scenarios

## Problem

Elasticsearch has the worst test coverage among all databases:
- 16 unit tests (only helper/pure functions, zero coverage of `build_auth`, `build_search_body`, `validate_file_path`, etc.)
- 1 monolithic integration test (244 lines, 15+ scenarios in a single function)
- No command integration tests, no stateful tests

## Goals

1. Add ~20 unit tests for untested private helper functions
2. Split the monolithic integration test into 8 independent test functions

**Non-goals:** Frontend tests, command integration tests, new error scenario tests (future work).

## Changes

### 1. Add unit tests to `elasticsearch.rs`

**File:** `src-tauri/src/datasources/elasticsearch.rs` (in `#[cfg(test)] mod tests`)

Add imports for new functions being tested:
```rust
use super::{
    // existing imports...
    build_auth, build_search_body, set_search_pagination, validate_file_path,
    parse_docs_count, ElasticsearchAuth,
};
```

#### `build_auth` tests (4 cases)

| Test | Input | Expected |
|------|-------|----------|
| auto mode no credentials | `auth_mode=None, user=None, pass=None` | `Ok(None)` |
| auto mode with basic credentials | `auth_mode=None, user=Some("u"), pass=Some("p")` | `Ok(Basic("u", "p"))` |
| basic mode | `auth_mode=Some("basic"), user=Some("u"), pass=Some("p")` | `Ok(Basic("u", "p"))` |
| api_key mode | `auth_mode=Some("api_key"), api_key_encoded=Some("key")` | `Ok(ApiKey("key"))` |
| unsupported mode | `auth_mode=Some("oauth")` | `Err(...)` |

#### `validate_file_path` tests (2 cases)

| Test | Input | Expected |
|------|-------|----------|
| empty path | `""`, `"export"` | `Err("[VALIDATION_ERROR]...")` |
| valid path | `"/tmp/test.ndjson"`, `"export"` | `Ok(PathBuf)` |

#### `build_search_body` tests (4 cases)

| Test | Input | Expected |
|------|-------|----------|
| DSL takes priority | `query=Some("q"), dsl=Some("{\"match\":{}}")` | DSL JSON |
| query_string fallback | `query=Some("status:ok"), dsl=None` | `{"query":{"query_string":{"query":"status:ok"}}}` |
| match_all default | `query=None, dsl=None` | `{"query":{"match_all":{}}}` |
| invalid DSL JSON | `dsl=Some("not json")` | `Err(...)` |

#### `set_search_pagination` tests (3 cases)

| Test | Input | Expected |
|------|-------|----------|
| sets from and size | `from=Some(10), size=50` | body has `from:10, size:50` |
| removes from when None | `from=None, size=50` | body has `size:50`, no `from` |
| rejects non-object body | `body=Value::Array([])` | `Err(...)` |

#### `parse_docs_count` tests (3 cases)

| Test | Input | Expected |
|------|-------|----------|
| valid number | `Some("42")` | `Some(42)` |
| none | `None` | `None` |
| non-numeric | `Some("abc")` | `None` |

#### `validate_raw_path` additional tests (2 cases)

| Test | Input | Expected |
|------|-------|----------|
| rejects `..` in path | `"/../secret"` | `Err(...)` |
| auto-prepends `/` | `"_cluster/health"` | `Ok("/_cluster/health")` |

#### `normalize_error` additional tests (3 cases)

| Test | Input | Expected |
|------|-------|----------|
| falls back to error/type | body with `error/type` but no `error/reason` | contains error type |
| empty body | `""` | contains HTTP status only |
| non-JSON body | `"not json"` | contains body text |

**Total: ~19 new test cases**

### 2. Split integration test

**File:** `src-tauri/tests/elasticsearch_integration.rs`

Replace the single `test_elasticsearch_read_only_flow` with 8 independent test functions. Each function creates its own test data and cleans up after itself.

| Test Function | Scenarios |
|---------------|-----------|
| `test_es_connection_and_list_indices` | `test_connection` (verify version), `list_indices` (verify non-empty) |
| `test_es_index_lifecycle` | `create_index` → verify listed → `refresh_index` → `close_index` → `open_index` → `delete_index` → verify gone |
| `test_es_document_crud` | `upsert_document` → `get_document` (verify found + source) → `delete_document` (verify "deleted") |
| `test_es_search_and_aggregations` | Index docs → `search_documents` with query_string (verify total/hits) → `search_documents` with DSL aggregation (verify buckets) |
| `test_es_mapping_metadata` | `create_index` with mappings → `get_index_mapping` (verify mapping structure) |
| `test_es_export_import_cycle` | Index docs → `export_documents` to NDJSON → `import_documents` into new index → verify counts match |
| `test_es_malformed_import_rejects` | Write invalid NDJSON → `import_documents` → verify error |
| `test_es_execute_raw` | Index docs → `execute_raw` GET `/_count` → verify count |

Each test uses a unique index name (e.g., `dbpaw_es_{test_name}_{timestamp}`) to avoid collisions when running with `--test-threads=1`.

The helper function `cleanup_index(client, base_url, index)` is extracted to avoid duplicating cleanup code.

### 3. No changes needed to `test-integration.sh`

The script already registers `elasticsearch_integration` and runs it with `--test-threads=1`. Splitting the test file into multiple functions within the same file requires no script changes.

## Verification

After all changes:
1. `cargo test --manifest-path src-tauri/Cargo.toml --lib` — all unit tests pass
2. `IT_DB=elasticsearch bun run test:integration` — all integration tests pass (requires Docker or local ES)
3. `bun run typecheck` — no type errors
