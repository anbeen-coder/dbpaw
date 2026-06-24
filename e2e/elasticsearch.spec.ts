import { expect, test, type Page } from "@playwright/test";
import { collectRuntimeErrors } from "./runtime-errors";

async function openElasticsearch(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();
  // Double-click Elasticsearch Dev to connect and expand
  await page.getByText("Elasticsearch Dev", { exact: true }).dblclick();
  // Wait for connection to establish and "Indices" to appear
  await expect(page.getByText("Indices")).toBeVisible({ timeout: 10_000 });
  // Click on "Indices" to expand and load index list
  await page.getByText("Indices").click();
  // Wait for index list to render - products is a non-system index
  await expect(page.getByText("products", { exact: true })).toBeVisible({ timeout: 10_000 });
}

test.describe("Elasticsearch", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await openElasticsearch(page);
  });

  test("连接并浏览索引列表", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    // Verify indices are visible (from mock data: products, orders, .kibana)
    await expect(page.getByText("products", { exact: true })).toBeVisible();
    await expect(page.getByText("orders", { exact: true })).toBeVisible();

    runtimeErrors.assertClean("ES 索引列表加载");
  });

  test("双击索引打开索引视图", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    // Double-click products index to open it
    await page.getByText("products", { exact: true }).dblclick();

    // Wait for the ElasticsearchIndexView to render
    // The search bar should show the index name in the top bar
    await expect(
      page.locator(".truncate.text-sm.font-medium", { hasText: "products" }),
    ).toBeVisible({ timeout: 10_000 });

    runtimeErrors.assertClean("ES 索引视图打开");
  });

  test("查看索引字段列表", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    // Open products index
    await page.getByText("products", { exact: true }).dblclick();
    await expect(
      page.locator(".truncate.text-sm.font-medium", { hasText: "products" }),
    ).toBeVisible({ timeout: 10_000 });

    // Verify field list shows mapping fields from mock data
    // Mock mapping has: id (keyword), name (text), price (float), category (keyword), created_at (date)
    await expect(page.getByText("keyword").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("text").first()).toBeVisible();
    await expect(page.getByText("float").first()).toBeVisible();

    runtimeErrors.assertClean("ES 索引字段列表");
  });

  test("执行搜索查询并查看文档列表", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    // Open products index
    await page.getByText("products", { exact: true }).dblclick();
    await expect(
      page.locator(".truncate.text-sm.font-medium", { hasText: "products" }),
    ).toBeVisible({ timeout: 10_000 });

    // Verify documents are loaded (auto-search on open via mock data)
    await expect(page.getByText("Mock Product 1").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Mock Product 2").first()).toBeVisible();
    await expect(page.getByText("Mock Product 3").first()).toBeVisible();

    runtimeErrors.assertClean("ES 搜索查询执行");
  });

  test("查看文档详情", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    // Open products index
    await page.getByText("products", { exact: true }).dblclick();
    await expect(
      page.locator(".truncate.text-sm.font-medium", { hasText: "products" }),
    ).toBeVisible({ timeout: 10_000 });

    // Wait for documents to load
    await expect(page.getByText("Mock Product 1").first()).toBeVisible({ timeout: 10_000 });

    // Click on a document row (doc-1 is the _id column value)
    await page.getByText("doc-1").first().click();

    // Verify the document tab is shown in the detail panel
    await expect(
      page.getByRole("button", { name: /document/i }),
    ).toBeVisible();

    runtimeErrors.assertClean("ES 文档详情查看");
  });

  test("查看映射详情", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    // Open products index
    await page.getByText("products", { exact: true }).dblclick();
    await expect(
      page.locator(".truncate.text-sm.font-medium", { hasText: "products" }),
    ).toBeVisible({ timeout: 10_000 });

    // Click on mapping tab in the detail panel
    await page.getByRole("button", { name: /mapping/i }).click();

    // Verify mapping details are shown (mock returns properties with type info)
    await expect(page.getByText(/properties/i).first()).toBeVisible({ timeout: 10_000 });

    runtimeErrors.assertClean("ES 索引映射详情");
  });

  test("查看聚合结果", async ({ page }) => {
    const runtimeErrors = collectRuntimeErrors(page);

    // Open products index
    await page.getByText("products", { exact: true }).dblclick();
    await expect(
      page.locator(".truncate.text-sm.font-medium", { hasText: "products" }),
    ).toBeVisible({ timeout: 10_000 });

    // Click on aggregations tab
    await page.getByRole("button", { name: /aggregation/i }).click();

    // Verify aggregation data is shown (mock returns categories bucket)
    await expect(page.getByText("electronics").first()).toBeVisible({ timeout: 10_000 });

    runtimeErrors.assertClean("ES 聚合结果查看");
  });
});
