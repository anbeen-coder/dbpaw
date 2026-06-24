import { describe, it, expectTypeOf } from "vitest";
import type { CommandMap, CommandArgs, CommandReturn } from "../commands";
import type {
  QueryResult, TableMetadata, SchemaOverview, SavedConnection,
  TestConnectionResult, SavedQuery, SqlExecutionLog,
} from "../types/sql";
import type {
  RedisKeyValue, RedisScanResponse, RedisMutationResult,
  RedisZRangeByScoreResult, RedisStreamView,
} from "../types/redis";
import type {
  ElasticsearchBulkExportResult, ElasticsearchBulkImportResult,
  ElasticsearchSearchResponse, ElasticsearchIndexInfo,
} from "../types/elasticsearch";

describe("CommandMap type assertions", () => {
  it("execute_query returns QueryResult", () => {
    expectTypeOf<CommandReturn<"execute_query">>().toEqualTypeOf<QueryResult>();
  });

  it("get_table_structure returns columns with name, type, and nullable", () => {
    expectTypeOf<CommandReturn<"get_table_structure">>().toEqualTypeOf<{
      columns: { name: string; type: string; nullable: boolean }[];
    }>();
  });

  it("get_schema_overview returns SchemaOverview", () => {
    expectTypeOf<CommandReturn<"get_schema_overview">>().toEqualTypeOf<SchemaOverview>();
  });

  it("get_connections returns SavedConnection[]", () => {
    expectTypeOf<CommandReturn<"get_connections">>().toEqualTypeOf<SavedConnection[]>();
  });

  it("test_connection_ephemeral returns TestConnectionResult", () => {
    expectTypeOf<CommandReturn<"test_connection_ephemeral">>().toEqualTypeOf<TestConnectionResult>();
  });

  it("redis_get_key returns RedisKeyValue", () => {
    expectTypeOf<CommandReturn<"redis_get_key">>().toEqualTypeOf<RedisKeyValue>();
  });

  it("redis_zrangebyscore returns RedisZRangeByScoreResult", () => {
    expectTypeOf<CommandReturn<"redis_zrangebyscore">>().toEqualTypeOf<RedisZRangeByScoreResult>();
  });

  it("elasticsearch_export_documents returns ElasticsearchBulkExportResult", () => {
    expectTypeOf<CommandReturn<"elasticsearch_export_documents">>().toEqualTypeOf<ElasticsearchBulkExportResult>();
  });

  it("elasticsearch_import_documents returns ElasticsearchBulkImportResult", () => {
    expectTypeOf<CommandReturn<"elasticsearch_import_documents">>().toEqualTypeOf<ElasticsearchBulkImportResult>();
  });

  it("elasticsearch_list_indices returns ElasticsearchIndexInfo[]", () => {
    expectTypeOf<CommandReturn<"elasticsearch_list_indices">>().toEqualTypeOf<ElasticsearchIndexInfo[]>();
  });

  it("elasticsearch_search_documents returns ElasticsearchSearchResponse", () => {
    expectTypeOf<CommandReturn<"elasticsearch_search_documents">>().toEqualTypeOf<ElasticsearchSearchResponse>();
  });
});
