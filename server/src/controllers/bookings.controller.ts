import type { Request, Response } from "express";
import { Appointment, ProviderProfile, Service } from "../models";
import { AppError } from "../middleware/errorHandler";
import { computeAvailableSlots } from "../services/availability.service";
import { notify, notifyOtherParties } from "../services/notifications.service";
import { startOfDay, endOfDay } from "../utils/date";

const LATE_WINDOW_MS = 24 * 60 * 60 * 1000;

interface MongoDuplicateKeyError {
  code?: number;
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as MongoDuplicateKeyError).code === 11000;
}

async function assertSlotIsOpen(
  providerId: string,
  serviceDurationMinutes: number,
  targetStart: Date,
  excludeAppointmentId?: string,
): Promise<void> {
  const profile = await ProviderProfile.findOne({ userId: providerId });
  if (!profile) {
    throw new AppError(404, "Provider not found");
  }

  const dayBookings = await Appointment.find({
    providerId,
    status: "booked",
    ...(excludeAppointmentId ? { _id: { $ne: excludeAppointmentId } } : {}),
    startTime: { $gte: startOfDay(targetStart), $lt: endOfDay(targetStart) },
  });

  const slots = computeAvailableSlots({
    date: targetStart,
    serviceDurationMinutes,
    bufferMinutes: profile.bufferMinutes,
    workingHours: profile.workingHours,
    timeOff: profile.timeOff,
    existingBookings: dayBookings.map((b) => ({ startTime: b.startTime, endTime: b.endTime })),
  });

  const isOpen = slots.some((slot) => slot.startTime.getTime() === targetStart.getTime());
  if (!isOpen) {
    throw new AppError(409, "That time is not available");
  }
}

export async function createBooking(req: Request, res: Response): Promise<void> {
  const { providerId, serviceId, startTime } = req.body ?? {};

  if (typeof providerId !== "string" || typeof serviceId !== "string" || typeof startTime !== "string") {
    throw new AppError(400, "providerId, serviceId, and startTime are required");
  }

  const start = new Date(startTime);
  if (Number.isNaN(start.getTime())) {
    throw new AppError(400, "startTime must be a valid ISO date");
  }

  const service = await Service.findOne({ _id: serviceId, providerId, isActive: true });
  if (!service) {
    throw new AppError(404, "Service not found for this provider");
  }
  const end = new Date(start.getTime() + service.durationMinutes * 60000);

  // App-level check catches the common case and gives a clean error message.
  await assertSlotIsOpen(providerId, service.durationMinutes, start);

  try {
    const appointment = await Appointment.create({
      customerId: req.user!.id,
      providerId,
      serviceId,
      startTime: start,
      endTime: end,
      status: "booked",
    });

    await notify(
      providerId,
      "booking_created",
      `New booking: ${service.name} on ${start.toISOString()}`,
      appointment._id,
    );

    res.status(201).json({ appointment });
  } catch (err) {
    // Belt-and-suspenders: if two requests race past the check above for the
    // exact same slot, the unique partial index on Appointment rejects the
    // loser here instead of silently double-booking the provider.
    if (isDuplicateKeyError(err)) {
      throw new AppError(409, "That time was just booked by someone else");
    }
    throw err;
  }
}

export async function listMyBookingsAsCustomer(req: Request, res: Response): Promise<void> {
  const appointments = await Appointment.find({ customerId: req.user!.id })
    .sort({ startTime: -1 })
    .populate("providerId", "name")
    .populate("serviceId", "name durationMinutes price");
  res.json({ appointments });
}

export async function listMyBookingsAsProvider(req: Request, res: Response): Promise<void> {
  const appointments = await Appointment.find({ providerId: req.user!.id })
    .sort({ startTime: -1 })
    .populate("customerId", "name")
    .populate("serviceId", "name durationMinutes price");
  res.json({ appointments });
}

export async function cancelBooking(req: Request, res: Response): Promise<void> {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    throw new AppError(404, "Booking not found");
  }

  const isParticipant =
    appointment.customerId.toString() === req.user!.id || appointment.providerId.toString() === req.user!.id;
  if (!isParticipant && req.user!.role !== "admin") {
    throw new AppError(403, "Forbidden");
  }
  if (appointment.status !== "booked") {
    throw new AppError(400, "Only booked appointments can be cancelled");
  }

  const isLate = appointment.startTime.getTime() - Date.now() < LATE_WINDOW_MS;

  appointment.status = "cancelled";
  appointment.cancellationReason = typeof req.body?.reason === "string" ? req.body.reason : undefined;
  appointment.lateCancellation = isLate;
  await appointment.save();

  await notifyOtherParties(
    appointment,
    req.user!.id,
    "booking_cancelled",
    `Booking cancelled${isLate ? " (inside the 24h window)" : ""}`,
    appointment._id,
  );

  res.json({ appointment });
}

export async function rescheduleBooking(req: Request, res: Response): Promise<void> {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    throw new AppError(404, "Booking not found");
  }

  const isOwner = appointment.customerId.toString() === req.user!.id;
  if (!isOwner && req.user!.role !== "admin") {
    throw new AppError(403, "Forbidden");
  }
  if (appointment.status !== "booked") {
    throw new AppError(400, "Only booked appointments can be rescheduled");
  }

  const { newStartTime } = req.body ?? {};
  if (typeof newStartTime !== "string") {
    throw new AppError(400, "newStartTime is required");
  }
  const newStart = new Date(newStartTime);
  if (Number.isNaN(newStart.getTime())) {
    throw new AppError(400, "newStartTime must be a valid ISO date");
  }

  const service = await Service.findById(appointment.serviceId);
  if (!service) {
    throw new AppError(404, "Service not found");
  }

  await assertSlotIsOpen(
    appointment.providerId.toString(),
    service.durationMinutes,
    newStart,
    String(appointment._id),
  );

  const isLate = appointment.startTime.getTime() - Date.now() < LATE_WINDOW_MS;

  appointment.startTime = newStart;
  appointment.endTime = new Date(newStart.getTime() + service.durationMinutes * 60000);
  appointment.lateReschedule = isLate;

  try {
    await appointment.save();
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw new AppError(409, "That time was just booked by someone else");
    }
    throw err;
  }

  await notifyOtherParties(
    appointment,
    req.user!.id,
    "booking_rescheduled",
    `Booking rescheduled to ${newStart.toISOString()}`,
    appointment._id,
  );

  res.json({ appointment });
}

export async function completeBooking(req: Request, res: Response): Promise<void> {
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) {
    throw new AppError(404, "Booking not found");
  }

  const isProviderOwner = appointment.providerId.toString() === req.user!.id;
  if (!isProviderOwner && req.user!.role !== "admin") {
    throw new AppError(403, "Forbidden");
  }
  if (appointment.status !== "booked") {
    throw new AppError(400, "Only booked appointments can be marked completed");
  }
  if (appointment.endTime.getTime() > Date.now()) {
    throw new AppError(400, "Cannot mark a future appointment as completed");
  }

  appointment.status = "completed";
  await appointment.save();

  res.json({ appointment });
}
