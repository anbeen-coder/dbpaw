import { expect, test } from "@playwright/test";
import { collectRuntimeErrors } from "./runtime-errors";

test.describe("AI Chat", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Connections" }),
    ).toBeVisible();
  });

  test.describe("Sidebar Toggle", () => {
    test("打开AI侧边栏", async ({ page }) => {
      const runtimeErrors = collectRuntimeErrors(page);

      // Click AI toggle button
      await page.getByLabel(/Show AI panel/i).click();

      // Verify AI sidebar becomes visible
      await expect(page.locator("#ai-sidebar")).toBeVisible();

      // Verify sidebar contains AI Assistant heading
      await expect(page.getByText("AI Assistant")).toBeVisible();

      runtimeErrors.assertClean("打开AI侧边栏");
    });

    test("关闭AI侧边栏", async ({ page }) => {
      const runtimeErrors = collectRuntimeErrors(page);

      // Open AI sidebar first
      await page.getByLabel(/Show AI panel/i).click();
      await expect(page.locator("#ai-sidebar")).toBeVisible();

      // Click AI toggle button to close
      await page.getByLabel(/Hide AI panel/i).click();

      // Verify AI sidebar is hidden
      await expect(page.locator("#ai-sidebar")).toBeHidden();

      runtimeErrors.assertClean("关闭AI侧边栏");
    });
  });

  test.describe("Chat Messaging", () => {
    test("发送消息并接收响应", async ({ page }) => {
      const runtimeErrors = collectRuntimeErrors(page);

      // Open AI sidebar
      await page.getByLabel(/Show AI panel/i).click();
      await expect(page.locator("#ai-sidebar")).toBeVisible();

      // Type message in textarea
      const textarea = page.getByPlaceholder(/Describe SQL to generate/i);
      await textarea.fill("List all users");

      // Click send button
      await page.getByLabel("Send message").click();

      // Verify user message appears
      await expect(page.getByText("List all users")).toBeVisible();

      // Verify assistant response appears (mock returns SQL as paragraph)
      // Use first() since there may be multiple SELECT responses from pre-existing conversations
      await expect(page.locator("#ai-sidebar").getByText(/SELECT/i).first()).toBeVisible();

      runtimeErrors.assertClean("发送消息并接收响应");
    });

    test("验证mock响应内容", async ({ page }) => {
      const runtimeErrors = collectRuntimeErrors(page);

      // Open AI sidebar
      await page.getByLabel(/Show AI panel/i).click();
      await expect(page.locator("#ai-sidebar")).toBeVisible();

      // Type message requesting SQL generation
      const textarea = page.getByPlaceholder(/Describe SQL to generate/i);
      await textarea.fill("Generate SQL for user orders");

      // Click send button
      await page.getByLabel("Send message").click();

      // Verify response contains SQL keywords (rendered as paragraph in mock mode)
      // Use first() since there may be multiple responses from pre-existing conversations
      const sidebar = page.locator("#ai-sidebar");
      await expect(sidebar.getByText(/SELECT/i).first()).toBeVisible();
      await expect(sidebar.getByText(/FROM/i).first()).toBeVisible();
      await expect(sidebar.getByText(/LIMIT/i).first()).toBeVisible();

      runtimeErrors.assertClean("验证mock响应内容");
    });
  });

  test.describe("Conversation History", () => {
    test("打开对话历史popover", async ({ page }) => {
      const runtimeErrors = collectRuntimeErrors(page);

      // Open AI sidebar
      await page.getByLabel(/Show AI panel/i).click();
      await expect(page.locator("#ai-sidebar")).toBeVisible();

      // Click history button
      await page.getByLabel(/Open conversation history/i).click();

      // Verify popover opens with conversation list
      await expect(page.getByText("Conversation History")).toBeVisible();

      // Verify existing mock conversations are visible
      await expect(page.getByText(/Generate.*Order/i).first()).toBeVisible();

      runtimeErrors.assertClean("打开对话历史popover");
    });

    test("切换到指定对话", async ({ page }) => {
      const runtimeErrors = collectRuntimeErrors(page);

      // Open AI sidebar
      await page.getByLabel(/Show AI panel/i).click();
      await expect(page.locator("#ai-sidebar")).toBeVisible();

      // Click history button
      await page.getByLabel(/Open conversation history/i).click();
      await expect(page.getByText("Conversation History")).toBeVisible();

      // Click on a conversation
      await page.getByText(/Generate.*Order/i).first().click();

      // Verify conversation messages load (the mock conversation has "order count" in its messages)
      await expect(page.getByText(/order count/i).first()).toBeVisible();

      // Verify popover closes
      await expect(page.getByText("Conversation History")).toBeHidden();

      runtimeErrors.assertClean("切换到指定对话");
    });

    test("删除对话", async ({ page }) => {
      const runtimeErrors = collectRuntimeErrors(page);

      // Open AI sidebar
      await page.getByLabel(/Show AI panel/i).click();
      await expect(page.locator("#ai-sidebar")).toBeVisible();

      // Click history button
      await page.getByLabel(/Open conversation history/i).click();
      await expect(page.getByText("Conversation History")).toBeVisible();

      // Count initial conversations
      const initialCount = await page.getByText(/Generate.*Order|Optimize.*Slow|Explain.*JOIN|Test.*Markdown/i).count();

      // Click delete button on first conversation
      await page.getByLabel(/Delete conversation/i).first().click();

      // Verify conversation is removed from list
      const newCount = await page.getByText(/Generate.*Order|Optimize.*Slow|Explain.*JOIN|Test.*Markdown/i).count();
      expect(newCount).toBeLessThan(initialCount);

      runtimeErrors.assertClean("删除对话");
    });
  });

  test.describe("New Conversation", () => {
    test("新建对话清空当前消息", async ({ page }) => {
      const runtimeErrors = collectRuntimeErrors(page);

      // Open AI sidebar
      await page.getByLabel(/Show AI panel/i).click();
      await expect(page.locator("#ai-sidebar")).toBeVisible();

      // Click history button and select a conversation with messages
      await page.getByLabel(/Open conversation history/i).click();
      await page.getByText(/Generate.*Order/i).first().click();

      // Verify messages are loaded
      await expect(page.getByText(/order count/i).first()).toBeVisible();

      // Click new chat button
      await page.getByLabel(/Start new chat/i).click();

      // Verify message list is empty (the pre-existing messages should be hidden)
      await expect(page.getByText(/order count/i)).toBeHidden();

      runtimeErrors.assertClean("新建对话清空当前消息");
    });

    test("新建对话后发送消息", async ({ page }) => {
      const runtimeErrors = collectRuntimeErrors(page);

      // Open AI sidebar
      await page.getByLabel(/Show AI panel/i).click();
      await expect(page.locator("#ai-sidebar")).toBeVisible();

      // Click new chat button
      await page.getByLabel(/Start new chat/i).click();

      // Send a message
      const textarea = page.getByPlaceholder(/Describe SQL to generate/i);
      await textarea.fill("Show all tables");
      await page.getByLabel("Send message").click();

      // Verify response appears
      await expect(page.locator("#ai-sidebar").getByText(/SELECT/i).first()).toBeVisible();

      runtimeErrors.assertClean("新建对话后发送消息");
    });
  });
});
