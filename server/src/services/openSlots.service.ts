import { Appointment } from "../models/Appointment";
import type { ProviderProfileDocument } from "../models/ProviderProfile";
import { computeSlotsInRange, type AvailableSlot } from "./availability.service";

const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_TIME_ZONE = "UTC";

/** Providers who haven't set a timezone keep the original behaviour: hours read as UTC. */
export function providerTimeZone(profile: ProviderProfileDocument): string {
  return profile.timezone ?? DEFAULT_TIME_ZONE;
}

interface FindOpenSlotsParams {
  providerId: string;
  profile: ProviderProfileDocument;
  serviceDurationMinutes: number;
  rangeStart: Date;
  rangeEnd: Date;
  /** Ignore this appointment's own time, e.g. when rescheduling it. */
  excludeAppointmentId?: string;
}

/**
 * Open slots starting within [rangeStart, rangeEnd), with the provider's
 * existing bookings loaded from the database. The one place both the
 * availability endpoint and booking validation get slots from, so what a
 * customer is shown and what they're allowed to book can't drift apart.
 */
export async function findOpenSlots(params: FindOpenSlotsParams): Promise<AvailableSlot[]> {
  const { providerId, profile, serviceDurationMinutes, rangeStart, rangeEnd, excludeAppointmentId } = params;

  // A day of margin either side catches bookings on the neighbouring
  // provider-days the range touches, plus anything whose buffer reaches in.
  const bookings = await Appointment.find({
    providerId,
    status: "booked",
    ...(excludeAppointmentId ? { _id: { $ne: excludeAppointmentId } } : {}),
    startTime: { $gte: new Date(rangeStart.getTime() - DAY_MS), $lt: new Date(rangeEnd.getTime() + DAY_MS) },
  });

  return computeSlotsInRange({
    rangeStart,
    rangeEnd,
    timeZone: providerTimeZone(profile),
    serviceDurationMinutes,
    bufferMinutes: profile.bufferMinutes,
    workingHours: profile.workingHours,
    timeOff: profile.timeOff,
    existingBookings: bookings.map((b) => ({ startTime: b.startTime, endTime: b.endTime })),
  });
}
