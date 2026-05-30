import { describe, expect, test } from "bun:test";
import { invokeMock } from "./mocks";

describe("AI模块", () => {
  test("ai_list_providers - 列出AI提供商", async () => {
    const result = await invokeMock<any[]>("ai_list_providers");
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("id");
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("providerType");
  });

  test("ai_create_provider - 创建AI提供商", async () => {
    const result = await invokeMock<any>("ai_create_provider", {
      config: {
        name: "Test Provider",
        providerType: "openai",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4",
      }
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("name");
    expect(result.name).toBe("Test Provider");
  });

  test("ai_update_provider - 更新AI提供商", async () => {
    const result = await invokeMock<any>("ai_update_provider", {
      id: 2,
      config: {
        name: "Updated Provider",
        providerType: "openai_compat",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4",
      }
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("name");
    expect(result.name).toBe("Updated Provider");
  });

  test("ai_delete_provider - 删除AI提供商", async () => {
    const result = await invokeMock<void>("ai_delete_provider", { id: 1 });
    expect(result).toBeUndefined();
  });

  test("ai_set_default_provider - 设置默认提供商", async () => {
    const result = await invokeMock<void>("ai_set_default_provider", { id: 1 });
    expect(result).toBeUndefined();
  });

  test("ai_list_conversations - 列出对话", async () => {
    const result = await invokeMock<any[]>("ai_list_conversations");
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("id");
    expect(result[0]).toHaveProperty("title");
  });

  test("ai_get_conversation - 获取对话详情", async () => {
    const result = await invokeMock<any>("ai_get_conversation", { conversationId: 1 });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("conversation");
    expect(result).toHaveProperty("messages");
    expect(Array.isArray(result.messages)).toBe(true);
  });

  test("ai_delete_conversation - 删除对话", async () => {
    const result = await invokeMock<void>("ai_delete_conversation", { conversationId: 1 });
    expect(result).toBeUndefined();
  });

  test("ai_chat_start - 开始聊天", async () => {
    const result = await invokeMock<any>("ai_chat_start", {
      request: {
        requestId: "test-request",
        scenario: "sql_generate",
        input: "Generate SQL for users table",
        title: "Test Chat",
      }
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("conversationId");
    expect(result).toHaveProperty("userMessageId");
    expect(result).toHaveProperty("assistantMessageId");
  });

  test("ai_chat_continue - 继续聊天", async () => {
    const result = await invokeMock<any>("ai_chat_continue", {
      request: {
        requestId: "test-request-2",
        conversationId: 1,
        scenario: "sql_generate",
        input: "Add pagination to the query",
      }
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("conversationId");
    expect(result).toHaveProperty("userMessageId");
    expect(result).toHaveProperty("assistantMessageId");
  });
});
