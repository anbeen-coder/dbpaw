# 数据库支持分析报告

> 最后更新: 2026-06-22
> 详细能力矩阵见 [capability-matrix.md](./capability-matrix.md)

## 当前已支持的16种数据库

### SQL数据库 (12种)

| 数据库 | 类型 | 流行度排名 | 状态 |
|--------|------|-----------|------|
| PostgreSQL | 关系型 | #4 | ✅ 完整支持 |
| MySQL | 关系型 | #2 | ✅ 完整支持 |
| MariaDB | 关系型 | #12 | ✅ 完整支持 |
| TiDB | 分布式SQL | #20+ | ✅ 支持 |
| StarRocks | 分析型 | 新兴 | ⚠️ 基本支持（导入不支持） |
| Apache Doris | 分析型 | 新兴 | ⚠️ 基本支持（导入不支持） |
| SQLite | 嵌入式 | #9 | ✅ 支持 |
| DuckDB | 分析型 | 新兴 | ✅ 支持 |
| ClickHouse | 列式 | #17 | ⚠️ 预览版（只读导入） |
| SQL Server | 关系型 | #3 | ✅ 完整支持 |
| Oracle | 关系型 | #1 | ✅ 支持 |
| IBM Db2 | 关系型 | #8 | ✅ 支持（Linux/Win/macOS x86_64） |

### 非SQL数据源 (4种)

| 数据库 | 类型 | 流行度排名 | 状态 |
|--------|------|-----------|------|
| Redis | 键值型 | #6 | ✅ 完整支持（Cluster/Sentinel） |
| Elasticsearch | 搜索引擎 | #7 | 🧪 实验性（Index 浏览 + 文档 CRUD） |
| MongoDB | 文档型 | #5 | 🧪 实验性（Collection 浏览 + 文档分页） |
| Cassandra | 宽列型 | #11 | 🧪 实验性（CQL 查询 + Keyspace 浏览） |

---

## 按流行度推荐添加的数据库

> 以下为尚未支持的高流行度数据库。已实现的（Db2、Cassandra）已从列表中移除。

### 第一梯队 (高流行度，强烈推荐)

1. **DynamoDB** - AWS NoSQL数据库
   - 流行度排名: #13
   - 应用场景: 云原生、AWS生态
   - 实现难度: 高 (需要AWS SDK)

### 第二梯队 (中等流行度，建议支持)

2. **Couchbase** - 文档数据库
   - 流行度排名: #14
   - 应用场景: 缓存、文档存储
   - 实现难度: 中等

3. **Neo4j** - 图数据库
   - 流行度排名: #15
   - 应用场景: 社交网络、推荐系统
   - 实现难度: 中等 (有Rust驱动 `neo4j`)

4. **InfluxDB** - 时序数据库
   - 流行度排名: #16
   - 应用场景: 监控、物联网、时序数据
   - 实现难度: 低 (有Rust驱动 `influxdb`)

### 第三梯队 (新兴/云数据库，可选支持)

5. **CockroachDB** - 分布式SQL数据库
   - 流行度排名: #19
   - 应用场景: 分布式系统、云原生
   - 实现难度: 低 (PostgreSQL兼容)

6. **Snowflake** - 云数据仓库
   - 流行度排名: #18
   - 应用场景: 数据分析、BI
   - 实现难度: 高 (需要专用协议)

7. **PlanetScale** - MySQL兼容的无服务器数据库
   - 流行度排名: 新兴
   - 应用场景: 现代Web应用
   - 实现难度: 低 (MySQL兼容)

8. **Neon** - 无服务器PostgreSQL
   - 流行度排名: 新兴
   - 应用场景: 现代Web应用
   - 实现难度: 低 (PostgreSQL兼容)

---

## 实现建议

### 优先级排序

1. **InfluxDB** - 时序数据库需求大，实现简单
2. **Neo4j** - 图数据库独特场景
3. **CockroachDB** - 分布式SQL，PostgreSQL兼容
4. **DynamoDB** - AWS生态需求

### 技术考虑

- PostgreSQL兼容的数据库 (CockroachDB, Neon) 可以复用现有PostgreSQL驱动
- MySQL兼容的数据库 (PlanetScale) 可以复用现有MySQL驱动
- 新协议数据库需要开发新驱动

---

## 参考资源

- [DB-Engines 数据库排名](https://db-engines.com/en/ranking)
- [项目数据库驱动目录](../src-tauri/src/db/drivers/)
- [添加新数据库文档](./add-new-db.md)
- [产品能力矩阵](./capability-matrix.md)
