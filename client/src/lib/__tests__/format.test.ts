import { describe, it, expect } from "vitest";
import { addDaysIso, dayParts, formatStars, sameClockTime, timeZoneCity, todayIso } from "../format";

describe("formatStars", () => {
  it("renders the correct number of filled and empty stars", () => {
    expect(formatStars(5)).toBe("★★★★★");
    expect(formatStars(0)).toBe("☆☆☆☆☆");
    expect(formatStars(3)).toBe("★★★☆☆");
  });

  it("rounds fractional ratings to the nearest whole star", () => {
    expect(formatStars(3.6)).toBe("★★★★☆");
    expect(formatStars(3.4)).toBe("★★★☆☆");
  });
});

describe("todayIso", () => {
  it("returns a date in YYYY-MM-DD format", () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("matches the current date on the local calendar, not the UTC one", () => {
    // On a US evening the UTC date is already tomorrow; "today" in the date
    // picker has to be the viewer's today.
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    expect(todayIso()).toBe(expected);
  });
});

describe("calendar dates", () => {
  it("adds days across month ends and a daylight-saving weekend without drifting", () => {
    expect(addDaysIso("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDaysIso("2026-03-07", 2)).toBe("2026-03-09");
  });

  it("reads the weekday of the calendar date itself, wherever the viewer is", () => {
    expect(dayParts("2026-09-12").day).toBe("12");
    expect(dayParts("2026-09-12").full).toMatch(/Saturday/);
  });
});

describe("timezone helpers", () => {
  it("names a zone by its city", () => {
    expect(timeZoneCity("America/New_York")).toBe("New York");
    expect(timeZoneCity("America/Argentina/Buenos_Aires")).toBe("Buenos Aires");
    expect(timeZoneCity("UTC")).toBe("UTC");
  });

  it("tells whether two zones' clocks agree at a given moment", () => {
    // Chicago and Winnipeg share Central time; London is 6 hours ahead in August.
    expect(sameClockTime("2026-08-05T15:00:00.000Z", "America/Chicago", "America/Winnipeg")).toBe(true);
    expect(sameClockTime("2026-08-05T15:00:00.000Z", "America/Chicago", "Europe/London")).toBe(false);
  });
});
