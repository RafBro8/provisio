import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../app";
import { registerTestUser, setupProviderWithService, futureDate } from "../../test/helpers";

const app = createApp();

describe("providers routes", () => {
  it("lists providers publicly, including those with no reviews yet", async () => {
    const { provider } = await setupProviderWithService(app, { dayOfWeek: 3 });

    const res = await request(app).get("/api/providers");
    expect(res.status).toBe(200);
    const found = res.body.providers.find((p: { id: string }) => p.id === provider.id);
    expect(found).toMatchObject({ avgRating: null, reviewCount: 0 });
  });

  it("404s on a provider detail lookup for a non-existent id", async () => {
    const res = await request(app).get("/api/providers/000000000000000000000000");
    expect(res.status).toBe(404);
  });

  it("lets a provider read and update their own profile", async () => {
    const { provider } = await setupProviderWithService(app, { dayOfWeek: 3 });

    const getRes = await provider.agent.get("/api/providers/me/profile");
    expect(getRes.status).toBe(200);
    expect(getRes.body.profile.bufferMinutes).toBe(15);

    const putRes = await provider.agent
      .put("/api/providers/me/profile")
      .send({ bio: "Experienced consultant", bufferMinutes: 20 });
    expect(putRes.status).toBe(200);
    expect(putRes.body.profile.bio).toBe("Experienced consultant");
    expect(putRes.body.profile.bufferMinutes).toBe(20);
  });

  it("rejects a customer trying to read the provider-only profile route", async () => {
    const customer = await registerTestUser(app, "customer");
    const res = await customer.agent.get("/api/providers/me/profile");
    expect(res.status).toBe(403);
  });

  it("validates required query params on the availability endpoint", async () => {
    const { provider } = await setupProviderWithService(app, { dayOfWeek: 3 });
    const res = await provider.agent.get(`/api/providers/${provider.id}/availability`);
    expect(res.status).toBe(400);
  });

  it("404s when requesting availability for a service that isn't this provider's", async () => {
    const { provider: providerA } = await setupProviderWithService(app, { dayOfWeek: 3 });
    const { service: serviceB } = await setupProviderWithService(app, { dayOfWeek: 3 });
    const date = futureDate(7).toISOString().slice(0, 10);

    const res = await providerA.agent.get(
      `/api/providers/${providerA.id}/availability?serviceId=${serviceB._id}&date=${date}`,
    );
    expect(res.status).toBe(404);
  });
});
