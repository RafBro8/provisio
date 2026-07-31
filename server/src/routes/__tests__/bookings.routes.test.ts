import { describe, it, expect } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { createApp } from "../../app";
import { Appointment, User } from "../../models";
import { registerTestUser, setupProviderWithService, futureDate } from "../../test/helpers";

async function loginAsNewAdmin(app: import("express").Express) {
  const passwordHash = await bcrypt.hash("supersecret1", 10);
  const admin = await User.create({
    name: "Test Admin",
    email: `admin-${Date.now()}@example.com`,
    passwordHash,
    role: "admin",
  });
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email: admin.email, password: "supersecret1" });
  return agent;
}

const app = createApp();

describe("bookings routes", () => {
  it("lets a customer book an open slot and removes it from availability", async () => {
    const date = futureDate(7);
    const { provider, service } = await setupProviderWithService(app, { dayOfWeek: date.getUTCDay() });
    const customer = await registerTestUser(app, "customer");

    const startTime = new Date(date);
    startTime.setUTCHours(9, 0, 0, 0);

    const bookRes = await customer.agent.post("/api/bookings").send({
      providerId: provider.id,
      serviceId: service._id,
      startTime: startTime.toISOString(),
    });
    expect(bookRes.status).toBe(201);
    expect(bookRes.body.appointment.status).toBe("booked");

    const availRes = await customer.agent.get(
      `/api/providers/${provider.id}/availability?serviceId=${service._id}&date=${date.toISOString().slice(0, 10)}`,
    );
    const bookedStillListed = availRes.body.slots.some(
      (s: { startTime: string }) => s.startTime === startTime.toISOString(),
    );
    expect(bookedStillListed).toBe(false);
  });

  it("rejects a provider trying to create a booking (customer-only route)", async () => {
    const date = futureDate(7);
    const { provider, service } = await setupProviderWithService(app, { dayOfWeek: date.getUTCDay() });
    const startTime = new Date(date);
    startTime.setUTCHours(9, 0, 0, 0);

    const res = await provider.agent.post("/api/bookings").send({
      providerId: provider.id,
      serviceId: service._id,
      startTime: startTime.toISOString(),
    });
    expect(res.status).toBe(403);
  });

  it("rejects booking a slot outside working hours", async () => {
    const date = futureDate(7);
    const { provider, service } = await setupProviderWithService(app, {
      dayOfWeek: date.getUTCDay(),
      startTime: "09:00",
      endTime: "17:00",
    });
    const customer = await registerTestUser(app, "customer");

    const startTime = new Date(date);
    startTime.setUTCHours(20, 0, 0, 0); // 8pm, outside 9-5

    const res = await customer.agent.post("/api/bookings").send({
      providerId: provider.id,
      serviceId: service._id,
      startTime: startTime.toISOString(),
    });
    expect(res.status).toBe(409);
  });

  it("only lets exactly one of two concurrent requests book the same slot", async () => {
    const date = futureDate(7);
    const { provider, service } = await setupProviderWithService(app, { dayOfWeek: date.getUTCDay() });
    const customerA = await registerTestUser(app, "customer");
    const customerB = await registerTestUser(app, "customer");

    const startTime = new Date(date);
    startTime.setUTCHours(9, 0, 0, 0);

    const payload = {
      providerId: provider.id,
      serviceId: service._id,
      startTime: startTime.toISOString(),
    };

    const [resA, resB] = await Promise.all([
      customerA.agent.post("/api/bookings").send(payload),
      customerB.agent.post("/api/bookings").send(payload),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 409]);

    const count = await Appointment.countDocuments({
      providerId: provider.id,
      startTime,
      status: "booked",
    });
    expect(count).toBe(1);
  });

  describe("cancellation", () => {
    it("does not flag a cancellation made well ahead of the appointment as late", async () => {
      const date = futureDate(30);
      const { provider, service } = await setupProviderWithService(app, { dayOfWeek: date.getUTCDay() });
      const customer = await registerTestUser(app, "customer");

      const startTime = new Date(date);
      startTime.setUTCHours(9, 0, 0, 0);
      const bookRes = await customer.agent.post("/api/bookings").send({
        providerId: provider.id,
        serviceId: service._id,
        startTime: startTime.toISOString(),
      });

      const cancelRes = await customer.agent
        .patch(`/api/bookings/${bookRes.body.appointment._id}/cancel`)
        .send({ reason: "can't make it" });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.appointment.status).toBe("cancelled");
      expect(cancelRes.body.appointment.lateCancellation).toBe(false);
    });

    it("flags a cancellation made inside the 24h window as late", async () => {
      const { provider, service } = await setupProviderWithService(app, { dayOfWeek: new Date().getUTCDay() });
      const customer = await registerTestUser(app, "customer");

      // The API won't let us book something this close through the normal
      // flow (it's within the availability grid's "now" filter for today),
      // so create the appointment directly against the model — this is
      // exactly the kind of near-term edge case that's easier to set up
      // than to organically produce through the public API.
      const startTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      const appointment = await Appointment.create({
        customerId: customer.id,
        providerId: provider.id,
        serviceId: service._id,
        startTime,
        endTime: new Date(startTime.getTime() + service.durationMinutes * 60000),
        status: "booked",
      });

      const cancelRes = await customer.agent.patch(`/api/bookings/${appointment._id}/cancel`).send({});
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.appointment.lateCancellation).toBe(true);
    });

    it("rejects a customer cancelling someone else's booking", async () => {
      const date = futureDate(7);
      const { provider, service } = await setupProviderWithService(app, { dayOfWeek: date.getUTCDay() });
      const owner = await registerTestUser(app, "customer");
      const stranger = await registerTestUser(app, "customer");

      const startTime = new Date(date);
      startTime.setUTCHours(9, 0, 0, 0);
      const bookRes = await owner.agent.post("/api/bookings").send({
        providerId: provider.id,
        serviceId: service._id,
        startTime: startTime.toISOString(),
      });

      const res = await stranger.agent.patch(`/api/bookings/${bookRes.body.appointment._id}/cancel`);
      expect(res.status).toBe(403);
    });

    it("lets the provider cancel a booking on their own calendar", async () => {
      const date = futureDate(7);
      const { provider, service } = await setupProviderWithService(app, { dayOfWeek: date.getUTCDay() });
      const customer = await registerTestUser(app, "customer");

      const startTime = new Date(date);
      startTime.setUTCHours(9, 0, 0, 0);
      const bookRes = await customer.agent.post("/api/bookings").send({
        providerId: provider.id,
        serviceId: service._id,
        startTime: startTime.toISOString(),
      });

      const res = await provider.agent.patch(`/api/bookings/${bookRes.body.appointment._id}/cancel`);
      expect(res.status).toBe(200);
      expect(res.body.appointment.status).toBe("cancelled");
    });
  });

  describe("reschedule", () => {
    it("moves a booking to a new open slot", async () => {
      const date = futureDate(7);
      const { provider, service } = await setupProviderWithService(app, { dayOfWeek: date.getUTCDay() });
      const customer = await registerTestUser(app, "customer");

      const startTime = new Date(date);
      startTime.setUTCHours(9, 0, 0, 0);
      const bookRes = await customer.agent.post("/api/bookings").send({
        providerId: provider.id,
        serviceId: service._id,
        startTime: startTime.toISOString(),
      });

      const newStart = new Date(date);
      newStart.setUTCHours(11, 0, 0, 0);
      const res = await customer.agent
        .patch(`/api/bookings/${bookRes.body.appointment._id}/reschedule`)
        .send({ newStartTime: newStart.toISOString() });

      expect(res.status).toBe(200);
      expect(res.body.appointment.startTime).toBe(newStart.toISOString());
    });

    it("rejects rescheduling onto a slot that's already taken", async () => {
      const date = futureDate(7);
      const { provider, service } = await setupProviderWithService(app, { dayOfWeek: date.getUTCDay() });
      const customerA = await registerTestUser(app, "customer");
      const customerB = await registerTestUser(app, "customer");

      const slotA = new Date(date);
      slotA.setUTCHours(9, 0, 0, 0);
      const slotB = new Date(date);
      slotB.setUTCHours(11, 0, 0, 0);

      const bookA = await customerA.agent
        .post("/api/bookings")
        .send({ providerId: provider.id, serviceId: service._id, startTime: slotA.toISOString() });
      await customerB.agent
        .post("/api/bookings")
        .send({ providerId: provider.id, serviceId: service._id, startTime: slotB.toISOString() });

      const res = await customerA.agent
        .patch(`/api/bookings/${bookA.body.appointment._id}/reschedule`)
        .send({ newStartTime: slotB.toISOString() });

      expect(res.status).toBe(409);
    });
  });

  describe("completion", () => {
    it("rejects marking a future appointment as completed", async () => {
      const date = futureDate(7);
      const { provider, service } = await setupProviderWithService(app, { dayOfWeek: date.getUTCDay() });
      const customer = await registerTestUser(app, "customer");

      const startTime = new Date(date);
      startTime.setUTCHours(9, 0, 0, 0);
      const bookRes = await customer.agent.post("/api/bookings").send({
        providerId: provider.id,
        serviceId: service._id,
        startTime: startTime.toISOString(),
      });

      const res = await provider.agent.patch(`/api/bookings/${bookRes.body.appointment._id}/complete`);
      expect(res.status).toBe(400);
    });

    it("rejects a customer marking their own appointment completed", async () => {
      const { provider, service } = await setupProviderWithService(app, { dayOfWeek: new Date().getUTCDay() });
      const customer = await registerTestUser(app, "customer");

      const startTime = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const appointment = await Appointment.create({
        customerId: customer.id,
        providerId: provider.id,
        serviceId: service._id,
        startTime,
        endTime: new Date(startTime.getTime() + service.durationMinutes * 60000),
        status: "booked",
      });

      const res = await customer.agent.patch(`/api/bookings/${appointment._id}/complete`);
      expect(res.status).toBe(403);
    });

    it("lets the provider mark a past appointment as completed", async () => {
      const { provider, service } = await setupProviderWithService(app, { dayOfWeek: new Date().getUTCDay() });
      const customer = await registerTestUser(app, "customer");

      const startTime = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const appointment = await Appointment.create({
        customerId: customer.id,
        providerId: provider.id,
        serviceId: service._id,
        startTime,
        endTime: new Date(startTime.getTime() + service.durationMinutes * 60000),
        status: "booked",
      });

      const res = await provider.agent.patch(`/api/bookings/${appointment._id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.appointment.status).toBe("completed");
    });
  });

  describe("admin: list all bookings", () => {
    it("rejects non-admin users", async () => {
      const customer = await registerTestUser(app, "customer");
      const res = await customer.agent.get("/api/bookings");
      expect(res.status).toBe(403);
    });

    it("lets an admin see every booking on the platform, with names populated", async () => {
      const date = futureDate(7);
      const { provider, service } = await setupProviderWithService(app, { dayOfWeek: date.getUTCDay() });
      const customer = await registerTestUser(app, "customer");

      const startTime = new Date(date);
      startTime.setUTCHours(9, 0, 0, 0);
      await customer.agent
        .post("/api/bookings")
        .send({ providerId: provider.id, serviceId: service._id, startTime: startTime.toISOString() });

      const adminAgent = await loginAsNewAdmin(app);
      const res = await adminAgent.get("/api/bookings");

      expect(res.status).toBe(200);
      expect(res.body.appointments.length).toBeGreaterThanOrEqual(1);
      const found = res.body.appointments[0];
      expect(found.customerId.name).toBe("Test Customer");
      expect(found.providerId.name).toBe("Test Provider");
      expect(found.serviceId.name).toBe("Consultation");
    });

    it("lets an admin cancel any booking as an override", async () => {
      const date = futureDate(7);
      const { provider, service } = await setupProviderWithService(app, { dayOfWeek: date.getUTCDay() });
      const customer = await registerTestUser(app, "customer");

      const startTime = new Date(date);
      startTime.setUTCHours(9, 0, 0, 0);
      const bookRes = await customer.agent
        .post("/api/bookings")
        .send({ providerId: provider.id, serviceId: service._id, startTime: startTime.toISOString() });

      const adminAgent = await loginAsNewAdmin(app);
      const res = await adminAgent.patch(`/api/bookings/${bookRes.body.appointment._id}/cancel`);

      expect(res.status).toBe(200);
      expect(res.body.appointment.status).toBe("cancelled");
    });
  });
});
