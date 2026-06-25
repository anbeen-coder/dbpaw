import { expect, test } from "@playwright/test";
import { collectRuntimeErrors } from "./runtime-errors";

async function openSidebarContextMenu(page: import("@playwright/test").Page) {
  const lastConnection = page.getByText("Elasticsearch Dev").first();
  await lastConnection.scrollIntoViewIfNeeded();
  const box = await lastConnection.boundingBox();
  if (box) {
    await page.mouse.click(
      box.x + box.width / 2,
      box.y + box.height + 20,
      { button: "right" },
    );
  }
}

test.describe("Connection Import", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Connections" }),
    ).toBeVisible();
  });

  test("import dialog shows correct options", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    await openSidebarContextMenu(page);

    // Click Import Connections
    const contextMenu = page.locator(".fixed.z-50");
    await expect(contextMenu).toBeVisible();
    await contextMenu.getByRole("button", { name: "Import Connections" }).click();

    // Verify dialog opens with correct title
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Import Database Connections")).toBeVisible();

    // Verify Navicat option
    await expect(page.getByText("Navicat")).toBeVisible();
    await expect(page.getByText("Import .ncx files")).toBeVisible();

    // Verify DBeaver option
    await expect(page.getByText("DBeaver")).toBeVisible();
    await expect(page.getByText("Import .json files")).toBeVisible();

    // Verify Cancel button
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();

    // Click Cancel
    await page.getByRole("button", { name: "Cancel" }).click();

    // Verify dialog closes
    await expect(page.getByRole("dialog")).toBeHidden();

    runtimeErrors.assertClean("import dialog shows correct options");
  });

  test("navicat import shows desktop only toast", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    await openSidebarContextMenu(page);

    // Click Import Connections
    const contextMenu = page.locator(".fixed.z-50");
    await expect(contextMenu).toBeVisible();
    await contextMenu.getByRole("button", { name: "Import Connections" }).click();

    // Verify dialog opens
    await expect(page.getByRole("dialog")).toBeVisible();

    // Click Navicat button
    await page.getByText("Navicat", { exact: true }).click();

    // Verify "Desktop only" toast appears
    await expect(
      page.getByText("SQL import is only available in Tauri desktop mode."),
    ).toBeVisible({ timeout: 5000 });

    runtimeErrors.assertClean("navicat import shows desktop only toast");
  });

  test("dbeaver import shows desktop only toast", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    await openSidebarContextMenu(page);

    // Click Import Connections
    const contextMenu = page.locator(".fixed.z-50");
    await expect(contextMenu).toBeVisible();
    await contextMenu.getByRole("button", { name: "Import Connections" }).click();

    // Verify dialog opens
    await expect(page.getByRole("dialog")).toBeVisible();

    // Click DBeaver button
    await page.getByText("DBeaver", { exact: true }).click();

    // Verify "Desktop only" toast appears
    await expect(
      page.getByText("SQL import is only available in Tauri desktop mode."),
    ).toBeVisible({ timeout: 5000 });

    runtimeErrors.assertClean("dbeaver import shows desktop only toast");
  });
});
