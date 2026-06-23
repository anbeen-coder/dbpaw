# DbPaw 产品能力矩阵

> 最后验证日期: 2026-06-22
> 验证来源: `src-tauri/src/db/drivers/` (后端)、`src/lib/driver-registry.tsx` (前端)、`src/lib/tree-adapters/` (UI)

---

## 状态定义

| 符号 | 含义 | 判定标准 |
|------|------|----------|
| ✅ 完成 | 可用于生产 | 全部核心方法实现，前端完整集成 |
| ⚠️ 半完成 | 基本可用 | 核心连接/查询可用，但部分可选功能缺失 |
| 🧪 实验性 | 谨慎使用 | 能连上但功能有限，API 不稳定 |
| ❌ 不支持 | 无实现 | 无 driver 或无前端集成 |

---

## 总览矩阵

| 数据库 | 类型 | 核心查询 | 导入导出 | Schema 管理 | 高级对象 | 连接安全 | 辅助功能 |
|--------|------|----------|----------|-------------|----------|----------|----------|
| PostgreSQL | 关系型 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| MySQL | 关系型 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| MariaDB | 关系型 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| TiDB | 分布式 SQL | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| StarRocks | 分析型 | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ |
| Doris | 分析型 | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ |
| SQLite | 嵌入式 | ✅ | ✅ | ✅ | ⚠️ | ❌ | ✅ |
| DuckDB | 分析型 | ✅ | ✅ | ✅ | ⚠️ | ❌ | ✅ |
| ClickHouse | 列式 | ⚠️ | ⚠️ | ✅ | ❌ | ❌ | ✅ |
| SQL Server | 关系型 | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Oracle | 关系型 | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| IBM Db2 | 关系型 | ✅ | ✅ | ✅ | ⚠️ | ❌ | ✅ |
| Redis | 键值型 | ⚠️ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Elasticsearch | 搜索引擎 | ⚠️ | ⚠️ | ❌ | ❌ | ✅ | ❌ |
| MongoDB | 文档型 | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Cassandra | 宽列型 | ⚠️ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 核心查询

| 子功能 | PG | MySQL | Maria | TiDB | Star | Doris | SQLite | Duck | CH | MSSQL | Oracle | Db2 | Redis | ES | Mongo | Cass |
|--------|-----|-------|-------|------|------|-------|--------|------|-----|-------|--------|-----|-------|-----|-------|------|
| 连接管理 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SQL/CQL 执行 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| 数据分页 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 列排序 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| 条件筛选 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ⚠️ |
| DDL 预览 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ⚠️ | ✅ |
| 多结果集 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 查询取消 | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Saved Queries | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |

**说明:**
- Redis: 支持原生命令执行 (`executeRaw`)，非 SQL
- Elasticsearch: 支持 DSL JSON 查询和文档搜索，非 SQL
- MongoDB: 支持 JSON 命令 (`{"find": ...}`)，非 SQL
- Cassandra: 支持 CQL 查询
- ClickHouse: `QUERY_WITH_ID` flag 已设置但实现与普通查询相同，无真正取消能力
- MongoDB DDL: 返回 JSON 格式的 collection 元数据，非 CREATE 语句
- Cassandra 筛选: 忽略 filter 参数（需 ALLOW FILTERING）

---

## 导入导出

| 子功能 | PG | MySQL | Maria | TiDB | Star | Doris | SQLite | Duck | CH | MSSQL | Oracle | Db2 | Redis | ES | Mongo | Cass |
|--------|-----|-------|-------|------|------|-------|--------|------|-----|-------|--------|-----|-------|-----|-------|------|
| CSV 导出 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| JSON 导出 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| SQL 导出 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 整库导出 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| SQL 文件导入 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 文档批量导入 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |

**说明:**
- StarRocks / Doris: `importCapability` 标记为 `unsupported`
- ClickHouse: `importCapability` 标记为 `read_only_not_supported`
- Elasticsearch: 支持 `exportDocuments` / `importDocuments`（基于文件的批量操作）

---

## Schema 管理

| 子功能 | PG | MySQL | Maria | TiDB | Star | Doris | SQLite | Duck | CH | MSSQL | Oracle | Db2 | Redis | ES | Mongo | Cass |
|--------|-----|-------|-------|------|------|-------|--------|------|-----|-------|--------|-----|-------|-----|-------|------|
| 可视化建表 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 可视化改表 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 索引管理 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Schema 浏览 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 创建数据库 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| 外键关系 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

**说明:**
- Schema 浏览: 仅 PostgreSQL、SQL Server、Oracle、Db2 支持 schema 节点
- MySQL 系列: 数据库级浏览（无 schema 节点），但建表/改表/索引完整支持
- ClickHouse: 无外键支持（ClickHouse 本身不支持外键）
- DuckDB: 无外键元数据查询（`ForeignKeyDriver` 未实现）
- Cassandra: 支持创建/删除 Keyspace

---

## 高级对象浏览

| 子功能 | PG | MySQL | Maria | TiDB | Star | Doris | SQLite | Duck | CH | MSSQL | Oracle | Db2 | Redis | ES | Mongo | Cass |
|--------|-----|-------|-------|------|------|-------|--------|------|-----|-------|--------|-----|-------|-----|-------|------|
| 存储过程/函数 | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | ✅ | ⚠️ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 事件 | ❌ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 序列 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 自定义类型 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 同义词 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 包 (Packages) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 物化视图 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**说明:**
- TiDB/StarRocks/Doris: 使用 MySQL driver，routine 浏览依赖 MySQL 兼容性，实际可用性取决于具体版本
- Oracle: `RoutineDriver` 未实现（Oracle 的 procedure/function 浏览缺失），但 `PackageDriver` 完整
- ClickHouse: 支持物化视图浏览（通过 `MaterializedView` 节点类型）
- MSSQL: `SynonymDriver` 是 MSSQL 独有实现

---

## 连接安全

| 子功能 | PG | MySQL | Maria | TiDB | Star | Doris | SQLite | Duck | CH | MSSQL | Oracle | Db2 | Redis | ES | Mongo | Cass |
|--------|-----|-------|-------|------|------|-------|--------|------|-----|-------|--------|-----|-------|-----|-------|------|
| SSH 隧道 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SSL/TLS CA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| SSL 基础 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**说明:**
- 文件型数据库 (SQLite, DuckDB): 无网络连接，不适用 SSH/SSL
- Oracle / Cassandra: SSH 隧道在 driver 内部处理（非透明隧道层）
- MongoDB: 支持 TLS/SSL + 可选 CA 证书验证

---

## 辅助功能

| 子功能 | PG | MySQL | Maria | TiDB | Star | Doris | SQLite | Duck | CH | MSSQL | Oracle | Db2 | Redis | ES | Mongo | Cass |
|--------|-----|-------|-------|------|------|-------|--------|------|-----|-------|--------|-----|-------|-----|-------|------|
| AI 助手 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| MCP Server | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| ER 图 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 数据库文档生成 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**说明:**
- AI 助手和 MCP Server 是连接级功能，对所有数据库通用
- ER 图仅对 SQL 系数据库可用（依赖表结构和外键关系）
- 数据库文档生成: 所有数据库均未实现

---

## 非 SQL 数据源特殊能力

### Redis

| 能力 | 状态 |
|------|------|
| Key 浏览（Scan） | ✅ |
| String 操作 | ✅ |
| Hash 操作 | ✅ |
| List 操作 | ✅ |
| Set 操作 | ✅ |
| Sorted Set 操作 | ✅ |
| Stream 操作 | ✅ |
| JSON 操作 | ✅ |
| Bitmap / HyperLogLog / Geo | ✅ |
| 原生命令执行 | ✅ |
| Server Info / Config | ✅ |
| Cluster / Sentinel | ✅ |
| 创建 Key | ✅ |

### Elasticsearch

| 能力 | 状态 |
|------|------|
| Index 浏览 | ✅ |
| Index 映射查看 | ✅ |
| 文档搜索 | ✅ |
| 文档 CRUD | ✅ |
| 批量导入/导出 | ✅ |
| Index 生命周期管理 | ✅ |
| 原始 HTTP 请求 | ✅ |

### MongoDB

| 能力 | 状态 |
|------|------|
| Database / Collection 浏览 | ✅ |
| 文档浏览（分页） | ✅ |
| Schema 推断（采样） | ✅ |
| JSON 命令执行 | ⚠️ |
| Collection 创建/删除 | ✅ |
| 文档 CRUD | ❌ |
| Aggregation Pipeline | ❌ |

### Cassandra

| 能力 | 状态 |
|------|------|
| Keyspace / Table 浏览 | ✅ |
| CQL 查询执行 | ✅ |
| DDL 生成（合成） | ✅ |
| Cassandra 元数据 | ✅ |
| Keyspace 创建/删除 | ✅ |
| 表截断 | ✅ |

---

## Driver 实现详情

| Driver | 文件 | 平台限制 | 连接方式 |
|--------|------|----------|----------|
| PostgreSQL | `postgres/` | 无 | 原生 (tokio-postgres) |
| MySQL | `mysql/` | 无 | 原生 (sqlx) |
| MariaDB | `mysql/` (共享) | 无 | 同 MySQL |
| TiDB | `mysql/` (共享) | 无 | 同 MySQL |
| StarRocks | `mysql/` (共享) | 无 | 同 MySQL |
| Doris | `mysql/` (共享) | 无 | 同 MySQL |
| SQLite | `sqlite/` | 无 | 原生 (rusqlite) |
| DuckDB | `duckdb/` | 无 | 原生 (duckdb-rs) |
| ClickHouse | `clickhouse/` | 无 | HTTP/REST (reqwest) |
| SQL Server | `mssql/` | 无 | 原生 (tiberius) |
| Oracle | `oracle.rs` | 无 | 原生 (oracle) |
| IBM Db2 | `db2/` | Linux/Win/macOS x86_64 | 原生 (odbc) |
| Redis | 独立模块 | 无 | 原生 (redis-rs) |
| Elasticsearch | 独立模块 | 无 | HTTP/REST |
| MongoDB | `mongodb.rs` | 无 | 原生 (mongodb) |
| Cassandra | `cassandra.rs` | 无 | 原生 (scylla) |
