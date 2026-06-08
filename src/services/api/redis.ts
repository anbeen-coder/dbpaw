import { invoke } from "./core";
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
      invoke<RedisCommandLog[]>("list_redis_command_logs", { limit }),
  },
  redis: {
    listDatabases: (id: number) =>
      invoke<RedisDatabaseInfo[]>("redis_list_databases", { id }),
    scanKeys: (params: {
      id: number;
      database?: string;
      cursor?: string;
      pattern?: string;
      limit?: number;
    }) => invoke<RedisScanResponse>("redis_scan_keys", params),
    getKey: (id: number, database: string | undefined, key: string) =>
      invoke<RedisKeyValue>("redis_get_key", { id, database, key }),
    setKey: (
      id: number,
      database: string | undefined,
      payload: RedisSetKeyPayload,
    ) =>
      invoke<RedisMutationResult>("redis_set_key", { id, database, payload }),
    updateKey: (
      id: number,
      database: string | undefined,
      payload: RedisSetKeyPayload,
    ) =>
      invoke<RedisMutationResult>("redis_update_key", {
        id,
        database,
        payload,
      }),
    deleteKey: (id: number, database: string | undefined, key: string) =>
      invoke<RedisMutationResult>("redis_delete_key", { id, database, key }),
    renameKey: (
      id: number,
      database: string | undefined,
      oldKey: string,
      newKey: string,
      force?: boolean,
    ) =>
      invoke<RedisMutationResult>("redis_rename_key", {
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
      invoke<RedisMutationResult>("redis_set_ttl", {
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
      invoke<RedisKeyValue>("redis_get_key_page", {
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
      invoke<RedisStreamEntry[]>("redis_get_stream_range", {
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
      invoke<RedisStreamView>("redis_get_stream_view", {
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
      invoke<boolean>("redis_xgroup_create", {
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
    ) => invoke<boolean>("redis_xgroup_del", { id, database, key, group }),
    xgroupSetId: (
      id: number,
      database: string | undefined,
      key: string,
      group: string,
      startId: string,
    ) =>
      invoke<boolean>("redis_xgroup_setid", {
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
    ) => invoke<number>("redis_xack", { id, database, key, group, ids }),
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
      invoke<RedisXPendingSummary | RedisXPendingEntry[]>("redis_xpending", {
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
      invoke<RedisXClaimEntry[]>("redis_xclaim", {
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
      invoke<number>("redis_xtrim", {
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
      invoke<RedisStreamEntry[]>("redis_xreadgroup", {
        id,
        database,
        key,
        group,
        consumer,
        startId,
        count,
      }),
    executeRaw: (id: number, database: string | undefined, command: string) =>
      invoke<RedisRawResult>("redis_execute_raw", { id, database, command }),
    patchKey: (
      id: number,
      database: string | undefined,
      payload: RedisKeyPatchPayload,
    ) =>
      invoke<RedisMutationResult>("redis_patch_key", { id, database, payload }),
    bitmapGetBit: (
      id: number,
      database: string | undefined,
      key: string,
      offset: number,
    ) => invoke<boolean>("redis_bitmap_get_bit", { id, database, key, offset }),
    bitmapCount: (
      id: number,
      database: string | undefined,
      key: string,
      start?: number,
      end?: number,
    ) =>
      invoke<number>("redis_bitmap_count", { id, database, key, start, end }),
    bitmapPos: (
      id: number,
      database: string | undefined,
      key: string,
      bit: boolean,
      start?: number,
      end?: number,
      count?: number,
    ) =>
      invoke<number[]>("redis_bitmap_pos", {
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
    ) => invoke<boolean>("redis_hll_pfadd", { id, database, key, elements }),
    geoAdd: (
      id: number,
      database: string | undefined,
      key: string,
      members: RedisGeoMember[],
    ) => invoke<number>("redis_geo_add", { id, database, key, members }),
    geoPos: (
      id: number,
      database: string | undefined,
      key: string,
      members: string[],
    ) =>
      invoke<(RedisGeoPosition | null)[]>("redis_geo_pos", {
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
      invoke<number>("redis_geo_dist", {
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
      invoke<RedisGeoSearchResult[]>("redis_geo_search", {
        id,
        database,
        key,
        ...params,
      }),
    serverInfo: (id: number, database: string | undefined) =>
      invoke<RedisServerInfo>("redis_server_info", { id, database }),
    serverConfig: (id: number, database: string | undefined) =>
      invoke<Record<string, string>>("redis_server_config", { id, database }),
    slowlogGet: (id: number, database: string | undefined, count?: number) =>
      invoke<RedisSlowlogEntry[]>("redis_slowlog_get", { id, database, count }),
    zrangebyscore: (
      id: number,
      database: string | undefined,
      key: string,
      min: string,
      max: string,
      offset?: number,
      limit?: number,
    ) =>
      invoke<RedisZRangeByScoreResult>("redis_zrangebyscore", {
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
      invoke<number | null>("redis_zrank", {
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
    ) => invoke<string[]>("redis_set_operation", { id, database, keys, op }),
    sismember: (
      id: number,
      database: string | undefined,
      key: string,
      member: string,
    ) => invoke<boolean>("redis_sismember", { id, database, key, member }),
    smove: (
      id: number,
      database: string | undefined,
      source: string,
      destination: string,
      member: string,
    ) =>
      invoke<boolean>("redis_smove", {
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
      invoke<RedisBatchKeyOpResult[]>("redis_batch_key_ops", {
        id,
        database,
        operations,
      }),
    mget: (id: number, database: string | undefined, keys: string[]) =>
      invoke<RedisMgetEntry[]>("redis_mget", { id, database, keys }),
    mset: (
      id: number,
      database: string | undefined,
      entries: Record<string, string>,
    ) => invoke<RedisMutationResult>("redis_mset", { id, database, entries }),
    clusterInfo: (id: number, database: string | undefined) =>
      invoke<RedisClusterInfo>("redis_cluster_info", { id, database }),
    zscore: (
      id: number,
      database: string | undefined,
      key: string,
      member: string,
    ) => invoke<number | null>("redis_zscore", { id, database, key, member }),
    zmscore: (
      id: number,
      database: string | undefined,
      key: string,
      members: string[],
    ) =>
      invoke<(number | null)[]>("redis_zmscore", {
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
      invoke<RedisZRangeByLexResult>("redis_zrangebylex", {
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
    ) => invoke<number>("redis_zlexcount", { id, database, key, min, max }),
    zpopmin: (
      id: number,
      database: string | undefined,
      key: string,
      count?: number,
    ) =>
      invoke<{ member: string; score: number }[]>("redis_zpopmin", {
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
      invoke<{ member: string; score: number }[]>("redis_zpopmax", {
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
    ) => invoke<string | null>("redis_lindex", { id, database, key, index }),
    lpos: (
      id: number,
      database: string | undefined,
      key: string,
      element: string,
      rank?: number,
      count?: number,
      maxlen?: number,
    ) =>
      invoke<number[]>("redis_lpos", {
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
    ) => invoke<boolean>("redis_ltrim", { id, database, key, start, stop }),
    linsert: (
      id: number,
      database: string | undefined,
      key: string,
      position: RedisLInsertPosition,
      pivot: string,
      element: string,
    ) =>
      invoke<number>("redis_linsert", {
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
      invoke<string | null>("redis_lmove", {
        id,
        database,
        source,
        destination,
        srcDirection,
        dstDirection,
      }),
  },
};
