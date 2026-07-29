import type { Request, Response } from "express";
import { Appointment, Review } from "../models";
import { AppError } from "../middleware/errorHandler";
import { notify } from "../services/notifications.service";

export async function createReview(req: Request, res: Response): Promise<void> {
  const { appointmentId, rating, comment } = req.body ?? {};

  if (typeof appointmentId !== "string") {
    throw new AppError(400, "appointmentId is required");
  }
  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    throw new AppError(400, "rating must be a number between 1 and 5");
  }

  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    throw new AppError(404, "Appointment not found");
  }
  if (appointment.customerId.toString() !== req.user!.id) {
    throw new AppError(403, "Forbidden");
  }
  if (appointment.status !== "completed") {
    throw new AppError(400, "You can only review a completed appointment");
  }

  const existing = await Review.findOne({ appointmentId });
  if (existing) {
    throw new AppError(409, "This appointment has already been reviewed");
  }

  const review = await Review.create({
    appointmentId,
    customerId: req.user!.id,
    providerId: appointment.providerId,
    rating,
    comment: typeof comment === "string" ? comment : undefined,
  });

  await notify(appointment.providerId, "review_received", `New ${rating}-star review received`, appointment._id);

  res.status(201).json({ review });
}

export async function listProviderReviews(req: Request, res: Response): Promise<void> {
  const reviews = await Review.find({ providerId: req.params.providerId }).sort({ createdAt: -1 });
  res.json({ reviews });
}
