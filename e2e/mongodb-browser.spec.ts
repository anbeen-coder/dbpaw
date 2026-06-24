import { expect, test, type Page } from "@playwright/test";
import { collectRuntimeErrors } from "./runtime-errors";

async function openMongoDBBrowser(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();
  // Double-click MongoDB Dev to connect
  await page.getByText("MongoDB Dev", { exact: true }).dblclick();
  // Wait for database "testdb" to appear in the sidebar
  await expect(page.getByText("testdb")).toBeVisible();
  // Click database "testdb" to expand and load collections
  await page.getByText("testdb").click();
  // Wait for collection list to render
  await expect(page.getByText("users", { exact: true })).toBeVisible();
}

test.describe("MongoDB Browser", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await openMongoDBBrowser(page);
  });

  test("连接并浏览数据库列表", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    // Verify databases are visible
    await expect(page.getByText("admin", { exact: true })).toBeVisible();
    await expect(page.getByText("testdb", { exact: true })).toBeVisible();
    await expect(page.getByText("local", { exact: true })).toBeVisible();

    runtimeErrors.assertClean("MongoDB 数据库列表加载");
  });

  test("展开数据库查看集合列表", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    // Verify collections are visible
    await expect(page.getByText("users", { exact: true })).toBeVisible();
    await expect(page.getByText("orders", { exact: true })).toBeVisible();
    await expect(page.getByText("products", { exact: true })).toBeVisible();

    runtimeErrors.assertClean("MongoDB 集合列表加载");
  });

  test("双击集合打开文档浏览器", async ({ page }) => {
    test.skip(true, "MongoDB document browser tab is not yet implemented");
    const runtimeErrors = collectRuntimeErrors(page);

    // Double-click users collection
    await page.getByText("users", { exact: true }).dblclick();

    // Wait for documents to render
    await expect(page.getByText("Alice")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Bob")).toBeVisible();

    runtimeErrors.assertClean("MongoDB 文档浏览器打开");
  });

  test("查看文档详情", async ({ page }) => {
    test.skip(true, "MongoDB document browser tab is not yet implemented");
    const runtimeErrors = collectRuntimeErrors(page);

    // Open users collection
    await page.getByText("users", { exact: true }).dblclick();
    await expect(page.getByText("Alice")).toBeVisible({ timeout: 10_000 });

    // Click on a document to view details
    await page.getByText("Alice").click();

    // Verify detail panel shows document fields
    await expect(page.getByText("alice@example.com")).toBeVisible();

    runtimeErrors.assertClean("MongoDB 文档详情查看");
  });

  test("搜索/过滤文档", async ({ page }) => {
    test.skip(true, "MongoDB document browser tab is not yet implemented");
    const runtimeErrors = collectRuntimeErrors(page);

    // Open users collection
    await page.getByText("users", { exact: true }).dblclick();
    await expect(page.getByText("Alice")).toBeVisible({ timeout: 10_000 });

    // Find and use search input
    const searchInput = page.locator('input[placeholder*="Search"]').or(
      page.locator('input[placeholder*="Filter"]'),
    );
    await searchInput.fill("Alice");
    await searchInput.press("Enter");

    // Verify filtered results
    await expect(page.getByText("Alice")).toBeVisible();
    await expect(page.getByText("Bob")).toBeHidden();

    runtimeErrors.assertClean("MongoDB 文档搜索过滤");
  });

  test("新建文档", async ({ page }) => {
    test.skip(true, "MongoDB document browser tab is not yet implemented");
    const runtimeErrors = collectRuntimeErrors(page);

    // Open users collection
    await page.getByText("users", { exact: true }).dblclick();
    await expect(page.getByText("Alice")).toBeVisible({ timeout: 10_000 });

    // Click New Document button
    await page
      .getByRole("button", { name: /New Document|Add Document|Insert/ })
      .click();

    // Verify new document form or dialog appears
    await expect(
      page.getByRole("dialog").or(page.locator("form")),
    ).toBeVisible();

    // Fill in document data
    await page
      .getByLabel("name")
      .or(page.locator('input[placeholder="name"]'))
      .fill("Test User");
    await page
      .getByLabel("email")
      .or(page.locator('input[placeholder="email"]'))
      .fill("test@example.com");

    // Save document
    await page.getByRole("button", { name: /Save|Insert|Create/ }).click();

    // Wait for save to complete
    await page.waitForTimeout(500);

    runtimeErrors.assertClean("MongoDB 新建文档");
  });

  test("删除文档确认对话框", async ({ page }) => {
    test.skip(true, "MongoDB document browser tab is not yet implemented");
    const runtimeErrors = collectRuntimeErrors(page);

    // Open users collection
    await page.getByText("users", { exact: true }).dblclick();
    await expect(page.getByText("Alice")).toBeVisible({ timeout: 10_000 });

    // Select a document and click delete
    await page.getByText("Alice").click();
    await page.getByRole("button", { name: /Delete|Remove/ }).click();

    // Verify confirmation dialog appears
    await expect(
      page.getByRole("alertdialog").or(page.getByRole("dialog")),
    ).toBeVisible();
    await expect(
      page.getByText(/confirm|delete|permanently/i),
    ).toBeVisible();

    // Cancel deletion
    await page.getByRole("button", { name: /Cancel|No/ }).click();
    await expect(
      page.getByRole("alertdialog").or(page.getByRole("dialog")),
    ).toBeHidden();

    runtimeErrors.assertClean("MongoDB 删除文档确认对话框");
  });

  test("右键菜单操作", async ({ page }) => {
    test.skip(true, "MongoDB collection context menu is not yet wired up");
    const runtimeErrors = collectRuntimeErrors(page);

    // Right-click on a collection
    await page.getByText("users", { exact: true }).click({ button: "right" });

    // Verify context menu appears
    const contextMenu = page.locator(".fixed.z-50");
    await expect(contextMenu).toBeVisible();

    // Verify menu items
    await expect(
      contextMenu.getByRole("button", { name: /Open|View|Browse/ }),
    ).toBeVisible();
    await expect(
      contextMenu.getByRole("button", { name: /Drop|Delete/ }),
    ).toBeVisible();

    // Close menu
    await page.keyboard.press("Escape");

    runtimeErrors.assertClean("MongoDB 右键菜单操作");
  });
});
