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

import { systemApi } from "./system";

const g = globalThis as any;

beforeEach(() => {
  g.window = { __TAURI_INTERNALS__: {} };
  capturedCmd = "";
  capturedArgs = null;
  mockReturn = undefined;
});

describe("systemApi.system.listFonts", () => {
  test("invokes list_system_fonts", async () => {
    mockReturn = ["Arial", "Helvetica", "Times New Roman"];

    const result = await systemApi.system.listFonts();

    expect(capturedCmd).toBe("list_system_fonts");
    expect(capturedArgs).toBeUndefined();
    expect(result).toEqual(["Arial", "Helvetica", "Times New Roman"]);
  });
});

describe("systemApi.mcp.status", () => {
  test("invokes mcp_status", async () => {
    mockReturn = { running: true, port: 3000 };

    const result = await systemApi.mcp.status();

    expect(capturedCmd).toBe("mcp_status");
    expect(capturedArgs).toBeUndefined();
    expect(result.running).toBe(true);
  });
});

describe("systemApi.mcp.start", () => {
  test("invokes mcp_start with config", async () => {
    const config = { port: 3001, transport: "stdio" as const };
    mockReturn = { running: true, port: 3001 };

    await systemApi.mcp.start(config as any);

    expect(capturedCmd).toBe("mcp_start");
    expect(capturedArgs).toEqual({ config });
  });
});

describe("systemApi.mcp.stop", () => {
  test("invokes mcp_stop", async () => {
    mockReturn = { running: false };

    await systemApi.mcp.stop();

    expect(capturedCmd).toBe("mcp_stop");
    expect(capturedArgs).toBeUndefined();
  });
});

describe("systemApi.mcp.getTools", () => {
  test("invokes mcp_get_tools", async () => {
    mockReturn = [{ name: "query", description: "Execute SQL" }];

    const result = await systemApi.mcp.getTools();

    expect(capturedCmd).toBe("mcp_get_tools");
    expect(capturedArgs).toBeUndefined();
    expect(result).toHaveLength(1);
  });
});

describe("systemApi.mcp.detectClients", () => {
  test("invokes mcp_detect_clients", async () => {
    mockReturn = [{ name: "Claude Desktop", configured: true }];

    const result = await systemApi.mcp.detectClients();

    expect(capturedCmd).toBe("mcp_detect_clients");
    expect(capturedArgs).toBeUndefined();
    expect(result).toHaveLength(1);
  });
});

describe("systemApi.mcp.configureClient", () => {
  test("invokes mcp_configure_client", async () => {
    mockReturn = "Configuration written to ~/.config/claude/claude_desktop_config.json";

    const result = await systemApi.mcp.configureClient("Claude Desktop");

    expect(capturedCmd).toBe("mcp_configure_client");
    expect(capturedArgs).toEqual({ clientName: "Claude Desktop" });
    expect(result).toContain("Configuration written");
  });
});
