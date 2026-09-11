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

  it("summarises each provider's active services in the list: cheapest price, shortest session, count", async () => {
    const { provider } = await setupProviderWithService(app, { dayOfWeek: 3, serviceDurationMinutes: 30, price: 50 });
    await provider.agent.post("/api/services").send({ name: "Deep dive", durationMinutes: 90, price: 120 });
    // A retired service is cheaper and shorter than both, but shouldn't count.
    const retired = await provider.agent.post("/api/services").send({ name: "Old intro", durationMinutes: 15, price: 10 });
    await provider.agent.patch(`/api/services/${retired.body.service._id}`).send({ isActive: false });

    const res = await request(app).get("/api/providers");
    const found = res.body.providers.find((p: { id: string }) => p.id === provider.id);
    expect(found).toMatchObject({ fromPrice: 50, shortestMinutes: 30, serviceCount: 2 });
  });

  it("lists a provider with no services yet without inventing a price", async () => {
    const provider = await registerTestUser(app, "provider");

    const res = await request(app).get("/api/providers");
    const found = res.body.providers.find((p: { id: string }) => p.id === provider.id);
    expect(found).toMatchObject({ fromPrice: null, shortestMinutes: null, serviceCount: 0 });
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

describe("provider timezones", () => {
  const EVERY_DAY_8_TO_10 = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, startTime: "08:00", endTime: "10:00" }));

  /** A provider in Tokyo (UTC+9, no daylight saving) working 08:00-10:00 every day. */
  async function tokyoProvider() {
    const provider = await registerTestUser(app, "provider");
    await provider.agent
      .put("/api/providers/me/profile")
      .send({ timezone: "Asia/Tokyo", bufferMinutes: 0, workingHours: EVERY_DAY_8_TO_10 });
    const serviceRes = await provider.agent
      .post("/api/services")
      .send({ name: "Consultation", durationMinutes: 60, price: 50 });
    return { provider, service: serviceRes.body.service };
  }

  it("saves a valid timezone, rejects an unknown one, and reports it on the public profile", async () => {
    const provider = await registerTestUser(app, "provider");

    const before = await request(app).get(`/api/providers/${provider.id}`);
    expect(before.body.provider.timezone).toBe("UTC");

    const bad = await provider.agent.put("/api/providers/me/profile").send({ timezone: "Mars/Olympus_Mons" });
    expect(bad.status).toBe(400);

    const good = await provider.agent.put("/api/providers/me/profile").send({ timezone: "Europe/London" });
    expect(good.status).toBe(200);
    const after = await request(app).get(`/api/providers/${provider.id}`);
    expect(after.body.provider.timezone).toBe("Europe/London");
  });

  it("rejects a malformed date or an unknown tz on the availability endpoint", async () => {
    const { provider, service } = await tokyoProvider();
    const base = `/api/providers/${provider.id}/availability?serviceId=${service._id}`;

    expect((await request(app).get(`${base}&date=2026-8-5`)).status).toBe(400);
    expect((await request(app).get(`${base}&date=2026-02-30`)).status).toBe(400);
    expect((await request(app).get(`${base}&date=2026-08-05&tz=Not/AZone`)).status).toBe(400);
  });

  it("reads the date on the customer's calendar when they send their tz", async () => {
    const { provider, service } = await tokyoProvider();
    const date = futureDate(7).toISOString().slice(0, 10);
    const nextDay = futureDate(8).toISOString().slice(0, 10);

    const res = await request(app).get(
      `/api/providers/${provider.id}/availability?serviceId=${service._id}&date=${date}&tz=America/Chicago`,
    );

    // Chicago's day holds the *next* Tokyo morning: 08:00 and 09:00 JST are
    // 23:00Z and 00:00Z, i.e. that evening in Chicago (UTC-5 or -6).
    expect(res.status).toBe(200);
    expect(res.body.slots.map((s: { startTime: string }) => s.startTime)).toEqual([
      `${date}T23:00:00.000Z`,
      `${nextDay}T00:00:00.000Z`,
    ]);
  });

  it("reads the date on the provider's own calendar when no tz is sent", async () => {
    const { provider, service } = await tokyoProvider();
    const date = futureDate(7).toISOString().slice(0, 10);
    const dayBefore = futureDate(6).toISOString().slice(0, 10);

    const res = await request(app).get(
      `/api/providers/${provider.id}/availability?serviceId=${service._id}&date=${date}`,
    );

    // Tokyo's morning of `date` begins the previous evening in UTC.
    expect(res.body.slots.map((s: { startTime: string }) => s.startTime)).toEqual([
      `${dayBefore}T23:00:00.000Z`,
      `${date}T00:00:00.000Z`,
    ]);
  });

  it("validates bookings against the provider's wall clock, not UTC", async () => {
    const { provider, service } = await tokyoProvider();
    const customer = await registerTestUser(app, "customer");
    const date = futureDate(7).toISOString().slice(0, 10);
    const dayBefore = futureDate(6).toISOString().slice(0, 10);

    // 09:00Z would be inside 08:00-10:00 if hours were read as UTC, but it's
    // 18:00 in Tokyo — outside working hours.
    const wrong = await customer.agent
      .post("/api/bookings")
      .send({ providerId: provider.id, serviceId: service._id, startTime: `${date}T09:00:00.000Z` });
    expect(wrong.status).toBe(409);

    // 08:00 in Tokyo on `date` is 23:00Z the day before.
    const right = await customer.agent
      .post("/api/bookings")
      .send({ providerId: provider.id, serviceId: service._id, startTime: `${dayBefore}T23:00:00.000Z` });
    expect(right.status).toBe(201);
  });
});
