# Integration Test Error Code Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 39 old error tag assertions in 26 integration test files with new error codes.

**Architecture:** Direct string replacement: `[VALIDATION_ERROR]` → `[ERR-3001]`, `[QUERY_ERROR]` → `[ERR-2001]`, `[CONN_FAILED]` → `[ERR-1001]`.

**Tech Stack:** Rust, cargo test

---

### Task 1: Update sqlite integration tests (4 assertions)

**Files:**
- Modify: `src-tauri/tests/sqlite_integration.rs`

- [ ] **Step 1: Replace all old error tags**

Find and replace in the file:
- `[VALIDATION_ERROR]` → `[ERR-3001]`
- `[QUERY_ERROR]` → `[ERR-2001]`
- `[CONN_FAILED]` → `[ERR-1001]`

- [ ] **Step 2: Verify with grep**

Run: `grep -n "\[VALIDATION_ERROR\]\|\[QUERY_ERROR\]\|\[CONN_FAILED\]" src-tauri/tests/sqlite_integration.rs`
Expected: No matches (0 lines)

- [ ] **Step 3: Commit**

```bash
git add src-tauri/tests/sqlite_integration.rs
git commit -m "test(sqlite): update error assertions to use new error codes"
```

---

### Task 2: Update postgres integration tests (4 assertions)

**Files:**
- Modify: `src-tauri/tests/postgres_integration.rs`

- [ ] **Step 1: Replace all old error tags**

Find and replace in the file:
- `[VALIDATION_ERROR]` → `[ERR-3001]`
- `[QUERY_ERROR]` → `[ERR-2001]`
- `[CONN_FAILED]` → `[ERR-1001]`

- [ ] **Step 2: Verify with grep**

Run: `grep -n "\[VALIDATION_ERROR\]\|\[QUERY_ERROR\]\|\[CONN_FAILED\]" src-tauri/tests/postgres_integration.rs`
Expected: No matches

- [ ] **Step 3: Commit**

```bash
git add src-tauri/tests/postgres_integration.rs
git commit -m "test(postgres): update error assertions to use new error codes"
```

---

### Task 3: Update mssql integration tests (4 assertions)

**Files:**
- Modify: `src-tauri/tests/mssql_integration.rs`

- [ ] **Step 1: Replace all old error tags**

Find and replace in the file:
- `[VALIDATION_ERROR]` → `[ERR-3001]`
- `[QUERY_ERROR]` → `[ERR-2001]`
- `[CONN_FAILED]` → `[ERR-1001]`

- [ ] **Step 2: Verify with grep**

Run: `grep -n "\[VALIDATION_ERROR\]\|\[QUERY_ERROR\]\|\[CONN_FAILED\]" src-tauri/tests/mssql_integration.rs`
Expected: No matches

- [ ] **Step 3: Commit**

```bash
git add src-tauri/tests/mssql_integration.rs
git commit -m "test(mssql): update error assertions to use new error codes"
```

---

### Task 4: Update duckdb integration tests (4 assertions)

**Files:**
- Modify: `src-tauri/tests/duckdb_integration.rs`

- [ ] **Step 1: Replace all old error tags**

Find and replace in the file:
- `[VALIDATION_ERROR]` → `[ERR-3001]`
- `[QUERY_ERROR]` → `[ERR-2001]`
- `[CONN_FAILED]` → `[ERR-1001]`

- [ ] **Step 2: Verify with grep**

Run: `grep -n "\[VALIDATION_ERROR\]\|\[QUERY_ERROR\]\|\[CONN_FAILED\]" src-tauri/tests/duckdb_integration.rs`
Expected: No matches

- [ ] **Step 3: Commit**

```bash
git add src-tauri/tests/duckdb_integration.rs
git commit -m "test(duckdb): update error assertions to use new error codes"
```

---

### Task 5: Update sqlite stateful command tests (3 assertions)

**Files:**
- Modify: `src-tauri/tests/sqlite_stateful_command_integration.rs`

- [ ] **Step 1: Replace all old error tags**

Find and replace in the file:
- `[VALIDATION_ERROR]` → `[ERR-3001]`
- `[QUERY_ERROR]` → `[ERR-2001]`
- `[CONN_FAILED]` → `[ERR-1001]`

- [ ] **Step 2: Verify with grep**

Run: `grep -n "\[VALIDATION_ERROR\]\|\[QUERY_ERROR\]\|\[CONN_FAILED\]" src-tauri/tests/sqlite_stateful_command_integration.rs`
Expected: No matches

- [ ] **Step 3: Commit**

```bash
git add src-tauri/tests/sqlite_stateful_command_integration.rs
git commit -m "test(sqlite): update stateful command error assertions"
```

---

### Task 6: Update mysql and mariadb stateful command tests (2+2 assertions)

**Files:**
- Modify: `src-tauri/tests/mysql_stateful_command_integration.rs`
- Modify: `src-tauri/tests/mariadb_stateful_command_integration.rs`

- [ ] **Step 1: Replace all old error tags in mysql file**

Find and replace:
- `[VALIDATION_ERROR]` → `[ERR-3001]`

- [ ] **Step 2: Replace all old error tags in mariadb file**

Find and replace:
- `[VALIDATION_ERROR]` → `[ERR-3001]`

- [ ] **Step 3: Verify with grep**

Run: `grep -rn "\[VALIDATION_ERROR\]\|\[QUERY_ERROR\]\|\[CONN_FAILED\]" src-tauri/tests/mysql_stateful_command_integration.rs src-tauri/tests/mariadb_stateful_command_integration.rs`
Expected: No matches

- [ ] **Step 4: Commit**

```bash
git add src-tauri/tests/mysql_stateful_command_integration.rs src-tauri/tests/mariadb_stateful_command_integration.rs
git commit -m "test(mysql,mariadb): update stateful command error assertions"
```

---

### Task 7: Update remaining 19 test files (1 assertion each)

**Files:**
- Modify: `src-tauri/tests/starrocks_stateful_command_integration.rs`
- Modify: `src-tauri/tests/starrocks_integration.rs`
- Modify: `src-tauri/tests/starrocks_command_integration.rs`
- Modify: `src-tauri/tests/sqlite_command_integration.rs`
- Modify: `src-tauri/tests/redis_integration.rs`
- Modify: `src-tauri/tests/postgres_stateful_command_integration.rs`
- Modify: `src-tauri/tests/postgres_command_integration.rs`
- Modify: `src-tauri/tests/oracle_integration.rs`
- Modify: `src-tauri/tests/oracle_command_integration.rs`
- Modify: `src-tauri/tests/mysql_integration.rs`
- Modify: `src-tauri/tests/mysql_command_integration.rs`
- Modify: `src-tauri/tests/mssql_stateful_command_integration.rs`
- Modify: `src-tauri/tests/mssql_command_integration.rs`
- Modify: `src-tauri/tests/mariadb_integration.rs`
- Modify: `src-tauri/tests/mariadb_command_integration.rs`
- Modify: `src-tauri/tests/duckdb_command_integration.rs`
- Modify: `src-tauri/tests/doris_command_integration.rs`
- Modify: `src-tauri/tests/clickhouse_integration.rs`
- Modify: `src-tauri/tests/clickhouse_command_integration.rs`

- [ ] **Step 1: Replace old error tags in all 19 files**

For each file, find and replace:
- `[VALIDATION_ERROR]` → `[ERR-3001]`
- `[QUERY_ERROR]` → `[ERR-2001]`
- `[CONN_FAILED]` → `[ERR-1001]`

- [ ] **Step 2: Verify no old tags remain in tests directory**

Run: `grep -rn "\[VALIDATION_ERROR\]\|\[QUERY_ERROR\]\|\[CONN_FAILED\]" src-tauri/tests/`
Expected: No matches (0 lines)

- [ ] **Step 3: Commit**

```bash
git add src-tauri/tests/
git commit -m "test: update remaining error assertions to use new error codes"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run cargo check**

Run: `cargo check`
Expected: PASS

- [ ] **Step 2: Verify no old tags remain**

Run: `grep -rn "\[VALIDATION_ERROR\]\|\[QUERY_ERROR\]\|\[CONN_FAILED\]" src-tauri/tests/`
Expected: No matches

- [ ] **Step 3: Verify new error codes are present**

Run: `grep -c "\[ERR-3001\]\|\[ERR-2001\]\|\[ERR-1001\]" src-tauri/tests/*.rs | grep -v ":0$"`
Expected: Multiple files with non-zero counts
