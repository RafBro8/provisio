// Timezone helpers built on Intl, which Node ships with full ICU data for.
//
// The model: a provider's working hours are wall-clock times in their own
// IANA timezone ("09:00 in Europe/London"), appointments are stored as UTC
// instants, and a customer asks for a day on their own calendar. These
// helpers translate between the three. Calendar dates are passed around as
// plain "YYYY-MM-DD" strings, never as Date objects, so there's no hidden
// timezone attached to them.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

export function isValidTimeZone(timeZone: unknown): timeZone is string {
  if (typeof timeZone !== "string" || timeZone.length === 0) return false;
  try {
    formatterFor(timeZone);
    return true;
  } catch {
    return false;
  }
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  // Rejects impossible dates like 2026-02-30, which Date.UTC would roll over.
  return new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);
}

/** The wall-clock calendar date and minute-of-day of an instant in a timezone. */
export function zonedParts(instant: Date, timeZone: string): { date: string; minutes: number } {
  const parts = Object.fromEntries(
    formatterFor(timeZone)
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

/** How far a timezone's wall clock is ahead of UTC at a given instant, in ms. */
function offsetAt(instantMs: number, timeZone: string): number {
  const { date, minutes } = zonedParts(new Date(instantMs), timeZone);
  const wallAsUtc = Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
    0,
    minutes,
  );
  // Drop seconds/ms from the instant so the difference is whole minutes.
  return wallAsUtc - Math.floor(instantMs / 60000) * 60000;
}

/**
 * The UTC instant at which a timezone's wall clock reads the given date and
 * minute-of-day — or null if that wall time doesn't exist there (skipped by
 * a daylight-saving jump). A wall time that happens twice (when clocks go
 * back) resolves to the first occurrence.
 */
export function zonedTimeToUtc(date: string, minutesOfDay: number, timeZone: string): Date | null {
  const wallAsUtc = Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
    0,
    minutesOfDay,
  );
  // The true instant sits within a day of wallAsUtc, so the offsets in force
  // a day either side cover both sides of any daylight-saving change near
  // it. Try each, and keep only what reads back as the requested wall time:
  // none survive in a skipped hour, both survive in a repeated one.
  const candidates = [DAY_MS, -DAY_MS].map((shift) => wallAsUtc - offsetAt(wallAsUtc - shift, timeZone));
  const valid = candidates
    .filter((ms) => {
      const check = zonedParts(new Date(ms), timeZone);
      return check.date === date && check.minutes === minutesOfDay;
    })
    .sort((a, b) => a - b);

  return valid.length > 0 ? new Date(valid[0]) : null;
}

/**
 * The first instant of a calendar day in a timezone. Usually local midnight;
 * in the few zones that change clocks at midnight, the first minute that
 * actually exists that day.
 */
export function startOfZonedDay(date: string, timeZone: string): Date {
  for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
    const instant = zonedTimeToUtc(date, minutes, timeZone);
    if (instant) return instant;
  }
  throw new Error(`No valid time on ${date} in ${timeZone}`);
}

export function addDaysIso(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 (Sunday) – 6 (Saturday) for a calendar date — the same wherever you are. */
export function dayOfWeekIso(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** The calendar date a stored date-only value (saved as UTC midnight) represents. */
export function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
