import { describe, it, expect } from "vitest";
import { computeAvailableSlots } from "../availability.service";

// A fixed, known Wednesday (dayOfWeek === 3) so every test is deterministic
// regardless of when the suite actually runs.
const WEDNESDAY = new Date("2026-08-05T00:00:00.000Z");
const THURSDAY = new Date("2026-08-06T00:00:00.000Z");
const FAR_PAST = new Date("2026-01-01T00:00:00.000Z"); // treat every candidate slot as "in the future"

function isoStarts(slots: { startTime: Date }[]): string[] {
  return slots.map((s) => s.startTime.toISOString());
}

describe("computeAvailableSlots", () => {
  it("generates a full grid of slots within working hours with no bookings", () => {
    const slots = computeAvailableSlots({
      date: WEDNESDAY,
      serviceDurationMinutes: 30,
      bufferMinutes: 15,
      workingHours: [{ dayOfWeek: 3, startTime: "09:00", endTime: "11:00" }],
      timeOff: [],
      existingBookings: [],
      now: FAR_PAST,
    });

    expect(isoStarts(slots)).toEqual([
      "2026-08-05T09:00:00.000Z",
      "2026-08-05T09:30:00.000Z",
      "2026-08-05T10:00:00.000Z",
      "2026-08-05T10:30:00.000Z",
    ]);
  });

  it("returns no slots when there's no working-hours block for that day of week", () => {
    const slots = computeAvailableSlots({
      date: WEDNESDAY,
      serviceDurationMinutes: 30,
      bufferMinutes: 15,
      workingHours: [{ dayOfWeek: 4, startTime: "09:00", endTime: "17:00" }], // Thursday only
      timeOff: [],
      existingBookings: [],
      now: FAR_PAST,
    });

    expect(slots).toEqual([]);
  });

  it("returns no slots when the whole day is blocked by time off", () => {
    const slots = computeAvailableSlots({
      date: WEDNESDAY,
      serviceDurationMinutes: 30,
      bufferMinutes: 15,
      workingHours: [{ dayOfWeek: 3, startTime: "09:00", endTime: "17:00" }],
      timeOff: [{ startDate: WEDNESDAY, endDate: WEDNESDAY }],
      existingBookings: [],
      now: FAR_PAST,
    });

    expect(slots).toEqual([]);
  });

  it("does not block a day outside a time-off range that covers a different day", () => {
    const slots = computeAvailableSlots({
      date: WEDNESDAY,
      serviceDurationMinutes: 30,
      bufferMinutes: 15,
      workingHours: [{ dayOfWeek: 3, startTime: "09:00", endTime: "11:00" }],
      timeOff: [{ startDate: THURSDAY, endDate: THURSDAY }],
      existingBookings: [],
      now: FAR_PAST,
    });

    expect(slots.length).toBe(4);
  });

  it("blocks a slot that exactly matches an existing booking", () => {
    const slots = computeAvailableSlots({
      date: WEDNESDAY,
      serviceDurationMinutes: 30,
      bufferMinutes: 0,
      workingHours: [{ dayOfWeek: 3, startTime: "09:00", endTime: "10:00" }],
      timeOff: [],
      existingBookings: [
        { startTime: new Date("2026-08-05T09:00:00.000Z"), endTime: new Date("2026-08-05T09:30:00.000Z") },
      ],
      now: FAR_PAST,
    });

    expect(isoStarts(slots)).toEqual(["2026-08-05T09:30:00.000Z"]);
  });

  it("pads bookings with the buffer on both sides, blocking neighboring slots", () => {
    const slots = computeAvailableSlots({
      date: WEDNESDAY,
      serviceDurationMinutes: 30,
      bufferMinutes: 15,
      workingHours: [{ dayOfWeek: 3, startTime: "09:00", endTime: "12:00" }],
      timeOff: [],
      existingBookings: [
        { startTime: new Date("2026-08-05T10:00:00.000Z"), endTime: new Date("2026-08-05T10:30:00.000Z") },
      ],
      now: FAR_PAST,
    });

    // The booking occupies 10:00-10:30; a 15-min buffer expands that to
    // [9:45, 10:45), which swallows the 9:30 and 10:30 slots but not 9:00 or 11:00.
    expect(isoStarts(slots)).toEqual([
      "2026-08-05T09:00:00.000Z",
      "2026-08-05T11:00:00.000Z",
      "2026-08-05T11:30:00.000Z",
    ]);
  });

  it("excludes a candidate slot that would run past the end of the working-hours block", () => {
    const slots = computeAvailableSlots({
      date: WEDNESDAY,
      serviceDurationMinutes: 30,
      bufferMinutes: 0,
      workingHours: [{ dayOfWeek: 3, startTime: "09:00", endTime: "09:45" }], // room for exactly one 30-min slot
      timeOff: [],
      existingBookings: [],
      now: FAR_PAST,
    });

    expect(isoStarts(slots)).toEqual(["2026-08-05T09:00:00.000Z"]);
  });

  it("supports multiple working-hours blocks in the same day (e.g. a lunch gap)", () => {
    const slots = computeAvailableSlots({
      date: WEDNESDAY,
      serviceDurationMinutes: 30,
      bufferMinutes: 0,
      workingHours: [
        { dayOfWeek: 3, startTime: "09:00", endTime: "10:00" },
        { dayOfWeek: 3, startTime: "13:00", endTime: "14:00" },
      ],
      timeOff: [],
      existingBookings: [],
      now: FAR_PAST,
    });

    expect(isoStarts(slots)).toEqual([
      "2026-08-05T09:00:00.000Z",
      "2026-08-05T09:30:00.000Z",
      "2026-08-05T13:00:00.000Z",
      "2026-08-05T13:30:00.000Z",
    ]);
  });

  it("filters out slots that start before 'now'", () => {
    const slots = computeAvailableSlots({
      date: WEDNESDAY,
      serviceDurationMinutes: 30,
      bufferMinutes: 0,
      workingHours: [{ dayOfWeek: 3, startTime: "09:00", endTime: "11:00" }],
      timeOff: [],
      existingBookings: [],
      now: new Date("2026-08-05T10:00:00.000Z"), // "now" is mid-morning on the target day
    });

    expect(isoStarts(slots)).toEqual(["2026-08-05T10:00:00.000Z", "2026-08-05T10:30:00.000Z"]);
  });

  it("respects a custom slot increment that differs from the service duration", () => {
    const slots = computeAvailableSlots({
      date: WEDNESDAY,
      serviceDurationMinutes: 30,
      bufferMinutes: 0,
      slotIncrementMinutes: 15,
      workingHours: [{ dayOfWeek: 3, startTime: "09:00", endTime: "10:00" }],
      timeOff: [],
      existingBookings: [],
      now: FAR_PAST,
    });

    expect(isoStarts(slots)).toEqual([
      "2026-08-05T09:00:00.000Z",
      "2026-08-05T09:15:00.000Z",
      "2026-08-05T09:30:00.000Z",
    ]);
  });
});
