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

import { aiApi } from "./ai";

const g = globalThis as any;

beforeEach(() => {
  g.window = { __TAURI_INTERNALS__: {} };
  capturedCmd = "";
  capturedArgs = null;
  mockReturn = undefined;
});

describe("aiApi.ai.providers.list", () => {
  test("invokes ai_list_providers", async () => {
    mockReturn = [{ id: 1, name: "openai", provider_type: "openai" }];

    const result = await aiApi.ai.providers.list();

    expect(capturedCmd).toBe("ai_list_providers");
    expect(capturedArgs).toBeUndefined();
    expect(result).toHaveLength(1);
  });
});

describe("aiApi.ai.providers.create", () => {
  test("invokes ai_create_provider with config", async () => {
    const config = { name: "gpt4", provider_type: "openai", api_key: "sk-xxx", model: "gpt-4" };
    mockReturn = { id: 2, ...config };

    await aiApi.ai.providers.create(config as any);

    expect(capturedCmd).toBe("ai_create_provider");
    expect(capturedArgs).toEqual({ config });
  });
});

describe("aiApi.ai.providers.update", () => {
  test("invokes ai_update_provider with id and config", async () => {
    const config = { name: "gpt4-turbo", provider_type: "openai", model: "gpt-4-turbo" };
    mockReturn = { id: 2, ...config };

    await aiApi.ai.providers.update(2, config as any);

    expect(capturedCmd).toBe("ai_update_provider");
    expect(capturedArgs).toEqual({ id: 2, config });
  });
});

describe("aiApi.ai.providers.delete", () => {
  test("invokes ai_delete_provider", async () => {
    mockReturn = undefined;

    await aiApi.ai.providers.delete(2);

    expect(capturedCmd).toBe("ai_delete_provider");
    expect(capturedArgs).toEqual({ id: 2 });
  });
});

describe("aiApi.ai.providers.setDefault", () => {
  test("invokes ai_set_default_provider", async () => {
    mockReturn = undefined;

    await aiApi.ai.providers.setDefault(1);

    expect(capturedCmd).toBe("ai_set_default_provider");
    expect(capturedArgs).toEqual({ id: 1 });
  });
});

describe("aiApi.ai.providers.clearApiKey", () => {
  test("invokes ai_clear_provider_api_key", async () => {
    mockReturn = undefined;

    await aiApi.ai.providers.clearApiKey("openai");

    expect(capturedCmd).toBe("ai_clear_provider_api_key");
    expect(capturedArgs).toEqual({ provider_type: "openai" });
  });
});

describe("aiApi.ai.chat.start", () => {
  test("invokes ai_chat_start", async () => {
    const request = { message: "Hello", connectionId: 1, database: "db" };
    mockReturn = { response: "Hi!", conversation_id: 1 };

    const result = await aiApi.ai.chat.start(request as any);

    expect(capturedCmd).toBe("ai_chat_start");
    expect(capturedArgs).toEqual({ request });
    expect(result.response).toBe("Hi!");
  });
});

describe("aiApi.ai.chat.continue", () => {
  test("invokes ai_chat_continue", async () => {
    const request = { message: "Follow up", conversation_id: 1 };
    mockReturn = { response: "Answer", conversation_id: 1 };

    await aiApi.ai.chat.continue(request as any);

    expect(capturedCmd).toBe("ai_chat_continue");
    expect(capturedArgs).toEqual({ request });
  });
});

describe("aiApi.ai.conversations.list", () => {
  test("invokes ai_list_conversations without filters", async () => {
    mockReturn = [];

    await aiApi.ai.conversations.list();

    expect(capturedCmd).toBe("ai_list_conversations");
    expect(capturedArgs).toEqual({ connectionId: undefined, database: undefined });
  });

  test("invokes with filters", async () => {
    mockReturn = [];

    await aiApi.ai.conversations.list({ connectionId: 5, database: "mydb" });

    expect(capturedArgs).toEqual({ connectionId: 5, database: "mydb" });
  });
});

describe("aiApi.ai.conversations.get", () => {
  test("invokes ai_get_conversation", async () => {
    mockReturn = { id: 1, messages: [] };

    await aiApi.ai.conversations.get(1);

    expect(capturedCmd).toBe("ai_get_conversation");
    expect(capturedArgs).toEqual({ conversationId: 1 });
  });
});

describe("aiApi.ai.conversations.delete", () => {
  test("invokes ai_delete_conversation", async () => {
    mockReturn = undefined;

    await aiApi.ai.conversations.delete(1);

    expect(capturedCmd).toBe("ai_delete_conversation");
    expect(capturedArgs).toEqual({ conversationId: 1 });
  });
});
