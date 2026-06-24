import { invoke } from "./core";
import { COMMANDS } from "@/services/commands";
import type {
  RedisBatchKeyOp,
  RedisBatchKeyOpResult,
  RedisClusterInfo,
  RedisCommandLog,
  RedisDatabaseInfo,
  RedisGeoMember,
  RedisGeoPosition,
  RedisGeoSearchResult,
  RedisKeyPatchPayload,
  RedisKeyValue,
  RedisLInsertPosition,
  RedisLMoveDirection,
  RedisMgetEntry,
  RedisMutationResult,
  RedisRawResult,
  RedisScanResponse,
  RedisServerInfo,
  RedisSetKeyPayload,
  RedisSetOperation,
  RedisSlowlogEntry,
  RedisStreamEntry,
  RedisStreamView,
  RedisXClaimEntry,
  RedisXPendingEntry,
  RedisXPendingSummary,
  RedisZRangeByLexResult,
  RedisZRangeByScoreResult,
} from "../types";

export const redisApi = {
  redisLogs: {
    list: (limit = 100) =>
      invoke<RedisCommandLog[]>(COMMANDS.LIST_REDIS_COMMAND_LOGS, { limit }),
  },
  redis: {
    listDatabases: (id: number) =>
      invoke<RedisDatabaseInfo[]>(COMMANDS.REDIS_LIST_DATABASES, { id }),
    scanKeys: (params: {
      id: number;
      database?: string;
      cursor?: string;
      pattern?: string;
      limit?: number;
    }) => invoke<RedisScanResponse>(COMMANDS.REDIS_SCAN_KEYS, params),
    getKey: (id: number, database: string | undefined, key: string) =>
      invoke<RedisKeyValue>(COMMANDS.REDIS_GET_KEY, { id, database, key }),
    setKey: (
      id: number,
      database: string | undefined,
      payload: RedisSetKeyPayload,
    ) =>
      invoke<RedisMutationResult>(COMMANDS.REDIS_SET_KEY, { id, database, payload }),
    updateKey: (
      id: number,
      database: string | undefined,
      payload: RedisSetKeyPayload,
    ) =>
      invoke<RedisMutationResult>(COMMANDS.REDIS_UPDATE_KEY, {
        id,
        database,
        payload,
      }),
    deleteKey: (id: number, database: string | undefined, key: string) =>
      invoke<RedisMutationResult>(COMMANDS.REDIS_DELETE_KEY, { id, database, key }),
    renameKey: (
      id: number,
      database: string | undefined,
      oldKey: string,
      newKey: string,
      force?: boolean,
    ) =>
      invoke<RedisMutationResult>(COMMANDS.REDIS_RENAME_KEY, {
        id,
        database,
        oldKey,
        newKey,
        force,
      }),
    setTtl: (
      id: number,
      database: string | undefined,
      key: string,
      ttlSeconds?: number | null,
    ) =>
      invoke<RedisMutationResult>(COMMANDS.REDIS_SET_TTL, {
        id,
        database,
        key,
        ttlSeconds,
      }),
    getKeyPage: (
      id: number,
      database: string | undefined,
      key: string,
      offset: number,
      limit: number,
    ) =>
      invoke<RedisKeyValue>(COMMANDS.REDIS_GET_KEY_PAGE, {
        id,
        database,
        key,
        offset,
        limit,
      }),
    getStreamRange: (
      id: number,
      database: string | undefined,
      key: string,
      startId: string,
      count: number,
    ) =>
      invoke<RedisStreamEntry[]>(COMMANDS.REDIS_GET_STREAM_RANGE, {
        id,
        database,
        key,
        startId,
        count,
      }),
    getStreamView: (
      id: number,
      database: string | undefined,
      key: string,
      startId: string,
      endId: string,
      count: number,
    ) =>
      invoke<RedisStreamView>(COMMANDS.REDIS_GET_STREAM_VIEW, {
        id,
        database,
        key,
        startId,
        endId,
        count,
      }),
    xgroupCreate: (
      id: number,
      database: string | undefined,
      key: string,
      group: string,
      startId: string,
      mkstream?: boolean,
    ) =>
      invoke<boolean>(COMMANDS.REDIS_XGROUP_CREATE, {
        id,
        database,
        key,
        group,
        startId,
        mkstream,
      }),
    xgroupDel: (
      id: number,
      database: string | undefined,
      key: string,
      group: string,
    ) => invoke<boolean>(COMMANDS.REDIS_XGROUP_DEL, { id, database, key, group }),
    xgroupSetId: (
      id: number,
      database: string | undefined,
      key: string,
      group: string,
      startId: string,
    ) =>
      invoke<boolean>(COMMANDS.REDIS_XGROUP_SETID, {
        id,
        database,
        key,
        group,
        startId,
      }),
    xack: (
      id: number,
      database: string | undefined,
      key: string,
      group: string,
      ids: string[],
    ) => invoke<number>(COMMANDS.REDIS_XACK, { id, database, key, group, ids }),
    xpending: (
      id: number,
      database: string | undefined,
      key: string,
      group: string,
      start?: string,
      end?: string,
      count?: number,
      consumer?: string,
    ) =>
      invoke<RedisXPendingSummary | RedisXPendingEntry[]>(COMMANDS.REDIS_XPENDING, {
        id,
        database,
        key,
        group,
        start,
        end,
        count,
        consumer,
      }),
    xclaim: (
      id: number,
      database: string | undefined,
      key: string,
      group: string,
      consumer: string,
      minIdleMs: number,
      ids: string[],
    ) =>
      invoke<RedisXClaimEntry[]>(COMMANDS.REDIS_XCLAIM, {
        id,
        database,
        key,
        group,
        consumer,
        minIdleMs,
        ids,
      }),
    xtrim: (
      id: number,
      database: string | undefined,
      key: string,
      strategy: string,
      threshold: string,
      approximate?: boolean,
    ) =>
      invoke<number>(COMMANDS.REDIS_XTRIM, {
        id,
        database,
        key,
        strategy,
        threshold,
        approximate,
      }),
    xreadgroup: (
      id: number,
      database: string | undefined,
      key: string,
      group: string,
      consumer: string,
      startId: string,
      count?: number,
    ) =>
      invoke<RedisStreamEntry[]>(COMMANDS.REDIS_XREADGROUP, {
        id,
        database,
        key,
        group,
        consumer,
        startId,
        count,
      }),
    executeRaw: (id: number, database: string | undefined, command: string) =>
      invoke<RedisRawResult>(COMMANDS.REDIS_EXECUTE_RAW, { id, database, command }),
    patchKey: (
      id: number,
      database: string | undefined,
      payload: RedisKeyPatchPayload,
    ) =>
      invoke<RedisMutationResult>(COMMANDS.REDIS_PATCH_KEY, { id, database, payload }),
    bitmapGetBit: (
      id: number,
      database: string | undefined,
      key: string,
      offset: number,
    ) => invoke<boolean>(COMMANDS.REDIS_BITMAP_GET_BIT, { id, database, key, offset }),
    bitmapCount: (
      id: number,
      database: string | undefined,
      key: string,
      start?: number,
      end?: number,
    ) =>
      invoke<number>(COMMANDS.REDIS_BITMAP_COUNT, { id, database, key, start, end }),
    bitmapPos: (
      id: number,
      database: string | undefined,
      key: string,
      bit: boolean,
      start?: number,
      end?: number,
      count?: number,
    ) =>
      invoke<number[]>(COMMANDS.REDIS_BITMAP_POS, {
        id,
        database,
        key,
        bit,
        start,
        end,
        count,
      }),
    hllPfadd: (
      id: number,
      database: string | undefined,
      key: string,
      elements: string[],
    ) => invoke<boolean>(COMMANDS.REDIS_HLL_PFADD, { id, database, key, elements }),
    geoAdd: (
      id: number,
      database: string | undefined,
      key: string,
      members: RedisGeoMember[],
    ) => invoke<number>(COMMANDS.REDIS_GEO_ADD, { id, database, key, members }),
    geoPos: (
      id: number,
      database: string | undefined,
      key: string,
      members: string[],
    ) =>
      invoke<(RedisGeoPosition | null)[]>(COMMANDS.REDIS_GEO_POS, {
        id,
        database,
        key,
        members,
      }),
    geoDist: (
      id: number,
      database: string | undefined,
      key: string,
      member1: string,
      member2: string,
      unit?: string,
    ) =>
      invoke<number>(COMMANDS.REDIS_GEO_DIST, {
        id,
        database,
        key,
        member1,
        member2,
        unit,
      }),
    geoSearch: (
      id: number,
      database: string | undefined,
      key: string,
      params: {
        member?: string;
        longitude?: number;
        latitude?: number;
        radius: number;
        unit: string;
        withCoord?: boolean;
        withDist?: boolean;
        withHash?: boolean;
        count?: number;
      },
    ) =>
      invoke<RedisGeoSearchResult[]>(COMMANDS.REDIS_GEO_SEARCH, {
        id,
        database,
        key,
        ...params,
      }),
    serverInfo: (id: number, database: string | undefined) =>
      invoke<RedisServerInfo>(COMMANDS.REDIS_SERVER_INFO, { id, database }),
    serverConfig: (id: number, database: string | undefined) =>
      invoke<Record<string, string>>(COMMANDS.REDIS_SERVER_CONFIG, { id, database }),
    slowlogGet: (id: number, database: string | undefined, count?: number) =>
      invoke<RedisSlowlogEntry[]>(COMMANDS.REDIS_SLOWLOG_GET, { id, database, count }),
    zrangebyscore: (
      id: number,
      database: string | undefined,
      key: string,
      min: string,
      max: string,
      offset?: number,
      limit?: number,
    ) =>
      invoke<RedisZRangeByScoreResult>(COMMANDS.REDIS_ZRANGEBYSCORE, {
        id,
        database,
        key,
        min,
        max,
        offset,
        limit,
      }),
    zrank: (
      id: number,
      database: string | undefined,
      key: string,
      member: string,
      reverse?: boolean,
    ) =>
      invoke<number | null>(COMMANDS.REDIS_ZRANK, {
        id,
        database,
        key,
        member,
        reverse,
      }),
    setOperation: (
      id: number,
      database: string | undefined,
      keys: string[],
      op: RedisSetOperation,
    ) => invoke<string[]>(COMMANDS.REDIS_SET_OPERATION, { id, database, keys, op }),
    sismember: (
      id: number,
      database: string | undefined,
      key: string,
      member: string,
    ) => invoke<boolean>(COMMANDS.REDIS_SISMEMBER, { id, database, key, member }),
    smove: (
      id: number,
      database: string | undefined,
      source: string,
      destination: string,
      member: string,
    ) =>
      invoke<boolean>(COMMANDS.REDIS_SMOVE, {
        id,
        database,
        source,
        destination,
        member,
      }),
    batchKeyOps: (
      id: number,
      database: string | undefined,
      operations: RedisBatchKeyOp[],
    ) =>
      invoke<RedisBatchKeyOpResult[]>(COMMANDS.REDIS_BATCH_KEY_OPS, {
        id,
        database,
        operations,
      }),
    mget: (id: number, database: string | undefined, keys: string[]) =>
      invoke<RedisMgetEntry[]>(COMMANDS.REDIS_MGET, { id, database, keys }),
    mset: (
      id: number,
      database: string | undefined,
      entries: Record<string, string>,
    ) => invoke<RedisMutationResult>(COMMANDS.REDIS_MSET, { id, database, entries }),
    clusterInfo: (id: number, database: string | undefined) =>
      invoke<RedisClusterInfo>(COMMANDS.REDIS_CLUSTER_INFO, { id, database }),
    zscore: (
      id: number,
      database: string | undefined,
      key: string,
      member: string,
    ) => invoke<number | null>(COMMANDS.REDIS_ZSCORE, { id, database, key, member }),
    zmscore: (
      id: number,
      database: string | undefined,
      key: string,
      members: string[],
    ) =>
      invoke<(number | null)[]>(COMMANDS.REDIS_ZMSCORE, {
        id,
        database,
        key,
        members,
      }),
    zrangebylex: (
      id: number,
      database: string | undefined,
      key: string,
      min: string,
      max: string,
      offset?: number,
      limit?: number,
    ) =>
      invoke<RedisZRangeByLexResult>(COMMANDS.REDIS_ZRANGEBYLEX, {
        id,
        database,
        key,
        min,
        max,
        offset,
        limit,
      }),
    zlexcount: (
      id: number,
      database: string | undefined,
      key: string,
      min: string,
      max: string,
    ) => invoke<number>(COMMANDS.REDIS_ZLEXCOUNT, { id, database, key, min, max }),
    zpopmin: (
      id: number,
      database: string | undefined,
      key: string,
      count?: number,
    ) =>
      invoke<{ member: string; score: number }[]>(COMMANDS.REDIS_ZPOPMIN, {
        id,
        database,
        key,
        count,
      }),
    zpopmax: (
      id: number,
      database: string | undefined,
      key: string,
      count?: number,
    ) =>
      invoke<{ member: string; score: number }[]>(COMMANDS.REDIS_ZPOPMAX, {
        id,
        database,
        key,
        count,
      }),
    lindex: (
      id: number,
      database: string | undefined,
      key: string,
      index: number,
    ) => invoke<string | null>(COMMANDS.REDIS_LINDEX, { id, database, key, index }),
    lpos: (
      id: number,
      database: string | undefined,
      key: string,
      element: string,
      rank?: number,
      count?: number,
      maxlen?: number,
    ) =>
      invoke<number[]>(COMMANDS.REDIS_LPOS, {
        id,
        database,
        key,
        element,
        rank,
        count,
        maxlen,
      }),
    ltrim: (
      id: number,
      database: string | undefined,
      key: string,
      start: number,
      stop: number,
    ) => invoke<boolean>(COMMANDS.REDIS_LTRIM, { id, database, key, start, stop }),
    linsert: (
      id: number,
      database: string | undefined,
      key: string,
      position: RedisLInsertPosition,
      pivot: string,
      element: string,
    ) =>
      invoke<number>(COMMANDS.REDIS_LINSERT, {
        id,
        database,
        key,
        position,
        pivot,
        element,
      }),
    lmove: (
      id: number,
      database: string | undefined,
      source: string,
      destination: string,
      srcDirection: RedisLMoveDirection,
      dstDirection: RedisLMoveDirection,
    ) =>
      invoke<string | null>(COMMANDS.REDIS_LMOVE, {
        id,
        database,
        source,
        destination,
        srcDirection,
        dstDirection,
      }),
  },
};
