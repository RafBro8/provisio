import { addDaysIso, dayOfWeekIso, toIsoDate, zonedParts, zonedTimeToUtc } from "../utils/date";

export interface WorkingHoursBlock {
  dayOfWeek: number; // 0 (Sunday) – 6 (Saturday)
  startTime: string; // 24h "HH:mm", wall-clock time in the provider's timezone
  endTime: string;
}

export interface TimeOffBlock {
  /** Date-only values, stored as UTC midnight of the calendar day they name. */
  startDate: Date;
  endDate: Date;
}

export interface BookedInterval {
  startTime: Date;
  endTime: Date;
}

export interface AvailableSlot {
  startTime: Date;
  endTime: Date;
}

interface SlotRules {
  serviceDurationMinutes: number;
  bufferMinutes: number;
  workingHours: WorkingHoursBlock[];
  timeOff: TimeOffBlock[];
  existingBookings: BookedInterval[];
  /** The provider's IANA timezone; working hours and dates are read in it. Defaults to UTC. */
  timeZone?: string;
  /** Grid spacing between candidate slot start times. Defaults to the service duration. */
  slotIncrementMinutes?: number;
  /** Injectable for tests; defaults to the real current time. */
  now?: Date;
}

export interface ComputeAvailableSlotsParams extends SlotRules {
  /** A calendar day on the provider's own calendar, "YYYY-MM-DD". */
  date: string;
}

export interface ComputeSlotsInRangeParams extends SlotRules {
  rangeStart: Date;
  rangeEnd: Date;
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function isWithinTimeOff(date: string, timeOff: TimeOffBlock[]): boolean {
  return timeOff.some((block) => date >= toIsoDate(block.startDate) && date <= toIsoDate(block.endDate));
}

/**
 * Pure function: given a provider's recurring working hours, time off, and
 * already-booked intervals, returns the open slots on one day of the
 * provider's calendar for a service of a given duration. No I/O — callers
 * fetch the inputs from the DB and this just does the interval math, which
 * is what makes it cheap to unit test exhaustively.
 */
export function computeAvailableSlots(params: ComputeAvailableSlotsParams): AvailableSlot[] {
  const {
    date,
    serviceDurationMinutes,
    bufferMinutes,
    workingHours,
    timeOff,
    existingBookings,
    timeZone = "UTC",
    slotIncrementMinutes,
    now = new Date(),
  } = params;

  if (isWithinTimeOff(date, timeOff)) {
    return [];
  }

  const dayOfWeek = dayOfWeekIso(date);
  const blocksForDay = workingHours.filter((block) => block.dayOfWeek === dayOfWeek);
  const increment = slotIncrementMinutes ?? serviceDurationMinutes;

  // Pad each existing booking with the buffer on both sides so back-to-back
  // bookings always leave the provider's configured breathing room, however
  // the appointments happen to be ordered.
  const blockedRanges = existingBookings.map((booking) => ({
    start: new Date(booking.startTime.getTime() - bufferMinutes * 60000),
    end: new Date(booking.endTime.getTime() + bufferMinutes * 60000),
  }));

  const slots: AvailableSlot[] = [];

  for (const block of blocksForDay) {
    const blockStartMin = parseTimeToMinutes(block.startTime);
    const blockEndMin = parseTimeToMinutes(block.endTime);

    for (
      let slotStartMin = blockStartMin;
      slotStartMin + serviceDurationMinutes <= blockEndMin;
      slotStartMin += increment
    ) {
      // Null when the clocks skip this wall time (spring forward): the slot
      // doesn't exist that day.
      const slotStart = zonedTimeToUtc(date, slotStartMin, timeZone);
      if (!slotStart) continue;
      const slotEnd = new Date(slotStart.getTime() + serviceDurationMinutes * 60000);

      if (slotStart < now) continue;

      const overlapsExisting = blockedRanges.some(
        (range) => slotStart < range.end && slotEnd > range.start,
      );
      if (overlapsExisting) continue;

      slots.push({ startTime: slotStart, endTime: slotEnd });
    }
  }

  return slots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

/**
 * The provider's calendar days that overlap [rangeStart, rangeEnd) — usually
 * one or two, since a customer's day rarely lines up with the provider's.
 */
export function providerDatesInRange(rangeStart: Date, rangeEnd: Date, timeZone: string): string[] {
  const first = zonedParts(rangeStart, timeZone).date;
  const last = zonedParts(new Date(rangeEnd.getTime() - 1), timeZone).date;
  const dates = [first];
  while (dates[dates.length - 1] < last) {
    dates.push(addDaysIso(dates[dates.length - 1], 1));
  }
  return dates;
}

/**
 * Open slots that start within [rangeStart, rangeEnd) — e.g. one day on the
 * customer's calendar, which can straddle two of the provider's days.
 */
export function computeSlotsInRange(params: ComputeSlotsInRangeParams): AvailableSlot[] {
  const { rangeStart, rangeEnd, timeZone = "UTC", ...rules } = params;

  return providerDatesInRange(rangeStart, rangeEnd, timeZone)
    .flatMap((date) => computeAvailableSlots({ ...rules, date, timeZone }))
    .filter((slot) => slot.startTime >= rangeStart && slot.startTime < rangeEnd);
}
