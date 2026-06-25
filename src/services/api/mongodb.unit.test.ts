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

import { mongodbApi } from "./mongodb";

const g = globalThis as any;

beforeEach(() => {
  g.window = { __TAURI_INTERNALS__: {} };
  capturedCmd = "";
  capturedArgs = null;
  mockReturn = undefined;
});

describe("mongodbApi.mongodb.testConnection", () => {
  test("invokes mongodb_test_connection", async () => {
    mockReturn = { ok: true, serverInfo: { version: "6.0" } };

    const result = await mongodbApi.mongodb.testConnection(1);

    expect(capturedCmd).toBe("mongodb_test_connection");
    expect(capturedArgs).toEqual({ id: 1 });
    expect(result.ok).toBe(true);
  });
});

describe("mongodbApi.mongodb.testConnectionEphemeral", () => {
  test("invokes mongodb_test_connection_ephemeral", async () => {
    const form = { driver: "mongodb", host: "localhost", port: 27017 };
    mockReturn = { success: true };

    await mongodbApi.mongodb.testConnectionEphemeral(form as any);

    expect(capturedCmd).toBe("mongodb_test_connection_ephemeral");
    expect(capturedArgs).toEqual({ form });
  });
});

describe("mongodbApi.mongodb.listDatabases", () => {
  test("invokes mongodb_list_databases", async () => {
    mockReturn = [{ name: "admin", sizeOnDisk: 0 }];

    const result = await mongodbApi.mongodb.listDatabases(1);

    expect(capturedCmd).toBe("mongodb_list_databases");
    expect(capturedArgs).toEqual({ id: 1 });
    expect(result).toHaveLength(1);
  });
});

describe("mongodbApi.mongodb.listCollections", () => {
  test("invokes mongodb_list_collections", async () => {
    mockReturn = [{ name: "users", type: "collection" }];

    const result = await mongodbApi.mongodb.listCollections(1, "mydb");

    expect(capturedCmd).toBe("mongodb_list_collections");
    expect(capturedArgs).toEqual({ id: 1, database: "mydb" });
    expect(result).toHaveLength(1);
  });
});
