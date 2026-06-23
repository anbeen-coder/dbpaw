import { expect, test } from "@playwright/test";
import { collectRuntimeErrors } from "./runtime-errors";

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Connections" }),
    ).toBeVisible();
  });

  test("打开设置面板", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    // Click settings button
    await page.getByLabel("Open settings").or(
      page.getByRole("button", { name: /Settings/ })
    ).click();

    // Verify settings dialog opens
    await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
    await expect(page.getByText("Settings")).toBeVisible();

    runtimeErrors.assertClean("打开设置面板");
  });

  test("切换到 Layout 标签", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    // Open settings
    await page.getByLabel("Open settings").click();
    await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();

    // Click Layout tab
    await page.getByRole("button", { name: "Layout" }).or(
      page.getByText("Layout")
    ).click();

    // Verify Layout content is shown
    await expect(page.getByText(/Layout|Theme|Appearance/i).first()).toBeVisible();

    runtimeErrors.assertClean("切换到 Layout 标签");
  });

  test("切换到 AI 标签", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    // Open settings
    await page.getByLabel("Open settings").click();
    await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();

    // Click AI tab
    await page.getByRole("button", { name: "AI", exact: true }).click();

    // Verify AI content is shown
    await expect(page.getByText("AI Providers")).toBeVisible();

    runtimeErrors.assertClean("切换到 AI 标签");
  });

  test("切换到 Shortcuts 标签", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    // Open settings
    await page.getByLabel("Open settings").click();
    await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();

    // Click Shortcuts tab
    await page.getByRole("button", { name: /Shortcuts|Keyboard/ }).or(
      page.getByText(/Shortcuts|Keyboard/)
    ).click();

    // Verify Shortcuts content is shown
    await expect(page.getByText(/Keyboard|Shortcuts|Hotkey/i).first()).toBeVisible();

    runtimeErrors.assertClean("切换到 Shortcuts 标签");
  });

  test("修改设置并保存", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    // Open settings
    await page.getByLabel("Open settings").click();
    await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();

    // Click Layout tab
    await page.getByRole("button", { name: "Layout" }).click();

    // Find a toggle or setting to modify
    const toggle = page.locator('button[role="switch"]').or(
      page.locator('input[type="checkbox"]')
    ).first();

    if (await toggle.isVisible()) {
      // Get current state
      const initialState = await toggle.getAttribute("aria-checked") || 
                          await toggle.isChecked();

      // Toggle the setting
      await toggle.click();

      // Verify state changed
      const newState = await toggle.getAttribute("aria-checked") || 
                      await toggle.isChecked();
      expect(newState).not.toBe(initialState);
    }

    // Close settings
    const closeButton = page.getByRole("button", { name: "Close" });
    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      await page.keyboard.press("Escape");
    }
    await expect(page.getByRole("dialog", { name: "Settings" })).toBeHidden();

    runtimeErrors.assertClean("修改设置并保存");
  });
});
