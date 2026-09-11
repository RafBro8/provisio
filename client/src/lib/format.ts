export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Today on the viewer's own calendar, "YYYY-MM-DD" — not the UTC date, which is already tomorrow on a US evening. */
export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** The viewer's IANA timezone, e.g. "America/Chicago". */
export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** A time as the clock reads in another timezone, e.g. "3:00 PM". */
export function formatTimeIn(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZone });
}

/** "America/New_York" → "New York"; "UTC" stays "UTC". */
export function timeZoneCity(timeZone: string): string {
  return timeZone.split("/").pop()!.replace(/_/g, " ");
}

/** Whether two timezones' clocks read the same at a given instant (e.g. Chicago and Winnipeg in summer). */
export function sameClockTime(iso: string, zoneA: string, zoneB: string): boolean {
  return formatTimeIn(iso, zoneA) === formatTimeIn(iso, zoneB);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Adds whole days to a YYYY-MM-DD date string. Pure calendar arithmetic —
 * UTC is only used internally so no daylight-saving shift can creep in.
 */
export function addDaysIso(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Display pieces for a YYYY-MM-DD date string, e.g.
 * { weekday: "Thu", day: "14", full: "Thursday, September 14" }.
 */
export function dayParts(isoDate: string): { weekday: string; day: string; full: string } {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return {
    weekday: date.toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" }),
    day: String(date.getUTCDate()),
    full: date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }),
  };
}

/** "Dana Whitfield" → "DW"; a single name gives one letter. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export function formatStars(rating: number): string {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}
