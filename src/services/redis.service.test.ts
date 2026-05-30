import { describe, expect, test } from "bun:test";
import { invokeMock } from "./mocks";

describe("Redis模块", () => {
  test("redis_list_databases - 获取Redis数据库列表", async () => {
    const result = await invokeMock<any[]>("redis_list_databases", { id: 1 });
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("index");
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("selected");
    expect(result[0]).toHaveProperty("keyCount");
  });

  test("redis_scan_keys - 扫描Redis键", async () => {
    const result = await invokeMock<any>("redis_scan_keys", {
      id: 1,
      database: "0",
      cursor: "0",
      pattern: "*",
      limit: 10,
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("cursor");
    expect(result).toHaveProperty("keys");
    expect(Array.isArray(result.keys)).toBe(true);
    expect(result.keys.length).toBeGreaterThan(0);
    expect(result.keys[0]).toHaveProperty("key");
    expect(result.keys[0]).toHaveProperty("keyType");
    expect(result.keys[0]).toHaveProperty("ttl");
  });

  test("redis_get_key - 获取Redis键值", async () => {
    const result = await invokeMock<any>("redis_get_key", {
      id: 1,
      database: "0",
      key: "user:1",
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("key");
    expect(result).toHaveProperty("keyType");
    expect(result).toHaveProperty("ttl");
    expect(result).toHaveProperty("value");
    expect(result).toHaveProperty("keyExists");
    expect(result.key).toBe("user:1");
    expect(result.keyExists).toBe(true);
  });

  test("redis_set_key - 设置Redis键值", async () => {
    const result = await invokeMock<any>("redis_set_key", {
      id: 1,
      database: "0",
      payload: {
        key: "test:string",
        keyType: "string",
        value: "hello",
        ttl: -1,
      },
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("affected");
    expect(result.success).toBe(true);
    expect(result.affected).toBe(1);
  });

  test("redis_delete_key - 删除Redis键", async () => {
    const result = await invokeMock<any>("redis_delete_key", {
      id: 1,
      database: "0",
      key: "test:string",
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("affected");
    expect(result.success).toBe(true);
    expect(result.affected).toBe(1);
  });

  test("redis_rename_key - 重命名Redis键", async () => {
    const result = await invokeMock<any>("redis_rename_key", {
      id: 1,
      database: "0",
      oldKey: "old:key",
      newKey: "new:key",
      force: false,
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("affected");
    expect(result.success).toBe(true);
    expect(result.affected).toBe(1);
  });

  test("redis_set_ttl - 设置Redis键TTL", async () => {
    const result = await invokeMock<any>("redis_set_ttl", {
      id: 1,
      database: "0",
      key: "user:1",
      ttlSeconds: 3600,
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("affected");
    expect(result.success).toBe(true);
    expect(result.affected).toBe(1);
  });

  test("redis_server_info - 获取Redis服务器信息", async () => {
    const result = await invokeMock<any>("redis_server_info", {
      id: 1,
      database: "0",
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("sections");
    expect(result).toHaveProperty("dbsize");
    expect(result.sections).toHaveProperty("server");
    expect(result.sections).toHaveProperty("stats");
    expect(result.sections.server).toHaveProperty("redis_version");
    expect(result.sections.server).toHaveProperty("redis_mode");
  });

  test("redis_server_config - 获取Redis服务器配置", async () => {
    const result = await invokeMock<Record<string, string>>(
      "redis_server_config",
      {
        id: 1,
        database: "0",
      },
    );
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
    expect(result).toHaveProperty("maxmemory");
    expect(result).toHaveProperty("maxmemory-policy");
    expect(result).toHaveProperty("timeout");
  });

  test("redis_slowlog_get - 获取Redis慢查询日志", async () => {
    const result = await invokeMock<any[]>("redis_slowlog_get", {
      id: 1,
      database: "0",
      count: 10,
    });
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("id");
    expect(result[0]).toHaveProperty("timestamp");
    expect(result[0]).toHaveProperty("durationMs");
    expect(result[0]).toHaveProperty("command");
  });

  test("redis_execute_raw - 执行Redis原始命令", async () => {
    const result = await invokeMock<any>("redis_execute_raw", {
      id: 1,
      database: "0",
      command: "PING",
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("output");
    expect(result.output).toBe("PONG");
  });

  test("list_redis_command_logs - 获取Redis命令日志", async () => {
    const result = await invokeMock<any[]>("list_redis_command_logs", {
      limit: 50,
    });
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});
