import type { Request, Response } from "express";
import { Types } from "mongoose";
import { User, ProviderProfile, Service, Review } from "../models";
import { AppError } from "../middleware/errorHandler";
import { computeAvailableSlots } from "../services/availability.service";
import { startOfDay, endOfDay } from "../utils/date";
import { Appointment } from "../models/Appointment";

interface RatingSummary {
  avgRating: number;
  reviewCount: number;
}

async function getRatingSummaries(providerIds: string[]): Promise<Map<string, RatingSummary>> {
  const results = await Review.aggregate<{ _id: Types.ObjectId; avgRating: number; reviewCount: number }>([
    { $match: { providerId: { $in: providerIds.map((id) => new Types.ObjectId(id)) } } },
    { $group: { _id: "$providerId", avgRating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } },
  ]);

  return new Map(
    results.map((r) => [
      r._id.toString(),
      { avgRating: Math.round(r.avgRating * 10) / 10, reviewCount: r.reviewCount },
    ]),
  );
}

export async function listProviders(_req: Request, res: Response): Promise<void> {
  const providers = await User.find({ role: "provider" }).select("name");
  const providerIds = providers.map((p) => String(p._id));

  const [profiles, ratings] = await Promise.all([
    ProviderProfile.find({ userId: { $in: providerIds } }),
    getRatingSummaries(providerIds),
  ]);
  const profileByUserId = new Map(profiles.map((p) => [p.userId.toString(), p]));

  res.json({
    providers: providers.map((p) => {
      const id = String(p._id);
      const rating = ratings.get(id);
      return {
        id,
        name: p.name,
        bio: profileByUserId.get(id)?.bio ?? "",
        avgRating: rating?.avgRating ?? null,
        reviewCount: rating?.reviewCount ?? 0,
      };
    }),
  });
}

export async function getProviderDetail(req: Request, res: Response): Promise<void> {
  const provider = await User.findOne({ _id: req.params.id, role: "provider" });
  if (!provider) {
    throw new AppError(404, "Provider not found");
  }

  const [profile, services, ratings] = await Promise.all([
    ProviderProfile.findOne({ userId: provider._id }),
    Service.find({ providerId: provider._id, isActive: true }),
    getRatingSummaries([String(provider._id)]),
  ]);
  const rating = ratings.get(String(provider._id));

  res.json({
    provider: {
      id: String(provider._id),
      name: provider.name,
      bio: profile?.bio ?? "",
      avgRating: rating?.avgRating ?? null,
      reviewCount: rating?.reviewCount ?? 0,
    },
    services,
  });
}

export async function getMyProfile(req: Request, res: Response): Promise<void> {
  const profile = await ProviderProfile.findOne({ userId: req.user!.id });
  if (!profile) {
    throw new AppError(404, "Provider profile not found");
  }
  res.json({ profile });
}

export async function updateMyProfile(req: Request, res: Response): Promise<void> {
  const { bio, bufferMinutes, workingHours, timeOff } = req.body ?? {};

  const update: Record<string, unknown> = {};
  if (bio !== undefined) update.bio = bio;
  if (bufferMinutes !== undefined) update.bufferMinutes = bufferMinutes;
  if (workingHours !== undefined) update.workingHours = workingHours;
  if (timeOff !== undefined) update.timeOff = timeOff;

  const profile = await ProviderProfile.findOneAndUpdate(
    { userId: req.user!.id },
    { $set: update },
    { new: true, runValidators: true },
  );
  if (!profile) {
    throw new AppError(404, "Provider profile not found");
  }
  res.json({ profile });
}

export async function getAvailability(req: Request, res: Response): Promise<void> {
  const providerId = req.params.id;
  const { serviceId, date } = req.query;

  if (typeof serviceId !== "string" || typeof date !== "string") {
    throw new AppError(400, "serviceId and date query params are required");
  }

  const targetDate = new Date(date);
  if (Number.isNaN(targetDate.getTime())) {
    throw new AppError(400, "date must be a valid ISO date, e.g. 2026-08-03");
  }

  const [profile, service] = await Promise.all([
    ProviderProfile.findOne({ userId: providerId }),
    Service.findOne({ _id: serviceId, providerId, isActive: true }),
  ]);
  if (!profile) throw new AppError(404, "Provider not found");
  if (!service) throw new AppError(404, "Service not found for this provider");

  const dayBookings = await Appointment.find({
    providerId,
    status: "booked",
    startTime: { $gte: startOfDay(targetDate), $lt: endOfDay(targetDate) },
  });

  const slots = computeAvailableSlots({
    date: targetDate,
    serviceDurationMinutes: service.durationMinutes,
    bufferMinutes: profile.bufferMinutes,
    workingHours: profile.workingHours,
    timeOff: profile.timeOff,
    existingBookings: dayBookings.map((b) => ({ startTime: b.startTime, endTime: b.endTime })),
  });

  res.json({ slots });
}
