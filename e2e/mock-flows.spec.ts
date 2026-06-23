import { expect, test } from "@playwright/test";
import { collectRuntimeErrors } from "./runtime-errors";

test("mock app critical buttons can be clicked without runtime errors", async ({
  page,
}) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();
  runtimeErrors.assertClean("App boot should not emit runtime errors");

  await page.getByLabel("Open settings").click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
  await page.getByRole("button", { name: "Layout" }).click();
  await page.getByRole("button", { name: "AI" }).click();
  await expect(
    page.getByRole("heading", { name: "AI Providers" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeHidden();
  runtimeErrors.assertClean("Settings buttons should not emit runtime errors");

  await page.getByRole("button", { name: "Refresh" }).click();
  runtimeErrors.assertClean(
    "Connection refresh should not emit runtime errors",
  );

  await page.getByRole("button", { name: "New Connection" }).click();
  await expect(
    page.getByRole("dialog", { name: "New Database Connection" }),
  ).toBeVisible();

  for (const driver of ["MySQL", "PostgreSQL", "Redis", "MongoDB"]) {
    await page.getByText(driver, { exact: true }).click();
    await expect(page.getByRole("button", { name: "Back" })).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByText(driver, { exact: true })).toBeVisible();
  }

  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "New Database Connection" }),
  ).toBeHidden();
  runtimeErrors.assertClean(
    "Connection dialog buttons should not emit runtime errors",
  );
});

test("create new connection flow", async ({ page }) => {
  const runtimeErrors = collectRuntimeErrors(page);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Connections" }),
  ).toBeVisible();
  runtimeErrors.assertClean("App boot");

  // Click New Connection button
  await page.getByRole("button", { name: "New Connection" }).click();
  await expect(
    page.getByRole("dialog", { name: "New Database Connection" }),
  ).toBeVisible();

  // Select PostgreSQL driver
  await page.getByText("PostgreSQL", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Back" })).toBeVisible();

  // Fill connection form
  const dialog = page.getByRole("dialog", { name: "New Database Connection" });
  await dialog.getByLabel("Connection Name").fill("localhost/testdb");
  await dialog.getByLabel("Host").fill("localhost");
  await dialog.getByLabel("Port").fill("5432");
  await dialog.getByLabel("Database").fill("testdb");
  await dialog.getByLabel("Username").fill("testuser");
  await dialog.getByLabel("Password").fill("testpass");

  // Test connection
  await dialog.getByRole("button", { name: "Test" }).click();
  await expect(
    page.getByText("Connection Test Successful", { exact: true }),
  ).toBeVisible({ timeout: 10_000 });

  // Save connection
  await dialog.getByRole("button", { name: "Connect" }).click();
  await expect(
    page.getByRole("dialog", { name: "New Database Connection" }),
  ).toBeHidden();

  // Verify connection appears in sidebar
  await expect(page.getByText("localhost/testdb")).toBeVisible();

  runtimeErrors.assertClean("Connection creation flow");
});
