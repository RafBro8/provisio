import { describe, it, expect, afterEach } from "vitest";
import { Appointment } from "../../models/Appointment";
import { assertBookingIndex, BOOKING_INDEX_NAME } from "../indexes";

async function dropBookingIndexIfPresent(): Promise<void> {
  const indexes = await Appointment.collection.indexes().catch(() => []);
  if (indexes.some((i) => i.name === BOOKING_INDEX_NAME)) {
    await Appointment.collection.dropIndex(BOOKING_INDEX_NAME);
  }
}

describe("assertBookingIndex", () => {
  afterEach(async () => {
    // Leave the collection with the correct index for anything that runs after.
    await dropBookingIndexIfPresent();
    await Appointment.createIndexes();
  });

  it("passes on a database where the unique index can be built", async () => {
    await expect(assertBookingIndex()).resolves.toBeUndefined();

    const index = (await Appointment.collection.indexes()).find((i) => i.name === BOOKING_INDEX_NAME);
    expect(index?.unique).toBe(true);
    expect(index?.partialFilterExpression).toEqual({ status: "booked" });
  });

  it("builds the index itself if it's missing entirely", async () => {
    await dropBookingIndexIfPresent();

    await expect(assertBookingIndex()).resolves.toBeUndefined();

    const index = (await Appointment.collection.indexes()).find((i) => i.name === BOOKING_INDEX_NAME);
    expect(index?.unique).toBe(true);
  });

  it("refuses when a non-unique index with the same name is in the way — the real-world failure", async () => {
    // Exactly what happened to the long-lived dev database: the index was
    // first created without `unique`, and Mongoose won't replace an existing
    // index that has the same name.
    await dropBookingIndexIfPresent();
    await Appointment.collection.createIndex({ providerId: 1, startTime: 1 }, { name: BOOKING_INDEX_NAME });

    await expect(assertBookingIndex()).rejects.toThrow(/Refusing to start/);
    await expect(assertBookingIndex()).rejects.toThrow(/unique=false/);
  });
});
