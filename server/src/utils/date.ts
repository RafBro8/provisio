// All scheduling in this app is treated as UTC — there's no per-provider
// timezone modeling. That's a deliberate scope decision for a portfolio
// project (real timezone/DST handling is a project of its own), not an
// oversight.

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = startOfDay(date);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}
