# Mock测试覆盖率提升实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为所有API端点添加功能验证测试，验证每个端点能正确返回mock数据

**Architecture:** 按模块创建独立测试文件，每个文件测试一个API模块的所有端点，使用现有的mock函数和数据

**Tech Stack:** TypeScript, bun:test, 现有mock系统

---

## 文件结构

```
src/services/
├── query.service.test.ts     # 新增 - query模块测试
├── metadata.service.test.ts  # 新增 - metadata模块测试
├── connections.service.test.ts # 新增 - connections模块测试
├── redis.service.test.ts     # 新增 - redis模块测试
├── elasticsearch.service.test.ts # 新增 - elasticsearch模块测试
├── mongodb.service.test.ts   # 新增 - mongodb模块测试
└── ai.service.test.ts        # 新增 - ai模块测试
```

## Task 1: 创建Query模块测试

**Files:**
- Create: `src/services/query.service.test.ts`

- [ ] **Step 1: 创建query.service.test.ts文件**

```typescript
import { describe, expect, test } from "bun:test";
import { invokeMock } from "./mocks";

describe("Query模块", () => {
  test("execute_query - 执行SQL查询", async () => {
    const result = await invokeMock<any>("execute_query", {
      id: 1,
      query: "SELECT * FROM users LIMIT 10",
      database: "testdb",
    });
    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.rowCount).toBeDefined();
    expect(result.columns).toBeDefined();
    expect(result.timeTakenMs).toBeDefined();
    expect(result.success).toBeDefined();
  });

  test("cancel_query - 取消查询", async () => {
    const result = await invokeMock<boolean>("cancel_query", {
      uuid: "test-uuid",
      queryId: "test-query-id",
    });
    expect(result).toBeDefined();
    expect(typeof result).toBe("boolean");
  });

  test("execute_by_conn - 通过连接信息执行查询", async () => {
    const result = await invokeMock<any>("execute_by_conn", {
      form: {
        driver: "postgres",
        host: "localhost",
        port: 5432,
        database: "testdb",
        username: "postgres",
      },
      sql: "SELECT * FROM users LIMIT 10",
    });
    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.rowCount).toBeDefined();
    expect(result.columns).toBeDefined();
  });
});
```

- [ ] **Step 2: 运行测试验证通过**

Run: `bun test src/services/query.service.test.ts`
Expected: PASS

- [ ] **Step 3: 提交代码**

```bash
git add src/services/query.service.test.ts
git commit -m "test: add query module mock tests"
```

## Task 2: 创建Metadata模块测试

**Files:**
- Create: `src/services/metadata.service.test.ts`

- [ ] **Step 1: 创建metadata.service.test.ts文件**

```typescript
import { describe, expect, test } from "bun:test";
import { invokeMock } from "./mocks";

describe("Metadata模块", () => {
  test("list_tables - 列出表", async () => {
    const result = await invokeMock<{ schema: string; name: string; type: string }[]>(
      "list_tables",
      { id: 1, database: "testdb", schema: "public" }
    );
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("schema");
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("type");
  });

  test("list_routines - 列出存储过程/函数", async () => {
    const result = await invokeMock<{ schema: string; name: string; type: string }[]>(
      "list_routines",
      { id: 1, database: "testdb", schema: "dbo" }
    );
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  test("get_table_structure - 获取表结构", async () => {
    const result = await invokeMock<{ columns: { name: string; type: string; nullable: boolean }[] }>(
      "get_table_structure",
      { id: 1, schema: "public", table: "users" }
    );
    expect(result).toBeDefined();
    expect(result.columns).toBeDefined();
    expect(Array.isArray(result.columns)).toBe(true);
    expect(result.columns.length).toBeGreaterThan(0);
  });

  test("get_table_ddl - 获取表DDL", async () => {
    const result = await invokeMock<string>(
      "get_table_ddl",
      { id: 1, database: "testdb", schema: "public", table: "users" }
    );
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  test("get_routine_ddl - 获取存储过程/函数DDL", async () => {
    const result = await invokeMock<string>(
      "get_routine_ddl",
      { id: 1, database: "testdb", schema: "dbo", name: "sync_user_stats", routineType: "procedure" }
    );
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  test("get_table_metadata - 获取表元数据", async () => {
    const result = await invokeMock<any>(
      "get_table_metadata",
      { id: 1, database: "testdb", schema: "public", table: "users" }
    );
    expect(result).toBeDefined();
    expect(result.columns).toBeDefined();
    expect(result.indexes).toBeDefined();
    expect(result.foreignKeys).toBeDefined();
    expect(result.specialTypeSummaries).toBeDefined();
  });

  test("list_tables_by_conn - 通过连接列出表", async () => {
    const result = await invokeMock<{ schema: string; name: string; type: string }[]>(
      "list_tables_by_conn",
      {
        form: {
          driver: "postgres",
          host: "localhost",
          port: 5432,
          database: "testdb",
          username: "postgres",
        }
      }
    );
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  test("list_databases - 列出数据库", async () => {
    const result = await invokeMock<string[]>(
      "list_databases",
      {
        form: {
          driver: "postgres",
          host: "localhost",
          port: 5432,
          database: "testdb",
          username: "postgres",
        }
      }
    );
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  test("list_databases_by_id - 通过ID列出数据库", async () => {
    const result = await invokeMock<string[]>(
      "list_databases_by_id",
      { id: 1 }
    );
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  test("get_schema_overview - 获取schema概览", async () => {
    const result = await invokeMock<any>(
      "get_schema_overview",
      { id: 1, database: "testdb", schema: "public" }
    );
    expect(result).toBeDefined();
    expect(result.tables).toBeDefined();
    expect(Array.isArray(result.tables)).toBe(true);
  });

  test("get_schema_foreign_keys - 获取外键", async () => {
    const result = await invokeMock<any[]>(
      "get_schema_foreign_keys",
      { id: 1, database: "testdb", schema: "public" }
    );
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  test("list_events - 列出事件", async () => {
    const result = await invokeMock<any[]>(
      "list_events",
      { connectionId: "1", database: "testdb" }
    );
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  test("list_sequences - 列出序列", async () => {
    const result = await invokeMock<any[]>(
      "list_sequences",
      { connectionId: "1", database: "testdb" }
    );
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  test("list_types - 列出类型", async () => {
    const result = await invokeMock<any[]>(
      "list_types",
      { connectionId: "1", database: "testdb" }
    );
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  test("list_synonyms - 列出同义词", async () => {
    const result = await invokeMock<any[]>(
      "list_synonyms",
      { connectionId: "1", database: "testdb" }
    );
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  test("list_packages - 列出包", async () => {
    const result = await invokeMock<any[]>(
      "list_packages",
      { connectionId: "1", database: "testdb" }
    );
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试验证通过**

Run: `bun test src/services/metadata.service.test.ts`
Expected: PASS

- [ ] **Step 3: 提交代码**

```bash
git add src/services/metadata.service.test.ts
git commit -m "test: add metadata module mock tests"
```

## Task 3: 创建Connections模块测试

**Files:**
- Create: `src/services/connections.service.test.ts`

- [ ] **Step 1: 创建connections.service.test.ts文件**

```typescript
import { describe, expect, test } from "bun:test";
import { invokeMock } from "./mocks";

describe("Connections模块", () => {
  test("get_connections - 获取连接列表", async () => {
    const result = await invokeMock<any[]>("get_connections");
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("id");
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("dbType");
  });

  test("create_connection - 创建连接", async () => {
    const result = await invokeMock<any>("create_connection", {
      form: {
        driver: "postgres",
        name: "Test Connection",
        host: "localhost",
        port: 5432,
        database: "testdb",
        username: "postgres",
      }
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("name");
    expect(result.name).toBe("Test Connection");
  });

  test("update_connection - 更新连接", async () => {
    const result = await invokeMock<any>("update_connection", {
      id: 1,
      form: {
        driver: "postgres",
        name: "Updated Connection",
        host: "localhost",
        port: 5432,
        database: "testdb",
        username: "postgres",
      }
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("name");
    expect(result.name).toBe("Updated Connection");
  });

  test("delete_connection - 删除连接", async () => {
    const result = await invokeMock<void>("delete_connection", { id: 1 });
    expect(result).toBeDefined();
  });

  test("create_database_by_id - 创建数据库", async () => {
    const result = await invokeMock<void>("create_database_by_id", {
      id: 1,
      payload: { name: "new_database" }
    });
    expect(result).toBeDefined();
  });

  test("get_mysql_charsets_by_id - 获取MySQL字符集", async () => {
    const result = await invokeMock<string[]>("get_mysql_charsets_by_id", { id: 1 });
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("utf8mb4");
  });

  test("get_mysql_collations_by_id - 获取MySQL排序规则", async () => {
    const result = await invokeMock<string[]>("get_mysql_collations_by_id", {
      id: 1,
      charset: "utf8mb4"
    });
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  test("test_connection_ephemeral - 测试临时连接", async () => {
    const result = await invokeMock<any>("test_connection_ephemeral", {
      form: {
        driver: "postgres",
        host: "localhost",
        port: 5432,
        database: "testdb",
        username: "postgres",
      }
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("message");
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试验证通过**

Run: `bun test src/services/connections.service.test.ts`
Expected: PASS

- [ ] **Step 3: 提交代码**

```bash
git add src/services/connections.service.test.ts
git commit -m "test: add connections module mock tests"
```

## Task 4: 创建Redis模块测试

**Files:**
- Create: `src/services/redis.service.test.ts`

- [ ] **Step 1: 创建redis.service.test.ts文件**

```typescript
import { describe, expect, test } from "bun:test";
import { invokeMock } from "./mocks";

describe("Redis模块", () => {
  test("redis_list_databases - 列出数据库", async () => {
    const result = await invokeMock<any[]>("redis_list_databases", { id: 1 });
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  test("redis_scan_keys - 扫描键", async () => {
    const result = await invokeMock<any>("redis_scan_keys", {
      id: 1,
      database: "0",
      cursor: "0",
      pattern: "*",
      limit: 100
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("cursor");
    expect(result).toHaveProperty("keys");
    expect(Array.isArray(result.keys)).toBe(true);
  });

  test("redis_get_key - 获取键", async () => {
    const result = await invokeMock<any>("redis_get_key", {
      id: 1,
      database: "0",
      key: "test:key"
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("key");
    expect(result).toHaveProperty("keyType");
    expect(result).toHaveProperty("ttl");
    expect(result).toHaveProperty("value");
  });

  test("redis_set_key - 设置键", async () => {
    const result = await invokeMock<any>("redis_set_key", {
      id: 1,
      database: "0",
      payload: {
        key: "test:string",
        value: { kind: "string", value: "hello" }
      }
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("success");
    expect(result.success).toBe(true);
  });

  test("redis_delete_key - 删除键", async () => {
    const result = await invokeMock<any>("redis_delete_key", {
      id: 1,
      database: "0",
      key: "test:key"
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("success");
    expect(result.success).toBe(true);
  });

  test("redis_rename_key - 重命名键", async () => {
    const result = await invokeMock<any>("redis_rename_key", {
      id: 1,
      database: "0",
      oldKey: "test:old",
      newKey: "test:new"
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("success");
    expect(result.success).toBe(true);
  });

  test("redis_set_ttl - 设置过期时间", async () => {
    const result = await invokeMock<any>("redis_set_ttl", {
      id: 1,
      database: "0",
      key: "test:key",
      ttlSeconds: 3600
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("success");
    expect(result.success).toBe(true);
  });

  test("redis_server_info - 获取服务器信息", async () => {
    const result = await invokeMock<any>("redis_server_info", {
      id: 1,
      database: "0"
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("sections");
    expect(result).toHaveProperty("dbsize");
  });

  test("redis_server_config - 获取服务器配置", async () => {
    const result = await invokeMock<Record<string, string>>("redis_server_config", {
      id: 1,
      database: "0"
    });
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  });

  test("redis_slowlog_get - 获取慢查询日志", async () => {
    const result = await invokeMock<any[]>("redis_slowlog_get", {
      id: 1,
      database: "0",
      count: 10
    });
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  test("redis_execute_raw - 执行原始命令", async () => {
    const result = await invokeMock<any>("redis_execute_raw", {
      id: 1,
      database: "0",
      command: "PING"
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("output");
  });
});
```

- [ ] **Step 2: 运行测试验证通过**

Run: `bun test src/services/redis.service.test.ts`
Expected: PASS

- [ ] **Step 3: 提交代码**

```bash
git add src/services/redis.service.test.ts
git commit -m "test: add redis module mock tests"
```

## Task 5: 创建Elasticsearch模块测试

**Files:**
- Create: `src/services/elasticsearch.service.test.ts`

- [ ] **Step 1: 创建elasticsearch.service.test.ts文件**

```typescript
import { describe, expect, test } from "bun:test";
import { invokeMock } from "./mocks";

describe("Elasticsearch模块", () => {
  test("elasticsearch_test_connection - 测试连接", async () => {
    const result = await invokeMock<any>("elasticsearch_test_connection", { id: 1 });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("clusterName");
    expect(result).toHaveProperty("version");
  });

  test("elasticsearch_list_indices - 列出索引", async () => {
    const result = await invokeMock<any[]>("elasticsearch_list_indices", { id: 1 });
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("health");
  });

  test("elasticsearch_get_index_mapping - 获取索引映射", async () => {
    const result = await invokeMock<any>("elasticsearch_get_index_mapping", {
      id: 1,
      index: "products"
    });
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  });

  test("elasticsearch_create_index - 创建索引", async () => {
    const result = await invokeMock<any>("elasticsearch_create_index", {
      id: 1,
      index: "new-index"
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("acknowledged");
    expect(result.acknowledged).toBe(true);
  });

  test("elasticsearch_delete_index - 删除索引", async () => {
    const result = await invokeMock<any>("elasticsearch_delete_index", {
      id: 1,
      index: "products"
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("acknowledged");
    expect(result.acknowledged).toBe(true);
  });

  test("elasticsearch_refresh_index - 刷新索引", async () => {
    const result = await invokeMock<any>("elasticsearch_refresh_index", {
      id: 1,
      index: "products"
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("acknowledged");
    expect(result.acknowledged).toBe(true);
  });

  test("elasticsearch_open_index - 打开索引", async () => {
    const result = await invokeMock<any>("elasticsearch_open_index", {
      id: 1,
      index: "products"
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("acknowledged");
    expect(result.acknowledged).toBe(true);
  });

  test("elasticsearch_close_index - 关闭索引", async () => {
    const result = await invokeMock<any>("elasticsearch_close_index", {
      id: 1,
      index: "products"
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("acknowledged");
    expect(result.acknowledged).toBe(true);
  });

  test("elasticsearch_search_documents - 搜索文档", async () => {
    const result = await invokeMock<any>("elasticsearch_search_documents", {
      id: 1,
      index: "products",
      query: "*",
      from: 0,
      size: 10
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("hits");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.hits)).toBe(true);
  });

  test("elasticsearch_get_document - 获取文档", async () => {
    const result = await invokeMock<any>("elasticsearch_get_document", {
      id: 1,
      index: "products",
      documentId: "doc-1"
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("found");
    expect(result.found).toBe(true);
  });

  test("elasticsearch_upsert_document - 更新/插入文档", async () => {
    const result = await invokeMock<any>("elasticsearch_upsert_document", {
      id: 1,
      index: "products",
      source: { name: "Test Product", price: 19.99 }
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("result");
    expect(result).toHaveProperty("status");
  });

  test("elasticsearch_delete_document - 删除文档", async () => {
    const result = await invokeMock<any>("elasticsearch_delete_document", {
      id: 1,
      index: "products",
      documentId: "doc-1"
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("result");
    expect(result.result).toBe("deleted");
  });
});
```

- [ ] **Step 2: 运行测试验证通过**

Run: `bun test src/services/elasticsearch.service.test.ts`
Expected: PASS

- [ ] **Step 3: 提交代码**

```bash
git add src/services/elasticsearch.service.test.ts
git commit -m "test: add elasticsearch module mock tests"
```

## Task 6: 创建MongoDB模块测试

**Files:**
- Create: `src/services/mongodb.service.test.ts`

- [ ] **Step 1: 创建mongodb.service.test.ts文件**

```typescript
import { describe, expect, test } from "bun:test";
import { invokeMock } from "./mocks";

describe("MongoDB模块", () => {
  test("mongodb_test_connection - 测试连接", async () => {
    const result = await invokeMock<any>("mongodb_test_connection", { id: 1 });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("version");
  });

  test("mongodb_test_connection_ephemeral - 测试临时连接", async () => {
    const result = await invokeMock<any>("mongodb_test_connection_ephemeral", {
      form: {
        driver: "mongodb",
        host: "localhost",
        port: 27017,
        database: "testdb",
      }
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("success");
    expect(result.success).toBe(true);
  });

  test("mongodb_list_databases - 列出数据库", async () => {
    const result = await invokeMock<any[]>("mongodb_list_databases", { id: 1 });
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("name");
  });

  test("mongodb_list_collections - 列出集合", async () => {
    const result = await invokeMock<any[]>("mongodb_list_collections", {
      id: 1,
      database: "testdb"
    });
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("name");
  });
});
```

- [ ] **Step 2: 运行测试验证通过**

Run: `bun test src/services/mongodb.service.test.ts`
Expected: PASS

- [ ] **Step 3: 提交代码**

```bash
git add src/services/mongodb.service.test.ts
git commit -m "test: add mongodb module mock tests"
```

## Task 7: 创建AI模块测试

**Files:**
- Create: `src/services/ai.service.test.ts`

- [ ] **Step 1: 创建ai.service.test.ts文件**

```typescript
import { describe, expect, test } from "bun:test";
import { invokeMock } from "./mocks";

describe("AI模块", () => {
  test("ai_list_providers - 列出AI提供商", async () => {
    const result = await invokeMock<any[]>("ai_list_providers");
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("id");
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("providerType");
  });

  test("ai_create_provider - 创建AI提供商", async () => {
    const result = await invokeMock<any>("ai_create_provider", {
      config: {
        name: "Test Provider",
        providerType: "openai",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4",
      }
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("name");
    expect(result.name).toBe("Test Provider");
  });

  test("ai_update_provider - 更新AI提供商", async () => {
    const result = await invokeMock<any>("ai_update_provider", {
      id: 1,
      config: {
        name: "Updated Provider",
        providerType: "openai",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4",
      }
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("name");
    expect(result.name).toBe("Updated Provider");
  });

  test("ai_delete_provider - 删除AI提供商", async () => {
    const result = await invokeMock<void>("ai_delete_provider", { id: 1 });
    expect(result).toBeDefined();
  });

  test("ai_set_default_provider - 设置默认提供商", async () => {
    const result = await invokeMock<void>("ai_set_default_provider", { id: 1 });
    expect(result).toBeDefined();
  });

  test("ai_list_conversations - 列出对话", async () => {
    const result = await invokeMock<any[]>("ai_list_conversations");
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("id");
    expect(result[0]).toHaveProperty("title");
  });

  test("ai_get_conversation - 获取对话详情", async () => {
    const result = await invokeMock<any>("ai_get_conversation", { conversationId: 1 });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("conversation");
    expect(result).toHaveProperty("messages");
    expect(Array.isArray(result.messages)).toBe(true);
  });

  test("ai_delete_conversation - 删除对话", async () => {
    const result = await invokeMock<void>("ai_delete_conversation", { conversationId: 1 });
    expect(result).toBeDefined();
  });

  test("ai_chat_start - 开始聊天", async () => {
    const result = await invokeMock<any>("ai_chat_start", {
      request: {
        requestId: "test-request",
        scenario: "sql_generate",
        input: "Generate SQL for users table",
        title: "Test Chat",
      }
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("conversationId");
    expect(result).toHaveProperty("userMessageId");
    expect(result).toHaveProperty("assistantMessageId");
  });

  test("ai_chat_continue - 继续聊天", async () => {
    const result = await invokeMock<any>("ai_chat_continue", {
      request: {
        requestId: "test-request-2",
        conversationId: 1,
        scenario: "sql_generate",
        input: "Add pagination to the query",
      }
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("conversationId");
    expect(result).toHaveProperty("userMessageId");
    expect(result).toHaveProperty("assistantMessageId");
  });
});
```

- [ ] **Step 2: 运行测试验证通过**

Run: `bun test src/services/ai.service.test.ts`
Expected: PASS

- [ ] **Step 3: 提交代码**

```bash
git add src/services/ai.service.test.ts
git commit -m "test: add ai module mock tests"
```

## Task 8: 运行所有测试验证

**Files:**
- No new files

- [ ] **Step 1: 运行所有service测试**

Run: `bun run test:service`
Expected: All tests pass

- [ ] **Step 2: 运行单元测试确保无回归**

Run: `bun run test:unit`
Expected: All tests pass

- [ ] **Step 3: 提交最终验证**

```bash
git add -A
git commit -m "test: complete mock test coverage for all API endpoints"
```
