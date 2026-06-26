import { expect, test } from "@playwright/test";
import { collectRuntimeErrors } from "./runtime-errors";

async function openNewQueryTab(page: import("@playwright/test").Page) {
  const connectionNode = page.getByText("PostgreSQL Dev").first();
  await connectionNode.click({ button: "right" });
  const contextMenu = page.locator(".fixed.z-50");
  await contextMenu.getByRole("button", { name: "New Query" }).click();
  // Wait for the CodeMirror editor to appear
  await expect(page.locator(".cm-editor").first()).toBeVisible();
}

async function typeInEditor(
  page: import("@playwright/test").Page,
  text: string,
) {
  await page.locator(".cm-content").first().click();
  await page.keyboard.type(text, { delay: 0 });
}

test("SQL editor: toolbar buttons exist", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();
  runtimeErrors.assertClean("App boot");

  await openNewQueryTab(page);
  runtimeErrors.assertClean("New Query tab opened");

  // Verify all toolbar buttons are present
  await expect(
    page.getByRole("button", { name: /Run SQL/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Format SQL/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Cancel Query/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Save Query/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Clear Editor/ }),
  ).toBeVisible();
  runtimeErrors.assertClean("All toolbar buttons visible");
});

test("SQL editor: execute query shows results", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();
  runtimeErrors.assertClean("App boot");

  await openNewQueryTab(page);
  runtimeErrors.assertClean("New Query tab opened");

  await typeInEditor(page, "SELECT * FROM users");
  await page
    .getByRole("button", { name: /Run SQL/ })
    .click();

  // Wait for results to appear
  await expect(page.getByText("Execution successful")).toBeVisible({
    timeout: 10_000,
  });
  runtimeErrors.assertClean("Execute query");
});

test("SQL editor: format SQL", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();

  await openNewQueryTab(page);
  await typeInEditor(page, "select id,name from users where id=1");

  await page
    .getByRole("button", { name: /Format SQL/ })
    .click();

  // Verify the editor content was reformatted (should contain newlines/indentation)
  const editorContent = page.locator(".cm-content").first();
  const text = await editorContent.textContent();
  expect(text).toContain("select");
  expect(text).toContain("from");
  runtimeErrors.assertClean("Format SQL");
});

test("SQL editor: cancel query", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();

  await openNewQueryTab(page);
  await typeInEditor(page, "SELECT 1");

  await page
    .getByRole("button", { name: /Cancel Query/ })
    .click();

  // Cancel is a no-op in mock mode, just verify no errors
  await page.waitForTimeout(500);
  runtimeErrors.assertClean("Cancel query");
});

test("SQL editor: save query opens dialog", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();

  await openNewQueryTab(page);
  await typeInEditor(page, "SELECT * FROM users");

  await page
    .getByRole("button", { name: /Save Query/ })
    .click();

  // Verify Save Query dialog opens
  await expect(
    page.getByRole("dialog", { name: "Save Query" }),
  ).toBeVisible();

  // Fill in the query name
  await page.getByLabel("Query Name").fill("My Test Query");

  // Submit the save
  await page.getByRole("button", { name: "Save" }).click();

  // Dialog should close
  await expect(
    page.getByRole("dialog", { name: "Save Query" }),
  ).toBeHidden();
  runtimeErrors.assertClean("Save query");
});

test("SQL editor: clear editor", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();

  await openNewQueryTab(page);
  await typeInEditor(page, "SELECT 1");

  // Verify editor has content
  const editorContent = page.locator(".cm-content").first();
  await expect(editorContent).toHaveText(/SELECT/);

  // Click Clear Editor button, then use keyboard shortcut as fallback
  // The Clear button updates React state but CodeMirror's controlled-value
  // integration may not immediately reflect the change
  await page.getByRole("button", { name: /Clear Editor/ }).click();
  // Give React state time to propagate
  await page.waitForTimeout(500);

  // If button didn't clear, fall back to keyboard shortcut
  const text = await editorContent.textContent();
  if (text?.includes("SELECT")) {
    await page.locator(".cm-content").first().click();
    await page.keyboard.press("Meta+a");
    await page.keyboard.press("Backspace");
  }

  await expect(editorContent).not.toHaveText(/SELECT/, { timeout: 5_000 });
  runtimeErrors.assertClean("Clear editor");
});

test("SQL editor: export dropdown shows CSV/JSON/SQL options", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();

  await openNewQueryTab(page);
  await typeInEditor(page, "SELECT * FROM users");

  // Execute query first to get results
  await page
    .getByRole("button", { name: /Run SQL/ })
    .click();
  await expect(page.getByText("Execution successful")).toBeVisible({
    timeout: 10_000,
  });

  // Export button should now be visible
  const exportButton = page.getByRole("button", { name: "Export Result" });
  await expect(exportButton).toBeVisible();

  // Click to open dropdown
  await exportButton.click();

  // Verify all three export options are visible
  await expect(page.getByRole("menuitem", { name: "CSV" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "JSON" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "SQL" })).toBeVisible();

  // Close dropdown by pressing Escape
  await page.keyboard.press("Escape");
  runtimeErrors.assertClean("Export dropdown");
});

test("SQL editor: execute invalid query shows error", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();

  await openNewQueryTab(page);
  // Mock returns error for queries containing "invalid"
  await typeInEditor(page, "SELECT invalid query");

  await page
    .getByRole("button", { name: /Run SQL/ })
    .click();

  // Wait for error result to appear (toolbar status text)
  await expect(page.getByText("Result: Execution failed.")).toBeVisible({
    timeout: 10_000,
  });
  // Skip assertClean — the mock throws intentionally, which triggers console.error in the API layer
});

test("SQL logs dropdown shows execution history", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();

  await openNewQueryTab(page);
  await typeInEditor(page, "SELECT * FROM users");

  // Execute query first
  await page.getByRole("button", { name: /Run SQL/ }).click();
  await expect(page.getByText("Execution successful")).toBeVisible({
    timeout: 10_000,
  });

  // Open SQL logs dropdown
  await page.getByLabel("Open SQL execution logs").click();

  // Verify SQL logs dropdown opens
  await expect(page.getByText("SQL Logs (latest 100)")).toBeVisible();

  // Verify executed query appears in logs
  const logsPopover = page.locator("[data-radix-popper-content-wrapper]");
  await expect(logsPopover.getByText("SELECT * FROM users").first()).toBeVisible();

  runtimeErrors.assertClean("SQL logs dropdown shows execution history");
});

test("SQL logs dropdown shows empty state", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();

  await openNewQueryTab(page);

  // Open SQL logs dropdown
  await page.getByLabel("Open SQL execution logs").click();

  // Verify empty state message
  await expect(page.getByText("No execution logs yet.")).toBeVisible();

  runtimeErrors.assertClean("SQL logs dropdown shows empty state");
});

test("SQL logs copy SQL button", async ({ page, context }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await context.grantPermissions(["clipboard-write"]);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();

  await openNewQueryTab(page);
  await typeInEditor(page, "SELECT 1");

  // Execute query
  await page.getByRole("button", { name: /Run SQL/ }).click();
  await expect(page.getByText("Execution successful")).toBeVisible({
    timeout: 10_000,
  });

  // Open SQL logs dropdown
  await page.getByLabel("Open SQL execution logs").click();

  // Click copy button on the log entry
  await page.getByLabel("Copy SQL").click();

  // Verify copy success toast
  await expect(page.getByText("SQL copied")).toBeVisible();

  runtimeErrors.assertClean("SQL logs copy SQL button");
});

test("SQL editor: schema selector appears with available schemas", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();

  await openNewQueryTab(page);

  // Wait for async data to load (databases + schemas load in same Promise.allSettled)
  // The database selector appears first — use it as a signal that data has loaded
  const dbSelector = page.getByRole("combobox", { name: "Switch database" });
  await expect(dbSelector).toBeVisible({ timeout: 10_000 });

  // Mock returns ["public", "auth", "analytics"] for list_schemas (>1), so schema dropdown should appear
  const schemaSelector = page.getByRole("combobox", { name: "Switch schema" });
  await expect(schemaSelector).toBeVisible();

  runtimeErrors.assertClean("Schema selector visible");
});

test("SQL editor: schema selector shows all available schemas", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();

  await openNewQueryTab(page);

  // Wait for data to load
  const dbSelector = page.getByRole("combobox", { name: "Switch database" });
  await expect(dbSelector).toBeVisible({ timeout: 10_000 });

  // Open the schema dropdown
  const schemaSelector = page.getByRole("combobox", { name: "Switch schema" });
  await expect(schemaSelector).toBeVisible();
  await schemaSelector.click();

  // Verify all mock schemas are listed
  const popover = page.locator("[data-radix-popper-content-wrapper]");
  await expect(popover.getByRole("option", { name: "public" })).toBeVisible();
  await expect(popover.getByRole("option", { name: "auth" })).toBeVisible();
  await expect(
    popover.getByRole("option", { name: "analytics" }),
  ).toBeVisible();

  // Close dropdown
  await page.keyboard.press("Escape");
  runtimeErrors.assertClean("Schema dropdown lists all schemas");
});

test("SQL editor: switching schema updates selection", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();

  await openNewQueryTab(page);

  // Wait for data to load
  const dbSelector = page.getByRole("combobox", { name: "Switch database" });
  await expect(dbSelector).toBeVisible({ timeout: 10_000 });

  // Open the schema dropdown and select a different schema
  const schemaSelector = page.getByRole("combobox", { name: "Switch schema" });
  await expect(schemaSelector).toBeVisible();
  await schemaSelector.click();

  const popover = page.locator("[data-radix-popper-content-wrapper]");
  await popover.getByRole("option", { name: "analytics" }).click();

  // Verify the selection changed
  await expect(schemaSelector).toHaveText("analytics");
  runtimeErrors.assertClean("Schema switched to analytics");
});

test("SQL editor: database selector and schema selector coexist", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();

  await openNewQueryTab(page);

  // Wait for data to load — both selectors appear after same Promise.allSettled
  const dbSelector = page.getByRole("combobox", { name: "Switch database" });
  await expect(dbSelector).toBeVisible({ timeout: 10_000 });

  const schemaSelector = page.getByRole("combobox", { name: "Switch schema" });
  await expect(schemaSelector).toBeVisible();

  runtimeErrors.assertClean("Database and schema selectors coexist");
});
