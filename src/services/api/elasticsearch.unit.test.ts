import { describe, expect, test, mock, beforeEach } from "bun:test";

let capturedCmd = "";
let capturedArgs: any = null;
let mockReturn: any = undefined;

mock.module("./core", () => ({
  invoke: async (cmd: string, args?: any) => {
    capturedCmd = cmd;
    capturedArgs = args;
    return mockReturn;
  },
}));

import { elasticsearchApi } from "./elasticsearch";

const g = globalThis as any;

beforeEach(() => {
  g.window = { __TAURI_INTERNALS__: {} };
  capturedCmd = "";
  capturedArgs = null;
  mockReturn = undefined;
});

describe("elasticsearchApi.elasticsearch.testConnection", () => {
  test("invokes elasticsearch_test_connection", async () => {
    mockReturn = { cluster_name: "test", version: "8.0.0" };

    const result = await elasticsearchApi.elasticsearch.testConnection(1);

    expect(capturedCmd).toBe("elasticsearch_test_connection");
    expect(capturedArgs).toEqual({ id: 1 });
    expect(result.cluster_name).toBe("test");
  });
});

describe("elasticsearchApi.elasticsearch.listIndices", () => {
  test("invokes elasticsearch_list_indices", async () => {
    mockReturn = [{ index: "products", health: "green" }];

    const result = await elasticsearchApi.elasticsearch.listIndices(1);

    expect(capturedCmd).toBe("elasticsearch_list_indices");
    expect(capturedArgs).toEqual({ id: 1 });
    expect(result).toHaveLength(1);
  });
});

describe("elasticsearchApi.elasticsearch.getIndexMapping", () => {
  test("invokes elasticsearch_get_index_mapping", async () => {
    mockReturn = { properties: { title: { type: "text" } } };

    await elasticsearchApi.elasticsearch.getIndexMapping(1, "products");

    expect(capturedCmd).toBe("elasticsearch_get_index_mapping");
    expect(capturedArgs).toEqual({ id: 1, index: "products" });
  });
});

describe("elasticsearchApi.elasticsearch.createIndex", () => {
  test("invokes elasticsearch_create_index with body", async () => {
    const body = { settings: { number_of_shards: 1 } };
    mockReturn = { acknowledged: true };

    await elasticsearchApi.elasticsearch.createIndex({ id: 1, index: "new_index", body });

    expect(capturedCmd).toBe("elasticsearch_create_index");
    expect(capturedArgs).toEqual({ id: 1, index: "new_index", body });
  });

  test("works without body", async () => {
    mockReturn = { acknowledged: true };

    await elasticsearchApi.elasticsearch.createIndex({ id: 1, index: "new_index" });

    expect(capturedArgs).toEqual({ id: 1, index: "new_index", body: undefined });
  });
});

describe("elasticsearchApi.elasticsearch.deleteIndex", () => {
  test("invokes elasticsearch_delete_index", async () => {
    mockReturn = { acknowledged: true };

    await elasticsearchApi.elasticsearch.deleteIndex(1, "old_index");

    expect(capturedCmd).toBe("elasticsearch_delete_index");
    expect(capturedArgs).toEqual({ id: 1, index: "old_index" });
  });
});

describe("elasticsearchApi.elasticsearch.refreshIndex", () => {
  test("invokes elasticsearch_refresh_index", async () => {
    mockReturn = { acknowledged: true };

    await elasticsearchApi.elasticsearch.refreshIndex(1, "products");

    expect(capturedCmd).toBe("elasticsearch_refresh_index");
    expect(capturedArgs).toEqual({ id: 1, index: "products" });
  });
});

describe("elasticsearchApi.elasticsearch.openIndex", () => {
  test("invokes elasticsearch_open_index", async () => {
    mockReturn = { acknowledged: true };

    await elasticsearchApi.elasticsearch.openIndex(1, "products");

    expect(capturedCmd).toBe("elasticsearch_open_index");
    expect(capturedArgs).toEqual({ id: 1, index: "products" });
  });
});

describe("elasticsearchApi.elasticsearch.closeIndex", () => {
  test("invokes elasticsearch_close_index", async () => {
    mockReturn = { acknowledged: true };

    await elasticsearchApi.elasticsearch.closeIndex(1, "products");

    expect(capturedCmd).toBe("elasticsearch_close_index");
    expect(capturedArgs).toEqual({ id: 1, index: "products" });
  });
});

describe("elasticsearchApi.elasticsearch.searchDocuments", () => {
  test("invokes elasticsearch_search_documents", async () => {
    mockReturn = { hits: { hits: [], total: 0 } };

    await elasticsearchApi.elasticsearch.searchDocuments({
      id: 1,
      index: "products",
      query: "laptop",
      dsl: '{"query":{"match":{"name":"laptop"}}}',
      from: 0,
      size: 20,
    });

    expect(capturedCmd).toBe("elasticsearch_search_documents");
    expect(capturedArgs).toEqual({
      id: 1,
      index: "products",
      query: "laptop",
      dsl: '{"query":{"match":{"name":"laptop"}}}',
      from: 0,
      size: 20,
    });
  });
});

describe("elasticsearchApi.elasticsearch.getDocument", () => {
  test("invokes elasticsearch_get_document", async () => {
    mockReturn = { _id: "1", _source: { name: "test" } };

    await elasticsearchApi.elasticsearch.getDocument(1, "products", "1");

    expect(capturedCmd).toBe("elasticsearch_get_document");
    expect(capturedArgs).toEqual({ id: 1, index: "products", documentId: "1" });
  });
});

describe("elasticsearchApi.elasticsearch.upsertDocument", () => {
  test("invokes elasticsearch_upsert_document", async () => {
    mockReturn = { result: "created" };

    await elasticsearchApi.elasticsearch.upsertDocument({
      id: 1,
      index: "products",
      documentId: "1",
      source: { name: "Widget" },
      refresh: true,
    });

    expect(capturedCmd).toBe("elasticsearch_upsert_document");
    expect(capturedArgs).toEqual({
      id: 1,
      index: "products",
      documentId: "1",
      source: { name: "Widget" },
      refresh: true,
    });
  });
});

describe("elasticsearchApi.elasticsearch.deleteDocument", () => {
  test("invokes elasticsearch_delete_document", async () => {
    mockReturn = { result: "deleted" };

    await elasticsearchApi.elasticsearch.deleteDocument({
      id: 1,
      index: "products",
      documentId: "1",
      refresh: false,
    });

    expect(capturedCmd).toBe("elasticsearch_delete_document");
    expect(capturedArgs).toEqual({
      id: 1,
      index: "products",
      documentId: "1",
      refresh: false,
    });
  });
});

describe("elasticsearchApi.elasticsearch.exportDocuments", () => {
  test("invokes elasticsearch_export_documents", async () => {
    mockReturn = { filePath: "/tmp/export.ndjson", count: 100 };

    await elasticsearchApi.elasticsearch.exportDocuments({
      id: 1,
      index: "products",
      query: "laptop",
      filePath: "/tmp/export.ndjson",
      batchSize: 500,
    });

    expect(capturedCmd).toBe("elasticsearch_export_documents");
    expect(capturedArgs).toEqual({
      id: 1,
      index: "products",
      query: "laptop",
      filePath: "/tmp/export.ndjson",
      batchSize: 500,
    });
  });
});

describe("elasticsearchApi.elasticsearch.importDocuments", () => {
  test("invokes elasticsearch_import_documents", async () => {
    mockReturn = { success: 50, errors: 0 };

    await elasticsearchApi.elasticsearch.importDocuments({
      id: 1,
      index: "products",
      filePath: "/tmp/import.ndjson",
      batchSize: 100,
      refresh: true,
    });

    expect(capturedCmd).toBe("elasticsearch_import_documents");
    expect(capturedArgs).toEqual({
      id: 1,
      index: "products",
      filePath: "/tmp/import.ndjson",
      batchSize: 100,
      refresh: true,
    });
  });
});

describe("elasticsearchApi.elasticsearch.executeRaw", () => {
  test("invokes elasticsearch_execute_raw", async () => {
    mockReturn = { status: 200, body: "{}" };

    await elasticsearchApi.elasticsearch.executeRaw({
      id: 1,
      method: "GET",
      path: "/_cluster/health",
      body: undefined,
    });

    expect(capturedCmd).toBe("elasticsearch_execute_raw");
    expect(capturedArgs).toEqual({
      id: 1,
      method: "GET",
      path: "/_cluster/health",
      body: undefined,
    });
  });
});
