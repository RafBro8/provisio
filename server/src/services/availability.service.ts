import { startOfDay } from "../utils/date";

export interface WorkingHoursBlock {
  dayOfWeek: number; // 0 (Sunday) – 6 (Saturday)
  startTime: string; // 24h "HH:mm"
  endTime: string;
}

export interface TimeOffBlock {
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

export interface ComputeAvailableSlotsParams {
  date: Date;
  serviceDurationMinutes: number;
  bufferMinutes: number;
  workingHours: WorkingHoursBlock[];
  timeOff: TimeOffBlock[];
  existingBookings: BookedInterval[];
  /** Grid spacing between candidate slot start times. Defaults to the service duration. */
  slotIncrementMinutes?: number;
  /** Injectable for tests; defaults to the real current time. */
  now?: Date;
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function combineDateAndMinutes(date: Date, minutesOfDay: number): Date {
  return new Date(startOfDay(date).getTime() + minutesOfDay * 60000);
}

function isWithinTimeOff(date: Date, timeOff: TimeOffBlock[]): boolean {
  const day = startOfDay(date).getTime();
  return timeOff.some((block) => {
    const blockStart = startOfDay(block.startDate).getTime();
    const blockEnd = startOfDay(block.endDate).getTime();
    return day >= blockStart && day <= blockEnd;
  });
}

/**
 * Pure function: given a provider's recurring working hours, time off, and
 * already-booked intervals for one day, returns the open slots for a
 * service of a given duration. No I/O — callers fetch the inputs from the
 * DB and this just does the interval math, which is what makes it cheap to
 * unit test exhaustively.
 */
export function computeAvailableSlots(params: ComputeAvailableSlotsParams): AvailableSlot[] {
  const {
    date,
    serviceDurationMinutes,
    bufferMinutes,
    workingHours,
    timeOff,
    existingBookings,
    slotIncrementMinutes,
    now = new Date(),
  } = params;

  if (isWithinTimeOff(date, timeOff)) {
    return [];
  }

  const dayOfWeek = startOfDay(date).getUTCDay();
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
      const slotStart = combineDateAndMinutes(date, slotStartMin);
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
