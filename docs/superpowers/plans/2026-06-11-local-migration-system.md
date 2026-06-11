# Local SQLite Migration System 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `local.rs` 中 220 行手写迁移逻辑抽取为独立的 `db/migrations.rs` 模块，用 `schema_migrations` 表追踪版本。

**Architecture:** 新建 `migrations.rs` 提供 `run_migrations(&pool)` 函数，内部维护一个编译时嵌入的迁移数组和版本表。`local.rs` 的 `init_with_app_dir()` 和测试 `make_test_db()` 都改为调用此函数。向后兼容通过检测旧数据库（有 `connections` 表但无 `schema_migrations` 表）自动处理。

**Tech Stack:** Rust, sqlx (SQLite), include_str!

---

### Task 1: 创建 `migrations.rs`

**Files:**
- Create: `src-tauri/src/db/migrations.rs`

- [ ] **Step 1: 创建 `migrations.rs` 文件**

```rust
use crate::error::AppError;
use sqlx::{Pool, Row, Sqlite};
use std::collections::HashSet;

const MIGRATIONS: &[(i64, &str)] = &[
    (1,  include_str!("../../migrations/001_initial.sql")),
    (2,  include_str!("../../migrations/002_saved_queries.sql")),
    (3,  include_str!("../../migrations/003_add_database_to_saved_queries.sql")),
    (4,  include_str!("../../migrations/004_add_ssh_fields.sql")),
    (5,  include_str!("../../migrations/005_ai_providers.sql")),
    (6,  include_str!("../../migrations/006_ai_conversations.sql")),
    (7,  include_str!("../../migrations/007_ai_messages.sql")),
    (8,  include_str!("../../migrations/008_ai_provider_vendor_unique.sql")),
    (9,  include_str!("../../migrations/009_ai_provider_type_relaxed.sql")),
    (10, include_str!("../../migrations/010_sql_execution_logs.sql")),
    (11, include_str!("../../migrations/011_add_ssl_fields.sql")),
    (12, include_str!("../../migrations/012_add_redis_connection_options.sql")),
    (13, include_str!("../../migrations/013_add_elasticsearch_connection_options.sql")),
    (14, include_str!("../../migrations/014_add_sentinel_fields.sql")),
    (15, include_str!("../../migrations/015_add_mongodb_auth_source.sql")),
    (16, include_str!("../../migrations/016_redis_command_logs.sql")),
];

pub async fn run_migrations(pool: &Pool<Sqlite>) -> Result<(), AppError> {
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        )",
    )
    .execute(pool)
    .await
    .map_err(|e| AppError::internal(format!("创建 schema_migrations 表失败: {e}")))?;

    let applied: Vec<i64> =
        sqlx::query_scalar("SELECT version FROM schema_migrations ORDER BY version")
            .fetch_all(pool)
            .await
            .map_err(|e| AppError::internal(format!("查询已执行迁移失败: {e}")))?;

    if applied.is_empty() {
        let has_connections_table: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='connections')",
        )
        .fetch_one(pool)
        .await
        .map_err(|e| AppError::internal(format!("检测旧数据库失败: {e}")))?;

        if has_connections_table {
            for &(version, _) in MIGRATIONS {
                sqlx::query("INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)")
                    .bind(version)
                    .execute(pool)
                    .await
                    .map_err(|e| {
                        AppError::internal(format!("记录迁移版本 {version} 失败: {e}"))
                    })?;
            }
            return Ok(());
        }
    }

    let applied_set: HashSet<i64> = applied.into_iter().collect();

    for &(version, sql) in MIGRATIONS {
        if applied_set.contains(&version) {
            continue;
        }
        sqlx::query(sql)
            .execute(pool)
            .await
            .map_err(|e| AppError::internal(format!("迁移 {version:03} 执行失败: {e}")))?;

        sqlx::query("INSERT INTO schema_migrations (version) VALUES (?)")
            .bind(version)
            .execute(pool)
            .await
            .map_err(|e| AppError::internal(format!("记录迁移版本 {version} 失败: {e}")))?;
    }

    Ok(())
}
```

- [ ] **Step 2: 运行 `cargo check` 确认编译通过**

Run: `cargo check`
Expected: 编译成功（未使用的 `Row` import 可能有 warning，后续 Task 2 会用到）

- [ ] **Step 3: 提交**

```bash
git add src-tauri/src/db/migrations.rs
git commit -m "feat: add db/migrations.rs with schema_migrations version tracking"
```

---

### Task 2: 注册模块

**Files:**
- Modify: `src-tauri/src/db/mod.rs:1`

- [ ] **Step 1: 在 `mod.rs` 中添加模块声明**

在 `pub mod local;` 后面加一行：

```rust
pub mod migrations;
```

当前 `mod.rs` 内容为：
```rust
pub mod drivers;
pub(crate) mod errors;
pub mod local;
pub mod pool_manager;
pub(crate) mod sql;
```

改为：
```rust
pub mod drivers;
pub(crate) mod errors;
pub mod local;
pub mod migrations;
pub mod pool_manager;
pub(crate) mod sql;
```

- [ ] **Step 2: 运行 `cargo check` 确认编译通过**

Run: `cargo check`
Expected: 编译成功，无新 warning

- [ ] **Step 3: 提交**

```bash
git add src-tauri/src/db/mod.rs
git commit -m "feat: register migrations module in db/mod.rs"
```

---

### Task 3: 精简 `local.rs` 的 `init_with_app_dir()`

**Files:**
- Modify: `src-tauri/src/db/local.rs:66-283`

- [ ] **Step 1: 删除迁移代码，替换为单行调用**

删除 `local.rs` 中第 66-283 行的迁移代码块（从 `// Run migrations` 注释开始，到第 283 行 `}` 结束），替换为：

```rust
        crate::db::migrations::run_migrations(&pool).await?;
```

`init_with_app_dir()` 函数变为：

```rust
    pub async fn init_with_app_dir(app_dir: &Path) -> Result<Self, AppError> {
        if !app_dir.exists() {
            fs::create_dir_all(app_dir).map_err(|e| AppError::internal_with("Database operation failed", e))?;
        }
        let ai_master_key = Self::load_or_create_ai_master_key(&app_dir)?;
        let db_path = app_dir.join("dbpaw.sqlite");
        let db_url = format!("sqlite://{}?mode=rwc", db_path.to_string_lossy());

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect(&db_url)
            .await
            .map_err(|e| AppError::internal_with("Local DB initialization failed", e))?;

        crate::db::migrations::run_migrations(&pool).await?;

        Ok(Self {
            pool,
            ai_master_key,
        })
    }
```

- [ ] **Step 2: 运行 `cargo check` 确认编译通过**

Run: `cargo check`
Expected: 编译成功。可能有 unused import warning（如 `Row`），下一步清理。

- [ ] **Step 3: 清理不再需要的 import**

检查 `local.rs` 顶部的 import，移除不再需要的 `Row` import（如果存在）。当前 `local.rs:11` 有 `use sqlx::{sqlite::SqlitePoolOptions, Pool, Row, Sqlite};`，`Row` 在迁移代码中被间接使用，但精简后可能不再需要。运行 `cargo check` 确认。

如果 `Row` 仍有其他地方使用（如 `list_connections` 中的 `row.try_get`），则保留。

- [ ] **Step 4: 运行 `cargo check` 确认编译通过**

Run: `cargo check`
Expected: 编译成功，无 warning

- [ ] **Step 5: 提交**

```bash
git add src-tauri/src/db/local.rs
git commit -m "refactor: replace 220 lines of migration code with run_migrations() call"
```

---

### Task 4: 精简测试 `make_test_db()`

**Files:**
- Modify: `src-tauri/src/db/local.rs:1165-1203`（`make_test_db` 函数）

- [ ] **Step 1: 替换测试中的迁移代码**

当前 `make_test_db()` 中有 16 行 `include_str!` 的循环（约 1172-1194 行）。将其替换为：

```rust
    async fn make_test_db() -> LocalDb {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("connect sqlite memory db");

        crate::db::migrations::run_migrations(&pool)
            .await
            .expect("apply migrations");

        let mut ai_master_key = [0u8; 32];
        rand::rng().fill_bytes(&mut ai_master_key);

        LocalDb {
            pool,
            ai_master_key,
        }
    }
```

- [ ] **Step 2: 运行 `cargo check` 确认编译通过**

Run: `cargo check`
Expected: 编译成功

- [ ] **Step 3: 运行测试确认功能正确**

Run: `cargo test --lib -- local::tests`
Expected: 所有测试通过

- [ ] **Step 4: 提交**

```bash
git add src-tauri/src/db/local.rs
git commit -m "refactor: simplify make_test_db() to use run_migrations()"
```

---

### Task 5: 最终验证

**Files:**
- 无新增/修改文件

- [ ] **Step 1: 运行完整的 `cargo check`**

Run: `cargo check`
Expected: 编译成功，无 error，无 warning

- [ ] **Step 2: 运行完整的测试套件**

Run: `cargo test --lib`
Expected: 所有测试通过

- [ ] **Step 3: 运行 `cargo fmt --check` 确认格式**

Run: `cargo fmt --check -- src-tauri/src/db/migrations.rs src-tauri/src/db/local.rs src-tauri/src/db/mod.rs`
Expected: 无格式问题（或运行 `cargo fmt` 修复后提交）

- [ ] **Step 4: 最终提交（如有格式修复）**

```bash
git add src-tauri/src/db/migrations.rs src-tauri/src/db/local.rs src-tauri/src/db/mod.rs
git commit -m "chore: apply rustfmt to migration system changes"
```
