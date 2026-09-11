import { describe, it, expect } from "vitest";
import { computeAvailableSlots, computeSlotsInRange, providerDatesInRange } from "../availability.service";

// A fixed, known Wednesday (dayOfWeek === 3) so every test is deterministic
// regardless of when the suite actually runs.
const WEDNESDAY = "2026-08-05";
const THURSDAY = "2026-08-06";
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
      timeOff: [{ startDate: new Date(WEDNESDAY), endDate: new Date(WEDNESDAY) }],
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
      timeOff: [{ startDate: new Date(THURSDAY), endDate: new Date(THURSDAY) }],
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

describe("computeAvailableSlots in the provider's timezone", () => {
  it("reads working hours as wall-clock time where the provider is", () => {
    // Chicago is UTC-5 in August (daylight time), so 09:00 there is 14:00Z.
    const slots = computeAvailableSlots({
      date: WEDNESDAY,
      timeZone: "America/Chicago",
      serviceDurationMinutes: 60,
      bufferMinutes: 0,
      workingHours: [{ dayOfWeek: 3, startTime: "09:00", endTime: "11:00" }],
      timeOff: [],
      existingBookings: [],
      now: FAR_PAST,
    });

    expect(isoStarts(slots)).toEqual(["2026-08-05T14:00:00.000Z", "2026-08-05T15:00:00.000Z"]);
  });

  it("uses the provider's day of week, even when that day is a different UTC date", () => {
    // Tokyo is UTC+9: Wednesday 08:00 there is still Tuesday 23:00Z.
    const slots = computeAvailableSlots({
      date: WEDNESDAY,
      timeZone: "Asia/Tokyo",
      serviceDurationMinutes: 60,
      bufferMinutes: 0,
      workingHours: [{ dayOfWeek: 3, startTime: "08:00", endTime: "09:00" }],
      timeOff: [],
      existingBookings: [],
      now: FAR_PAST,
    });

    expect(isoStarts(slots)).toEqual(["2026-08-04T23:00:00.000Z"]);
  });

  it("skips a slot whose wall time doesn't exist when the clocks go forward", () => {
    // New York, Sunday 2026-03-08: 02:00 jumps straight to 03:00.
    const slots = computeAvailableSlots({
      date: "2026-03-08",
      timeZone: "America/New_York",
      serviceDurationMinutes: 60,
      bufferMinutes: 0,
      workingHours: [{ dayOfWeek: 0, startTime: "01:00", endTime: "04:00" }],
      timeOff: [],
      existingBookings: [],
      now: FAR_PAST,
    });

    // 01:00 EST (06:00Z) and 03:00 EDT (07:00Z); 02:00 never happens.
    expect(isoStarts(slots)).toEqual(["2026-03-08T06:00:00.000Z", "2026-03-08T07:00:00.000Z"]);
  });

  it("offers a repeated wall time once, at its first occurrence, when the clocks go back", () => {
    // New York, Sunday 2026-11-01: 01:00-02:00 happens twice (EDT, then EST).
    const slots = computeAvailableSlots({
      date: "2026-11-01",
      timeZone: "America/New_York",
      serviceDurationMinutes: 60,
      bufferMinutes: 0,
      workingHours: [{ dayOfWeek: 0, startTime: "00:00", endTime: "03:00" }],
      timeOff: [],
      existingBookings: [],
      now: FAR_PAST,
    });

    // 00:00 EDT (04:00Z), 01:00 EDT (05:00Z), 02:00 EST (07:00Z).
    expect(isoStarts(slots)).toEqual([
      "2026-11-01T04:00:00.000Z",
      "2026-11-01T05:00:00.000Z",
      "2026-11-01T07:00:00.000Z",
    ]);
  });

  it("applies time off to the provider's calendar day, not the UTC one", () => {
    // Wednesday in Tokyo starts on Tuesday UTC; a Wednesday day off must
    // still block the whole of it.
    const slots = computeAvailableSlots({
      date: WEDNESDAY,
      timeZone: "Asia/Tokyo",
      serviceDurationMinutes: 60,
      bufferMinutes: 0,
      workingHours: [{ dayOfWeek: 3, startTime: "08:00", endTime: "12:00" }],
      timeOff: [{ startDate: new Date(WEDNESDAY), endDate: new Date(WEDNESDAY) }],
      existingBookings: [],
      now: FAR_PAST,
    });

    expect(slots).toEqual([]);
  });
});

describe("computeSlotsInRange", () => {
  // Wednesday on a Chicago calendar: 05:00Z Wednesday to 05:00Z Thursday.
  const CHICAGO_WEDNESDAY = {
    rangeStart: new Date("2026-08-05T05:00:00.000Z"),
    rangeEnd: new Date("2026-08-06T05:00:00.000Z"),
  };

  it("collects a customer's day from the two provider days it straddles", () => {
    // A Tokyo provider working 08:00-10:00 every day. Of Tokyo's Wednesday
    // and Thursday mornings, only Thursday's falls inside Chicago's Wednesday.
    const slots = computeSlotsInRange({
      ...CHICAGO_WEDNESDAY,
      timeZone: "Asia/Tokyo",
      serviceDurationMinutes: 60,
      bufferMinutes: 0,
      workingHours: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, startTime: "08:00", endTime: "10:00" })),
      timeOff: [],
      existingBookings: [],
      now: FAR_PAST,
    });

    // Thursday 08:00 and 09:00 in Tokyo = Wednesday 6pm and 7pm in Chicago.
    expect(isoStarts(slots)).toEqual(["2026-08-05T23:00:00.000Z", "2026-08-06T00:00:00.000Z"]);
  });

  it("matches a single-day computation when customer and provider share a timezone", () => {
    const rules = {
      timeZone: "America/Chicago",
      serviceDurationMinutes: 30,
      bufferMinutes: 0,
      workingHours: [{ dayOfWeek: 3, startTime: "00:00", endTime: "23:30" }],
      timeOff: [],
      existingBookings: [],
      now: FAR_PAST,
    };

    expect(computeSlotsInRange({ ...CHICAGO_WEDNESDAY, ...rules })).toEqual(
      computeAvailableSlots({ ...rules, date: WEDNESDAY }),
    );
  });
});

describe("providerDatesInRange", () => {
  it("lists every provider-calendar day the range touches, in order", () => {
    expect(
      providerDatesInRange(new Date("2026-08-05T05:00:00.000Z"), new Date("2026-08-06T05:00:00.000Z"), "Asia/Tokyo"),
    ).toEqual(["2026-08-05", "2026-08-06"]);
    expect(
      providerDatesInRange(new Date("2026-08-05T00:00:00.000Z"), new Date("2026-08-06T00:00:00.000Z"), "UTC"),
    ).toEqual(["2026-08-05"]);
  });
});
