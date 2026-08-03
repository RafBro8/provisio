import { describe, it, expect } from "vitest";
import { formatStars, todayIso } from "../format";

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

  it("matches the current UTC date", () => {
    const expected = new Date().toISOString().slice(0, 10);
    expect(todayIso()).toBe(expected);
  });
});
