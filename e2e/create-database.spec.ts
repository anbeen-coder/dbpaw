import { expect, test } from "@playwright/test";
import { collectRuntimeErrors } from "./runtime-errors";

async function openCreateDatabaseDialog(page: import("@playwright/test").Page) {
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();

  const connectionNode = page.getByText("PostgreSQL Dev").first();
  await connectionNode.click({ button: "right" });

  const contextMenu = page.locator(".fixed.z-50");
  await expect(contextMenu).toBeVisible();
  await expect(
    contextMenu.getByRole("button", { name: "New Database" }),
  ).toBeVisible();
  await contextMenu.getByRole("button", { name: "New Database" }).click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Create Database")).toBeVisible();
}

test.describe("Create Database", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("从右键菜单打开建库对话框", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    await openCreateDatabaseDialog(page);

    await expect(page.getByText("Database Name")).toBeVisible();
    await expect(
      page.getByText("Create if not exists (IF NOT EXISTS)"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Show advanced options" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Create" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();

    runtimeErrors.assertClean("打开建库对话框");
  });

  test("填写名称并成功创建数据库", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    await openCreateDatabaseDialog(page);

    await page.getByPlaceholder("Enter database name").fill("my_new_db");

    await page.getByRole("button", { name: "Create" }).click();

    await expect(
      page.getByText("Database created successfully"),
    ).toBeVisible({ timeout: 10_000 });

    await expect(page.getByRole("dialog")).toBeHidden();

    runtimeErrors.assertClean("填写名称并成功创建数据库");
  });

  test("空名称提交显示验证错误", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    await openCreateDatabaseDialog(page);

    await page.getByRole("button", { name: "Create" }).click();

    await expect(
      page.getByText("Database name is required"),
    ).toBeVisible();

    await expect(page.getByRole("dialog")).toBeVisible();

    runtimeErrors.assertClean("空名称提交显示验证错误");
  });

  test("高级选项展开和收起", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    await openCreateDatabaseDialog(page);

    const toggleBtn = page.getByRole("button", {
      name: "Show advanced options",
    });
    await toggleBtn.click();

    await expect(
      page.getByRole("button", { name: "Hide advanced options" }),
    ).toBeVisible();
    await expect(page.getByText("Encoding")).toBeVisible();

    await page
      .getByRole("button", { name: "Hide advanced options" })
      .click();

    await expect(
      page.getByRole("button", { name: "Show advanced options" }),
    ).toBeVisible();

    runtimeErrors.assertClean("高级选项展开和收起");
  });

  test("取消按钮关闭对话框", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    await openCreateDatabaseDialog(page);

    await page.getByPlaceholder("Enter database name").fill("some_db");

    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByRole("dialog")).toBeHidden();

    runtimeErrors.assertClean("取消按钮关闭对话框");
  });

  test("Escape 键关闭对话框", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    await openCreateDatabaseDialog(page);

    await page.keyboard.press("Escape");

    await expect(page.getByRole("dialog")).toBeHidden();

    runtimeErrors.assertClean("Escape 键关闭对话框");
  });
});
