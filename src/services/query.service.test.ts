import { describe, expect, test } from "bun:test";
import { invokeMock } from "./mocks";

describe("Query模块", () => {
  test("execute_query - 执行SQL查询", async () => {
    const result = await invokeMock<any>("execute_query", {
      id: 1,
      query: "SELECT * FROM users LIMIT 10",
      database: "testdb",
    });
    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.rowCount).toBeDefined();
    expect(result.columns).toBeDefined();
    expect(result.timeTakenMs).toBeDefined();
    expect(result.success).toBeDefined();
  });

  test("cancel_query - 取消查询", async () => {
    const result = await invokeMock<boolean>("cancel_query", {
      uuid: "test-uuid",
      queryId: "test-query-id",
    });
    expect(result).toBeDefined();
    expect(typeof result).toBe("boolean");
  });

  test("execute_by_conn - 通过连接信息执行查询", async () => {
    const result = await invokeMock<any>("execute_by_conn", {
      form: {
        driver: "postgres",
        host: "localhost",
        port: 5432,
        database: "testdb",
        username: "postgres",
      },
      sql: "SELECT * FROM users LIMIT 10",
    });
    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.rowCount).toBeDefined();
    expect(result.columns).toBeDefined();
  });
});
