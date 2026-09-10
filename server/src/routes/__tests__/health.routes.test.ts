import { describe, it, expect } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../../app";

const app = createApp();

describe("health route", () => {
  it("reports the connection and the database name outside production", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok", db: "connected" });
    expect(res.body.database).toBe(mongoose.connection.name);
  });

  it("reports the deployed commit when Render provides one", async () => {
    process.env.RENDER_GIT_COMMIT = "e4a7e08c0ffee1234567890";
    try {
      const res = await request(app).get("/api/health");
      expect(res.body.commit).toBe("e4a7e08");
    } finally {
      delete process.env.RENDER_GIT_COMMIT;
    }
  });
});
