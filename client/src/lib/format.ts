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

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Adds whole days to a YYYY-MM-DD date string, staying in UTC like todayIso(). */
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
