# Mock测试覆盖率提升设计文档

## 概述

**目标**：为所有API端点添加功能验证测试，验证每个端点能正确返回mock数据，方便后续agent修改前端后进行快速自测。

**范围**：所有现有API模块的mock测试覆盖

**方法**：按模块创建独立测试文件

## 测试架构

### 测试文件结构

```
src/services/
├── api.unit.test.ts          # 现有 - API路由和基本功能测试
├── mocks.service.test.ts     # 现有 - 部分mock服务测试
├── query.service.test.ts     # 新增 - query模块测试
├── metadata.service.test.ts  # 新增 - metadata模块测试
├── connections.service.test.ts # 新增 - connections模块测试
├── redis.service.test.ts     # 新增 - redis模块测试
├── elasticsearch.service.test.ts # 新增 - elasticsearch模块测试
├── mongodb.service.test.ts   # 新增 - mongodb模块测试
└── ai.service.test.ts        # 新增 - ai模块测试
```

### 测试原则

1. **功能验证测试**：验证每个API端点能正确返回mock数据
2. **不测试错误场景**：专注于正常功能验证
3. **按模块组织**：每个模块一个测试文件
4. **复用现有mock数据**：使用`mocks.ts`中现有的mock函数和数据

## 测试覆盖范围

### 1. Query模块 (`query.service.test.ts`)

**端点**：
- `execute_query` - 执行SQL查询
- `cancel_query` - 取消查询
- `execute_by_conn` - 通过连接信息执行查询

**测试用例**：
- 验证查询返回正确的数据结构
- 验证取消查询返回boolean
- 验证通过连接执行查询返回正确结果

### 2. Metadata模块 (`metadata.service.test.ts`)

**端点**：
- `list_tables` - 列出表
- `list_routines` - 列出存储过程/函数
- `get_table_structure` - 获取表结构
- `get_table_ddl` - 获取表DDL
- `get_routine_ddl` - 获取存储过程/函数DDL
- `get_table_metadata` - 获取表元数据
- `list_tables_by_conn` - 通过连接列出表
- `list_databases` - 列出数据库
- `list_databases_by_id` - 通过ID列出数据库
- `get_schema_overview` - 获取schema概览
- `get_schema_foreign_keys` - 获取外键
- `list_events` - 列出事件
- `list_sequences` - 列出序列
- `list_types` - 列出类型
- `list_synonyms` - 列出同义词
- `list_packages` - 列出包

**测试用例**：
- 验证每个端点返回正确的数组或对象结构
- 验证数据包含必要的字段

### 3. Connections模块 (`connections.service.test.ts`)

**端点**：
- `get_connections` - 获取连接列表
- `create_connection` - 创建连接
- `update_connection` - 更新连接
- `delete_connection` - 删除连接
- `create_database_by_id` - 创建数据库
- `get_mysql_charsets_by_id` - 获取MySQL字符集
- `get_mysql_collations_by_id` - 获取MySQL排序规则
- `test_connection_ephemeral` - 测试临时连接

**测试用例**：
- 验证CRUD操作返回正确结果
- 验证字符集和排序规则返回数组

### 4. Redis模块 (`redis.service.test.ts`)

**端点**：所有redis相关端点（30+个）

**测试重点**：
- 数据库操作：listDatabases, scanKeys
- 键操作：getKey, setKey, deleteKey, renameKey
- 数据结构操作：hash, list, set, zset, stream
- 特殊功能：bitmap, hyperloglog, geo
- 服务器信息：serverInfo, serverConfig, slowlogGet

**测试用例**：
- 验证每个操作返回正确的数据结构
- 验证数据类型和格式

### 5. Elasticsearch模块 (`elasticsearch.service.test.ts`)

**端点**：
- `elasticsearch_test_connection` - 测试连接
- `elasticsearch_list_indices` - 列出索引
- `elasticsearch_get_index_mapping` - 获取索引映射
- `elasticsearch_create_index` - 创建索引
- `elasticsearch_delete_index` - 删除索引
- `elasticsearch_refresh_index` - 刷新索引
- `elasticsearch_open_index` - 打开索引
- `elasticsearch_close_index` - 关闭索引
- `elasticsearch_search_documents` - 搜索文档
- `elasticsearch_get_document` - 获取文档
- `elasticsearch_upsert_document` - 更新/插入文档
- `elasticsearch_delete_document` - 删除文档

**测试用例**：
- 验证每个操作返回正确的结果结构
- 验证索引操作返回状态码

### 6. MongoDB模块 (`mongodb.service.test.ts`)

**端点**：
- `mongodb_test_connection` - 测试连接
- `mongodb_test_connection_ephemeral` - 测试临时连接
- `mongodb_list_databases` - 列出数据库
- `mongodb_list_collections` - 列出集合

**测试用例**：
- 验证连接测试返回版本信息
- 验证数据库和集合列表返回数组

### 7. AI模块 (`ai.service.test.ts`)

**端点**：
- `ai_list_providers` - 列出AI提供商
- `ai_create_provider` - 创建AI提供商
- `ai_update_provider` - 更新AI提供商
- `ai_delete_provider` - 删除AI提供商
- `ai_set_default_provider` - 设置默认提供商
- `ai_list_conversations` - 列出对话
- `ai_get_conversation` - 获取对话详情
- `ai_delete_conversation` - 删除对话
- `ai_chat_start` - 开始聊天
- `ai_chat_continue` - 继续聊天

**测试用例**：
- 验证提供商CRUD操作
- 验证对话管理操作
- 验证聊天功能返回响应

## 测试模板

```typescript
import { describe, expect, test } from "bun:test";
import { invokeMock } from "./mocks";

describe("模块名", () => {
  test("端点名称 - 描述", async () => {
    const result = await invokeMock<返回类型>("命令名", { 参数 });
    expect(result).toBeDefined();
    // 验证数据结构
  });
});
```

## 执行和集成

### 测试执行命令

```bash
# 运行所有service测试
bun run test:service

# 运行特定模块测试
bun test src/services/query.service.test.ts
```

### 集成到现有流程

- 测试文件自动被`scripts/test-service.sh`发现
- 无需修改现有测试脚本
- 符合现有CI/CD流程

### 测试数据管理

- 使用`mocks.ts`中现有的mock数据
- 复用现有的mock函数
- 不创建新的mock数据

## 验证点

1. 所有测试能通过`bun run test:service`
2. 测试覆盖所有API端点
3. 测试执行时间合理（<30秒）

## 实现步骤

1. 创建`query.service.test.ts`
2. 创建`metadata.service.test.ts`
3. 创建`connections.service.test.ts`
4. 创建`redis.service.test.ts`
5. 创建`elasticsearch.service.test.ts`
6. 创建`mongodb.service.test.ts`
7. 创建`ai.service.test.ts`
8. 运行测试验证

## 成功标准

- 所有API端点都有对应的测试用例
- 所有测试通过
- 测试覆盖率显著提升
- 后续agent修改前端后可以快速验证功能
