import { expect, test, type Page } from "@playwright/test";
import { collectRuntimeErrors } from "./runtime-errors";

async function navigateToTableList(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();
  await page.getByText("PostgreSQL Dev", { exact: true }).dblclick();
  await expect(page.getByText("testdb")).toBeVisible();
  await page.getByText("testdb").click();
  await expect(page.getByText("public")).toBeVisible();
}

async function openCreateTableFromSchemaMenu(page: Page) {
  await page.getByText("public", { exact: true }).click({ button: "right" });
  const contextMenu = page.locator(".fixed.z-50");
  await expect(contextMenu).toBeVisible();
  await expect(contextMenu.getByRole("button", { name: "New Table" })).toBeVisible();
  await contextMenu.getByRole("button", { name: "New Table" }).click();
  await expect(page.getByText("Table Name")).toBeVisible();
}

test.describe("Create Table", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await navigateToTableList(page);
  });

  test("从 schema 右键打开建表向导", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    await openCreateTableFromSchemaMenu(page);

    await expect(page.getByText("SQL Preview")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create Table" })).toBeVisible();

    runtimeErrors.assertClean("打开建表向导");
  });

  test("添加列并设置数据类型", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    await openCreateTableFromSchemaMenu(page);

    await page.getByPlaceholder("e.g. users").fill("test_table");

    const nameInput = page.getByPlaceholder("Name").first();
    await expect(nameInput).toBeVisible();
    await nameInput.fill("id");

    const typeTrigger = page.locator('[role="combobox"]').first();
    await typeTrigger.click();
    await page.getByRole("option", { name: "INTEGER" }).click();

    await page.getByRole("button", { name: "Add Column" }).click();

    const nameInputs = page.getByPlaceholder("Name");
    await nameInputs.last().fill("name");

    const typeTriggers = page.locator('[role="combobox"]');
    await typeTriggers.last().click();
    await page.getByRole("option", { name: "VARCHAR" }).click();

    runtimeErrors.assertClean("添加列并设置数据类型");
  });

  test("设置主键约束", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    await openCreateTableFromSchemaMenu(page);

    await page.getByPlaceholder("e.g. users").fill("test_table");

    await page.getByPlaceholder("Name").first().fill("id");

    const typeTrigger = page.locator('[role="combobox"]').first();
    await typeTrigger.click();
    await page.getByRole("option", { name: "INTEGER" }).click();

    const pkCheckbox = page.locator('button[role="checkbox"]').nth(1);
    await pkCheckbox.click();
    await expect(pkCheckbox).toHaveAttribute("data-state", "checked");

    runtimeErrors.assertClean("设置主键约束");
  });

  test("预览 DDL 语句", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    await openCreateTableFromSchemaMenu(page);

    await page.getByPlaceholder("e.g. users").fill("test_table");

    await page.getByPlaceholder("Name").first().fill("id");

    const typeTrigger = page.locator('[role="combobox"]').first();
    await typeTrigger.click();
    await page.getByRole("option", { name: "INTEGER" }).click();

    await expect(page.locator("pre").getByText("CREATE TABLE")).toBeVisible();
    await expect(page.locator("pre").getByText(/test_table/)).toBeVisible();

    runtimeErrors.assertClean("预览 DDL 语句");
  });

  test("保存表并验证出现在列表", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    await openCreateTableFromSchemaMenu(page);

    await page.getByPlaceholder("e.g. users").fill("new_test_table");

    await page.getByPlaceholder("Name").first().fill("id");

    const typeTrigger = page.locator('[role="combobox"]').first();
    await typeTrigger.click();
    await page.getByRole("option", { name: "INTEGER" }).click();

    await page.getByRole("button", { name: "Create Table" }).click();

    await expect(page.getByText('Table "new_test_table" created successfully')).toBeVisible({ timeout: 10_000 });

    runtimeErrors.assertClean("保存表并验证出现在列表");
  });
});
