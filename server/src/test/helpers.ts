import request from "supertest";
import type { Express } from "express";

let counter = 0;

function uniqueEmail(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@example.com`;
}

export interface TestUser {
  agent: ReturnType<typeof request.agent>;
  id: string;
  email: string;
}

export async function registerTestUser(
  app: Express,
  role: "customer" | "provider",
  overrides: Partial<{ name: string; email: string; password: string }> = {},
): Promise<TestUser> {
  const agent = request.agent(app);
  const email = overrides.email ?? uniqueEmail(role);
  const res = await agent.post("/api/auth/register").send({
    name: overrides.name ?? (role === "provider" ? "Test Provider" : "Test Customer"),
    email,
    password: overrides.password ?? "supersecret1",
    role,
  });
  return { agent, id: res.body.user.id, email };
}

/** Midnight UTC N days from now — used as the target date for availability/booking tests. */
export function futureDate(daysFromNow: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function setupProviderWithService(
  app: Express,
  options: {
    dayOfWeek: number;
    startTime?: string;
    endTime?: string;
    bufferMinutes?: number;
    serviceDurationMinutes?: number;
    price?: number;
  },
) {
  const provider = await registerTestUser(app, "provider");

  await provider.agent.put("/api/providers/me/profile").send({
    bufferMinutes: options.bufferMinutes ?? 15,
    workingHours: [
      {
        dayOfWeek: options.dayOfWeek,
        startTime: options.startTime ?? "09:00",
        endTime: options.endTime ?? "17:00",
      },
    ],
  });

  const serviceRes = await provider.agent.post("/api/services").send({
    name: "Consultation",
    durationMinutes: options.serviceDurationMinutes ?? 30,
    price: options.price ?? 50,
  });

  return { provider, service: serviceRes.body.service };
}
