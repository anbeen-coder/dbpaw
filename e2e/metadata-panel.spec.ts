import { expect, test, type Page } from "@playwright/test";
import { collectRuntimeErrors } from "./runtime-errors";

async function openTableMetadata(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();
  // Double-click PostgreSQL Dev to connect
  await page.getByText("PostgreSQL Dev", { exact: true }).dblclick();
  // Wait for connection to establish
  await expect(page.getByText("testdb")).toBeVisible();
  // Click testdb to expand it
  await page.getByText("testdb").click();
  // Expand public schema
  await expect(page.getByText("public")).toBeVisible();
  await page.getByText("public").click();
  // Expand Tables group
  await expect(page.getByText("Tables")).toBeVisible();
  await page.getByText("Tables").click();
  // Double-click users table to open datagrid
  await page.getByText("users", { exact: true }).dblclick();
  // Wait for table data to render
  await expect(page.getByText("alice", { exact: true })).toBeVisible();
  // Click DDL button to open metadata panel
  const tabPanel = page.locator("[role='tabpanel']").filter({
    has: page.getByText("alice", { exact: true }),
  });
  await tabPanel.getByLabel("DDL").click();
  // Wait for metadata panel to render
  await page.waitForTimeout(500);
}

test.describe("Metadata Panel", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await openTableMetadata(page);
  });

  test("打开表的 Metadata 面板", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    // Verify metadata panel title is visible
    await expect(page.getByText("Table Metadata")).toBeVisible();
    // Verify schema.table is shown in the header (not in DDL code)
    await expect(page.locator(".text-sm.text-muted-foreground").getByText("public.users")).toBeVisible();

    runtimeErrors.assertClean("打开 Metadata 面板");
  });

  test("Columns 区域显示列信息", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    // Verify columns section title (the div, not the table header)
    await expect(page.locator("div.text-sm.font-semibold", { hasText: "Columns" })).toBeVisible();

    // Scope to the Columns section table (first section with border)
    const columnsSection = page.locator("section").filter({
      has: page.locator("div.text-sm.font-semibold", { hasText: "Columns" }),
    });
    const columnsTable = columnsSection.locator("table");

    // Verify column names are displayed in the first column of the Columns table
    const firstColumnCells = columnsTable.locator("tbody tr td:first-child");
    await expect(firstColumnCells.filter({ hasText: /^id$/ }).first()).toBeVisible();
    await expect(firstColumnCells.filter({ hasText: /^username$/ }).first()).toBeVisible();
    await expect(firstColumnCells.filter({ hasText: /^email$/ }).first()).toBeVisible();
    await expect(firstColumnCells.filter({ hasText: /^created_at$/ }).first()).toBeVisible();

    // Verify column types are shown in the second column
    const secondColumnCells = columnsTable.locator("tbody tr td:nth-child(2)");
    await expect(secondColumnCells.filter({ hasText: /^integer$/ }).first()).toBeVisible();
    await expect(secondColumnCells.filter({ hasText: /^varchar$/ }).first()).toBeVisible();

    runtimeErrors.assertClean("Columns 区域显示列信息");
  });

  test("Indexes 区域显示索引列表", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    // Verify indexes section title
    await expect(page.locator("div.text-sm.font-semibold", { hasText: "Indexes" })).toBeVisible();

    // Verify index names are displayed in table cells
    await expect(page.getByRole("cell", { name: "users_pkey" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "users_email_idx" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "users_username_idx" })).toBeVisible();

    runtimeErrors.assertClean("Indexes 区域显示索引列表");
  });

  test("Foreign Keys 区域显示外键关系", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    // Verify foreign keys section title
    await expect(page.locator("div.text-sm.font-semibold", { hasText: "Foreign Keys" })).toBeVisible();

    // Verify foreign key information is displayed in table cells
    await expect(page.getByRole("cell", { name: "fk_user_role" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "role_id" })).toBeVisible();

    runtimeErrors.assertClean("Foreign Keys 区域显示外键关系");
  });

  test("DDL 区域显示建表语句", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    // Verify DDL section title
    await expect(page.locator("div.text-sm.font-semibold", { hasText: "Create Table SQL" })).toBeVisible();

    // Verify DDL content is displayed in a code block
    await expect(page.locator("code")).toContainText("CREATE TABLE");
    await expect(page.locator("code")).toContainText("public.users");

    runtimeErrors.assertClean("DDL 区域显示建表语句");
  });

  test("Copy 按钮可点击无报错", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    // Find and click the Copy button
    const copyButton = page.getByRole("button", { name: "Copy" });
    await expect(copyButton).toBeVisible();
    await copyButton.click();
    await page.waitForTimeout(300);

    runtimeErrors.assertClean("Copy 按钮可点击无报错");
  });

  test("滚动页面无 runtime error", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    // Scroll to bottom of metadata panel
    const metadataPanel = page.locator(".h-full.overflow-auto").first();
    await metadataPanel.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await page.waitForTimeout(300);

    // Scroll back to top
    await metadataPanel.evaluate((el) => el.scrollTo(0, 0));
    await page.waitForTimeout(300);

    runtimeErrors.assertClean("滚动页面无 runtime error");
  });
});
