# Local SQLite Migration System

## 问题

`src-tauri/src/db/local.rs:52-283` 中 `init_with_app_dir()` 手写了 16 段迁移逻辑，每段都有独立的条件检查（column exists、table exists、index exists）。新增迁移需要同时修改两处：`local.rs` 和测试中的 `make_test_db()`。代码膨胀且容易遗漏。

## 目标

- 将迁移系统独立为 `db/migrations.rs`
- 用 `schema_migrations` 表记录已执行的版本
- `LocalDb::init()` 只调用 `run_migrations(&pool)`
- 新增迁移只改 `migrations.rs` 一处

## 设计

### 模块结构

```
src-tauri/src/db/
├── migrations.rs    ← 新增
├── local.rs         ← 精简 init_with_app_dir()
├── mod.rs           ← 增加 pub mod migrations;
├── drivers/
├── errors/
├── pool_manager.rs
├── pool.rs
└── sql/
```

### `schema_migrations` 表

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 迁移注册

编译时通过 `include_str!` 嵌入所有迁移 SQL：

```rust
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
```

新增迁移的流程：
1. 在 `migrations/` 下加 SQL 文件
2. 在 `MIGRATIONS` 数组追加一行 `(17, include_str!(...))`
3. 完成

### `run_migrations` 执行逻辑

```rust
pub async fn run_migrations(pool: &Pool<Sqlite>) -> Result<(), AppError> {
    // 1. 创建版本表（如果不存在）
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        )"
    )
    .execute(pool)
    .await
    .map_err(|e| AppError::internal(format!("创建 schema_migrations 表失败: {e}")))?;

    // 2. 查询已执行的版本
    let applied: Vec<i64> = sqlx::query_scalar("SELECT version FROM schema_migrations ORDER BY version")
        .fetch_all(pool)
        .await
        .map_err(|e| AppError::internal(format!("查询已执行迁移失败: {e}")))?;

    // 3. 如果表为空，检测是否为旧用户升级
    if applied.is_empty() {
        let has_connections_table: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='connections')"
        )
        .fetch_one(pool)
        .await
        .map_err(|e| AppError::internal(format!("检测旧数据库失败: {e}")))?;

        if has_connections_table {
            // 旧用户：将所有迁移标记为已执行，不实际运行
            for &(version, _) in MIGRATIONS {
                sqlx::query("INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)")
                    .bind(version)
                    .execute(pool)
                    .await
                    .map_err(|e| AppError::internal(format!("记录迁移版本 {version} 失败: {e}")))?;
            }
            return Ok(());
        }
    }

    // 4. 正常流程：执行未执行的迁移
    let applied_set: std::collections::HashSet<i64> = applied.into_iter().collect();

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

### 向后兼容

- `schema_migrations` 表为空 + `connections` 表存在 → 旧用户升级 → 跳过所有迁移，只记录版本号
- `schema_migrations` 表为空 + `connections` 表不存在 → 全新安装 → 正常执行所有迁移
- `schema_migrations` 有记录 → 正常流程 → 只执行未记录的迁移

### `local.rs` 的改动

`init_with_app_dir()` 中 220 行迁移代码（67-283）替换为一行：

```rust
crate::db::migrations::run_migrations(&pool).await?;
```

### 测试 `make_test_db()` 的改动

16 行 `include_str!` 循环替换为：

```rust
crate::db::migrations::run_migrations(&pool).await.expect("apply migrations");
```

### 009 号迁移的处理

009 号迁移（`ai_provider_type_relaxed`）的 SQL 本身是幂等的（`DROP IF EXISTS` / `CREATE IF NOT EXISTS`）。在新系统中按普通迁移处理，执行一次后记录版本号，不再重复执行。幂等 SQL 作为安全兜底。

## 范围

- 新增：`src-tauri/src/db/migrations.rs`
- 修改：`src-tauri/src/db/local.rs`（精简 init_with_app_dir 和 make_test_db）
- 修改：`src-tauri/src/db/mod.rs`（增加 pub mod migrations）
- 不动：`src-tauri/migrations/` 下的 16 个 SQL 文件保持原样
