import { expect, test } from "@playwright/test";
import { collectRuntimeErrors } from "./runtime-errors";

async function switchToQueriesTab(page: import("@playwright/test").Page) {
  await page.getByRole("tab", { name: "Queries" }).click();
  await expect(
    page.getByRole("heading", { name: "Saved Queries" }),
  ).toBeVisible();
}

test("Saved Queries: switch to Queries tab shows list", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();
  runtimeErrors.assertClean("App boot");

  await switchToQueriesTab(page);

  // Mock data has two saved queries
  await expect(page.getByText("Get all users")).toBeVisible();
  await expect(page.getByText("Active posts")).toBeVisible();
  runtimeErrors.assertClean("Queries tab loaded");
});

test("Saved Queries: search filters the list", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();

  await switchToQueriesTab(page);
  await expect(page.getByText("Get all users")).toBeVisible();

  // Search for a specific query
  await page.getByPlaceholder("Search queries...").fill("Active");

  // Only matching query should be visible
  await expect(page.getByText("Active posts")).toBeVisible();
  await expect(page.getByText("Get all users")).toBeHidden();

  // Clear search shows all again
  await page.getByPlaceholder("Search queries...").clear();
  await expect(page.getByText("Get all users")).toBeVisible();
  await expect(page.getByText("Active posts")).toBeVisible();
  runtimeErrors.assertClean("Search filter");
});

test("Saved Queries: double-click opens a query", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();

  await switchToQueriesTab(page);
  await expect(page.getByText("Get all users")).toBeVisible();

  // Double-click the query to open it
  await page.getByText("Get all users").dblclick();

  // A new editor tab should open with the query content
  await expect(page.locator(".cm-editor").first()).toBeVisible();
  runtimeErrors.assertClean("Open query via double-click");
});

test("Saved Queries: right-click context menu shows Open and Delete", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();

  await switchToQueriesTab(page);
  await expect(page.getByText("Get all users")).toBeVisible();

  // Right-click on the query
  await page.getByText("Get all users").click({ button: "right" });

  // Context menu should appear with Open and Delete
  const contextMenu = page.locator(".fixed.z-50");
  await expect(contextMenu.getByRole("button", { name: "Open" })).toBeVisible();
  await expect(
    contextMenu.getByRole("button", { name: "Delete" }),
  ).toBeVisible();
  runtimeErrors.assertClean("Context menu visible");
});

test("Saved Queries: context menu Open opens the query", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();

  await switchToQueriesTab(page);
  await expect(page.getByText("Get all users")).toBeVisible();

  // Right-click and select Open
  await page.getByText("Get all users").click({ button: "right" });
  const contextMenu = page.locator(".fixed.z-50");
  await contextMenu.getByRole("button", { name: "Open" }).click();

  // Editor tab should open
  await expect(page.locator(".cm-editor").first()).toBeVisible();
  runtimeErrors.assertClean("Open via context menu");
});

test("Saved Queries: context menu Delete removes the query", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();

  await switchToQueriesTab(page);
  await expect(page.getByText("Active posts")).toBeVisible();

  // Right-click on "Active posts" and delete it
  await page.getByText("Active posts").click({ button: "right" });
  const contextMenu = page.locator(".fixed.z-50");
  await contextMenu.getByRole("button", { name: "Delete" }).click();

  // The deleted query should disappear from the list
  await expect(page.getByText("Active posts")).toBeHidden();
  // Other query should still be visible
  await expect(page.getByText("Get all users")).toBeVisible();
  runtimeErrors.assertClean("Delete query");
});

test("Saved Queries: New button opens create dialog", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();

  await switchToQueriesTab(page);

  // Click the New button (exact match to avoid "New Connection")
  await page.getByRole("button", { name: "New", exact: true }).click();

  // Dialog should appear
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "New Query" }),
  ).toBeVisible();

  // Connection selector should be present
  await expect(
    page.getByRole("combobox", { name: "Connection" }),
  ).toBeVisible();

  // Create button should be disabled without a connection selected
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Create" }),
  ).toBeDisabled();
  runtimeErrors.assertClean("New query dialog");
});

test("Saved Queries: create dialog Cancel closes it", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();

  await switchToQueriesTab(page);
  await page.getByRole("button", { name: "New", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  // Cancel the dialog
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel" })
    .click();

  // Dialog should close
  await expect(page.getByRole("dialog")).toBeHidden();
  runtimeErrors.assertClean("Cancel create dialog");
});

test("Saved Queries: create new query opens editor tab", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();

  await switchToQueriesTab(page);
  await page.getByRole("button", { name: "New", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  // Select the PostgreSQL Dev connection
  await page.getByRole("combobox", { name: "Connection" }).click();
  await page.getByRole("option", { name: "PostgreSQL Dev" }).click();

  // Create button should now be enabled
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Create" }),
  ).toBeEnabled();

  // Click Create
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create" })
    .click();

  // Dialog should close and a new editor tab should open
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator(".cm-editor").first()).toBeVisible();
  runtimeErrors.assertClean("Create new query");
});

test("Saved Queries: edit and save a query", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();

  await switchToQueriesTab(page);
  await expect(page.getByText("Get all users")).toBeVisible();

  // Open the saved query via double-click
  await page.getByText("Get all users").dblclick();
  await expect(page.locator(".cm-editor").first()).toBeVisible();

  // Modify the SQL content
  const editor = page.locator(".cm-content").first();
  await editor.click();
  await page.keyboard.press("Meta+a");
  await page.keyboard.type("SELECT id, name FROM users LIMIT 10", {
    delay: 0,
  });

  // Save the query (savedQueryId exists, so it updates in place)
  await page.getByRole("button", { name: /Save Query/ }).click();

  // Success toast should appear
  await expect(page.getByText("Query saved successfully")).toBeVisible();
  runtimeErrors.assertClean("Edit and save query");
});

test("Saved Queries: refresh reloads the list", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();

  await switchToQueriesTab(page);
  await expect(page.getByText("Get all users")).toBeVisible();

  // Click the refresh button in the Queries section
  // The Queries tabpanel contains the SavedQueriesList with its own refresh button
  const queriesPanel = page.getByLabel("Queries");
  await queriesPanel
    .getByRole("button")
    .filter({ has: page.locator("svg.lucide-refresh-cw") })
    .click();

  // After refresh the list should still show the queries
  await expect(page.getByText("Get all users")).toBeVisible();
  runtimeErrors.assertClean("Refresh queries");
});
