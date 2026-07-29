import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../app";
import { Appointment } from "../../models";
import { registerTestUser, setupProviderWithService } from "../../test/helpers";

const app = createApp();

async function createCompletedAppointment(
  providerId: string,
  serviceId: string,
  customerId: string,
  durationMinutes: number,
) {
  const startTime = new Date(Date.now() - 2 * 60 * 60 * 1000);
  return Appointment.create({
    customerId,
    providerId,
    serviceId,
    startTime,
    endTime: new Date(startTime.getTime() + durationMinutes * 60000),
    status: "completed",
  });
}

describe("reviews routes", () => {
  it("lets a customer review their own completed appointment", async () => {
    const { provider, service } = await setupProviderWithService(app, { dayOfWeek: 3 });
    const customer = await registerTestUser(app, "customer");
    const appointment = await createCompletedAppointment(provider.id, service._id, customer.id, service.durationMinutes);

    const res = await customer.agent
      .post("/api/reviews")
      .send({ appointmentId: appointment._id, rating: 4, comment: "Solid session" });

    expect(res.status).toBe(201);
    expect(res.body.review).toMatchObject({ rating: 4, comment: "Solid session" });
  });

  it("rejects reviewing an appointment that isn't completed yet", async () => {
    const { provider, service } = await setupProviderWithService(app, { dayOfWeek: 3 });
    const customer = await registerTestUser(app, "customer");
    const appointment = await Appointment.create({
      customerId: customer.id,
      providerId: provider.id,
      serviceId: service._id,
      startTime: new Date(Date.now() + 60 * 60 * 1000),
      endTime: new Date(Date.now() + 90 * 60 * 1000),
      status: "booked",
    });

    const res = await customer.agent.post("/api/reviews").send({ appointmentId: appointment._id, rating: 5 });
    expect(res.status).toBe(400);
  });

  it("rejects reviewing someone else's appointment", async () => {
    const { provider, service } = await setupProviderWithService(app, { dayOfWeek: 3 });
    const owner = await registerTestUser(app, "customer");
    const stranger = await registerTestUser(app, "customer");
    const appointment = await createCompletedAppointment(provider.id, service._id, owner.id, service.durationMinutes);

    const res = await stranger.agent.post("/api/reviews").send({ appointmentId: appointment._id, rating: 5 });
    expect(res.status).toBe(403);
  });

  it("rejects a second review for the same appointment", async () => {
    const { provider, service } = await setupProviderWithService(app, { dayOfWeek: 3 });
    const customer = await registerTestUser(app, "customer");
    const appointment = await createCompletedAppointment(provider.id, service._id, customer.id, service.durationMinutes);

    await customer.agent.post("/api/reviews").send({ appointmentId: appointment._id, rating: 5 });
    const res = await customer.agent.post("/api/reviews").send({ appointmentId: appointment._id, rating: 2 });
    expect(res.status).toBe(409);
  });

  it("rejects a provider trying to create a review", async () => {
    const provider = await registerTestUser(app, "provider");
    const res = await provider.agent.post("/api/reviews").send({ appointmentId: "000000000000000000000000", rating: 5 });
    expect(res.status).toBe(403);
  });

  it("lists a provider's reviews publicly", async () => {
    const { provider, service } = await setupProviderWithService(app, { dayOfWeek: 3 });
    const customer = await registerTestUser(app, "customer");
    const appointment = await createCompletedAppointment(provider.id, service._id, customer.id, service.durationMinutes);
    await customer.agent.post("/api/reviews").send({ appointmentId: appointment._id, rating: 3 });

    const res = await request(app).get(`/api/reviews/provider/${provider.id}`);
    expect(res.status).toBe(200);
    expect(res.body.reviews).toHaveLength(1);
    expect(res.body.reviews[0].rating).toBe(3);
  });
});
