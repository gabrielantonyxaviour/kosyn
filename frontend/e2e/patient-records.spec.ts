import { expect, test } from "@playwright/test";

// spec: K-PR-1, K-PAY-1
// section: kosyn-ai/patients-records, kosyn-ai/payments-webhooks
// mode: browser

test("patient records page is reachable", async ({ page }) => {
  await page.goto("/patients/records");
  await expect(page).toHaveURL(/\/patients\/records/);
});

test("deposit page is reachable", async ({ page }) => {
  await page.goto("/patients/deposit");
  await expect(page).toHaveURL(/\/patients\/deposit/);
});
