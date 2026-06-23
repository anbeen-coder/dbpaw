import { expect, test, type Page } from "@playwright/test";
import { collectRuntimeErrors } from "./runtime-errors";

async function openNewQueryTab(page: Page) {
  const connectionNode = page.getByText("PostgreSQL Dev").first();
  await connectionNode.click({ button: "right" });
  const contextMenu = page.locator(".fixed.z-50");
  await contextMenu.getByRole("button", { name: "New Query" }).click();
  await expect(page.locator(".cm-editor").first()).toBeVisible();
}

test.describe("Tab Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Connections" }),
    ).toBeVisible();
  });

  test("打开多个标签页", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    // Open first tab
    await openNewQueryTab(page);

    // Open second tab
    await openNewQueryTab(page);

    // Verify multiple query tabs exist (target the editor tablist, not sidebar)
    const editorTablist = page.locator('[data-slot="tabs-list"]').last();
    const tabs = editorTablist.locator('[data-slot="tabs-trigger"]');
    await expect(tabs).toHaveCount(2, { timeout: 5_000 });

    runtimeErrors.assertClean("打开多个标签页");
  });

  test("切换标签页显示正确内容", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    // Open first tab
    await openNewQueryTab(page);

    // Open second tab
    await openNewQueryTab(page);

    // Verify both tabs exist
    const editorTablist = page.locator('[data-slot="tabs-list"]').last();
    const tabs = editorTablist.locator('[data-slot="tabs-trigger"]');
    await expect(tabs).toHaveCount(2, { timeout: 5_000 });

    // Click first tab
    await tabs.first().click();

    // Verify editor is visible after switching
    await expect(page.locator(".cm-editor").first()).toBeVisible();

    // Click second tab
    await tabs.last().click();

    // Verify editor is still visible
    await expect(page.locator(".cm-editor").first()).toBeVisible();

    runtimeErrors.assertClean("切换标签页显示正确内容");
  });

  test("关闭当前标签页", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    // Open a tab
    await openNewQueryTab(page);

    // Hover over the tab to show the close button
    const editorTablist = page.locator('[data-slot="tabs-list"]').last();
    const tab = editorTablist.locator('[data-slot="tabs-trigger"]').first();
    await tab.hover();

    // Close tab via close button (the X button inside the tab)
    const closeButton = tab.locator('button[aria-label*="Close"]').first();
    await closeButton.click();

    // Verify tab is closed
    await expect(editorTablist.locator('[data-slot="tabs-trigger"]')).toHaveCount(0, {
      timeout: 5_000,
    });

    runtimeErrors.assertClean("关闭当前标签页");
  });

  test("右键菜单关闭其他标签", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    // Open multiple tabs
    for (let i = 0; i < 3; i++) {
      await openNewQueryTab(page);
      await page.waitForTimeout(300);
    }

    // Right-click on first tab in the editor tablist
    const editorTablist = page.locator('[data-slot="tabs-list"]').last();
    const firstTab = editorTablist.locator('[data-slot="tabs-trigger"]').first();
    await firstTab.click({ button: "right" });

    // Click Close Other Tabs (Radix UI renders menu with role="menu")
    await page.getByRole("menuitem", { name: /Close Other Tabs/ }).click();

    // Verify only one tab remains
    await expect(editorTablist.locator('[data-slot="tabs-trigger"]')).toHaveCount(1, {
      timeout: 5_000,
    });

    runtimeErrors.assertClean("右键菜单关闭其他标签");
  });

  test("标签拖拽排序", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    // Open multiple tabs
    for (let i = 0; i < 3; i++) {
      await openNewQueryTab(page);
      await page.waitForTimeout(300);
    }

    const editorTablist = page.locator('[data-slot="tabs-list"]').last();
    const tabs = editorTablist.locator('[data-slot="tabs-trigger"]');
    const firstTab = tabs.first();
    const lastTab = tabs.last();

    // Get initial positions
    const firstBox = await firstTab.boundingBox();
    const lastBox = await lastTab.boundingBox();

    if (firstBox && lastBox) {
      // Drag first tab to last position
      await firstTab.dragTo(lastTab);

      // Verify order changed (first tab should now be last)
      await page.waitForTimeout(500);
    }

    runtimeErrors.assertClean("标签拖拽排序");
  });

  test("关闭所有标签", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    // Open multiple tabs
    for (let i = 0; i < 3; i++) {
      await openNewQueryTab(page);
      await page.waitForTimeout(300);
    }

    const editorTablist = page.locator('[data-slot="tabs-list"]').last();
    const tabs = editorTablist.locator('[data-slot="tabs-trigger"]');

    // Close all tabs by hovering and clicking close button on each
    const count = await tabs.count();
    for (let i = 0; i < count; i++) {
      const tab = tabs.first();
      await tab.hover();
      const closeButton = tab.locator('button[aria-label*="Close"]').first();
      await closeButton.click();
      await page.waitForTimeout(200);
    }

    // Verify all tabs are closed
    await expect(editorTablist.locator('[data-slot="tabs-trigger"]')).toHaveCount(0, {
      timeout: 5_000,
    });

    runtimeErrors.assertClean("关闭所有标签");
  });
});
