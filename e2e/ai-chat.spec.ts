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
});
