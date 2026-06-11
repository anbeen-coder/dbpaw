# 精简 DatabaseDriver Trait 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 精简 DatabaseDriver trait，移除 9 个可选方法的默认实现和 2 个冗余方法，通过 downcast 机制访问可选能力。

**Architecture:** 核心 trait 保留 12 个必需方法 + as_any()，可选能力通过子 trait + downcast 访问。新增 CancellableQueryDriver 子 trait 支持查询取消。

**Tech Stack:** Rust, async-trait, bitflags

---

## 文件结构

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src-tauri/src/db/drivers/traits.rs` | 修改 | 精简核心 trait，添加 CancellableQueryDriver |
| `src-tauri/src/db/drivers/mod.rs` | 修改 | 导出 CancellableQueryDriver |
| `src-tauri/src/db/drivers/sqlite.rs` | 修改 | 移除 get_table_data_chunk，添加 as_any |
| `src-tauri/src/db/drivers/postgres/mod.rs` | 修改 | 移除 get_table_data_chunk，添加 as_any |
| `src-tauri/src/db/drivers/mysql/mod.rs` | 修改 | 移除 get_table_data_chunk/execute_query_with_id，添加 as_any |
| `src-tauri/src/db/drivers/mssql/mod.rs` | 修改 | 移除 get_table_data_chunk，添加 as_any |
| `src-tauri/src/db/drivers/oracle.rs` | 修改 | 移除 get_table_data_chunk，添加 as_any |
| `src-tauri/src/db/drivers/clickhouse.rs` | 修改 | 移除 get_table_data_chunk/execute_query_with_id，添加 as_any |
| `src-tauri/src/db/drivers/duckdb.rs` | 修改 | 移除 get_table_data_chunk，添加 as_any |
| `src-tauri/src/db/drivers/mongodb.rs` | 修改 | 移除 get_table_data_chunk，添加 as_any |
| `src-tauri/src/db/drivers/cassandra.rs` | 修改 | 移除 get_table_data_chunk，添加 as_any |
| `src-tauri/src/db/drivers/db2.rs` | 修改 | 移除 get_table_data_chunk，添加 as_any |
| `src-tauri/src/commands/metadata.rs` | 修改 | 使用 downcast 调用可选能力 |
| `src-tauri/src/commands/query.rs` | 修改 | 使用 CancellableQueryDriver |
| `src-tauri/src/commands/transfer/export_service.rs` | 修改 | 替换 get_table_data_chunk 为 get_table_data |
| `src-tauri/src/commands/transfer.rs` | 修改 | 更新 mock 引用 |
| `src-tauri/src/db/pool_manager.rs` | 修改 | 更新 MockDriver |
| `src-tauri/src/commands/mod.rs` | 修改 | 更新 MockDriver |

---

### Task 1: 更新核心 traits.rs

**Files:**
- Modify: `src-tauri/src/db/drivers/traits.rs`

- [ ] **Step 1: 移除 9 个可选方法的默认实现**

从 `DatabaseDriver` trait 中移除以下方法的默认实现：
- `list_routines()`
- `list_events()`
- `list_sequences()`
- `list_types()`
- `list_synonyms()`
- `list_packages()`
- `get_routine_ddl()`
- `get_schema_foreign_keys()`
- `execute_query_with_id()`

同时移除 `get_table_data_chunk()` 方法。

- [ ] **Step 2: 添加 as_any 方法到核心 trait**

在 `DatabaseDriver` trait 中添加：

```rust
fn as_any(&self) -> &dyn std::any::Any;
```

- [ ] **Step 3: 添加 CancellableQueryDriver 子 trait**

```rust
#[async_trait]
pub trait CancellableQueryDriver: DatabaseDriver {
    async fn execute_query_with_id(
        &self,
        sql: String,
        query_id: Option<&str>,
    ) -> DriverResult<QueryResult>;
}
```

- [ ] **Step 4: 运行 cargo check**

Run: `cargo check`
Expected: 编译通过（驱动文件会报错，但 trait 定义本身应正确）

- [ ] **Step 5: 提交**

```bash
git add src-tauri/src/db/drivers/traits.rs
git commit -m "refactor: 精简 DatabaseDriver trait，移除可选方法默认实现"
```

---

### Task 2: 更新 mod.rs 导出

**Files:**
- Modify: `src-tauri/src/db/drivers/mod.rs`

- [ ] **Step 1: 导出 CancellableQueryDriver**

在 `mod.rs` 的导出列表中添加 `CancellableQueryDriver`：

```rust
pub use traits::{
    DatabaseDriver, DriverCapabilities, DriverResult, EventDriver, ForeignKeyDriver, PackageDriver,
    RoutineDriver, SequenceDriver, SynonymDriver, TypeDriver, CancellableQueryDriver,
};
```

- [ ] **Step 2: 运行 cargo check**

Run: `cargo check`
Expected: 编译通过

- [ ] **Step 3: 提交**

```bash
git add src-tauri/src/db/drivers/mod.rs
git commit -m "refactor: 导出 CancellableQueryDriver 子 trait"
```

---

### Task 3: 更新 SqliteDriver

**Files:**
- Modify: `src-tauri/src/db/drivers/sqlite.rs`

- [ ] **Step 1: 添加 as_any 实现**

在 `impl DatabaseDriver for SqliteDriver` 中添加：

```rust
fn as_any(&self) -> &dyn std::any::Any {
    self
}
```

- [ ] **Step 2: 移除 get_table_data_chunk 实现**

删除 `get_table_data_chunk` 方法（约第 692-714 行）。

- [ ] **Step 3: 运行 cargo check**

Run: `cargo check`
Expected: SqliteDriver 编译通过

- [ ] **Step 4: 运行测试**

Run: `cargo test sqlite`
Expected: 所有 sqlite 相关测试通过

- [ ] **Step 5: 提交**

```bash
git add src-tauri/src/db/drivers/sqlite.rs
git commit -m "refactor: 更新 SqliteDriver，移除 get_table_data_chunk"
```

---

### Task 4: 更新 PostgresDriver

**Files:**
- Modify: `src-tauri/src/db/drivers/postgres/mod.rs`

- [ ] **Step 1: 添加 as_any 实现**

在 `impl DatabaseDriver for PostgresDriver` 中添加：

```rust
fn as_any(&self) -> &dyn std::any::Any {
    self
}
```

- [ ] **Step 2: 移除 get_table_data_chunk 实现**

删除 `get_table_data_chunk` 方法（约第 107-130 行）。

- [ ] **Step 3: 运行 cargo check**

Run: `cargo check`
Expected: PostgresDriver 编译通过

- [ ] **Step 4: 提交**

```bash
git add src-tauri/src/db/drivers/postgres/mod.rs
git commit -m "refactor: 更新 PostgresDriver，移除 get_table_data_chunk"
```

---

### Task 5: 更新 MysqlDriver

**Files:**
- Modify: `src-tauri/src/db/drivers/mysql/mod.rs`

- [ ] **Step 1: 添加 as_any 实现**

在 `impl DatabaseDriver for MysqlDriver` 中添加：

```rust
fn as_any(&self) -> &dyn std::any::Any {
    self
}
```

- [ ] **Step 2: 移除 get_table_data_chunk 实现**

删除 `get_table_data_chunk` 方法（约第 133-148 行）。

- [ ] **Step 3: 移除 execute_query_with_id 实现**

删除 `execute_query_with_id` 方法（约第 162-168 行）。

- [ ] **Step 4: 添加 CancellableQueryDriver 实现**

```rust
#[async_trait]
impl CancellableQueryDriver for MysqlDriver {
    async fn execute_query_with_id(
        &self,
        sql: String,
        query_id: Option<&str>,
    ) -> DriverResult<QueryResult> {
        self.query.execute_query_with_id(sql, query_id).await
    }
}
```

- [ ] **Step 5: 运行 cargo check**

Run: `cargo check`
Expected: MysqlDriver 编译通过

- [ ] **Step 6: 提交**

```bash
git add src-tauri/src/db/drivers/mysql/mod.rs
git commit -m "refactor: 更新 MysqlDriver，添加 CancellableQueryDriver"
```

---

### Task 6: 更新 MssqlDriver

**Files:**
- Modify: `src-tauri/src/db/drivers/mssql/mod.rs`

- [ ] **Step 1: 添加 as_any 实现**

在 `impl DatabaseDriver for MssqlDriver` 中添加：

```rust
fn as_any(&self) -> &dyn std::any::Any {
    self
}
```

- [ ] **Step 2: 移除 get_table_data_chunk 实现**

删除 `get_table_data_chunk` 方法（约第 101-116 行）。

- [ ] **Step 3: 运行 cargo check**

Run: `cargo check`
Expected: MssqlDriver 编译通过

- [ ] **Step 4: 提交**

```bash
git add src-tauri/src/db/drivers/mssql/mod.rs
git commit -m "refactor: 更新 MssqlDriver，移除 get_table_data_chunk"
```

---

### Task 7: 更新 OracleDriver

**Files:**
- Modify: `src-tauri/src/db/drivers/oracle.rs`

- [ ] **Step 1: 添加 as_any 实现**

在 `impl DatabaseDriver for OracleDriver` 中添加：

```rust
fn as_any(&self) -> &dyn std::any::Any {
    self
}
```

- [ ] **Step 2: 移除 get_table_data_chunk 实现**

删除 `get_table_data_chunk` 方法（约第 604-626 行）。

- [ ] **Step 3: 运行 cargo check**

Run: `cargo check`
Expected: OracleDriver 编译通过

- [ ] **Step 4: 提交**

```bash
git add src-tauri/src/db/drivers/oracle.rs
git commit -m "refactor: 更新 OracleDriver，移除 get_table_data_chunk"
```

---

### Task 8: 更新 ClickHouseDriver

**Files:**
- Modify: `src-tauri/src/db/drivers/clickhouse.rs`

- [ ] **Step 1: 添加 as_any 实现**

在 `impl DatabaseDriver for ClickHouseDriver` 中添加：

```rust
fn as_any(&self) -> &dyn std::any::Any {
    self
}
```

- [ ] **Step 2: 移除 get_table_data_chunk 实现**

删除 `get_table_data_chunk` 方法（约第 851-876 行）。

- [ ] **Step 3: 重构 execute_query 方法**

ClickHouse 的 `execute_query` 目前调用 `self.execute_query_with_id(sql, None)`。需要将 `execute_query_with_id` 的实现重命名为内部方法 `execute_query_with_id_impl`，然后：

```rust
async fn execute_query(&self, sql: String) -> DriverResult<QueryResult> {
    self.execute_query_with_id_impl(sql, None).await
}
```

- [ ] **Step 4: 移除 execute_query_with_id trait 实现**

删除 trait impl 中的 `execute_query_with_id` 方法，保留内部实现 `execute_query_with_id_impl`。

- [ ] **Step 5: 添加 CancellableQueryDriver 实现**

```rust
#[async_trait]
impl CancellableQueryDriver for ClickHouseDriver {
    async fn execute_query_with_id(
        &self,
        sql: String,
        query_id: Option<&str>,
    ) -> DriverResult<QueryResult> {
        self.execute_query_with_id_impl(sql, query_id).await
    }
}
```

- [ ] **Step 6: 运行 cargo check**

Run: `cargo check`
Expected: ClickHouseDriver 编译通过

- [ ] **Step 7: 提交**

```bash
git add src-tauri/src/db/drivers/clickhouse.rs
git commit -m "refactor: 更新 ClickHouseDriver，添加 CancellableQueryDriver"
```

---

### Task 9: 更新 DuckdbDriver

**Files:**
- Modify: `src-tauri/src/db/drivers/duckdb.rs`

- [ ] **Step 1: 添加 as_any 实现**

在 `impl DatabaseDriver for DuckdbDriver` 中添加：

```rust
fn as_any(&self) -> &dyn std::any::Any {
    self
}
```

- [ ] **Step 2: 移除 get_table_data_chunk 实现**

删除 `get_table_data_chunk` 方法（约第 644-668 行）。

- [ ] **Step 3: 运行 cargo check**

Run: `cargo check`
Expected: DuckdbDriver 编译通过

- [ ] **Step 4: 提交**

```bash
git add src-tauri/src/db/drivers/duckdb.rs
git commit -m "refactor: 更新 DuckdbDriver，移除 get_table_data_chunk"
```

---

### Task 10: 更新 MongoDBDriver

**Files:**
- Modify: `src-tauri/src/db/drivers/mongodb.rs`

- [ ] **Step 1: 添加 as_any 实现**

在 `impl DatabaseDriver for MongoDBDriver` 中添加：

```rust
fn as_any(&self) -> &dyn std::any::Any {
    self
}
```

- [ ] **Step 2: 移除 get_table_data_chunk 实现**

删除 `get_table_data_chunk` 方法（约第 620-644 行）。

- [ ] **Step 3: 运行 cargo check**

Run: `cargo check`
Expected: MongoDBDriver 编译通过

- [ ] **Step 4: 提交**

```bash
git add src-tauri/src/db/drivers/mongodb.rs
git commit -m "refactor: 更新 MongoDBDriver，移除 get_table_data_chunk"
```

---

### Task 11: 更新 CassandraDriver

**Files:**
- Modify: `src-tauri/src/db/drivers/cassandra.rs`

- [ ] **Step 1: 添加 as_any 实现**

在 `impl DatabaseDriver for CassandraDriver` 中添加：

```rust
fn as_any(&self) -> &dyn std::any::Any {
    self
}
```

- [ ] **Step 2: 移除 get_table_data_chunk 实现**

删除 `get_table_data_chunk` 方法（约第 682-706 行）。

- [ ] **Step 3: 运行 cargo check**

Run: `cargo check`
Expected: CassandraDriver 编译通过

- [ ] **Step 4: 提交**

```bash
git add src-tauri/src/db/drivers/cassandra.rs
git commit -m "refactor: 更新 CassandraDriver，移除 get_table_data_chunk"
```

---

### Task 12: 更新 Db2Driver

**Files:**
- Modify: `src-tauri/src/db/drivers/db2.rs`

- [ ] **Step 1: 添加 as_any 实现**

在 `impl DatabaseDriver for Db2Driver` 中添加：

```rust
fn as_any(&self) -> &dyn std::any::Any {
    self
}
```

- [ ] **Step 2: 移除 get_table_data_chunk 实现**

删除 `get_table_data_chunk` 方法（约第 629-653 行）。

- [ ] **Step 3: 运行 cargo check**

Run: `cargo check`
Expected: Db2Driver 编译通过

- [ ] **Step 4: 提交**

```bash
git add src-tauri/src/db/drivers/db2.rs
git commit -m "refactor: 更新 Db2Driver，移除 get_table_data_chunk"
```

---

### Task 13: 更新 MockDriver (pool_manager.rs)

**Files:**
- Modify: `src-tauri/src/db/pool_manager.rs`

- [ ] **Step 1: 添加 as_any 实现**

在 `impl DatabaseDriver for MockDriver` 中添加：

```rust
fn as_any(&self) -> &dyn std::any::Any {
    self
}
```

- [ ] **Step 2: 移除 get_table_data_chunk 实现**

删除 `get_table_data_chunk` 方法（约第 405-417 行）。

- [ ] **Step 3: 运行 cargo check**

Run: `cargo check`
Expected: 编译通过

- [ ] **Step 4: 提交**

```bash
git add src-tauri/src/db/pool_manager.rs
git commit -m "refactor: 更新 MockDriver，移除 get_table_data_chunk"
```

---

### Task 14: 更新 MockDriver (commands/mod.rs)

**Files:**
- Modify: `src-tauri/src/commands/mod.rs`

- [ ] **Step 1: 添加 as_any 实现**

在 `impl DatabaseDriver for MockDriver` 中添加：

```rust
fn as_any(&self) -> &dyn std::any::Any {
    self
}
```

- [ ] **Step 2: 移除 get_table_data_chunk 实现**

删除 `get_table_data_chunk` 方法（约第 271-283 行）。

- [ ] **Step 3: 运行 cargo check**

Run: `cargo check`
Expected: 编译通过

- [ ] **Step 4: 提交**

```bash
git add src-tauri/src/commands/mod.rs
git commit -m "refactor: 更新 commands MockDriver，移除 get_table_data_chunk"
```

---

### Task 15: 更新 metadata.rs 使用 downcast

**Files:**
- Modify: `src-tauri/src/commands/metadata.rs`

- [ ] **Step 1: 添加 downcast 辅助函数**

```rust
use crate::db::drivers::{DatabaseDriver, DriverCapabilities, RoutineDriver, EventDriver, SequenceDriver, TypeDriver, SynonymDriver, PackageDriver, ForeignKeyDriver};
use std::any::Any;

fn as_routine_driver(driver: &dyn DatabaseDriver) -> Option<&dyn RoutineDriver> {
    if let Some(pg) = driver.as_any().downcast_ref::<PostgresDriver>() {
        return Some(pg);
    }
    if let Some(mysql) = driver.as_any().downcast_ref::<MysqlDriver>() {
        return Some(mysql);
    }
    if let Some(mssql) = driver.as_any().downcast_ref::<MssqlDriver>() {
        return Some(mssql);
    }
    if let Some(db2) = driver.as_any().downcast_ref::<Db2Driver>() {
        return Some(db2);
    }
    None
}

fn as_event_driver(driver: &dyn DatabaseDriver) -> Option<&dyn EventDriver> {
    if let Some(mysql) = driver.as_any().downcast_ref::<MysqlDriver>() {
        return Some(mysql);
    }
    None
}

fn as_sequence_driver(driver: &dyn DatabaseDriver) -> Option<&dyn SequenceDriver> {
    if let Some(pg) = driver.as_any().downcast_ref::<PostgresDriver>() {
        return Some(pg);
    }
    if let Some(oracle) = driver.as_any().downcast_ref::<OracleDriver>() {
        return Some(oracle);
    }
    if let Some(db2) = driver.as_any().downcast_ref::<Db2Driver>() {
        return Some(db2);
    }
    None
}

fn as_type_driver(driver: &dyn DatabaseDriver) -> Option<&dyn TypeDriver> {
    if let Some(pg) = driver.as_any().downcast_ref::<PostgresDriver>() {
        return Some(pg);
    }
    if let Some(oracle) = driver.as_any().downcast_ref::<OracleDriver>() {
        return Some(oracle);
    }
    None
}

fn as_synonym_driver(driver: &dyn DatabaseDriver) -> Option<&dyn SynonymDriver> {
    if let Some(mssql) = driver.as_any().downcast_ref::<MssqlDriver>() {
        return Some(mssql);
    }
    None
}

fn as_package_driver(driver: &dyn DatabaseDriver) -> Option<&dyn PackageDriver> {
    if let Some(oracle) = driver.as_any().downcast_ref::<OracleDriver>() {
        return Some(oracle);
    }
    None
}

fn as_foreign_key_driver(driver: &dyn DatabaseDriver) -> Option<&dyn ForeignKeyDriver> {
    if let Some(pg) = driver.as_any().downcast_ref::<PostgresDriver>() {
        return Some(pg);
    }
    if let Some(mysql) = driver.as_any().downcast_ref::<MysqlDriver>() {
        return Some(mysql);
    }
    if let Some(mssql) = driver.as_any().downcast_ref::<MssqlDriver>() {
        return Some(mssql);
    }
    if let Some(sqlite) = driver.as_any().downcast_ref::<SqliteDriver>() {
        return Some(sqlite);
    }
    if let Some(oracle) = driver.as_any().downcast_ref::<OracleDriver>() {
        return Some(oracle);
    }
    if let Some(db2) = driver.as_any().downcast_ref::<Db2Driver>() {
        return Some(db2);
    }
    None
}
```

注意：需要在文件顶部添加各驱动的 import。

- [ ] **Step 2: 更新 list_routines**

```rust
#[tauri::command]
pub async fn list_routines(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    schema: Option<String>,
) -> Result<Vec<RoutineInfo>, String> {
    super::execute_with_retry(&state, id, database, |driver| {
        let schema_clone = schema.clone();
        async move {
            let routine_driver = as_routine_driver(driver.as_ref())
                .ok_or_else(|| AppError::unsupported("Routines not supported"))?;
            routine_driver.list_routines(schema_clone).await
        }
    })
    .await
    .map_err(String::from)
}
```

- [ ] **Step 3: 更新 get_routine_ddl**

```rust
#[tauri::command]
pub async fn get_routine_ddl(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    schema: String,
    name: String,
    routine_type: String,
) -> Result<String, String> {
    super::execute_with_retry(&state, id, database, |driver| {
        let schema_clone = schema.clone();
        let name_clone = name.clone();
        let routine_type_clone = routine_type.clone();
        async move {
            let routine_driver = as_routine_driver(driver.as_ref())
                .ok_or_else(|| AppError::unsupported("Routines not supported"))?;
            routine_driver
                .get_routine_ddl(schema_clone, name_clone, routine_type_clone)
                .await
        }
    })
    .await
    .map_err(String::from)
}
```

- [ ] **Step 4: 更新 list_events**

```rust
#[tauri::command]
pub async fn list_events(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    schema: Option<String>,
) -> Result<Vec<EventInfo>, String> {
    super::execute_with_retry(&state, id, database, |driver| {
        let schema_clone = schema.clone();
        async move {
            let event_driver = as_event_driver(driver.as_ref())
                .ok_or_else(|| AppError::unsupported("Events not supported"))?;
            event_driver.list_events(schema_clone).await
        }
    })
    .await
    .map_err(String::from)
}
```

- [ ] **Step 5: 更新 list_sequences**

```rust
#[tauri::command]
pub async fn list_sequences(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    schema: Option<String>,
) -> Result<Vec<SequenceInfo>, String> {
    super::execute_with_retry(&state, id, database, |driver| {
        let schema_clone = schema.clone();
        async move {
            let seq_driver = as_sequence_driver(driver.as_ref())
                .ok_or_else(|| AppError::unsupported("Sequences not supported"))?;
            seq_driver.list_sequences(schema_clone).await
        }
    })
    .await
    .map_err(String::from)
}
```

- [ ] **Step 6: 更新 list_types**

```rust
#[tauri::command]
pub async fn list_types(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    schema: Option<String>,
) -> Result<Vec<TypeInfo>, String> {
    super::execute_with_retry(&state, id, database, |driver| {
        let schema_clone = schema.clone();
        async move {
            let type_driver = as_type_driver(driver.as_ref())
                .ok_or_else(|| AppError::unsupported("Types not supported"))?;
            type_driver.list_types(schema_clone).await
        }
    })
    .await
    .map_err(String::from)
}
```

- [ ] **Step 7: 更新 list_synonyms**

```rust
#[tauri::command]
pub async fn list_synonyms(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    schema: Option<String>,
) -> Result<Vec<SynonymInfo>, String> {
    super::execute_with_retry(&state, id, database, |driver| {
        let schema_clone = schema.clone();
        async move {
            let synonym_driver = as_synonym_driver(driver.as_ref())
                .ok_or_else(|| AppError::unsupported("Synonyms not supported"))?;
            synonym_driver.list_synonyms(schema_clone).await
        }
    })
    .await
    .map_err(String::from)
}
```

- [ ] **Step 8: 更新 list_packages**

```rust
#[tauri::command]
pub async fn list_packages(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    schema: Option<String>,
) -> Result<Vec<PackageInfo>, String> {
    super::execute_with_retry(&state, id, database, |driver| {
        let schema_clone = schema.clone();
        async move {
            let pkg_driver = as_package_driver(driver.as_ref())
                .ok_or_else(|| AppError::unsupported("Packages not supported"))?;
            pkg_driver.list_packages(schema_clone).await
        }
    })
    .await
    .map_err(String::from)
}
```

- [ ] **Step 9: 更新 get_schema_foreign_keys**

```rust
#[tauri::command]
pub async fn get_schema_foreign_keys(
    state: State<'_, AppState>,
    id: i64,
    database: Option<String>,
    schema: Option<String>,
) -> Result<Vec<SchemaForeignKey>, String> {
    super::execute_with_retry_from_app_state(&state, id, database, |driver| {
        let schema_clone = schema.clone();
        async move {
            let fk_driver = as_foreign_key_driver(driver.as_ref())
                .ok_or_else(|| AppError::unsupported("Foreign Keys not supported"))?;
            fk_driver
                .get_schema_foreign_keys(schema_clone.as_deref())
                .await
        }
    })
    .await
    .map_err(String::from)
}
```

- [ ] **Step 10: 运行 cargo check**

Run: `cargo check`
Expected: 编译通过

- [ ] **Step 11: 运行测试**

Run: `cargo test`
Expected: 所有测试通过

- [ ] **Step 12: 提交**

```bash
git add src-tauri/src/commands/metadata.rs
git commit -m "refactor: 更新 metadata commands 使用 downcast 调用可选能力"
```

---

### Task 16: 更新 query.rs 使用 CancellableQueryDriver

**Files:**
- Modify: `src-tauri/src/commands/query.rs`

- [ ] **Step 1: 更新 execute_query_core 中的 execute_query_with_id 调用**

找到 `execute_query_core` 函数中调用 `execute_query_with_id` 的地方，改为使用 downcast：

```rust
use crate::db::drivers::{CancellableQueryDriver, DriverCapabilities};

// 在 execute_query_core 中
let result = super::execute_with_retry_from_app_state(state, id, database.clone(), |driver| {
    let query_clone = guarded_query.clone();
    let query_id_clone = query_id.clone();
    async move {
        if cancellation_supported {
            let cancellable = driver.as_any()
                .downcast_ref::<dyn CancellableQueryDriver>()
                .ok_or_else(|| AppError::unsupported("Query cancellation not supported"))?;
            cancellable
                .execute_query_with_id(
                    query_clone,
                    Some(query_id_clone.as_str()),
                )
                .await
        } else {
            driver.execute_query(query_clone).await
        }
    }
});
```

- [ ] **Step 2: 更新 execute_by_conn_direct**

```rust
pub async fn execute_by_conn_direct(
    form: ConnectionForm,
    sql: String,
) -> Result<QueryResult, String> {
    let guarded_sql = apply_default_limit(&sql, Some(&form.driver));
    let driver = crate::db::drivers::connect(&form)
        .await
        .map_err(String::from)?;
    driver
        .execute_query(guarded_sql)
        .await
        .map_err(String::from)
}
```

- [ ] **Step 3: 运行 cargo check**

Run: `cargo check`
Expected: 编译通过

- [ ] **Step 4: 提交**

```bash
git add src-tauri/src/commands/query.rs
git commit -m "refactor: 更新 query commands 使用 CancellableQueryDriver"
```

---

### Task 17: 更新 export_service.rs

**Files:**
- Modify: `src-tauri/src/commands/transfer/export_service.rs`

- [ ] **Step 1: 替换 get_table_data_chunk 为 get_table_data**

找到所有 `get_table_data_chunk` 调用，替换为 `get_table_data`：

```rust
// 之前
let resp = db_driver
    .get_table_data_chunk(
        schema.clone(),
        table.clone(),
        page.unwrap_or(1).max(1),
        limit.unwrap_or(50).max(1),
        sort_column,
        sort_direction,
        filter,
        order_by,
    )
    .await?;

// 之后
let resp = db_driver
    .get_table_data(
        schema.clone(),
        table.clone(),
        page.unwrap_or(1).max(1),
        limit.unwrap_or(50).max(1),
        sort_column,
        sort_direction,
        filter,
        order_by,
    )
    .await?;
```

- [ ] **Step 2: 运行 cargo check**

Run: `cargo check`
Expected: 编译通过

- [ ] **Step 3: 提交**

```bash
git add src-tauri/src/commands/transfer/export_service.rs
git commit -m "refactor: 更新 export_service 使用 get_table_data"
```

---

### Task 18: 更新 transfer.rs mock

**Files:**
- Modify: `src-tauri/src/commands/transfer.rs`

- [ ] **Step 1: 移除 mock 中的 get_table_data_chunk**

找到 `transfer.rs` 中的 mock 实现，移除 `get_table_data_chunk` 方法。

- [ ] **Step 2: 运行 cargo check**

Run: `cargo check`
Expected: 编译通过

- [ ] **Step 3: 提交**

```bash
git add src-tauri/src/commands/transfer.rs
git commit -m "refactor: 更新 transfer mock，移除 get_table_data_chunk"
```

---

### Task 19: 完整测试

- [ ] **Step 1: 运行完整 cargo check**

Run: `cargo check`
Expected: 编译通过，无错误

- [ ] **Step 2: 运行完整 cargo test**

Run: `cargo test`
Expected: 所有测试通过

- [ ] **Step 3: 运行 cargo clippy**

Run: `cargo clippy`
Expected: 无警告或仅轻微警告

- [ ] **Step 4: 最终提交**

```bash
git add -A
git commit -m "refactor: 完成 DatabaseDriver trait 精简"
```
