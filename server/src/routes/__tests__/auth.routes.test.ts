import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../app";
import { ProviderProfile } from "../../models";

const app = createApp();

describe("auth routes", () => {
  const provider = {
    name: "Pat Provider",
    email: "pat.provider@example.com",
    password: "supersecret1",
    role: "provider",
  };

  it("registers a new provider and auto-creates a ProviderProfile", async () => {
    const res = await request(app).post("/api/auth/register").send(provider);

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      name: provider.name,
      email: provider.email,
      role: "provider",
    });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.headers["set-cookie"]).toBeDefined();

    const profile = await ProviderProfile.findOne({ userId: res.body.user.id });
    expect(profile).not.toBeNull();
  });

  it("rejects registering the same email twice", async () => {
    await request(app).post("/api/auth/register").send(provider);
    const res = await request(app).post("/api/auth/register").send(provider);
    expect(res.status).toBe(409);
  });

  it("rejects self-registering as admin", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...provider, email: "sneaky@example.com", role: "admin" });
    expect(res.status).toBe(400);
  });

  it("rejects registration with missing fields", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: "missing@example.com" });
    expect(res.status).toBe(400);
  });

  it("logs in with correct credentials and rejects the wrong password", async () => {
    await request(app).post("/api/auth/register").send(provider);

    const wrongLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: provider.email, password: "wrongpassword" });
    expect(wrongLogin.status).toBe(401);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: provider.email, password: provider.password });
    expect(login.status).toBe(200);
    expect(login.headers["set-cookie"]).toBeDefined();
  });

  it("allows /me with a valid session cookie and rejects without one", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send(provider);

    const authed = await agent.get("/api/auth/me");
    expect(authed.status).toBe(200);
    expect(authed.body.user.email).toBe(provider.email);

    const anonymous = await request(app).get("/api/auth/me");
    expect(anonymous.status).toBe(401);
  });

  it("clears the session on logout", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/register").send(provider);
    await agent.post("/api/auth/logout").expect(204);

    const res = await agent.get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});
