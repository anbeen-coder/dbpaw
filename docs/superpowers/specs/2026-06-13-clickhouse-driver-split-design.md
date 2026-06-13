# ClickHouse Driver 模块化拆分设计

## 概述

将单文件的 ClickHouse driver (`clickhouse.rs`，约1227行) 拆分为模块化结构，以提高可维护性。拆分将遵循 MySQL、Postgres、SQLite 等已拆分 driver 的现有模式。

## 目标

1. **提高可维护性**：将大文件拆分为更小、更专注的模块，便于理解和修改
2. **遵循现有模式**：与 MySQL、Postgres、SQLite 等已拆分的 driver 保持一致
3. **保持向后兼容性**：拆分是内部重构，不影响外部调用者
4. **添加单元测试**：为每个新模块添加单元测试，确保独立功能正确

## 当前状态

- **文件位置**：`src-tauri/src/db/drivers/clickhouse.rs`
- **文件大小**：约1227行
- **主要结构体**：`ClickHouseDriver`
- **实现的 trait**：`DatabaseDriver`

## 设计方案

### 模块结构

```
src-tauri/src/db/drivers/clickhouse/
├── mod.rs           # 模块导出和 ClickHouseDriver 结构体定义
├── connection.rs    # 连接配置、HTTP 客户端、SSH 隧道管理
├── metadata.rs      # 表结构、元数据、DDL、schema 概览
├── query.rs         # 查询执行、多语句处理、结果格式化
├── table_data.rs    # 分页数据获取、排序、过滤
└── helpers.rs       # 辅助函数（quote_ident, quote_literal 等）
```

### 模块职责划分

#### 1. `mod.rs` - 模块导出和结构体定义

**包含：**
- `ClickHouseDriver` 结构体定义
- `ClickHouseConfig` 结构体
- `ClickHouseMeta` 结构体
- `ClickHouseJsonResponse` 结构体
- `ClickHouseSummary` 结构体
- `ClickHouseRawResponse` 结构体
- 模块导出声明（`pub mod connection; pub mod metadata;` 等）
- `DatabaseDriver` trait 实现（委托给各模块）

**行数估计：** ~100行

#### 2. `connection.rs` - 连接管理

**包含：**
- `build_config()` 函数
- `ClickHouseDriver::connect()` 方法
- `ClickHouseDriver::execute_raw()` 方法
- `ClickHouseDriver::execute_json()` 方法
- `ClickHouseDriver::kill_query()` 方法
- `parse_summary_header()` 函数

**行数估计：** ~150行

#### 3. `metadata.rs` - 元数据查询

**包含：**
- `ClickHouseDriver::estimate_total_rows()` 方法
- `ClickHouseDriver::query_table_extra()` 方法
- `DatabaseDriver::list_databases()` 实现
- `DatabaseDriver::list_tables()` 实现
- `DatabaseDriver::get_table_structure()` 实现
- `DatabaseDriver::get_table_metadata()` 实现
- `DatabaseDriver::get_table_ddl()` 实现
- `DatabaseDriver::get_schema_overview()` 实现
- `extract_ttl_expr()` 函数
- `normalize_optional_sql_expr()` 函数

**行数估计：** ~350行

#### 4. `query.rs` - 查询执行

**包含：**
- `DatabaseDriver::execute_query()` 实现
- `DatabaseDriver::execute_query_with_id()` 实现
- `infer_insert_values_row_count()` 函数
- `raw_text_to_query_result()` 函数
- `has_format_clause()` 函数
- `is_json_format()` 函数
- `ensure_json_format()` 函数

**行数估计：** ~300行

#### 5. `table_data.rs` - 表数据查询

**包含：**
- `DatabaseDriver::get_table_data()` 实现
- `DatabaseDriver::get_table_data_chunk()` 实现

**行数估计：** ~100行

#### 6. `helpers.rs` - 辅助函数

**包含：**
- `quote_ident()` 函数
- `quote_literal()` 函数
- `table_ref()` 函数
- `trim_trailing_semicolon()` 函数
- `value_to_bool()` 函数
- `value_to_i64()` 函数
- `value_to_string()` 函数
- `required_i64_from_json_row()` 函数

**行数估计：** ~100行

### 依赖关系

```
mod.rs
├── connection.rs
├── metadata.rs
├── query.rs
├── table_data.rs
└── helpers.rs

connection.rs
└── helpers.rs

metadata.rs
├── connection.rs (调用 execute_json)
└── helpers.rs

query.rs
├── connection.rs (调用 execute_raw, execute_json)
└── helpers.rs

table_data.rs
├── connection.rs (调用 execute_json)
├── metadata.rs (调用 estimate_total_rows)
└── helpers.rs
```

### 函数分布详情

#### 辅助函数 (helpers.rs)

| 函数名 | 行号 | 用途 |
|--------|------|------|
| `quote_ident` | 93-95 | 标识符引用 |
| `quote_literal` | 97-99 | 字面量引用 |
| `table_ref` | 101-108 | 表名引用 |
| `trim_trailing_semicolon` | 110-113 | 去除尾部分号 |
| `value_to_bool` | 273-283 | 值转布尔 |
| `value_to_i64` | 285-291 | 值转 i64 |
| `value_to_string` | 293-304 | 值转字符串 |
| `required_i64_from_json_row` | 306-323 | 从 JSON 行提取 i64 |

#### 连接函数 (connection.rs)

| 函数名 | 行号 | 用途 |
|--------|------|------|
| `build_config` | 63-91 | 构建连接配置 |
| `ClickHouseDriver::connect` | 402-427 | 建立连接 |
| `ClickHouseDriver::execute_raw` | 429-464 | 执行原始查询 |
| `ClickHouseDriver::execute_json` | 466-484 | 执行 JSON 查询 |
| `ClickHouseDriver::kill_query` | 541-548 | 终止查询 |
| `parse_summary_header` | 325-329 | 解析摘要头 |

#### 元数据函数 (metadata.rs)

| 函数名 | 行号 | 用途 |
|--------|------|------|
| `ClickHouseDriver::estimate_total_rows` | 486-499 | 估算总行数 |
| `ClickHouseDriver::query_table_extra` | 501-539 | 查询表额外信息 |
| `DatabaseDriver::list_databases` | 565-580 | 列出数据库 |
| `DatabaseDriver::list_tables` | 582-621 | 列出表 |
| `DatabaseDriver::get_table_structure` | 623-630 | 获取表结构 |
| `DatabaseDriver::get_table_metadata` | 632-717 | 获取表元数据 |
| `DatabaseDriver::get_table_ddl` | 719-751 | 获取表 DDL |
| `DatabaseDriver::get_schema_overview` | 1072-1131 | 获取 schema 概览 |
| `extract_ttl_expr` | 383-399 | 提取 TTL 表达式 |
| `normalize_optional_sql_expr` | 372-381 | 规范化可选 SQL 表达式 |

#### 查询函数 (query.rs)

| 函数名 | 行号 | 用途 |
|--------|------|------|
| `DatabaseDriver::execute_query` | 875-877 | 执行查询 |
| `DatabaseDriver::execute_query_with_id` | 879-1070 | 带 ID 执行查询 |
| `infer_insert_values_row_count` | 150-271 | 推断 INSERT 行数 |
| `raw_text_to_query_result` | 331-370 | 原始文本转查询结果 |
| `has_format_clause` | 115-119 | 检查是否有 FORMAT 子句 |
| `is_json_format` | 121-140 | 检查是否是 JSON 格式 |
| `ensure_json_format` | 142-148 | 确保 JSON 格式 |

#### 表数据函数 (table_data.rs)

| 函数名 | 行号 | 用途 |
|--------|------|------|
| `DatabaseDriver::get_table_data` | 752-849 | 获取表数据 |
| `DatabaseDriver::get_table_data_chunk` | 851-873 | 获取表数据块 |

## 测试策略

### 单元测试

每个模块将包含相应的单元测试：

1. **`helpers.rs`**：测试所有辅助函数
   - `quote_ident` 测试特殊字符处理
   - `quote_literal` 测试转义
   - `table_ref` 测试 schema 和表名组合
   - `value_to_*` 测试类型转换
   - `required_i64_from_json_row` 测试错误处理

2. **`connection.rs`**：测试配置构建
   - `build_config` 测试默认值
   - `build_config` 测试 SSL 配置
   - `parse_summary_header` 测试 JSON 解析

3. **`metadata.rs`**：测试元数据解析
   - `extract_ttl_expr` 测试 TTL 提取
   - `normalize_optional_sql_expr` 测试规范化

4. **`query.rs`**：测试查询执行
   - `infer_insert_values_row_count` 测试行数推断
   - `raw_text_to_query_result` 测试文本转换
   - `has_format_clause` / `is_json_format` 测试格式检测

5. **`table_data.rs`**：测试分页逻辑

### 集成测试

现有的集成测试将继续运行，确保拆分后功能不变。

## 向后兼容性

- 保持 `ClickHouseDriver` 结构体的公共 API 不变
- 保持 `DatabaseDriver` trait 实现不变
- 外部调用者无需修改任何代码

## 实现步骤

1. 创建 `src-tauri/src/db/drivers/clickhouse/` 目录
2. 创建 `helpers.rs`，移动辅助函数
3. 创建 `connection.rs`，移动连接相关函数
4. 创建 `metadata.rs`，移动元数据相关函数
5. 创建 `query.rs`，移动查询相关函数
6. 创建 `table_data.rs`，移动表数据相关函数
7. 创建 `mod.rs`，整合所有模块
8. 删除原始 `clickhouse.rs` 文件
9. 更新 `src-tauri/src/db/drivers/mod.rs` 中的模块声明
10. 运行测试验证

## 风险和缓解措施

### 风险 1：模块间循环依赖
**缓解**：通过清晰的依赖关系设计，确保单向依赖。

### 风险 2：函数可见性问题
**缓解**：合理使用 `pub(super)` 和 `pub(crate)` 可见性修饰符。

### 风险 3：测试覆盖率下降
**缓解**：为每个模块添加单元测试，确保独立功能正确。

## 成功标准

1. 所有现有测试通过
2. 每个模块有清晰的职责
3. 代码可读性提高
4. 编译时间没有显著增加
5. 模块间依赖关系清晰

## 参考资料

- MySQL driver 模块化结构：`src-tauri/src/db/drivers/mysql/`
- Postgres driver 模块化结构：`src-tauri/src/db/drivers/postgres/`
- SQLite driver 模块化结构：`src-tauri/src/db/drivers/sqlite/`
- DatabaseDriver trait 定义：`src-tauri/src/db/drivers/mod.rs`