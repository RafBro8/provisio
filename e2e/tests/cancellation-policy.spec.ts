import { test, expect } from "@playwright/test";
import { step } from "./helpers/log";
import { setupProviderWithService, registerViaApi } from "./helpers/api";
import { loginViaUi, bookFirstAvailableSlot } from "./helpers/ui";
import { daysFromNow } from "./helpers/dates";

test.describe("cancellation policy", () => {
  test("cancelling well outside the 24h window is not flagged as late", async ({ page }) => {
    const farOut = daysFromNow(10);

    step("Setting up a provider with hours 10 days out");
    const { provider, service } = await setupProviderWithService({
      dayOfWeek: farOut.dayOfWeek,
      startTime: "09:00",
      endTime: "17:00",
      serviceName: "Nutrition Consultation",
    });

    const customer = await registerViaApi("customer");
    await loginViaUi(page, customer.email, customer.password);
    await bookFirstAvailableSlot(page, provider.id, service.name, farOut.iso);

    step("Cancelling the booking immediately");
    await page.goto("/bookings");
    await page.getByRole("button", { name: /^cancel$/i }).click();
    await page.getByRole("button", { name: /confirm cancellation/i }).click();

    step("Verifying it's cancelled without a late-cancellation flag");
    // The status badge is styled capitalized via CSS only — the actual DOM
    // text is lowercase ("cancelled"), so this must match case-insensitively.
    await expect(page.getByText(/^cancelled$/i)).toBeVisible();
    await expect(page.getByText(/inside the 24h window/i)).not.toBeVisible();
  });

  test("cancelling within the 24h window is flagged as late", async ({ page }) => {
    const today = daysFromNow(0);

    step("Setting up a provider with wide-open hours for today");
    const { provider, service } = await setupProviderWithService({
      dayOfWeek: today.dayOfWeek,
      serviceName: "Same-Day Consultation",
    });

    const customer = await registerViaApi("customer");
    await loginViaUi(page, customer.email, customer.password);
    // The soonest slot the app will offer today is, by definition, within 24h.
    await bookFirstAvailableSlot(page, provider.id, service.name, today.iso);

    step("Cancelling the booking immediately");
    await page.goto("/bookings");
    await page.getByRole("button", { name: /^cancel$/i }).click();
    await page.getByRole("button", { name: /confirm cancellation/i }).click();

    step("Verifying it's flagged as a late cancellation");
    // The status badge is styled capitalized via CSS only — the actual DOM
    // text is lowercase ("cancelled"), so this must match case-insensitively.
    await expect(page.getByText(/^cancelled$/i)).toBeVisible();
    await expect(page.getByText(/inside the 24h window/i)).toBeVisible();
  });
});
