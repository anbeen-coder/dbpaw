# AppError 收敛实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 消除后端旧 tagged string 协议，统一收敛到 `AppError` 结构化错误

**Architecture:** 自底向上逐驱动迁移，先改 `conn_failed_error()` 返回 `AppError`，再逐个驱动将内部方法从 `Result<T, String>` 改为 `DriverResult<T>`，最后删除 `From<String> for AppError` 兼容垫片

**Tech Stack:** Rust, Tauri, async-trait

---

## 文件结构

| 文件 | 职责 | 变更类型 |
|------|------|---------|
| `src-tauri/src/db/errors/connection.rs` | 连接错误构建 | 改返回 `AppError` |
| `src-tauri/src/db/drivers/postgres.rs` | PostgreSQL 驱动 | 迁移 1 个方法 |
| `src-tauri/src/db/drivers/sqlite.rs` | SQLite 驱动 | 迁移 5 个方法 + 28 处标签 |
| `src-tauri/src/db/drivers/oracle.rs` | Oracle 驱动 | 迁移 1 个方法 + 46 处标签 |
| `src-tauri/src/db/drivers/mongodb.rs` | MongoDB 驱动 | 迁移 9 个方法 + 19 处标签 |
| `src-tauri/src/db/drivers/duckdb.rs` | DuckDB 驱动 | 迁移 3 个方法 + 35 处标签 |
| `src-tauri/src/db/drivers/db2.rs` | DB2 驱动 | 迁移 3 个方法 + 40 处标签 |
| `src-tauri/src/db/drivers/cassandra.rs` | Cassandra 驱动 | 迁移 3 个方法 + 21 处标签 |
| `src-tauri/src/db/drivers/clickhouse.rs` | ClickHouse 驱动 | 迁移 8 个方法 + 13 处标签 |
| `src-tauri/src/error.rs` | AppError 定义 | 删除 `From<String>` 垫片 |

**已迁移（无需改动）：** `mysql.rs`、`mssql.rs`

---

### Task 1: `conn_failed_error()` 改为返回 `AppError`

**Files:**
- Modify: `src-tauri/src/db/errors/connection.rs:4`

- [ ] **Step 1: 改函数签名和返回值**

将 `conn_failed_error` 的返回类型从 `String` 改为 `AppError`，移除最后的 `.to_string()`：

```rust
// 改前
pub(crate) fn conn_failed_error(e: &dyn std::fmt::Display) -> String {
    // ... hint 逻辑不变 ...
    crate::error::AppError::conn_failed(raw, hint).to_string()
}

// 改后
pub(crate) fn conn_failed_error(e: &dyn std::fmt::Display) -> AppError {
    // ... hint 逻辑不变 ...
    crate::error::AppError::conn_failed(raw, hint)  // 不再 .to_string()
}
```

- [ ] **Step 2: 添加 `use` 导入**

在文件顶部添加：
```rust
use crate::error::AppError;
```

- [ ] **Step 3: 更新测试中的断言**

测试从 `assert!(msg.starts_with("[ERR-1001]"))` 改为检查 `AppError` 变体：
```rust
let err = conn_failed_error(&"DPI-1047: ...");
let s = err.to_string();
assert!(s.starts_with("[ERR-1001]"));
// 其余断言不变，因为 AppError::to_string() 输出格式相同
```

或者更精确地匹配变体：
```rust
let err = conn_failed_error(&"DPI-1047: ...");
match &err {
    AppError::ConnectionFailed { code, hint, .. } => {
        assert_eq!(*code, 1001);
        assert!(hint.as_ref().unwrap().contains("Oracle Instant Client"));
    }
    _ => panic!("Expected ConnectionFailed"),
}
```

- [ ] **Step 4: `cargo check`**

Run: `cargo check` in `src-tauri/`

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/db/errors/connection.rs
git commit -m "refactor: conn_failed_error returns AppError directly"
```

---

### Task 2: postgres.rs — 迁移 `load_pg_constraints`

**Files:**
- Modify: `src-tauri/src/db/drivers/postgres.rs` — `load_pg_constraints` 方法

postgres.rs 只有 1 个返回 `Result<T, String>` 的方法，无 tagged string。

- [ ] **Step 1: 找到 `load_pg_constraints` 方法，改返回类型**

从 `Result<..., String>` 改为 `DriverResult<...>`。如果方法体中有 `.map_err(|e| e.to_string())` 之类的转换，改为直接用 `AppError` 构造函数或 `.map_err(AppError::from)` / `.map_err(|e| AppError::internal(e.to_string()))`。

- [ ] **Step 2: `cargo check`**

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/db/drivers/postgres.rs
git commit -m "refactor(postgres): migrate load_pg_constraints to DriverResult"
```

---

### Task 3: sqlite.rs — 迁移 5 个方法 + 28 处标签

**Files:**
- Modify: `src-tauri/src/db/drivers/sqlite.rs`

需要迁移的方法：`connect`、`describe_query_columns`、值提取辅助函数、列信息辅助函数、表数据辅助函数

- [ ] **Step 1: 添加导入**

在文件顶部添加（如果缺少）：
```rust
use crate::error::AppError;
use crate::db::drivers::DriverResult;
```

- [ ] **Step 2: 迁移 `connect()` 方法**

签名从 `Result<Self, String>` 改为 `DriverResult<Self>`。替换方法体中的 tagged strings：
- `format!("[CONN_FAILED] ...")` → `AppError::conn_failed(...)` 或 `conn_failed_error(&e)`
- `"[VALIDATION_ERROR] ..."` → `AppError::validation(...)`

- [ ] **Step 3: 迁移其余 4 个内部方法**

每个方法：签名改 `DriverResult<T>`，方法体替换 tagged strings：
- `format!("[QUERY_ERROR] ...")` → `AppError::query_failed(format!(...))`
- `"[VALIDATION_ERROR] ..."` → `AppError::validation(...)`
- `format!("[CONN_FAILED] ...")` → `AppError::conn_failed(...)` 或 `conn_failed_error(&e)`

- [ ] **Step 4: `cargo check`**

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/db/drivers/sqlite.rs
git commit -m "refactor(sqlite): migrate to DriverResult, remove tagged strings"
```

---

### Task 4: oracle.rs — 迁移 1 个方法 + 46 处标签

**Files:**
- Modify: `src-tauri/src/db/drivers/oracle.rs`

- [ ] **Step 1: 添加导入**

```rust
use crate::error::AppError;
use crate::db::drivers::DriverResult;
```

- [ ] **Step 2: 迁移 `connect()` 方法**

签名从 `Result<Self, String>` 改为 `DriverResult<Self>`。

- [ ] **Step 3: 替换 46 处 tagged strings**

oracle.rs 主要是 `[QUERY_ERROR]`（40 处）和少量 `[VALIDATION_ERROR]`（3 处）、`[CONN_FAILED]`（3 处）。

注意：oracle.rs 有 `run_blocking` 方法，闭包签名是 `FnOnce(oracle::Connection) -> Result<T, String>`。这个闭包类型需要改为 `FnOnce(oracle::Connection) -> DriverResult<T>`，或者保持 `Result<T, String>` 在闭包内转换。需要看调用点决定。

- [ ] **Step 4: `cargo check`**

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/db/drivers/oracle.rs
git commit -m "refactor(oracle): migrate to DriverResult, remove tagged strings"
```

---

### Task 5: mongodb.rs — 迁移 9 个方法 + 19 处标签

**Files:**
- Modify: `src-tauri/src/db/drivers/mongodb.rs`

需要迁移的方法：`build_connection_uri`、`parse_json_doc`、`connect`、列信息辅助、`cursor_to_query_result`、投影辅助、`test_connection_info`、`list_databases_info`、集合信息辅助

- [ ] **Step 1: 添加导入**

```rust
use crate::error::AppError;
use crate::db::drivers::DriverResult;
```

- [ ] **Step 2: 迁移 `connect()` 和 `build_connection_uri()`**

注意：`[MONGODB_ERROR]` 不在 `From<String>` 垫片中，会 fallback 到 `AppError::internal()`。迁移时根据语义选择合适的 `AppError` 变体。

- [ ] **Step 3: 迁移其余 7 个方法**

`[NOT_FOUND]` → `AppError::not_found(...)`

- [ ] **Step 4: `cargo check`**

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/db/drivers/mongodb.rs
git commit -m "refactor(mongodb): migrate to DriverResult, remove tagged strings"
```

---

### Task 6: duckdb.rs — 迁移 3 个方法 + 35 处标签

**Files:**
- Modify: `src-tauri/src/db/drivers/duckdb.rs`

- [ ] **Step 1: 添加导入**

```rust
use crate::error::AppError;
use crate::db::drivers::DriverResult;
```

- [ ] **Step 2: 迁移 `connect()`、`build_file_path()`、值提取辅助函数**

duckdb.rs 有 `run_blocking` 闭包模式（类似 oracle），需要一并处理。

- [ ] **Step 3: 替换 35 处 tagged strings（主要是 `[QUERY_ERROR]` 30 处）**

- [ ] **Step 4: `cargo check`**

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/db/drivers/duckdb.rs
git commit -m "refactor(duckdb): migrate to DriverResult, remove tagged strings"
```

---

### Task 7: db2.rs — 迁移 3 个方法 + 40 处标签

**Files:**
- Modify: `src-tauri/src/db/drivers/db2.rs`

- [ ] **Step 1: 添加导入**

```rust
use crate::error::AppError;
use crate::db::drivers::DriverResult;
```

- [ ] **Step 2: 迁移 `connect()`、setup 辅助、`run_blocking()`**

db2.rs 也有 `run_blocking` 闭包模式。

- [ ] **Step 3: 替换 40 处 tagged strings（36 `[QUERY_ERROR]` + 4 `[VALIDATION_ERROR]`）**

- [ ] **Step 4: `cargo check`**

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/db/drivers/db2.rs
git commit -m "refactor(db2): migrate to DriverResult, remove tagged strings"
```

---

### Task 8: cassandra.rs — 迁移 3 个方法 + 21 处标签

**Files:**
- Modify: `src-tauri/src/db/drivers/cassandra.rs`

- [ ] **Step 1: 添加导入**

```rust
use crate::error::AppError;
use crate::db::drivers::DriverResult;
```

- [ ] **Step 2: 迁移 `connect()`、index-info 辅助、table-extra 辅助**

注意：`[CASSANDRA_ERROR]`（13 处）不在 `From<String>` 垫片中，根据语义映射到合适的 `AppError` 变体（大部分应该是 `AppError::query_failed`）。

- [ ] **Step 3: 替换 21 处 tagged strings**

- [ ] **Step 4: `cargo check`**

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/db/drivers/cassandra.rs
git commit -m "refactor(cassandra): migrate to DriverResult, remove tagged strings"
```

---

### Task 9: clickhouse.rs — 迁移 8 个方法 + 13 处标签

**Files:**
- Modify: `src-tauri/src/db/drivers/clickhouse.rs`

需要迁移的方法：`build_config`、`required_i64_from_json_row`、`connect`、`execute_raw`、`execute_json`、`estimate_total_rows`、table-extra 辅助、`kill_query`

- [ ] **Step 1: 添加导入**

```rust
use crate::error::AppError;
use crate::db::drivers::DriverResult;
```

- [ ] **Step 2: 迁移 `connect()` 和 `build_config()`**

- [ ] **Step 3: 迁移其余 6 个方法**

注意：`[PARSE_ERROR]`（4 处）不在垫片中，根据语义映射（可能是 `AppError::query_failed` 或 `AppError::validation`）。

- [ ] **Step 4: `cargo check`**

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/db/drivers/clickhouse.rs
git commit -m "refactor(clickhouse): migrate to DriverResult, remove tagged strings"
```

---

### Task 10: 删除 `From<String> for AppError` 兼容垫片

**Files:**
- Modify: `src-tauri/src/error.rs:105-128`（删除 `From<String> for AppError`）
- Modify: `src-tauri/src/error.rs:393-408`（删除旧标签测试）

- [ ] **Step 1: 确认所有驱动已迁移**

在 `src-tauri/src/` 下 grep 确认无残留 tagged strings：
```bash
grep -rn '\[QUERY_ERROR\]\|\[VALIDATION_ERROR\]\|\[CONN_FAILED\]\|\[UNSUPPORTED\]\|\[NOT_FOUND\]\|\[REDIS_ERROR\]\|\[CASSANDRA_ERROR\]\|\[MONGODB_ERROR\]\|\[PARSE_ERROR\]\|\[SERIALIZE_ERROR\]' src-tauri/src/db/drivers/
```
应该无输出。

- [ ] **Step 2: 删除 `From<String> for AppError` 实现**

删除 `error.rs:105-128` 的整个 `impl From<String> for AppError` 块。

- [ ] **Step 3: 删除 `From<&str> for AppError` 实现**

删除 `error.rs:130-134`（它调用 `AppError::from(err.to_string())`，依赖上面的 impl）。

- [ ] **Step 4: 删除旧标签测试**

删除 `error.rs:393-408` 的三个测试：
- `test_legacy_validation_label_converts_to_structured_error_code`
- `test_legacy_unsupported_label_converts_to_structured_error_code`
- `test_legacy_redis_label_converts_to_structured_error_code`

- [ ] **Step 5: `cargo check`**

- [ ] **Step 6: 更新 `AGENTS.md`**

移除"Database drivers are still migrating, so do not introduce new string-tag protocols"的说明，改为明确新代码禁止返回 tagged string。

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/error.rs AGENTS.md
git commit -m "refactor: remove From<String> for AppError compatibility shim"
```

---

## 验证清单

- [ ] `cargo check` 通过
- [ ] `cargo test` 通过
- [ ] `grep` 确认无残留 tagged strings
- [ ] 前端 `parseError()` 无需改动（`[ERR-XXXX]` 格式不变）
