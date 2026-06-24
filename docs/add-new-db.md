# ADD_NEW_DB — DbPaw 新增数据库驱动操作手册

本文档记录新增一个数据库驱动类型时需要修改的全部文件，包含精确路径和改法。

> 适用范围：本手册主体适用于 SQL/表模型数据库。Redis、Elasticsearch、MongoDB、Cassandra 等非 SQL 数据源走独立的数据源能力模型，见 [非 SQL 数据源接入原则](#非-sql-数据源接入原则)。

---

## 术语约定

- `{driver}` — 小写 driver ID，与前端 `DRIVER_IDS` 保持一致（例：`oracle`）
- `{DriverName}` — PascalCase（例：`Oracle`）
- `network` 型 — 通过 host:port 连接（postgres、mysql、mssql、clickhouse 等）
- `file` 型 — 通过本地文件路径连接（sqlite、duckdb）
- `datasource` 型 — 非 SQL 数据源（redis、elasticsearch、mongodb、cassandra），按原生能力模型接入

---

## 架构概览

### 后端 Rust 结构

```
src-tauri/src/db/drivers/
├── mod.rs          ← pub mod 声明 + re-export
├── traits.rs       ← DatabaseDriver trait 定义
├── registry.rs     ← connect() 分发 + is_mysql_family_driver()
├── postgres.rs     ← 各 driver 实现
├── mysql.rs
└── ...
```

- **trait 定义**在 `src-tauri/src/db/drivers/traits.rs`
- **driver 注册**在 `src-tauri/src/db/drivers/registry.rs`（`connect()` match arms）
- **mod 声明**在 `src-tauri/src/db/drivers/mod.rs`
- **错误必须返回 `Result<T, AppError>`**，`AppError` 定义在 `src-tauri/src/error.rs`
- 连接失败错误使用 `conn_failed_error()` 工具函数（`src-tauri/src/db/errors/connection.rs`），提供上下文感知的 hint（TLS、auth、网络等）

### 前端 TypeScript 结构

```
src/lib/driver-registry.tsx   ← DRIVER_IDS + DRIVER_REGISTRY（唯一入口）
src/services/api/             ← 按领域拆分的 API wrapper（core.ts 是唯一调 invoke 的文件）
src/services/commands.ts      ← COMMANDS 常量映射
src/services/mocks/           ← Mock 实现（VITE_USE_MOCK=true 时使用）
```

---

## 非 SQL 数据源接入原则

- 后端不要把非 SQL 数据源伪装成 `DatabaseDriver`，避免实现伪 `list_tables/get_table_data/execute_query`。
- 在 `src-tauri/src/datasources/{driver}.rs` 中定义该数据源的原生模型。
- 在 `src-tauri/src/commands/{driver}.rs` 中暴露专用 Tauri commands，并在 `src-tauri/src/lib.rs` 注册。
- 前端在 `src/lib/driver-registry.tsx` 中设置 `kind`（`kv`、`document`、`search`、`widecolumn`），Sidebar 和主视图按 `kind` 分流。
- 前端 API wrapper 放在 `src/services/api/{driver}.ts`，Mock 放在 `src/services/mocks/{driver}.ts`。
- SQL 的 `SqlEditor`、`TableView`、import/export 和 `sql_execution_logs` 默认不复用于非 SQL 数据源。

已有参考实现：

| 数据源 | 后端 | 前端 API | 前端树配置 |
|--------|------|----------|------------|
| Redis | `src-tauri/src/datasources/redis.rs`、`commands/redis.rs` | `src/services/api/redis.ts` | `createRedisTreeConfig` |
| Elasticsearch | `src-tauri/src/datasources/elasticsearch.rs`、`commands/elasticsearch.rs` | `src/services/api/elasticsearch.ts` | `createElasticsearchTreeConfig` |
| MongoDB | `src-tauri/src/datasources/mongodb.rs`、`commands/mongodb.rs` | `src/services/api/mongodb.ts` | `createMongodbTreeConfig` |
| Cassandra | `src-tauri/src/datasources/cassandra.rs`、`commands/cassandra.rs` | — | `createCassandraTreeConfig` |

---

## Step 1：创建 Rust Driver 文件

**文件：** `src-tauri/src/db/drivers/{driver}.rs`（新建）

参考模板选择：

- **PostgreSQL-like**（独立 schema、SSL CA、sqlx）→ 复制 `postgres.rs`
- **MySQL-like**（共享驱动、MySQL 协议）→ 复制 `mysql.rs`
- **HTTP API 型**（ClickHouse-like）→ 复制 `clickhouse.rs`
- **嵌入式/文件型**（无网络连接）→ 复制 `duckdb.rs`

必须实现 `DatabaseDriver` trait 的**必需方法**（定义见 `src-tauri/src/db/drivers/traits.rs`）：

```rust
#[async_trait]
pub trait DatabaseDriver: Send + Sync {
    fn capabilities(&self) -> DriverCapabilities { DriverCapabilities::empty() }

    // === 必需方法 ===
    async fn test_connection(&self) -> DriverResult<()>;
    async fn list_databases(&self) -> DriverResult<Vec<String>>;
    async fn list_tables(&self, schema: Option<String>) -> DriverResult<Vec<TableInfo>>;
    async fn get_table_structure(&self, schema: String, table: String) -> DriverResult<TableStructure>;
    async fn get_table_metadata(&self, schema: String, table: String) -> DriverResult<TableMetadata>;
    async fn get_table_ddl(&self, schema: String, table: String) -> DriverResult<String>;
    async fn get_table_data(&self, schema: String, table: String, page: i64, limit: i64,
        sort_column: Option<String>, sort_direction: Option<String>,
        filter: Option<String>, order_by: Option<String>, include_total: bool,
    ) -> DriverResult<TableDataResponse>;
    async fn get_table_data_chunk(&self, /* 同 get_table_data 但无 include_total */) -> DriverResult<TableDataResponse>;
    async fn execute_query(&self, sql: String) -> DriverResult<QueryResult>;
    async fn get_schema_overview(&self, schema: Option<String>) -> DriverResult<SchemaOverview>;
    async fn close(&self);

    // === 可选方法（有默认实现，返回 unsupported） ===
    async fn execute_query_with_id(&self, sql: String, query_id: Option<&str>) -> DriverResult<QueryResult>;
    async fn list_routines(&self, schema: Option<String>) -> DriverResult<Vec<RoutineInfo>>;
    async fn list_events(&self, schema: Option<String>) -> DriverResult<Vec<EventInfo>>;
    async fn list_sequences(&self, schema: Option<String>) -> DriverResult<Vec<SequenceInfo>>;
    async fn list_types(&self, schema: Option<String>) -> DriverResult<Vec<TypeInfo>>;
    async fn list_synonyms(&self, schema: Option<String>) -> DriverResult<Vec<SynonymInfo>>;
    async fn list_packages(&self, schema: Option<String>) -> DriverResult<Vec<PackageInfo>>;
    async fn get_routine_ddl(&self, schema: String, name: String, routine_type: String) -> DriverResult<String>;
    async fn get_schema_foreign_keys(&self, database: Option<&str>) -> DriverResult<Vec<SchemaForeignKey>>;
}
```

**关键类型：**
- `DriverResult<T>` = `Result<T, AppError>`（`AppError` 来自 `src-tauri/src/error.rs`）
- `DriverCapabilities` 是 bitflags，用于声明可选能力（`ROUTINES`、`EVENTS`、`SEQUENCES`、`TYPES`、`SYNONYMS`、`PACKAGES`、`FOREIGN_KEYS`、`QUERY_WITH_ID`）

**可选能力子 trait：** 如果 driver 支持额外能力，实现对应的子 trait 并在 `capabilities()` 中返回对应 flag：

```rust
// 例：支持 routines 的 driver
impl RoutineDriver for MyDriver { ... }

fn capabilities(&self) -> DriverCapabilities {
    DriverCapabilities::ROUTINES
}
```

子 trait 列表：`RoutineDriver`、`EventDriver`、`SequenceDriver`、`TypeDriver`、`SynonymDriver`、`PackageDriver`、`ForeignKeyDriver`。

**错误处理规则：**
- 连接失败 → 使用 `conn_failed_error(e)` 工具函数（自动推断 hint）
- 查询失败 → `AppError::query_failed("...")` 或 `AppError::query_failed_with("...", source)`
- 不支持的操作 → `AppError::unsupported("...")`
- **禁止** 使用 `.map_err(String::from)` 在 command 边界

---

## Step 2：注册到 Rust Driver 层

需要改 **3 个文件**：

### 2a. `src-tauri/src/db/drivers/mod.rs` — 添加 mod 声明

```rust
pub mod {driver};
```

### 2b. `src-tauri/src/db/drivers/registry.rs` — 注册 connect 分发

**顶部添加 use：**

```rust
use super::{driver}::{DriverName}Driver;
```

**在 `connect()` match 中添加分支（`_ =>` 之前）：**

```rust
"{driver}" => {
    let driver = {DriverName}Driver::connect(form).await?;
    Ok(Box::new(driver) as Box<dyn DatabaseDriver>)
}
```

**MySQL family 变体：** 如果新 driver 复用 MySQL 协议（如 PolarDB），在 `is_mysql_family_driver()` 中加入：

```rust
pub fn is_mysql_family_driver(driver: &str) -> bool {
    matches!(driver, "mysql" | "mariadb" | "tidb" | "starrocks" | "doris" | "{driver}")
}
```

然后 `connect()` 会自动通过 `driver if is_mysql_family_driver(driver)` 分支复用 `MysqlDriver`。

### 2c. `src-tauri/src/ssh.rs` — SSH 默认端口（仅 network 型）

在 `default_target_port()` 函数的 match 中加入：

```rust
"{driver}" => {PORT},
```

当前结构（第 10-30 行）：

```rust
fn default_target_port(driver: &str) -> i64 {
    if crate::db::drivers::is_mysql_family_driver(driver) {
        return if matches!(driver, "starrocks" | "doris") { 9030 } else { 3306 };
    }
    match driver {
        "mssql" => 1433,
        "oracle" => 1521,
        "db2" => 50000,
        "clickhouse" => 9000,
        "redis" => 6379,
        "elasticsearch" => 9200,
        "mongodb" => 27017,
        "sqlite" => 0,
        // ← 在这里加新 driver
        _ => 5432, // postgres and unknown drivers
    }
}
```

**注意：** file 型 driver 不走 SSH 隧道，但加 `"sqlite" => 0` 同款占位可防止 fallback 到 5432。

---

## Step 3：连接表单校验

**文件：** `src-tauri/src/connection_input/mod.rs`

`normalize_connection_form()` 函数（第 147-248 行）处理所有 driver 的连接参数校验。

### 3a. network 型 — 无需额外修改

第 226 行的 `else if form.host.is_none()` 已覆盖所有未特别处理的 network 型 driver。

### 3b. file 型

在第 203 行的 `matches!` 中加入新 driver：

```rust
if matches!(driver.as_str(), "sqlite" | "duckdb" | "{driver}") {
```

### 3c. MySQL family（支持 host:port 嵌入语法）

第 179 行已通过 `is_mysql_family_driver()` 自动覆盖。如果新 driver 不属于 MySQL family 但也需要 host:port 解析（如 elasticsearch、mongodb），在第 179-182 行的条件中加入：

```rust
if crate::db::drivers::is_mysql_family_driver(&driver)
    || driver == "elasticsearch"
    || driver == "mongodb"
    || driver == "{driver}"  // ← 加在这里
{
```

---

## Step 4：import/export 事务语法（如支持 import）

**文件：** `src-tauri/src/commands/transfer/import_plan.rs`（`import_transaction_sql` 函数，第 36-62 行）

根据 driver 支持的事务语法加入 match arm：

```rust
// BEGIN / COMMIT / ROLLBACK
"postgres" | "sqlite" | "duckdb" | "{driver}" => Ok(("BEGIN", "COMMIT", "ROLLBACK")),

// START TRANSACTION（MySQL 系）
"mysql" | "mariadb" | "tidb" => Ok(("START TRANSACTION", "COMMIT", "ROLLBACK")),

// 不支持 import
"{driver}" => Err(AppError::unsupported(format!(
    "Driver {} does not support transactional SQL import in this flow",
    original_driver
))),
```

**注意：** `starrocks`、`doris`、`clickhouse` 当前不支持 import，会返回 `AppError::unsupported`。

---

## Step 5：create_database 支持（如支持）

**文件：** `src-tauri/src/commands/connection/create_database.rs`

### 5a. 从"不支持"排除列表移除（file 型专用）

第 284 行：

```rust
if matches!(driver.as_str(), "sqlite" | "duckdb") {  // 不要在此加 network 型 driver
```

### 5b. 添加建库 SQL 构建函数

在文件中添加专用函数（参考已有的 `build_mysql_create_database_sql`、`build_postgres_create_database_sql` 等）：

```rust
fn build_{driver}_create_database_sql(
    payload: &CreateDatabasePayload,
    db_name: &str,
) -> Result<String, AppError> {
    // 实现建库 SQL
}
```

### 5c. 在 `create_database_by_id` 和 `create_database_by_id_direct` 的 match 中加入分支

```rust
"{driver}" => {
    let sql = build_{driver}_create_database_sql(&payload, &db_name)?;
    crate::commands::execute_with_retry(&state, id, None, |driver| {
        let sql_clone = sql.clone();
        async move { driver.execute_query(sql_clone).await.map(|_| ()) }
    })
    .await
}
```

---

## Step 6：前端 driver-registry.tsx（必改）

**文件：** `src/lib/driver-registry.tsx`

### 6a. DRIVER_IDS（第 29-46 行）

在 `as const` 数组中加入新 driver ID：

```typescript
const DRIVER_IDS = [
  "postgres",
  "mysql",
  // ...
  "{driver}", // ← 加在这里
] as const;
```

### 6b. DRIVER_REGISTRY（第 92-392 行）

在数组末尾（`];` 之前）加入一条 `DriverConfig` 记录：

```typescript
{
  id: "{driver}",
  label: "DisplayName",
  kind: "sql",                    // "sql" | "kv" | "document" | "search" | "widecolumn"
  defaultPort: 1234,              // file 型填 null
  isFileBased: false,             // file 型填 true
  isMysqlFamily: false,           // MySQL 协议兼容时填 true
  isDatabaseScoped: false,        // MySQL/ClickHouse 等以 database 为顶层作用域时填 true
  defaultSchema: "public",        // file 型通常填 "main"
  unqualifiedSchemas: [],         // 不需要 schema 前缀的 schema 列表，如 ["", "main", "public"]
  identifierQuote: "double",      // "double" → "name" | "backtick" → `name` | "bracket" → [name]
  supportsSSLCA: false,           // 支持 SSL CA 证书验证时填 true
  supportsSchemaBrowsing: false,  // 支持 schema 列表时填 true
  supportsCreateDatabase: true,   // 支持 CREATE DATABASE 时填 true
  importCapability: "supported",  // "supported" | "read_only_not_supported" | "unsupported"
  icon: () => renderSimpleIcon(si{DriverName}),  // 或 renderLocalIcon("/icons/db/{driver}.svg")
  treeConfig: (callbacks) => createSqlTreeConfig(callbacks, { supportsSchemaNode: true }, "{driver}"),
},
```

**图标规则：**
- 优先从 `simple-icons` 导入：`import { si{DriverName} } from "simple-icons";`
- 无 simple-icons 时用 `renderLocalIcon("/icons/db/{driver}.svg")` 或 `<Server className="w-4 h-4" />`

**这一个文件改完，以下前端逻辑自动生效（无需再改）：**
- `src/services/commands.ts` — `Driver` 类型由 `DRIVER_IDS` 推导
- `src/lib/connection-form/rules.ts` — MySQL family / file-based 数组
- `src/components/business/Sidebar/connection-list/helpers.tsx` — 图标映射
- `src/components/business/Sidebar/ConnectionList.tsx` — SelectItem、默认 port、SSL/file 条件渲染
- `quoteIdentifierForDriver()`、`getQualifiedTableName()` 等工具函数

---

## Step 7：i18n（仅 file 型 driver）

**文件：** `src/lib/i18n/locales/en.ts`、`zh.ts`（以及 `ja.ts` 如有）

file 型 driver 需要在 locale 文件里加"文件路径"标签和占位符。

在 `en.ts` 中搜索 `duckdbFilePath` 附近加入：

```typescript
{driver}FilePath: "{DriverName} File Path",
{driver}Path: "/path/to/db.{driver}",
```

zh.ts 同理加入对应翻译。

---

## Step 8：Cargo.toml 依赖

**文件：** `src-tauri/Cargo.toml`

按驱动依赖类型选择：

| 类型                           | 做法                                                      |
| ------------------------------ | --------------------------------------------------------- |
| 使用 sqlx（postgres/mysql 系） | 在 sqlx `features` 列表加 driver 名                       |
| 独立 crate（如 DuckDB）        | 加一行 `{driver} = { version = "x.y", features = [...] }` |
| HTTP 协议（如 ClickHouse）     | 加 HTTP client 依赖（参考 clickhouse.rs 的 import）       |
| 微软协议（MSSQL）              | 使用 `tiberius`（已有，无需重复加）                       |

---

## Step 9：集成测试骨架

**新建 3 个文件**（参考同类 driver 复制修改）：

```
src-tauri/tests/common/{driver}_context.rs    ← testcontainers 容器配置
src-tauri/tests/{driver}_integration.rs       ← DatabaseDriver trait 方法直接测试
src-tauri/tests/{driver}_command_integration.rs  ← Tauri command 层测试
```

在 `src-tauri/tests/common/mod.rs` 中加入模块声明：

```rust
pub mod {driver}_context;
```

更新 `scripts/test-integration.sh` 加入新 driver（搜索其他 driver 名的赋值行）。

**可选：** 如果 driver 支持多语句事务，创建：

```
src-tauri/tests/{driver}_stateful_command_integration.rs
```

参考 `postgres_stateful_command_integration.rs`。

**注意：** 集成测试标记 `#[ignore]`，需要 `IT_DB={driver}` 环境变量和 Docker 才能运行。Oracle 测试还需要本地安装 Oracle Instant Client。

---

## 验证 Checklist

每次新增 driver 后执行：

```bash
# 必须全部通过
bun run typecheck
bun run lint
cargo check --manifest-path src-tauri/Cargo.toml

# 有条件时执行
bun run test:unit
IT_DB={driver} bun run test:integration   # 需要 Docker
```

快速一键验证：

```bash
bun run test:smoke   # typecheck + lint + unit tests
```

---

## 常见陷阱

| 陷阱                                                          | 后果                                                  | 解法                                               |
| ------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| 忘记改 `ssh.rs` 默认端口                                      | SSH 隧道目标端口错误（fallback 到 5432）              | Step 2c                                            |
| file 型 driver 未加入 `connection_input` 的 matches!          | 校验报"host cannot be empty"而不是"file path"         | Step 3b                                            |
| 前端 `DRIVER_IDS` 加了但 `DRIVER_REGISTRY` 没加               | TypeScript 编译报错，图标/port 逻辑异常               | Step 6                                             |
| 图标使用了不存在的 simple-icons 导出名                        | 前端运行时崩溃                                        | 验证 `si{DriverName}` 是否存在于 `simple-icons` 包 |
| 忘记改 `import_transaction_sql`                               | import 功能对新 driver 返回"不支持"或使用错误事务语法 | Step 4                                             |
| MySQL family 新 driver 未加入 `is_mysql_family_driver()`      | `connect()` 不走 MySQL 分支，host:port 不被解析       | Step 2b                                            |
| i18n 只改了 en.ts                                             | 中文/日文界面显示 key 字符串而非翻译文本              | Step 7 所有 locale 文件都要改                      |
| 错误用了 `.map_err(String::from)` 而非 `AppError`             | 前端收不到结构化错误码和 hint                         | 始终返回 `Result<T, AppError>`                     |
| 连接失败没用 `conn_failed_error()`                            | 用户看到原始错误信息，缺少上下文 hint                 | 连接失败统一用 `conn_failed_error(e)`              |

---

## 文件改动汇总

| 文件                                              | 类型 | 条件                    |
| ------------------------------------------------- | ---- | ----------------------- |
| `src-tauri/src/db/drivers/{driver}.rs`            | 新建 | 必须                    |
| `src-tauri/src/db/drivers/mod.rs`                 | 改   | 必须（1处：pub mod）    |
| `src-tauri/src/db/drivers/registry.rs`            | 改   | 必须（2处：use + match）|
| `src-tauri/src/ssh.rs`                            | 改   | network 型              |
| `src-tauri/src/connection_input/mod.rs`           | 改   | file 型或特殊 network 型|
| `src-tauri/src/commands/transfer/import_plan.rs`  | 改   | 支持 import 时          |
| `src-tauri/src/commands/connection/create_database.rs` | 改 | 支持 create database 时 |
| `src-tauri/Cargo.toml`                            | 改   | 必须                    |
| `src/lib/driver-registry.tsx`                     | 改   | 必须（前端唯一入口）    |
| `src/lib/i18n/locales/en.ts`                      | 改   | file 型                 |
| `src/lib/i18n/locales/zh.ts`                      | 改   | file 型                 |
| `src-tauri/tests/common/{driver}_context.rs`      | 新建 | 集成测试                |
| `src-tauri/tests/{driver}_integration.rs`         | 新建 | 集成测试                |
| `src-tauri/tests/{driver}_command_integration.rs` | 新建 | 集成测试                |
| `src-tauri/tests/common/mod.rs`                   | 改   | 集成测试                |
| `scripts/test-integration.sh`                     | 改   | 集成测试                |
