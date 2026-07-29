import { describe, it, expect } from "vitest";
import { createApp } from "../../app";
import { registerTestUser, setupProviderWithService, futureDate } from "../../test/helpers";

const app = createApp();

async function createBookingNotifyingProvider(app: import("express").Express) {
  const date = futureDate(7);
  const { provider, service } = await setupProviderWithService(app, { dayOfWeek: date.getUTCDay() });
  const customer = await registerTestUser(app, "customer");

  const startTime = new Date(date);
  startTime.setUTCHours(9, 0, 0, 0);
  await customer.agent
    .post("/api/bookings")
    .send({ providerId: provider.id, serviceId: service._id, startTime: startTime.toISOString() });

  return { provider, customer };
}

describe("notifications routes", () => {
  it("lets a user list their own notifications", async () => {
    const { provider } = await createBookingNotifyingProvider(app);

    const res = await provider.agent.get("/api/notifications/mine");
    expect(res.status).toBe(200);
    expect(res.body.notifications).toHaveLength(1);
    expect(res.body.notifications[0].type).toBe("booking_created");
    expect(res.body.notifications[0].read).toBe(false);
  });

  it("does not let a user mark someone else's notification as read", async () => {
    const { provider, customer } = await createBookingNotifyingProvider(app);
    const mine = await provider.agent.get("/api/notifications/mine");
    const notificationId = mine.body.notifications[0]._id;

    const res = await customer.agent.patch(`/api/notifications/${notificationId}/read`);
    expect(res.status).toBe(404);
  });

  it("marks a single notification as read", async () => {
    const { provider } = await createBookingNotifyingProvider(app);
    const mine = await provider.agent.get("/api/notifications/mine");
    const notificationId = mine.body.notifications[0]._id;

    const res = await provider.agent.patch(`/api/notifications/${notificationId}/read`);
    expect(res.status).toBe(200);
    expect(res.body.notification.read).toBe(true);
  });

  it("marks all of a user's notifications as read", async () => {
    const { provider } = await createBookingNotifyingProvider(app);

    const markRes = await provider.agent.patch("/api/notifications/read-all");
    expect(markRes.status).toBe(204);

    const mine = await provider.agent.get("/api/notifications/mine");
    expect(mine.body.notifications.every((n: { read: boolean }) => n.read)).toBe(true);
  });
});
