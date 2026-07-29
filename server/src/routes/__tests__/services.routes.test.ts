import { describe, it, expect } from "vitest";
import { createApp } from "../../app";
import { registerTestUser, setupProviderWithService } from "../../test/helpers";

const app = createApp();

describe("services routes", () => {
  it("lets a provider create a service", async () => {
    const provider = await registerTestUser(app, "provider");
    const res = await provider.agent
      .post("/api/services")
      .send({ name: "Coaching Session", durationMinutes: 45, price: 75 });

    expect(res.status).toBe(201);
    expect(res.body.service).toMatchObject({
      name: "Coaching Session",
      durationMinutes: 45,
      price: 75,
      isActive: true,
    });
  });

  it("rejects a customer trying to create a service", async () => {
    const customer = await registerTestUser(app, "customer");
    const res = await customer.agent
      .post("/api/services")
      .send({ name: "Coaching Session", durationMinutes: 45, price: 75 });
    expect(res.status).toBe(403);
  });

  it("validates service fields", async () => {
    const provider = await registerTestUser(app, "provider");
    const res = await provider.agent.post("/api/services").send({ name: "", durationMinutes: 2, price: -5 });
    expect(res.status).toBe(400);
  });

  it("lists only the requesting provider's own services", async () => {
    const { provider: providerA } = await setupProviderWithService(app, { dayOfWeek: 3 });
    await setupProviderWithService(app, { dayOfWeek: 3 }); // noise: another provider's service

    const res = await providerA.agent.get("/api/services/mine");
    expect(res.status).toBe(200);
    expect(res.body.services).toHaveLength(1);
    expect(res.body.services[0].providerId).toBe(providerA.id);
  });

  it("rejects a provider updating another provider's service", async () => {
    const { provider: providerA } = await setupProviderWithService(app, { dayOfWeek: 3 });
    const { service: serviceB } = await setupProviderWithService(app, { dayOfWeek: 3 });

    const res = await providerA.agent.patch(`/api/services/${serviceB._id}`).send({ price: 999 });
    expect(res.status).toBe(403);
  });

  it("lets a provider deactivate their own service", async () => {
    const { provider, service } = await setupProviderWithService(app, { dayOfWeek: 3 });
    const res = await provider.agent.patch(`/api/services/${service._id}`).send({ isActive: false });
    expect(res.status).toBe(200);
    expect(res.body.service.isActive).toBe(false);
  });
});
