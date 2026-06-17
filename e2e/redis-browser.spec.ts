import { expect, test, type Page } from "@playwright/test";
import { collectRuntimeErrors } from "./runtime-errors";

async function openRedisBrowser(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();
  // Double-click Redis Dev to connect
  await page.getByText("Redis Dev", { exact: true }).dblclick();
  // Wait for database "0" to appear in the sidebar
  // Redis databases render as "0· 10" (name + middle dot + keyCount)
  await expect(page.getByText("0· 10")).toBeVisible();
  // Double-click database "0" to open browser
  await page.getByText("0· 10").dblclick();
  // Wait for key list to render
  await expect(page.getByText("user:1", { exact: true })).toBeVisible();
}

test.describe("Redis Browser", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await openRedisBrowser(page);
  });

  test.describe("Key Search", () => {
    test("search by pattern filters key list", async ({ page }) => {
      const runtimeErrors = collectRuntimeErrors(page);

      // Type pattern in search input
      const searchInput = page.locator(
        'input[placeholder="Pattern (user:* or *)"]',
      );
      await searchInput.fill("user:*");
      await searchInput.press("Enter");

      // Verify only matching keys are shown
      await expect(page.getByText("user:1", { exact: true })).toBeVisible();
      await expect(page.getByText("user:2", { exact: true })).toBeVisible();
      // Non-matching keys should not be visible
      await expect(
        page.getByText("session:abc", { exact: true }),
      ).toBeHidden();

      runtimeErrors.assertClean("Search by pattern");
    });

    test("refresh reloads key list", async ({ page }) => {
      const runtimeErrors = collectRuntimeErrors(page);

      // Click the Search / Refresh button (title="Search / Refresh")
      await page.getByTitle("Search / Refresh").click();

      // Verify keys are still visible after refresh
      await expect(page.getByText("user:1", { exact: true })).toBeVisible();
      await expect(page.getByText("tags", { exact: true })).toBeVisible();

      runtimeErrors.assertClean("Refresh keys");
    });
  });

  test.describe("Key Selection", () => {
    test("click key shows detail panel", async ({ page }) => {
      const runtimeErrors = collectRuntimeErrors(page);

      // Click on a key in the list
      await page.getByText("user:1", { exact: true }).click();

      // Verify detail panel shows the key name
      await expect(
        page.locator("h2", { hasText: "user:1" }),
      ).toBeVisible();
      // Verify type badge is shown
      await expect(page.getByText("string").first()).toBeVisible();

      runtimeErrors.assertClean("Click key shows detail");
    });

    test("checkbox multi-select shows batch toolbar", async ({ page }) => {
      const runtimeErrors = collectRuntimeErrors(page);

      // Click checkboxes for two keys
      // Key row selector — matches the div wrapper in KeyListPanel.tsx
      // If this breaks, consider adding data-testid to KeyListPanel
      const keyRows = page.locator(".flex.items-center.gap-2.px-3.py-1\\.5");
      await keyRows
        .filter({ hasText: "user:1" })
        .locator("button[role='checkbox']")
        .click();
      await keyRows
        .filter({ hasText: "user:2" })
        .locator("button[role='checkbox']")
        .click();

      // Verify batch operations toolbar appears
      await expect(page.getByText("DEL (2)")).toBeVisible();
      await expect(page.getByText("UNLINK")).toBeVisible();
      await expect(page.getByText("EXPIRE")).toBeVisible();
      await expect(page.getByText("PERSIST")).toBeVisible();
      await expect(page.getByText("MGET")).toBeVisible();
      await expect(page.getByText("MSET")).toBeVisible();

      runtimeErrors.assertClean("Multi-select shows batch toolbar");
    });
  });

  test.describe("New Key", () => {
    test("open new key form", async ({ page }) => {
      const runtimeErrors = collectRuntimeErrors(page);

      // Click "New key" button (in search panel, not the empty-state one)
      await page.getByRole("button", { name: "New key" }).first().click();

      // Verify new key form appears
      await expect(page.getByText("New Redis key")).toBeVisible();
      // Verify type selector defaults to string
      await expect(page.getByText("string").first()).toBeVisible();
      // Verify key name input is empty
      const keyInput = page.locator('input[placeholder="key name"]');
      await expect(keyInput).toHaveValue("");

      runtimeErrors.assertClean("Open new key form");
    });

    test("create a new string key", async ({ page }) => {
      const runtimeErrors = collectRuntimeErrors(page);

      // Click "New key" button (in search panel, not the empty-state one)
      await page.getByRole("button", { name: "New key" }).first().click();
      await expect(page.getByText("New Redis key")).toBeVisible();

      // Fill in key name
      const keyInput = page.locator('input[placeholder="key name"]');
      await keyInput.fill("test:new-key");

      // Fill in value (string viewer textarea)
      await page.locator("textarea").first().fill("hello-world");

      // Click Save
      await page.getByRole("button", { name: "Save" }).click();

      // Verify the new key appears in the key list
      await expect(page.getByText("test:new-key", { exact: true })).toBeVisible();
      runtimeErrors.assertClean("Create new string key");
    });
  });

  test.describe("Delete Key", () => {
    test("delete button visible in key detail", async ({ page }) => {
      const runtimeErrors = collectRuntimeErrors(page);

      // Select a key
      await page.getByText("user:1", { exact: true }).click();
      await expect(
        page.locator("h2", { hasText: "user:1" }),
      ).toBeVisible();

      // Verify Delete button is visible
      await expect(
        page.getByRole("button", { name: "Delete" }),
      ).toBeVisible();

      runtimeErrors.assertClean("Delete button visible");
    });

    test("delete confirmation dialog opens", async ({ page }) => {
      const runtimeErrors = collectRuntimeErrors(page);

      // Select a key
      await page.getByText("user:1", { exact: true }).click();
      await expect(
        page.locator("h2", { hasText: "user:1" }),
      ).toBeVisible();

      // Click Delete button
      await page.getByRole("button", { name: "Delete" }).click();

      // Verify confirmation dialog appears
      await expect(page.getByRole("alertdialog")).toBeVisible();
      await expect(page.getByText(/permanently deleted/)).toBeVisible();

      // Cancel
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByRole("alertdialog")).toBeHidden();

      runtimeErrors.assertClean("Delete confirmation dialog");
    });
  });

  test.describe("TTL", () => {
    test("apply TTL to key", async ({ page }) => {
      const runtimeErrors = collectRuntimeErrors(page);

      // Select a key with no TTL
      await page.getByText("user:1", { exact: true }).click();
      await expect(
        page.locator("h2", { hasText: "user:1" }),
      ).toBeVisible();

      // Find TTL input and set a value
      const ttlInput = page.locator('input[placeholder="persist"]');
      await ttlInput.fill("300");

      // Click Apply button
      await page
        .getByRole("button", { name: "Apply" })
        .click();

      // Wait for the TTL apply API call to complete (mock doesn't update displayed TTL)
      await page.waitForTimeout(500);
      runtimeErrors.assertClean("Apply TTL");
    });

    test("TTL metadata visible in header", async ({ page }) => {
      const runtimeErrors = collectRuntimeErrors(page);

      // Select a key with TTL (user:2 has ttl: 3600)
      await page.getByText("user:2", { exact: true }).click();
      await expect(
        page.locator("h2", { hasText: "user:2" }),
      ).toBeVisible();

      // Verify TTL is displayed in metadata bar
      await expect(page.getByText(/TTL:/)).toBeVisible();

      runtimeErrors.assertClean("TTL metadata visible");
    });
  });

  test.describe("Batch Operations", () => {
    test("batch toolbar shows all operation buttons", async ({ page }) => {
      const runtimeErrors = collectRuntimeErrors(page);

      // Select multiple keys via checkboxes
      // Key row selector — matches the div wrapper in KeyListPanel.tsx
      // If this breaks, consider adding data-testid to KeyListPanel
      const keyRows = page.locator(".flex.items-center.gap-2.px-3.py-1\\.5");
      await keyRows
        .filter({ hasText: "user:1" })
        .locator("button[role='checkbox']")
        .click();
      await keyRows
        .filter({ hasText: "tags" })
        .locator("button[role='checkbox']")
        .click();
      await keyRows
        .filter({ hasText: "leaderboard" })
        .locator("button[role='checkbox']")
        .click();

      // Verify all batch operation buttons
      await expect(page.getByText("DEL (3)")).toBeVisible();
      await expect(page.getByText("UNLINK")).toBeVisible();
      await expect(page.getByText("EXPIRE")).toBeVisible();
      await expect(page.getByText("PERSIST")).toBeVisible();
      await expect(page.getByText("MGET")).toBeVisible();
      await expect(page.getByText("MSET")).toBeVisible();
      // Verify helper text
      await expect(page.getByText("Shift+click to range-select")).toBeVisible();

      runtimeErrors.assertClean("Batch toolbar buttons");
    });
  });

  test.describe("Console", () => {
    test("open console from browser", async ({ page }) => {
      const runtimeErrors = collectRuntimeErrors(page);

      // Click Console button in search panel
      await page.getByRole("button", { name: "Console" }).click();

      // Verify console view opens
      await expect(page.getByText("Redis Console")).toBeVisible();
      // Verify command input is visible
      await expect(
        page.locator('input[placeholder="Enter Redis command…"]'),
      ).toBeVisible();

      runtimeErrors.assertClean("Open console");
    });

    test("execute PING command returns PONG", async ({ page }) => {
      const runtimeErrors = collectRuntimeErrors(page);

      // Open console
      await page.getByRole("button", { name: "Console" }).click();
      await expect(page.getByText("Redis Console")).toBeVisible();

      // Type PING and execute
      const cmdInput = page.locator(
        'input[placeholder="Enter Redis command…"]',
      );
      await cmdInput.fill("PING");
      await cmdInput.press("Enter");

      // Verify PONG output
      await expect(page.getByText("PONG")).toBeVisible();

      runtimeErrors.assertClean("Execute PING");
    });

    test("clear console history", async ({ page }) => {
      const runtimeErrors = collectRuntimeErrors(page);

      // Open console and run a command
      await page.getByRole("button", { name: "Console" }).click();
      await expect(page.getByText("Redis Console")).toBeVisible();

      const cmdInput = page.locator(
        'input[placeholder="Enter Redis command…"]',
      );
      await cmdInput.fill("PING");
      await cmdInput.press("Enter");
      await expect(page.getByText("PONG")).toBeVisible();

      // Click Clear button
      await page.getByRole("button", { name: "Clear" }).click();

      // Verify history is cleared (PONG should be gone)
      await expect(page.getByText("PONG")).toBeHidden();

      runtimeErrors.assertClean("Clear console");
    });
  });
});
