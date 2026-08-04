import type { Page } from "@playwright/test";
import { step } from "./log";

export async function loginViaUi(page: Page, email: string, password: string): Promise<void> {
  step(`Logging in as ${email}`);
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /^log in$/i }).click();
  await page.waitForURL("http://localhost:5173/");
}

/** Navigates straight to a provider by id (not via search) and books the first open slot on the given date. */
export async function bookFirstAvailableSlot(
  page: Page,
  providerId: string,
  serviceName: string,
  dateIso: string,
): Promise<void> {
  step(`Booking the first available slot for "${serviceName}" on ${dateIso}`);
  await page.goto(`/providers/${providerId}`);
  await page.getByRole("button", { name: new RegExp(serviceName) }).click();
  await page.locator('input[type="date"]').fill(dateIso);

  const slotButtons = page.locator("main button[aria-pressed]");
  await slotButtons.first().waitFor();
  await slotButtons.first().click();
  await page.getByRole("button", { name: /confirm booking/i }).click();
  await page.getByText(/^Booked!/).waitFor();
}
