import { COMMANDS } from "../commands";

export async function mockRedisListDatabases(_id: number): Promise<any[]> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return [
    { index: 0, name: "0", selected: true, keyCount: 10 },
    { index: 1, name: "1", selected: false, keyCount: 5 },
  ];
}

export async function mockRedisScanKeys(params: any): Promise<any> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  const allKeys = [
    { key: "user:1", keyType: "string", ttl: -1 },
    { key: "user:2", keyType: "hash", ttl: 3600 },
    { key: "session:abc", keyType: "string", ttl: 1800 },
    { key: "counter:visits", keyType: "string", ttl: -1 },
    { key: "tags", keyType: "set", ttl: -1 },
    { key: "leaderboard", keyType: "zset", ttl: -1 },
    { key: "queue:jobs", keyType: "list", ttl: -1 },
    { key: "cache:page", keyType: "string", ttl: -2 },
  ];

  const pattern: string = params?.pattern ?? "*";
  let filtered = allKeys;
  if (pattern !== "*") {
    const regex = new RegExp(
      "^" + pattern.replace(/[.+^${}()|[\]\\-]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$",
    );
    filtered = allKeys.filter((k) => regex.test(k.key));
  }

  return {
    cursor: "0",
    keys: filtered,
    isPartial: false,
  };
}

export async function mockRedisGetKey(
  _id: number,
  _database: string | undefined,
  key: string,
): Promise<any> {
  await new Promise((resolve) => setTimeout(resolve, 50));

  const typeValues: Record<string, any> = {
    "user:1": {
      key: "user:1",
      keyType: "string",
      ttl: -1,
      value: { kind: "string", value: "alice" },
      valueTotalLen: 5,
      valueOffset: 0,
      isBinary: false,
      extra: null,
      objectEncoding: "raw",
      memoryUsage: 56,
      objectIdletime: 0,
      objectRefcount: 1,
      keyExists: true,
    },
    "user:2": {
      key: "user:2",
      keyType: "hash",
      ttl: 3600,
      value: { kind: "hash", value: { name: "Bob", email: "bob@example.com" } },
      valueTotalLen: 2,
      valueOffset: 0,
      isBinary: false,
      extra: null,
      objectEncoding: "ziplist",
      memoryUsage: 128,
      objectIdletime: 10,
      objectRefcount: 1,
      keyExists: true,
    },
    "session:abc": {
      key: "session:abc",
      keyType: "string",
      ttl: 1800,
      value: { kind: "string", value: "session-data-123" },
      valueTotalLen: 16,
      valueOffset: 0,
      isBinary: false,
      extra: null,
      objectEncoding: "raw",
      memoryUsage: 64,
      objectIdletime: 5,
      objectRefcount: 1,
      keyExists: true,
    },
    "counter:visits": {
      key: "counter:visits",
      keyType: "string",
      ttl: -1,
      value: { kind: "string", value: "42" },
      valueTotalLen: 2,
      valueOffset: 0,
      isBinary: false,
      extra: null,
      objectEncoding: "int",
      memoryUsage: 16,
      objectIdletime: 0,
      objectRefcount: 1,
      keyExists: true,
    },
    "tags": {
      key: "tags",
      keyType: "set",
      ttl: -1,
      value: { kind: "set", value: ["go", "rust", "typescript"] },
      valueTotalLen: 3,
      valueOffset: 0,
      isBinary: false,
      extra: null,
      objectEncoding: "hashtable",
      memoryUsage: 96,
      objectIdletime: 0,
      objectRefcount: 1,
      keyExists: true,
    },
    "leaderboard": {
      key: "leaderboard",
      keyType: "zset",
      ttl: -1,
      value: {
        kind: "zSet",
        value: [
          { member: "alice", score: 100 },
          { member: "bob", score: 85 },
          { member: "charlie", score: 72 },
        ],
      },
      valueTotalLen: 3,
      valueOffset: 0,
      isBinary: false,
      extra: null,
      objectEncoding: "ziplist",
      memoryUsage: 120,
      objectIdletime: 0,
      objectRefcount: 1,
      keyExists: true,
    },
    "queue:jobs": {
      key: "queue:jobs",
      keyType: "list",
      ttl: -1,
      value: { kind: "list", value: ["job-1", "job-2", "job-3"] },
      valueTotalLen: 3,
      valueOffset: 0,
      isBinary: false,
      extra: null,
      objectEncoding: "ziplist",
      memoryUsage: 80,
      objectIdletime: 0,
      objectRefcount: 1,
      keyExists: true,
    },
    "cache:page": {
      key: "cache:page",
      keyType: "string",
      ttl: -2,
      value: { kind: "string", value: "" },
      valueTotalLen: 0,
      valueOffset: 0,
      isBinary: false,
      extra: null,
      objectEncoding: "raw",
      memoryUsage: 0,
      objectIdletime: 0,
      objectRefcount: 1,
      keyExists: false,
    },
  };

  return typeValues[key] ?? {
    key,
    keyType: "string",
    ttl: -1,
    value: { kind: "string", value: "mock-value" },
    valueTotalLen: 11,
    valueOffset: 0,
    isBinary: false,
    extra: null,
    objectEncoding: "raw",
    memoryUsage: 56,
    objectIdletime: 0,
    objectRefcount: 1,
    keyExists: true,
  };
}

export async function mockRedisSetKey(
  _id: number,
  _database: string | undefined,
  _payload: any,
): Promise<any> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return { success: true, affected: 1 };
}

export async function mockRedisDeleteKey(
  _id: number,
  _database: string | undefined,
  _key: string,
): Promise<any> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return { success: true, affected: 1 };
}

export async function mockRedisRenameKey(
  _id: number,
  _database: string | undefined,
  _oldKey: string,
  _newKey: string,
  _force?: boolean,
): Promise<any> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return { success: true, affected: 1 };
}

export async function mockRedisSetTtl(
  _id: number,
  _database: string | undefined,
  _key: string,
  _ttlSeconds?: number | null,
): Promise<any> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return { success: true, affected: 1 };
}

export async function mockRedisServerInfo(
  _id: number,
  _database: string | undefined,
): Promise<any> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return {
    sections: {
      server: {
        redis_version: "7.0.0",
        redis_mode: "standalone",
        os: "Linux",
      },
      stats: {
        total_connections_received: "100",
        total_commands_processed: "1000",
      },
    },
    dbsize: 15,
  };
}

export async function mockRedisServerConfig(
  _id: number,
  _database: string | undefined,
): Promise<Record<string, string>> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return {
    "maxmemory": "1073741824",
    "maxmemory-policy": "allkeys-lru",
    "timeout": "300",
  };
}

export async function mockRedisSlowlogGet(
  _id: number,
  _database: string | undefined,
  _count?: number,
): Promise<any[]> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return [
    {
      id: 1,
      timestamp: Math.floor(Date.now() / 1000) - 60,
      durationMs: 15,
      command: "KEYS *",
    },
    {
      id: 2,
      timestamp: Math.floor(Date.now() / 1000) - 120,
      durationMs: 25,
      command: "LRANGE mylist 0 -1",
    },
  ];
}

export async function mockRedisExecuteRaw(
  _id: number,
  _database: string | undefined,
  _command: string,
): Promise<any> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return { output: "PONG" };
}

export function handleRedis(cmd: string, args?: any): Promise<any> | null {
  switch (cmd) {
    case COMMANDS.REDIS_LIST_DATABASES:
      return mockRedisListDatabases(args.id);
    case COMMANDS.REDIS_SCAN_KEYS:
      return mockRedisScanKeys(args);
    case COMMANDS.REDIS_GET_KEY:
      return mockRedisGetKey(args.id, args.database, args.key);
    case COMMANDS.REDIS_SET_KEY:
      return mockRedisSetKey(args.id, args.database, args.payload);
    case COMMANDS.REDIS_DELETE_KEY:
      return mockRedisDeleteKey(args.id, args.database, args.key);
    case COMMANDS.REDIS_RENAME_KEY:
      return mockRedisRenameKey(
        args.id,
        args.database,
        args.oldKey,
        args.newKey,
        args.force,
      );
    case COMMANDS.REDIS_SET_TTL:
      return mockRedisSetTtl(
        args.id,
        args.database,
        args.key,
        args.ttlSeconds,
      );
    case COMMANDS.REDIS_SERVER_INFO:
      return mockRedisServerInfo(args.id, args.database);
    case COMMANDS.REDIS_SERVER_CONFIG:
      return mockRedisServerConfig(args.id, args.database);
    case COMMANDS.REDIS_SLOWLOG_GET:
      return mockRedisSlowlogGet(args.id, args.database, args.count);
    case COMMANDS.REDIS_EXECUTE_RAW:
      return mockRedisExecuteRaw(args.id, args.database, args.command);
    case COMMANDS.REDIS_UPDATE_KEY:
      return Promise.resolve({ ok: true });
    case COMMANDS.REDIS_GET_KEY_PAGE:
      return Promise.resolve({ items: [], total: 0, cursor: "0" });
    case COMMANDS.REDIS_GET_STREAM_RANGE:
      return Promise.resolve({ messages: [], next_cursor: "0" });
    case COMMANDS.REDIS_GET_STREAM_VIEW:
      return Promise.resolve({ messages: [], next_cursor: "0" });
    case COMMANDS.REDIS_XGROUP_CREATE:
      return Promise.resolve({ ok: true });
    case COMMANDS.REDIS_XGROUP_DEL:
      return Promise.resolve({ ok: true });
    case COMMANDS.REDIS_XGROUP_SETID:
      return Promise.resolve({ ok: true });
    case COMMANDS.REDIS_XACK:
      return Promise.resolve({ acked: 0 });
    case COMMANDS.REDIS_XPENDING:
      return Promise.resolve({ pending: [] });
    case COMMANDS.REDIS_XCLAIM:
      return Promise.resolve({ claimed: [] });
    case COMMANDS.REDIS_XTRIM:
      return Promise.resolve({ trimmed: 0 });
    case COMMANDS.REDIS_XREADGROUP:
      return Promise.resolve({ messages: [] });
    case COMMANDS.REDIS_PATCH_KEY:
      return Promise.resolve({ ok: true });
    case COMMANDS.REDIS_BITMAP_GET_BIT:
      return Promise.resolve({ value: false });
    case COMMANDS.REDIS_BITMAP_COUNT:
      return Promise.resolve({ count: 0 });
    case COMMANDS.REDIS_BITMAP_POS:
      return Promise.resolve({ positions: [] });
    case COMMANDS.REDIS_HLL_PFADD:
      return Promise.resolve({ added: true });
    case COMMANDS.REDIS_GEO_ADD:
      return Promise.resolve({ added: 0 });
    case COMMANDS.REDIS_GEO_POS:
      return Promise.resolve([]);
    case COMMANDS.REDIS_GEO_DIST:
      return Promise.resolve({ distance: 0 });
    case COMMANDS.REDIS_GEO_SEARCH:
      return Promise.resolve([]);
    case COMMANDS.REDIS_ZRANGEBYSCORE:
      return Promise.resolve([]);
    case COMMANDS.REDIS_ZRANK:
      return Promise.resolve({ rank: 0 });
    case COMMANDS.REDIS_SET_OPERATION:
      return Promise.resolve([]);
    case COMMANDS.REDIS_SISMEMBER:
      return Promise.resolve({ is_member: false });
    case COMMANDS.REDIS_SMOVE:
      return Promise.resolve({ moved: false });
    case COMMANDS.REDIS_BATCH_KEY_OPS:
      return Promise.resolve({ results: [] });
    case COMMANDS.REDIS_MGET:
      return Promise.resolve([]);
    case COMMANDS.REDIS_MSET:
      return Promise.resolve({ ok: true });
    case COMMANDS.REDIS_CLUSTER_INFO:
      return Promise.resolve({});
    case COMMANDS.REDIS_ZSCORE:
      return Promise.resolve({ score: null });
    case COMMANDS.REDIS_ZMSCORE:
      return Promise.resolve([]);
    case COMMANDS.REDIS_ZRANGEBYLEX:
      return Promise.resolve([]);
    case COMMANDS.REDIS_ZLEXCOUNT:
      return Promise.resolve({ count: 0 });
    case COMMANDS.REDIS_ZPOPMIN:
      return Promise.resolve({ items: [] });
    case COMMANDS.REDIS_ZPOPMAX:
      return Promise.resolve({ items: [] });
    case COMMANDS.REDIS_LINDEX:
      return Promise.resolve(null);
    case COMMANDS.REDIS_LPOS:
      return Promise.resolve({ index: null });
    case COMMANDS.REDIS_LTRIM:
      return Promise.resolve({ ok: true });
    case COMMANDS.REDIS_LINSERT:
      return Promise.resolve({ length: 0 });
    case COMMANDS.REDIS_LMOVE:
      return Promise.resolve(null);
    default:
      return null;
  }
}
