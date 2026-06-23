import { expect, test, type Page } from "@playwright/test";
import { collectRuntimeErrors } from "./runtime-errors";

async function openNewQueryTab(page: Page) {
  const connectionNode = page.getByText("PostgreSQL Dev").first();
  await connectionNode.click({ button: "right" });
  const contextMenu = page.locator(".fixed.z-50");
  await contextMenu.getByRole("button", { name: "New Query" }).click();
  await expect(page.locator(".cm-editor").first()).toBeVisible();
}

async function typeInEditor(page: Page, text: string) {
  await page.locator(".cm-content").first().click();
  await page.keyboard.type(text, { delay: 0 });
}

async function focusOutsideEditor(page: Page) {
  await page.getByRole("heading", { name: "Connections" }).click();
  await page.waitForTimeout(100);
}

test.describe("Keyboard Shortcuts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Connections" }),
    ).toBeVisible();
  });

  test("Ctrl+N 打开新查询标签", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    await openNewQueryTab(page);

    const editorTablist = page.locator('[data-slot="tabs-list"]').last();
    const tabs = editorTablist.locator('[data-slot="tabs-trigger"]');
    const initialCount = await tabs.count();

    await focusOutsideEditor(page);

    // Global shortcut: isMacOS() returns false → Mod = Ctrl
    await page.keyboard.press("Control+n");

    await expect(tabs).toHaveCount(initialCount + 1, { timeout: 5_000 });

    runtimeErrors.assertClean("Ctrl+N 打开新查询标签");
  });

  test("Ctrl+S 保存当前查询", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    await openNewQueryTab(page);
    await typeInEditor(page, "SELECT 1");

    // Editor shortcut: CodeMirror uses its own platform detection → Mod = Meta (Cmd)
    await page.keyboard.press("Meta+s");

    await expect(
      page.getByRole("dialog", { name: "Save Query" }),
    ).toBeVisible({ timeout: 5_000 });

    runtimeErrors.assertClean("Ctrl+S 保存当前查询");
  });

  test("Ctrl+Enter 执行查询", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    await openNewQueryTab(page);
    await typeInEditor(page, "SELECT * FROM users");

    // Editor shortcut: CodeMirror uses its own platform detection → Mod = Meta (Cmd)
    await page.keyboard.press("Meta+Enter");

    await expect(page.getByText("Execution successful")).toBeVisible({
      timeout: 10_000,
    });

    runtimeErrors.assertClean("Ctrl+Enter 执行查询");
  });

  test("Ctrl+W 关闭当前标签", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    await openNewQueryTab(page);

    const editorTablist = page.locator('[data-slot="tabs-list"]').last();
    const tabs = editorTablist.locator('[data-slot="tabs-trigger"]');
    await expect(tabs).toHaveCount(1);

    await focusOutsideEditor(page);

    // Global shortcut: isMacOS() returns false → Mod = Ctrl
    await page.keyboard.press("Control+w");

    await expect(tabs).toHaveCount(0, { timeout: 5_000 });

    runtimeErrors.assertClean("Ctrl+W 关闭当前标签");
  });
});
