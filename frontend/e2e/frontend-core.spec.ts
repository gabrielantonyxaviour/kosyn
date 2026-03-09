import { expect, test } from "@playwright/test";

// spec: K-FE-1, K-FE-3
// section: kosyn-ai/frontend-core
// mode: browser

test("core pages render without crashes", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/patients/dashboard");
  await expect(page).toHaveURL(/\/patients\/dashboard/);

  await page.goto("/doctors/dashboard");
  await expect(page).toHaveURL(/\/doctors\/dashboard/);
});

test("dynamic consultation routes resolve", async ({ page }) => {
  await page.goto("/patients/consultation/demo-consultation-id");
  await expect(page).toHaveURL(
    /\/patients\/consultation\/demo-consultation-id/,
  );

  await page.goto("/doctors/consultation/demo-consultation-id");
  await expect(page).toHaveURL(/\/doctors\/consultation\/demo-consultation-id/);
});
