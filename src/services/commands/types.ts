import type {
  QueryResult,
  SqlExecutionLog,
  SqlExecutionSource,
  SavedConnection,
  TestConnectionResult,
  TableMetadata,
  SchemaOverview,
  SavedQuery,
  CreateDatabasePayload,
  ImportResult,
  SqliteConnectionIssue,
  EventInfo,
  SequenceInfo,
  TypeInfo,
  SynonymInfo,
  PackageInfo,
  RoutineInfo,
  RoutineType,
  SchemaForeignKey,
  ConnectionForm,
} from "../types/sql";
import type {
  RedisDatabaseInfo,
  RedisScanResponse,
  RedisKeyValue,
  RedisMutationResult,
  RedisServerInfo,
  RedisSlowlogEntry,
  RedisRawResult,
  RedisStreamView,
  RedisXPendingSummary,
  RedisXPendingEntry,
  RedisXClaimEntry,
  RedisZRangeByScoreResult,
  RedisZRangeByLexResult,
  RedisBatchKeyOp,
  RedisBatchKeyOpResult,
  RedisMgetEntry,
  RedisSetOperation,
  RedisClusterInfo,
  RedisCommandLog,
  RedisKeyPatchPayload,
  RedisGeoSearchResult,
  RedisSetKeyPayload,
  RedisLInsertPosition,
  RedisLMoveDirection,
  RedisStreamEntry,
  RedisGeoMember,
  RedisGeoPosition,
} from "../types/redis";
import type {
  ElasticsearchConnectionInfo,
  ElasticsearchIndexInfo,
  ElasticsearchSearchResponse,
  ElasticsearchDocument,
  ElasticsearchMutationResult,
  ElasticsearchIndexOperationResult,
  ElasticsearchRawResponse,
  ElasticsearchBulkExportResult,
  ElasticsearchBulkImportResult,
} from "../types/elasticsearch";
import type {
  AIProviderConfig,
  AIProviderForm,
  AIConversation,
  AIConversationDetail,
  AIChatRequest,
  AIChatResponse,
} from "../types/ai";
import type {
  McpStatus,
  McpConfig,
  McpToolInfo,
  McpDetectedClient,
} from "../types/mcp";
import type {
  MongodbConnectionInfo,
  MongodbDatabaseInfo,
  MongodbCollectionInfo,
} from "../types/mongodb";
import type {
  ExportResult,
  ExportScope,
  TransferFormat,
  ImportSqlResult,
} from "../types/export";

export type CommandArgs<T extends keyof CommandMap> = CommandMap[T]["args"];
export type CommandReturn<T extends keyof CommandMap> = CommandMap[T]["return"];

export interface CommandMap {
  // ── Query ──────────────────────────────────────────────────────────────
  execute_query: {
    args: {
      id: number;
      query: string;
      database?: string;
      source?: SqlExecutionSource;
      queryId?: string;
    };
    return: QueryResult;
  };
  cancel_query: {
    args: { uuid: string; queryId: string };
    return: boolean;
  };
  execute_by_conn: {
    args: { form: ConnectionForm; sql: string };
    return: QueryResult;
  };
  list_sql_execution_logs: {
    args: { limit?: number };
    return: SqlExecutionLog[];
  };
  list_redis_command_logs: {
    args: { limit?: number };
    return: RedisCommandLog[];
  };

  // ── Connections ────────────────────────────────────────────────────────
  get_connections: {
    args: Record<string, never>;
    return: SavedConnection[];
  };
  create_connection: {
    args: { form: ConnectionForm };
    return: SavedConnection;
  };
  update_connection: {
    args: { id: number; form: ConnectionForm };
    return: SavedConnection;
  };
  delete_connection: {
    args: { id: number };
    return: void;
  };
  create_database_by_id: {
    args: { id: number; payload: CreateDatabasePayload };
    return: void;
  };
  get_mysql_charsets_by_id: {
    args: { id: number };
    return: string[];
  };
  get_mysql_collations_by_id: {
    args: { id: number; charset?: string };
    return: string[];
  };
  test_connection_ephemeral: {
    args: { form: ConnectionForm };
    return: TestConnectionResult;
  };
  list_sqlite_issues: {
    args: Record<string, never>;
    return: SqliteConnectionIssue[];
  };
  import_connections: {
    args: { filePath: string };
    return: ImportResult;
  };

  // ── Saved Queries ──────────────────────────────────────────────────────
  get_saved_queries: {
    args: Record<string, never>;
    return: SavedQuery[];
  };
  save_query: {
    args: {
      name: string;
      query: string;
      description?: string;
      connectionId?: number;
      database?: string;
    };
    return: SavedQuery;
  };
  update_saved_query: {
    args: {
      id: number;
      name: string;
      query: string;
      description?: string;
      connectionId?: number;
      database?: string;
    };
    return: SavedQuery;
  };
  delete_saved_query: {
    args: { id: number };
    return: void;
  };

  // ── Metadata ───────────────────────────────────────────────────────────
  list_tables: {
    args: { id: number; database?: string; schema?: string };
    return: { schema: string; name: string; type: string }[];
  };
  list_routines: {
    args: { id: number; database?: string; schema?: string };
    return: RoutineInfo[];
  };
  get_table_structure: {
    args: { id: number; schema: string; table: string };
    return: { columns: { name: string; type: string; nullable: boolean }[] };
  };
  get_table_ddl: {
    args: { id: number; database?: string; schema: string; table: string };
    return: string;
  };
  get_routine_ddl: {
    args: {
      id: number;
      database?: string;
      schema: string;
      name: string;
      routineType: RoutineType;
    };
    return: string;
  };
  get_table_metadata: {
    args: { id: number; database?: string; schema: string; table: string };
    return: TableMetadata;
  };
  list_tables_by_conn: {
    args: { form: ConnectionForm };
    return: { schema: string; name: string; type: string }[];
  };
  list_databases: {
    args: { form: ConnectionForm };
    return: string[];
  };
  list_databases_by_id: {
    args: { id: number };
    return: string[];
  };
  get_schema_overview: {
    args: { id: number; database?: string; schema?: string };
    return: SchemaOverview;
  };
  get_schema_foreign_keys: {
    args: { id: number; database?: string; schema?: string };
    return: SchemaForeignKey[];
  };
  list_events: {
    args: { id: number; database?: string; schema?: string };
    return: EventInfo[];
  };
  list_sequences: {
    args: { id: number; database?: string; schema?: string };
    return: SequenceInfo[];
  };
  list_types: {
    args: { id: number; database?: string; schema?: string };
    return: TypeInfo[];
  };
  list_synonyms: {
    args: { id: number; database?: string; schema?: string };
    return: SynonymInfo[];
  };
  list_packages: {
    args: { id: number; database?: string; schema?: string };
    return: PackageInfo[];
  };
  get_driver_capabilities: {
    args: { id: number };
    return: number;
  };

  // ── Table Data ─────────────────────────────────────────────────────────
  get_table_data: {
    args: {
      id: number;
      database?: string;
      schema: string;
      table: string;
      page: number;
      limit: number;
      filter?: string;
      sortColumn?: string;
      sortDirection?: "asc" | "desc";
      orderBy?: string;
      includeTotal?: boolean;
    };
    return: {
      data: any[];
      total: number | null;
      page: number;
      limit: number;
      executionTimeMs: number;
    };
  };
  get_table_data_by_conn: {
    args: {
      form: ConnectionForm;
      schema: string;
      table: string;
      page: number;
      limit: number;
      includeTotal?: boolean;
    };
    return: {
      data: any[];
      total: number | null;
      page: number;
      limit: number;
      executionTimeMs: number;
    };
  };

  // ── Export / Import ────────────────────────────────────────────────────
  export_table_data: {
    args: {
      id: number;
      database?: string;
      schema: string;
      table: string;
      driver: string;
      format: TransferFormat;
      scope: Exclude<ExportScope, "query_result">;
      filter?: string;
      orderBy?: string;
      sortColumn?: string;
      sortDirection?: "asc" | "desc";
      page?: number;
      limit?: number;
      filePath?: string;
      chunkSize?: number;
    };
    return: ExportResult;
  };
  export_database_sql: {
    args: {
      id: number;
      database: string;
      driver: string;
      format: "sql_dml" | "sql_ddl" | "sql_full";
      filePath?: string;
      chunkSize?: number;
    };
    return: ExportResult;
  };
  export_query_result: {
    args: {
      id: number;
      database?: string;
      sql: string;
      driver: string;
      format: TransferFormat;
      filePath?: string;
    };
    return: ExportResult;
  };
  import_sql_file: {
    args: {
      id: number;
      database?: string;
      filePath: string;
      driver: string;
    };
    return: ImportSqlResult;
  };

  // ── Redis ──────────────────────────────────────────────────────────────
  redis_list_databases: {
    args: { id: number };
    return: RedisDatabaseInfo[];
  };
  redis_scan_keys: {
    args: {
      id: number;
      database?: string;
      cursor?: string;
      pattern?: string;
      limit?: number;
    };
    return: RedisScanResponse;
  };
  redis_get_key: {
    args: { id: number; database?: string; key: string };
    return: RedisKeyValue;
  };
  redis_set_key: {
    args: { id: number; database?: string; payload: RedisSetKeyPayload };
    return: RedisMutationResult;
  };
  redis_update_key: {
    args: { id: number; database?: string; payload: RedisSetKeyPayload };
    return: RedisMutationResult;
  };
  redis_delete_key: {
    args: { id: number; database?: string; key: string };
    return: RedisMutationResult;
  };
  redis_rename_key: {
    args: {
      id: number;
      database?: string;
      oldKey: string;
      newKey: string;
      force?: boolean;
    };
    return: RedisMutationResult;
  };
  redis_set_ttl: {
    args: { id: number; database?: string; key: string; ttlSeconds?: number | null };
    return: RedisMutationResult;
  };
  redis_get_key_page: {
    args: {
      id: number;
      database?: string;
      key: string;
      offset: number;
      limit: number;
    };
    return: RedisKeyValue;
  };
  redis_get_stream_range: {
    args: {
      id: number;
      database?: string;
      key: string;
      startId: string;
      count: number;
    };
    return: RedisStreamEntry[];
  };
  redis_get_stream_view: {
    args: {
      id: number;
      database?: string;
      key: string;
      startId: string;
      endId: string;
      count: number;
    };
    return: RedisStreamView;
  };
  redis_xgroup_create: {
    args: {
      id: number;
      database?: string;
      key: string;
      group: string;
      startId: string;
      mkstream?: boolean;
    };
    return: boolean;
  };
  redis_xgroup_del: {
    args: { id: number; database?: string; key: string; group: string };
    return: boolean;
  };
  redis_xgroup_setid: {
    args: {
      id: number;
      database?: string;
      key: string;
      group: string;
      startId: string;
    };
    return: boolean;
  };
  redis_xack: {
    args: {
      id: number;
      database?: string;
      key: string;
      group: string;
      ids: string[];
    };
    return: number;
  };
  redis_xpending: {
    args: {
      id: number;
      database?: string;
      key: string;
      group: string;
      start?: string;
      end?: string;
      count?: number;
      consumer?: string;
    };
    return: RedisXPendingSummary | RedisXPendingEntry[];
  };
  redis_xclaim: {
    args: {
      id: number;
      database?: string;
      key: string;
      group: string;
      consumer: string;
      minIdleMs: number;
      ids: string[];
    };
    return: RedisXClaimEntry[];
  };
  redis_xtrim: {
    args: {
      id: number;
      database?: string;
      key: string;
      strategy: string;
      threshold: string;
      approximate?: boolean;
    };
    return: number;
  };
  redis_xreadgroup: {
    args: {
      id: number;
      database?: string;
      key: string;
      group: string;
      consumer: string;
      startId: string;
      count?: number;
    };
    return: RedisStreamEntry[];
  };
  redis_execute_raw: {
    args: { id: number; database?: string; command: string };
    return: RedisRawResult;
  };
  redis_patch_key: {
    args: { id: number; database?: string; payload: RedisKeyPatchPayload };
    return: RedisMutationResult;
  };
  redis_bitmap_get_bit: {
    args: { id: number; database?: string; key: string; offset: number };
    return: boolean;
  };
  redis_bitmap_count: {
    args: {
      id: number;
      database?: string;
      key: string;
      start?: number;
      end?: number;
    };
    return: number;
  };
  redis_bitmap_pos: {
    args: {
      id: number;
      database?: string;
      key: string;
      bit: boolean;
      start?: number;
      end?: number;
      count?: number;
    };
    return: number[];
  };
  redis_hll_pfadd: {
    args: { id: number; database?: string; key: string; elements: string[] };
    return: boolean;
  };
  redis_geo_add: {
    args: { id: number; database?: string; key: string; members: RedisGeoMember[] };
    return: number;
  };
  redis_geo_pos: {
    args: { id: number; database?: string; key: string; members: string[] };
    return: (RedisGeoPosition | null)[];
  };
  redis_geo_dist: {
    args: {
      id: number;
      database?: string;
      key: string;
      member1: string;
      member2: string;
      unit?: string;
    };
    return: number;
  };
  redis_geo_search: {
    args: {
      id: number;
      database?: string;
      key: string;
      member?: string;
      longitude?: number;
      latitude?: number;
      radius: number;
      unit: string;
      withCoord?: boolean;
      withDist?: boolean;
      withHash?: boolean;
      count?: number;
    };
    return: RedisGeoSearchResult[];
  };
  redis_server_info: {
    args: { id: number; database?: string };
    return: RedisServerInfo;
  };
  redis_server_config: {
    args: { id: number; database?: string };
    return: Record<string, string>;
  };
  redis_slowlog_get: {
    args: { id: number; database?: string; count?: number };
    return: RedisSlowlogEntry[];
  };
  redis_zrangebyscore: {
    args: {
      id: number;
      database?: string;
      key: string;
      min: string;
      max: string;
      offset?: number;
      limit?: number;
    };
    return: RedisZRangeByScoreResult;
  };
  redis_zrank: {
    args: {
      id: number;
      database?: string;
      key: string;
      member: string;
      reverse?: boolean;
    };
    return: number | null;
  };
  redis_set_operation: {
    args: {
      id: number;
      database?: string;
      keys: string[];
      op: RedisSetOperation;
    };
    return: string[];
  };
  redis_sismember: {
    args: { id: number; database?: string; key: string; member: string };
    return: boolean;
  };
  redis_smove: {
    args: {
      id: number;
      database?: string;
      source: string;
      destination: string;
      member: string;
    };
    return: boolean;
  };
  redis_batch_key_ops: {
    args: { id: number; database?: string; operations: RedisBatchKeyOp[] };
    return: RedisBatchKeyOpResult[];
  };
  redis_mget: {
    args: { id: number; database?: string; keys: string[] };
    return: RedisMgetEntry[];
  };
  redis_mset: {
    args: { id: number; database?: string; entries: Record<string, string> };
    return: RedisMutationResult;
  };
  redis_cluster_info: {
    args: { id: number; database?: string };
    return: RedisClusterInfo;
  };
  redis_zscore: {
    args: { id: number; database?: string; key: string; member: string };
    return: number | null;
  };
  redis_zmscore: {
    args: { id: number; database?: string; key: string; members: string[] };
    return: (number | null)[];
  };
  redis_zrangebylex: {
    args: {
      id: number;
      database?: string;
      key: string;
      min: string;
      max: string;
      offset?: number;
      limit?: number;
    };
    return: RedisZRangeByLexResult;
  };
  redis_zlexcount: {
    args: { id: number; database?: string; key: string; min: string; max: string };
    return: number;
  };
  redis_zpopmin: {
    args: { id: number; database?: string; key: string; count?: number };
    return: { member: string; score: number }[];
  };
  redis_zpopmax: {
    args: { id: number; database?: string; key: string; count?: number };
    return: { member: string; score: number }[];
  };
  redis_lindex: {
    args: { id: number; database?: string; key: string; index: number };
    return: string | null;
  };
  redis_lpos: {
    args: {
      id: number;
      database?: string;
      key: string;
      element: string;
      rank?: number;
      count?: number;
      maxlen?: number;
    };
    return: number[];
  };
  redis_ltrim: {
    args: {
      id: number;
      database?: string;
      key: string;
      start: number;
      stop: number;
    };
    return: boolean;
  };
  redis_linsert: {
    args: {
      id: number;
      database?: string;
      key: string;
      position: RedisLInsertPosition;
      pivot: string;
      element: string;
    };
    return: number;
  };
  redis_lmove: {
    args: {
      id: number;
      database?: string;
      source: string;
      destination: string;
      srcDirection: RedisLMoveDirection;
      dstDirection: RedisLMoveDirection;
    };
    return: string | null;
  };

  // ── Elasticsearch ──────────────────────────────────────────────────────
  elasticsearch_test_connection: {
    args: { id: number };
    return: ElasticsearchConnectionInfo;
  };
  elasticsearch_test_connection_ephemeral: {
    args: { form: ConnectionForm };
    return: TestConnectionResult;
  };
  elasticsearch_list_indices: {
    args: { id: number };
    return: ElasticsearchIndexInfo[];
  };
  elasticsearch_get_index_mapping: {
    args: { id: number; index: string };
    return: any;
  };
  elasticsearch_create_index: {
    args: { id: number; index: string; body?: any };
    return: ElasticsearchIndexOperationResult;
  };
  elasticsearch_delete_index: {
    args: { id: number; index: string };
    return: ElasticsearchIndexOperationResult;
  };
  elasticsearch_refresh_index: {
    args: { id: number; index: string };
    return: ElasticsearchIndexOperationResult;
  };
  elasticsearch_open_index: {
    args: { id: number; index: string };
    return: ElasticsearchIndexOperationResult;
  };
  elasticsearch_close_index: {
    args: { id: number; index: string };
    return: ElasticsearchIndexOperationResult;
  };
  elasticsearch_search_documents: {
    args: {
      id: number;
      index: string;
      query?: string;
      dsl?: string;
      from: number;
      size: number;
    };
    return: ElasticsearchSearchResponse;
  };
  elasticsearch_get_document: {
    args: { id: number; index: string; documentId: string };
    return: ElasticsearchDocument;
  };
  elasticsearch_upsert_document: {
    args: {
      id: number;
      index: string;
      documentId?: string;
      source: any;
      refresh?: boolean;
    };
    return: ElasticsearchMutationResult;
  };
  elasticsearch_delete_document: {
    args: {
      id: number;
      index: string;
      documentId: string;
      refresh?: boolean;
    };
    return: ElasticsearchMutationResult;
  };
  elasticsearch_export_documents: {
    args: {
      id: number;
      index: string;
      query?: string;
      dsl?: string;
      filePath: string;
      batchSize?: number;
    };
    return: ElasticsearchBulkExportResult;
  };
  elasticsearch_import_documents: {
    args: {
      id: number;
      index: string;
      filePath: string;
      batchSize?: number;
      refresh?: boolean;
    };
    return: ElasticsearchBulkImportResult;
  };
  elasticsearch_execute_raw: {
    args: { id: number; method: string; path: string; body?: string };
    return: ElasticsearchRawResponse;
  };

  // ── MongoDB ────────────────────────────────────────────────────────────
  mongodb_test_connection: {
    args: { id: number };
    return: MongodbConnectionInfo;
  };
  mongodb_test_connection_ephemeral: {
    args: { form: ConnectionForm };
    return: TestConnectionResult;
  };
  mongodb_list_databases: {
    args: { id: number };
    return: MongodbDatabaseInfo[];
  };
  mongodb_list_collections: {
    args: { id: number; database: string };
    return: MongodbCollectionInfo[];
  };
  mongodb_find_documents: {
    args: {
      id: number;
      database: string;
      collection: string;
      filter?: string;
      page?: number;
      pageSize?: number;
    };
    return: { documents: any[]; total: number; page: number; pageSize: number };
  };
  mongodb_insert_document: {
    args: { id: number; database: string; collection: string; document: any };
    return: { success: boolean; insertedId: string };
  };
  mongodb_delete_document: {
    args: { id: number; database: string; collection: string; documentId: string };
    return: { success: boolean; deletedCount: number };
  };
  mongodb_update_document: {
    args: {
      id: number;
      database: string;
      collection: string;
      documentId: string;
      update: any;
    };
    return: { success: boolean; modifiedCount: number };
  };
  mongodb_get_document: {
    args: { id: number; database: string; collection: string; documentId: string };
    return: any;
  };

  // ── AI ─────────────────────────────────────────────────────────────────
  ai_list_providers: {
    args: Record<string, never>;
    return: AIProviderConfig[];
  };
  ai_create_provider: {
    args: { config: AIProviderForm };
    return: AIProviderConfig;
  };
  ai_update_provider: {
    args: { id: number; config: AIProviderForm };
    return: AIProviderConfig;
  };
  ai_delete_provider: {
    args: { id: number };
    return: void;
  };
  ai_set_default_provider: {
    args: { id: number };
    return: void;
  };
  ai_clear_provider_api_key: {
    args: { provider_type: string };
    return: void;
  };
  ai_chat_start: {
    args: { request: AIChatRequest };
    return: AIChatResponse;
  };
  ai_chat_continue: {
    args: { request: AIChatRequest };
    return: AIChatResponse;
  };
  ai_list_conversations: {
    args: { connectionId?: number; database?: string };
    return: AIConversation[];
  };
  ai_get_conversation: {
    args: { conversationId: number };
    return: AIConversationDetail;
  };
  ai_delete_conversation: {
    args: { conversationId: number };
    return: void;
  };

  // ── MCP ────────────────────────────────────────────────────────────────
  mcp_status: {
    args: Record<string, never>;
    return: McpStatus;
  };
  mcp_start: {
    args: { config: McpConfig };
    return: McpStatus;
  };
  mcp_stop: {
    args: Record<string, never>;
    return: McpStatus;
  };
  mcp_get_tools: {
    args: Record<string, never>;
    return: McpToolInfo[];
  };
  mcp_detect_clients: {
    args: Record<string, never>;
    return: McpDetectedClient[];
  };
  mcp_configure_client: {
    args: { clientName: string };
    return: string;
  };

  // ── System ─────────────────────────────────────────────────────────────
  list_system_fonts: {
    args: Record<string, never>;
    return: string[];
  };
}
