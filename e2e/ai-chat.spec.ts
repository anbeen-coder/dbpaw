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
});
