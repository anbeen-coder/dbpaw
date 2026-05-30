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
