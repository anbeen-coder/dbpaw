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

import { redisApi } from "./redis";

const g = globalThis as any;

beforeEach(() => {
  g.window = { __TAURI_INTERNALS__: {} };
  capturedCmd = "";
  capturedArgs = null;
  mockReturn = undefined;
});

describe("redisApi.redisLogs.list", () => {
  test("invokes list_redis_command_logs with default limit", async () => {
    mockReturn = [];

    await redisApi.redisLogs.list();

    expect(capturedCmd).toBe("list_redis_command_logs");
    expect(capturedArgs).toEqual({ limit: 100 });
  });

  test("invokes with custom limit", async () => {
    mockReturn = [];

    await redisApi.redisLogs.list(25);

    expect(capturedArgs).toEqual({ limit: 25 });
  });
});

describe("redisApi.redis.listDatabases", () => {
  test("invokes redis_list_databases", async () => {
    mockReturn = [{ index: 0, keys: 10 }];

    const result = await redisApi.redis.listDatabases(1);

    expect(capturedCmd).toBe("redis_list_databases");
    expect(capturedArgs).toEqual({ id: 1 });
    expect(result).toHaveLength(1);
  });
});

describe("redisApi.redis.scanKeys", () => {
  test("invokes redis_scan_keys with all params", async () => {
    mockReturn = { cursor: "0", keys: ["k1", "k2"] };

    await redisApi.redis.scanKeys({ id: 1, database: "0", cursor: "0", pattern: "user:*", limit: 50 });

    expect(capturedCmd).toBe("redis_scan_keys");
    expect(capturedArgs).toEqual({ id: 1, database: "0", cursor: "0", pattern: "user:*", limit: 50 });
  });
});

describe("redisApi.redis.getKey", () => {
  test("invokes redis_get_key", async () => {
    mockReturn = { key: "test", type: "string", value: "hello" };

    const result = await redisApi.redis.getKey(1, "0", "test");

    expect(capturedCmd).toBe("redis_get_key");
    expect(capturedArgs).toEqual({ id: 1, database: "0", key: "test" });
    expect(result.key).toBe("test");
  });
});

describe("redisApi.redis.setKey", () => {
  test("invokes redis_set_key", async () => {
    const payload = { key: "k", value: "v", type: "string" as const, ttl: 60 };
    mockReturn = { success: true };

    await redisApi.redis.setKey(1, "0", payload as any);

    expect(capturedCmd).toBe("redis_set_key");
    expect(capturedArgs).toEqual({ id: 1, database: "0", payload });
  });
});

describe("redisApi.redis.updateKey", () => {
  test("invokes redis_update_key", async () => {
    const payload = { key: "k", value: "v2", type: "string" as const };
    mockReturn = { success: true };

    await redisApi.redis.updateKey(1, "0", payload as any);

    expect(capturedCmd).toBe("redis_update_key");
    expect(capturedArgs).toEqual({ id: 1, database: "0", payload });
  });
});

describe("redisApi.redis.deleteKey", () => {
  test("invokes redis_delete_key", async () => {
    mockReturn = { success: true };

    await redisApi.redis.deleteKey(1, "0", "mykey");

    expect(capturedCmd).toBe("redis_delete_key");
    expect(capturedArgs).toEqual({ id: 1, database: "0", key: "mykey" });
  });
});

describe("redisApi.redis.renameKey", () => {
  test("invokes redis_rename_key", async () => {
    mockReturn = { success: true };

    await redisApi.redis.renameKey(1, "0", "old", "new", true);

    expect(capturedCmd).toBe("redis_rename_key");
    expect(capturedArgs).toEqual({ id: 1, database: "0", oldKey: "old", newKey: "new", force: true });
  });
});

describe("redisApi.redis.setTtl", () => {
  test("invokes redis_set_ttl", async () => {
    mockReturn = { success: true };

    await redisApi.redis.setTtl(1, "0", "mykey", 300);

    expect(capturedCmd).toBe("redis_set_ttl");
    expect(capturedArgs).toEqual({ id: 1, database: "0", key: "mykey", ttlSeconds: 300 });
  });

  test("supports null ttl to remove expiry", async () => {
    mockReturn = { success: true };

    await redisApi.redis.setTtl(1, "0", "mykey", null);

    expect(capturedArgs).toEqual({ id: 1, database: "0", key: "mykey", ttlSeconds: null });
  });
});

describe("redisApi.redis.getKeyPage", () => {
  test("invokes redis_get_key_page", async () => {
    mockReturn = { key: "list", type: "list", value: ["a", "b"] };

    await redisApi.redis.getKeyPage(1, "0", "list", 0, 10);

    expect(capturedCmd).toBe("redis_get_key_page");
    expect(capturedArgs).toEqual({ id: 1, database: "0", key: "list", offset: 0, limit: 10 });
  });
});

describe("redisApi.redis.getStreamRange", () => {
  test("invokes redis_get_stream_range", async () => {
    mockReturn = [];

    await redisApi.redis.getStreamRange(1, "0", "stream", "0-0", 50);

    expect(capturedCmd).toBe("redis_get_stream_range");
    expect(capturedArgs).toEqual({ id: 1, database: "0", key: "stream", startId: "0-0", count: 50 });
  });
});

describe("redisApi.redis.getStreamView", () => {
  test("invokes redis_get_stream_view", async () => {
    mockReturn = { entries: [], firstEntry: null, lastEntry: null };

    await redisApi.redis.getStreamView(1, "0", "stream", "0-0", "+", 100);

    expect(capturedCmd).toBe("redis_get_stream_view");
    expect(capturedArgs).toEqual({
      id: 1, database: "0", key: "stream", startId: "0-0", endId: "+", count: 100,
    });
  });
});

describe("redisApi.redis.xgroupCreate", () => {
  test("invokes redis_xgroup_create", async () => {
    mockReturn = true;

    await redisApi.redis.xgroupCreate(1, "0", "stream", "mygroup", "0-0", true);

    expect(capturedCmd).toBe("redis_xgroup_create");
    expect(capturedArgs).toEqual({
      id: 1, database: "0", key: "stream", group: "mygroup", startId: "0-0", mkstream: true,
    });
  });
});

describe("redisApi.redis.xgroupDel", () => {
  test("invokes redis_xgroup_del", async () => {
    mockReturn = true;

    await redisApi.redis.xgroupDel(1, "0", "stream", "mygroup");

    expect(capturedCmd).toBe("redis_xgroup_del");
    expect(capturedArgs).toEqual({ id: 1, database: "0", key: "stream", group: "mygroup" });
  });
});

describe("redisApi.redis.xgroupSetId", () => {
  test("invokes redis_xgroup_setid", async () => {
    mockReturn = true;

    await redisApi.redis.xgroupSetId(1, "0", "stream", "mygroup", "100-0");

    expect(capturedCmd).toBe("redis_xgroup_setid");
    expect(capturedArgs).toEqual({
      id: 1, database: "0", key: "stream", group: "mygroup", startId: "100-0",
    });
  });
});

describe("redisApi.redis.xack", () => {
  test("invokes redis_xack", async () => {
    mockReturn = 2;

    const result = await redisApi.redis.xack(1, "0", "stream", "mygroup", ["1-0", "2-0"]);

    expect(capturedCmd).toBe("redis_xack");
    expect(capturedArgs).toEqual({ id: 1, database: "0", key: "stream", group: "mygroup", ids: ["1-0", "2-0"] });
    expect(result).toBe(2);
  });
});

describe("redisApi.redis.xpending", () => {
  test("invokes redis_xpending with all params", async () => {
    mockReturn = [];

    await redisApi.redis.xpending(1, "0", "stream", "mygroup", "0-", "+", 10, "consumer1");

    expect(capturedCmd).toBe("redis_xpending");
    expect(capturedArgs).toEqual({
      id: 1, database: "0", key: "stream", group: "mygroup", start: "0-", end: "+", count: 10, consumer: "consumer1",
    });
  });
});

describe("redisApi.redis.xclaim", () => {
  test("invokes redis_xclaim", async () => {
    mockReturn = [];

    await redisApi.redis.xclaim(1, "0", "stream", "mygroup", "consumer1", 5000, ["1-0"]);

    expect(capturedCmd).toBe("redis_xclaim");
    expect(capturedArgs).toEqual({
      id: 1, database: "0", key: "stream", group: "mygroup", consumer: "consumer1", minIdleMs: 5000, ids: ["1-0"],
    });
  });
});

describe("redisApi.redis.xtrim", () => {
  test("invokes redis_xtrim", async () => {
    mockReturn = 5;

    await redisApi.redis.xtrim(1, "0", "stream", "MAXLEN", "1000", true);

    expect(capturedCmd).toBe("redis_xtrim");
    expect(capturedArgs).toEqual({
      id: 1, database: "0", key: "stream", strategy: "MAXLEN", threshold: "1000", approximate: true,
    });
  });
});

describe("redisApi.redis.xreadgroup", () => {
  test("invokes redis_xreadgroup", async () => {
    mockReturn = [];

    await redisApi.redis.xreadgroup(1, "0", "stream", "mygroup", "consumer1", ">", 10);

    expect(capturedCmd).toBe("redis_xreadgroup");
    expect(capturedArgs).toEqual({
      id: 1, database: "0", key: "stream", group: "mygroup", consumer: "consumer1", startId: ">", count: 10,
    });
  });
});

describe("redisApi.redis.executeRaw", () => {
  test("invokes redis_execute_raw", async () => {
    mockReturn = { result: "OK" };

    await redisApi.redis.executeRaw(1, "0", "PING");

    expect(capturedCmd).toBe("redis_execute_raw");
    expect(capturedArgs).toEqual({ id: 1, database: "0", command: "PING" });
  });
});

describe("redisApi.redis.patchKey", () => {
  test("invokes redis_patch_key", async () => {
    const payload = { key: "hash", field: "f1", value: "v1" };
    mockReturn = { success: true };

    await redisApi.redis.patchKey(1, "0", payload as any);

    expect(capturedCmd).toBe("redis_patch_key");
    expect(capturedArgs).toEqual({ id: 1, database: "0", payload });
  });
});

describe("redisApi.redis.bitmapGetBit", () => {
  test("invokes redis_bitmap_get_bit", async () => {
    mockReturn = true;

    await redisApi.redis.bitmapGetBit(1, "0", "bitmap", 5);

    expect(capturedCmd).toBe("redis_bitmap_get_bit");
    expect(capturedArgs).toEqual({ id: 1, database: "0", key: "bitmap", offset: 5 });
  });
});

describe("redisApi.redis.bitmapCount", () => {
  test("invokes redis_bitmap_count", async () => {
    mockReturn = 3;

    await redisApi.redis.bitmapCount(1, "0", "bitmap", 0, 10);

    expect(capturedCmd).toBe("redis_bitmap_count");
    expect(capturedArgs).toEqual({ id: 1, database: "0", key: "bitmap", start: 0, end: 10 });
  });
});

describe("redisApi.redis.bitmapPos", () => {
  test("invokes redis_bitmap_pos", async () => {
    mockReturn = [0, 2, 4];

    await redisApi.redis.bitmapPos(1, "0", "bitmap", true, 0, 10, 3);

    expect(capturedCmd).toBe("redis_bitmap_pos");
    expect(capturedArgs).toEqual({ id: 1, database: "0", key: "bitmap", bit: true, start: 0, end: 10, count: 3 });
  });
});

describe("redisApi.redis.hllPfadd", () => {
  test("invokes redis_hll_pfadd", async () => {
    mockReturn = true;

    await redisApi.redis.hllPfadd(1, "0", "hll", ["a", "b", "c"]);

    expect(capturedCmd).toBe("redis_hll_pfadd");
    expect(capturedArgs).toEqual({ id: 1, database: "0", key: "hll", elements: ["a", "b", "c"] });
  });
});

describe("redisApi.redis.geoAdd", () => {
  test("invokes redis_geo_add", async () => {
    const members = [{ name: "place", longitude: 1.0, latitude: 2.0 }];
    mockReturn = 1;

    await redisApi.redis.geoAdd(1, "0", "geo", members as any);

    expect(capturedCmd).toBe("redis_geo_add");
    expect(capturedArgs).toEqual({ id: 1, database: "0", key: "geo", members });
  });
});

describe("redisApi.redis.geoPos", () => {
  test("invokes redis_geo_pos", async () => {
    mockReturn = [{ longitude: 1.0, latitude: 2.0 }];

    await redisApi.redis.geoPos(1, "0", "geo", ["place"]);

    expect(capturedCmd).toBe("redis_geo_pos");
    expect(capturedArgs).toEqual({ id: 1, database: "0", key: "geo", members: ["place"] });
  });
});

describe("redisApi.redis.geoDist", () => {
  test("invokes redis_geo_dist", async () => {
    mockReturn = 123.4;

    await redisApi.redis.geoDist(1, "0", "geo", "a", "b", "km");

    expect(capturedCmd).toBe("redis_geo_dist");
    expect(capturedArgs).toEqual({ id: 1, database: "0", key: "geo", member1: "a", member2: "b", unit: "km" });
  });
});

describe("redisApi.redis.geoSearch", () => {
  test("invokes redis_geo_search", async () => {
    mockReturn = [];

    await redisApi.redis.geoSearch(1, "0", "geo", {
      member: "origin",
      radius: 10,
      unit: "km",
      withCoord: true,
      withDist: true,
      count: 5,
    });

    expect(capturedCmd).toBe("redis_geo_search");
    expect(capturedArgs).toEqual({
      id: 1, database: "0", key: "geo", member: "origin", radius: 10, unit: "km", withCoord: true, withDist: true, count: 5,
    });
  });
});

describe("redisApi.redis.serverInfo", () => {
  test("invokes redis_server_info", async () => {
    mockReturn = { version: "7.0.0" };

    await redisApi.redis.serverInfo(1, "0");

    expect(capturedCmd).toBe("redis_server_info");
    expect(capturedArgs).toEqual({ id: 1, database: "0" });
  });
});

describe("redisApi.redis.serverConfig", () => {
  test("invokes redis_server_config", async () => {
    mockReturn = { maxmemory: "1073741824" };

    await redisApi.redis.serverConfig(1, "0");

    expect(capturedCmd).toBe("redis_server_config");
    expect(capturedArgs).toEqual({ id: 1, database: "0" });
  });
});

describe("redisApi.redis.slowlogGet", () => {
  test("invokes redis_slowlog_get", async () => {
    mockReturn = [];

    await redisApi.redis.slowlogGet(1, "0", 10);

    expect(capturedCmd).toBe("redis_slowlog_get");
    expect(capturedArgs).toEqual({ id: 1, database: "0", count: 10 });
  });
});

describe("redisApi.redis.zrangebyscore", () => {
  test("invokes redis_zrangebyscore", async () => {
    mockReturn = { members: [], scores: [] };

    await redisApi.redis.zrangebyscore(1, "0", "zset", "-inf", "+inf", 0, 10);

    expect(capturedCmd).toBe("redis_zrangebyscore");
    expect(capturedArgs).toEqual({ id: 1, database: "0", key: "zset", min: "-inf", max: "+inf", offset: 0, limit: 10 });
  });
});

describe("redisApi.redis.zrank", () => {
  test("invokes redis_zrank", async () => {
    mockReturn = 2;

    await redisApi.redis.zrank(1, "0", "zset", "member1", true);

    expect(capturedCmd).toBe("redis_zrank");
    expect(capturedArgs).toEqual({ id: 1, database: "0", key: "zset", member: "member1", reverse: true });
  });
});

describe("redisApi.redis.setOperation", () => {
  test("invokes redis_set_operation", async () => {
    mockReturn = ["a", "b"];

    await redisApi.redis.setOperation(1, "0", ["s1", "s2"], "union");

    expect(capturedCmd).toBe("redis_set_operation");
    expect(capturedArgs).toEqual({ id: 1, database: "0", keys: ["s1", "s2"], op: "union" });
  });
});

describe("redisApi.redis.sismember", () => {
  test("invokes redis_sismember", async () => {
    mockReturn = true;

    await redisApi.redis.sismember(1, "0", "myset", "elem");

    expect(capturedCmd).toBe("redis_sismember");
    expect(capturedArgs).toEqual({ id: 1, database: "0", key: "myset", member: "elem" });
  });
});

describe("redisApi.redis.smove", () => {
  test("invokes redis_smove", async () => {
    mockReturn = true;

    await redisApi.redis.smove(1, "0", "src", "dst", "elem");

    expect(capturedCmd).toBe("redis_smove");
    expect(capturedArgs).toEqual({ id: 1, database: "0", source: "src", destination: "dst", member: "elem" });
  });
});

describe("redisApi.redis.batchKeyOps", () => {
  test("invokes redis_batch_key_ops", async () => {
    const ops = [{ op: "delete" as const, key: "k1" }];
    mockReturn = [];

    await redisApi.redis.batchKeyOps(1, "0", ops as any);

    expect(capturedCmd).toBe("redis_batch_key_ops");
    expect(capturedArgs).toEqual({ id: 1, database: "0", operations: ops });
  });
});

describe("redisApi.redis.mget", () => {
  test("invokes redis_mget", async () => {
    mockReturn = [{ key: "k1", value: "v1" }];

    await redisApi.redis.mget(1, "0", ["k1", "k2"]);

    expect(capturedCmd).toBe("redis_mget");
    expect(capturedArgs).toEqual({ id: 1, database: "0", keys: ["k1", "k2"] });
  });
});

describe("redisApi.redis.mset", () => {
  test("invokes redis_mset", async () => {
    mockReturn = { success: true };

    await redisApi.redis.mset(1, "0", { k1: "v1", k2: "v2" });

    expect(capturedCmd).toBe("redis_mset");
    expect(capturedArgs).toEqual({ id: 1, database: "0", entries: { k1: "v1", k2: "v2" } });
  });
});

describe("redisApi.redis.clusterInfo", () => {
  test("invokes redis_cluster_info", async () => {
    mockReturn = { cluster_state: "ok" };

    await redisApi.redis.clusterInfo(1, "0");

    expect(capturedCmd).toBe("redis_cluster_info");
    expect(capturedArgs).toEqual({ id: 1, database: "0" });
  });
});

describe("redisApi.redis.zscore", () => {
  test("invokes redis_zscore", async () => {
    mockReturn = 3.14;

    await redisApi.redis.zscore(1, "0", "zset", "member");

    expect(capturedCmd).toBe("redis_zscore");
    expect(capturedArgs).toEqual({ id: 1, database: "0", key: "zset", member: "member" });
  });
});

describe("redisApi.redis.zmscore", () => {
  test("invokes redis_zmscore", async () => {
    mockReturn = [1.0, null];

    await redisApi.redis.zmscore(1, "0", "zset", ["m1", "m2"]);

    expect(capturedCmd).toBe("redis_zmscore");
    expect(capturedArgs).toEqual({ id: 1, database: "0", key: "zset", members: ["m1", "m2"] });
  });
});

describe("redisApi.redis.zrangebylex", () => {
  test("invokes redis_zrangebylex", async () => {
    mockReturn = { members: [], scores: [] };

    await redisApi.redis.zrangebylex(1, "0", "zset", "[a", "[z", 0, 10);

    expect(capturedCmd).toBe("redis_zrangebylex");
    expect(capturedArgs).toEqual({ id: 1, database: "0", key: "zset", min: "[a", max: "[z", offset: 0, limit: 10 });
  });
});

describe("redisApi.redis.zlexcount", () => {
  test("invokes redis_zlexcount", async () => {
    mockReturn = 5;

    await redisApi.redis.zlexcount(1, "0", "zset", "[a", "[z");

    expect(capturedCmd).toBe("redis_zlexcount");
    expect(capturedArgs).toEqual({ id: 1, database: "0", key: "zset", min: "[a", max: "[z" });
  });
});

describe("redisApi.redis.zpopmin", () => {
  test("invokes redis_zpopmin", async () => {
    mockReturn = [{ member: "a", score: 1 }];

    await redisApi.redis.zpopmin(1, "0", "zset", 3);

    expect(capturedCmd).toBe("redis_zpopmin");
    expect(capturedArgs).toEqual({ id: 1, database: "0", key: "zset", count: 3 });
  });
});

describe("redisApi.redis.zpopmax", () => {
  test("invokes redis_zpopmax", async () => {
    mockReturn = [{ member: "z", score: 100 }];

    await redisApi.redis.zpopmax(1, "0", "zset", 1);

    expect(capturedCmd).toBe("redis_zpopmax");
    expect(capturedArgs).toEqual({ id: 1, database: "0", key: "zset", count: 1 });
  });
});

describe("redisApi.redis.lindex", () => {
  test("invokes redis_lindex", async () => {
    mockReturn = "value";

    await redisApi.redis.lindex(1, "0", "list", 0);

    expect(capturedCmd).toBe("redis_lindex");
    expect(capturedArgs).toEqual({ id: 1, database: "0", key: "list", index: 0 });
  });
});

describe("redisApi.redis.lpos", () => {
  test("invokes redis_lpos", async () => {
    mockReturn = [2, 5];

    await redisApi.redis.lpos(1, "0", "list", "elem", 1, 10, 100);

    expect(capturedCmd).toBe("redis_lpos");
    expect(capturedArgs).toEqual({
      id: 1, database: "0", key: "list", element: "elem", rank: 1, count: 10, maxlen: 100,
    });
  });
});

describe("redisApi.redis.ltrim", () => {
  test("invokes redis_ltrim", async () => {
    mockReturn = true;

    await redisApi.redis.ltrim(1, "0", "list", 0, 5);

    expect(capturedCmd).toBe("redis_ltrim");
    expect(capturedArgs).toEqual({ id: 1, database: "0", key: "list", start: 0, stop: 5 });
  });
});

describe("redisApi.redis.linsert", () => {
  test("invokes redis_linsert", async () => {
    mockReturn = 3;

    await redisApi.redis.linsert(1, "0", "list", "before", "pivot", "elem");

    expect(capturedCmd).toBe("redis_linsert");
    expect(capturedArgs).toEqual({
      id: 1, database: "0", key: "list", position: "before", pivot: "pivot", element: "elem",
    });
  });
});

describe("redisApi.redis.lmove", () => {
  test("invokes redis_lmove", async () => {
    mockReturn = "value";

    await redisApi.redis.lmove(1, "0", "src", "dst", "left", "right");

    expect(capturedCmd).toBe("redis_lmove");
    expect(capturedArgs).toEqual({
      id: 1, database: "0", source: "src", destination: "dst", srcDirection: "left", dstDirection: "right",
    });
  });
});
