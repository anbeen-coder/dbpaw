# AppError 收敛设计

## 目标

将后端错误体系统一收敛到 `AppError`，消除旧的 tagged string 协议（`[QUERY_ERROR]`、`[VALIDATION_ERROR]` 等），实现：
- 新代码禁止返回 tagged string
- 所有驱动内部方法返回 `DriverResult<T>`（即 `Result<T, AppError>`）
- `conn_failed_error()` 直接返回 `AppError`
- Tauri command 边界统一用 `.map_err(String::from)` 转换

## 当前状态

- `AppError` 定义完善：`src-tauri/src/error.rs:36`，有结构化变体和 numeric codes
- `DriverResult<T> = Result<T, AppError>`：`src-tauri/src/db/drivers/traits.rs:9`
- `conn_failed_error()` 返回 `AppError`：`src-tauri/src/db/errors/connection.rs:4` ✅
- `From<String> for AppError` 兼容垫片：`src-tauri/src/error.rs:105-128`（保留中）
- 前端 `parseError()` 解析 `[ERR-XXXX]` 格式：`src/lib/errors.ts:19`

## 已完成

### 阶段一：`conn_failed_error()` 改为返回 `AppError` ✅

`db/errors/connection.rs` — 直接返回 `AppError::conn_failed(raw, hint)`。

### 阶段二：驱动层迁移 ✅

所有驱动内部方法已迁移到 `DriverResult<T>`，tagged strings 已替换为 `AppError` 构造函数：

| 驱动 | 状态 | tagged strings | 方法数 |
|------|------|---------------|--------|
| postgres | ✅ | 0 | 1 |
| mysql | ✅ (之前已完成) | 0 | 0 |
| mssql | ✅ (之前已完成) | 0 | 0 |
| sqlite | ✅ | 28 | 5 |
| oracle | ✅ | 46 | 1 |
| mongodb | ✅ | 19 | 9 |
| duckdb | ✅ | 35 | 3 |
| db2 | ✅ | 40 | 3 |
| cassandra | ✅ | 21 | 3 |
| clickhouse | ✅ | 13 | 8 |

标签字符串替换规则：
| 旧标签 | 新构造函数 |
|--------|-----------|
| `[QUERY_ERROR] ...` | `AppError::query_failed(...)` |
| `[VALIDATION_ERROR] ...` | `AppError::validation(...)` |
| `[CONN_FAILED] ...` | `conn_failed_error(...)` 或 `AppError::conn_failed(...)` |
| `[UNSUPPORTED] ...` | `AppError::unsupported(...)` |
| `[NOT_FOUND] ...` | `AppError::not_found(...)` |
| `[REDIS_ERROR] ...` | `AppError::query_failed(...)` |
| `[CASSANDRA_ERROR] ...` | `AppError::query_failed(...)` 或语义化变体 |
| `[MONGODB_ERROR] ...` | 语义化变体（`conn_auth_failed`、`conn_timeout` 等） |
| `[PARSE_ERROR] ...` | `AppError::query_failed(...)` |

### 阶段三：Tauri command 边界 ✅

无需改动。`AppError` 已实现 `From<AppError> for String`，`.map_err(String::from)` 自动调用 `AppError::to_string()` 输出 `[ERR-XXXX] message` 格式。

## 待完成：`From<String> for AppError` 垫片清理

### 垫片说明

`src-tauri/src/error.rs:105-128` 的 `From<String> for AppError` 实现是兼容垫片，解析 tagged strings 并转换为 `AppError` 变体：

```rust
impl From<String> for AppError {
    fn from(err: String) -> Self {
        // [VALIDATION_ERROR] → AppError::validation
        // [UNSUPPORTED]      → AppError::unsupported
        // [REDIS_ERROR]      → AppError::query_failed
        // [QUERY_ERROR]      → AppError::query_failed
        // [CONN_FAILED]      → AppError::conn_failed
        // [NOT_FOUND]        → AppError::not_found
        // 其他               → AppError::internal
    }
}
```

### 保留原因

以下非驱动文件仍有 88 处 tagged strings，依赖此垫片：

| 文件 | tagged strings | 说明 |
|------|---------------|------|
| `datasources/elasticsearch.rs` | ~40 | Elasticsearch 驱动，未纳入本次迁移 |
| `connection_input/mod.rs` | ~14 | 连接输入验证 |
| `commands/query.rs` | 7 | 查询命令 |
| `commands/connection.rs` | 4 | 连接命令 |
| `commands/mod.rs` | 4 | 命令公共模块（含测试） |
| `commands/transfer/import_plan.rs` | 3 | 导入计划 |
| `db/local.rs` | 3 | 本地数据库 |
| `commands/metadata.rs` | 2 | 元数据命令 |
| `commands/mongodb.rs` | 1 | MongoDB 命令 |
| `commands/redis/tests.rs` | ~10 | Redis 测试 |

### 后续迁移任务

创建独立 PR 迁移上述文件，完成后删除垫片：

1. `datasources/elasticsearch.rs` — 最大，优先级高
2. `connection_input/mod.rs` — 连接验证
3. `commands/*` — 各命令文件
4. `db/local.rs` — 本地数据库
5. 删除 `From<String> for AppError` 和对应测试
6. 更新 `AGENTS.md`

## 验证

- 每改一个驱动跑一次 `cargo check` ✅
- 前端 `parseError()` 无需改动，`[ERR-XXXX]` 格式不变 ✅
- 垫片保留期间，新旧错误格式均能正确解析
