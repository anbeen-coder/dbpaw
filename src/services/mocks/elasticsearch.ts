import { COMMANDS } from "../commands";

export function handleElasticsearch(
  cmd: string,
  args?: any,
): Promise<any> | null {
  switch (cmd) {
    case COMMANDS.ELASTICSEARCH_TEST_CONNECTION:
      return Promise.resolve({
        clusterName: "mock-cluster",
        clusterUuid: "mock-uuid",
        version: "8.13.0",
        tagline: "You Know, for Search",
      });

    case COMMANDS.ELASTICSEARCH_LIST_INDICES:
      return Promise.resolve([
        {
          name: "products",
          health: "green",
          status: "open",
          uuid: "mock-uuid-1",
          primaryShards: "1",
          replicaShards: "1",
          docsCount: 128,
          storeSize: "45kb",
          isSystem: false,
        },
        {
          name: "orders",
          health: "green",
          status: "open",
          uuid: "mock-uuid-2",
          primaryShards: "1",
          replicaShards: "1",
          docsCount: 512,
          storeSize: "120kb",
          isSystem: false,
        },
        {
          name: ".kibana",
          health: "green",
          status: "open",
          uuid: "mock-uuid-3",
          primaryShards: "1",
          replicaShards: "0",
          docsCount: 8,
          storeSize: "12kb",
          isSystem: true,
        },
      ]);

    case COMMANDS.ELASTICSEARCH_GET_INDEX_MAPPING: {
      const idx = String(args.index || "products");
      return Promise.resolve({
        [idx]: {
          mappings: {
            properties: {
              id: { type: "keyword" },
              name: { type: "text" },
              price: { type: "float" },
              category: { type: "keyword" },
              created_at: { type: "date" },
            },
          },
        },
      });
    }

    case COMMANDS.ELASTICSEARCH_CREATE_INDEX:
      return Promise.resolve({
        index: String(args.index || "new-index"),
        acknowledged: true,
        shardsAcknowledged: true,
        status: 200,
      });

    case COMMANDS.ELASTICSEARCH_DELETE_INDEX:
      return Promise.resolve({
        index: String(args.index || "products"),
        acknowledged: true,
        shardsAcknowledged: null,
        status: 200,
      });

    case COMMANDS.ELASTICSEARCH_REFRESH_INDEX:
    case COMMANDS.ELASTICSEARCH_OPEN_INDEX:
    case COMMANDS.ELASTICSEARCH_CLOSE_INDEX:
      return Promise.resolve({
        index: String(args.index || "products"),
        acknowledged: true,
        shardsAcknowledged: true,
        status: 200,
      });

    case COMMANDS.ELASTICSEARCH_SEARCH_DOCUMENTS: {
      const hits = Array.from({ length: 3 }, (_, i) => ({
        index: String(args.index || "products"),
        id: `doc-${i + 1}`,
        score: 1.0 - i * 0.1,
        source: {
          id: `doc-${i + 1}`,
          name: `Mock Product ${i + 1}`,
          price: 19.99 + i * 10,
          category: "electronics",
          created_at: new Date().toISOString(),
        },
        fields: null,
      }));
      return Promise.resolve({
        hits,
        total: 3,
        tookMs: 5,
        aggregations: {
          categories: {
            buckets: [{ key: "electronics", doc_count: 3 }],
          },
        },
      });
    }

    case COMMANDS.ELASTICSEARCH_GET_DOCUMENT:
      return Promise.resolve({
        index: String(args.index || "products"),
        id: String(args.documentId || "doc-1"),
        found: true,
        source: {
          id: String(args.documentId || "doc-1"),
          name: "Mock Product",
          price: 29.99,
          category: "electronics",
          created_at: new Date().toISOString(),
        },
        fields: null,
      });

    case COMMANDS.ELASTICSEARCH_UPSERT_DOCUMENT:
      return Promise.resolve({
        index: String(args.index || "products"),
        id: args.documentId || `auto-${Date.now()}`,
        result: args.documentId ? "updated" : "created",
        status: args.documentId ? 200 : 201,
      });

    case COMMANDS.ELASTICSEARCH_DELETE_DOCUMENT:
      return Promise.resolve({
        index: String(args.index || "products"),
        id: String(args.documentId || "doc-1"),
        result: "deleted",
        status: 200,
      });

    case COMMANDS.ELASTICSEARCH_EXECUTE_RAW:
      return Promise.resolve({
        status: 200,
        body: '{"count":3,"_shards":{"total":1,"successful":1,"skipped":0,"failed":0}}',
        json: {
          count: 3,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        },
        tookMs: 3,
      });

    case COMMANDS.ELASTICSEARCH_EXPORT_DOCUMENTS:
      return Promise.resolve({
        filePath: "/tmp/mock-export.json",
        index: String(args?.index || "products"),
        documents: 0,
        batches: 0,
        timeTakenMs: 0,
      });
    case COMMANDS.ELASTICSEARCH_IMPORT_DOCUMENTS:
      return Promise.resolve({
        filePath: String(args?.filePath || "/tmp/mock-import.json"),
        index: String(args?.index || "products"),
        totalActions: 0,
        successful: 0,
        failed: 0,
        errors: [],
        timeTakenMs: 0,
      });

    default:
      return null;
  }
}
