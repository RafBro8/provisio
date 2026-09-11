import type { Request, Response } from "express";
import { Types } from "mongoose";
import { User, ProviderProfile, Service, Review } from "../models";
import { AppError } from "../middleware/errorHandler";
import { findOpenSlots, providerTimeZone, DEFAULT_TIME_ZONE } from "../services/openSlots.service";
import { addDaysIso, isIsoDate, isValidTimeZone, startOfZonedDay } from "../utils/date";

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

interface ServiceSummary {
  fromPrice: number;
  shortestMinutes: number;
  serviceCount: number;
}

/** Cheapest price, shortest session, and count of each provider's active services. */
async function getServiceSummaries(providerIds: string[]): Promise<Map<string, ServiceSummary>> {
  const results = await Service.aggregate<{ _id: Types.ObjectId } & ServiceSummary>([
    { $match: { providerId: { $in: providerIds.map((id) => new Types.ObjectId(id)) }, isActive: true } },
    {
      $group: {
        _id: "$providerId",
        fromPrice: { $min: "$price" },
        shortestMinutes: { $min: "$durationMinutes" },
        serviceCount: { $sum: 1 },
      },
    },
  ]);

  return new Map(
    results.map(({ _id, fromPrice, shortestMinutes, serviceCount }) => [
      _id.toString(),
      { fromPrice, shortestMinutes, serviceCount },
    ]),
  );
}

export async function listProviders(_req: Request, res: Response): Promise<void> {
  const providers = await User.find({ role: "provider" }).select("name");
  const providerIds = providers.map((p) => String(p._id));

  const [profiles, ratings, services] = await Promise.all([
    ProviderProfile.find({ userId: { $in: providerIds } }),
    getRatingSummaries(providerIds),
    getServiceSummaries(providerIds),
  ]);
  const profileByUserId = new Map(profiles.map((p) => [p.userId.toString(), p]));

  res.json({
    providers: providers.map((p) => {
      const id = String(p._id);
      const rating = ratings.get(id);
      const service = services.get(id);
      return {
        id,
        name: p.name,
        bio: profileByUserId.get(id)?.bio ?? "",
        avgRating: rating?.avgRating ?? null,
        reviewCount: rating?.reviewCount ?? 0,
        fromPrice: service?.fromPrice ?? null,
        shortestMinutes: service?.shortestMinutes ?? null,
        serviceCount: service?.serviceCount ?? 0,
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
      timezone: profile ? providerTimeZone(profile) : DEFAULT_TIME_ZONE,
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
  const { bio, bufferMinutes, workingHours, timeOff, timezone } = req.body ?? {};

  if (timezone !== undefined && !isValidTimeZone(timezone)) {
    throw new AppError(400, "Unknown time zone");
  }

  const update: Record<string, unknown> = {};
  if (bio !== undefined) update.bio = bio;
  if (timezone !== undefined) update.timezone = timezone;
  if (bufferMinutes !== undefined) update.bufferMinutes = bufferMinutes;
  if (workingHours !== undefined) update.workingHours = workingHours;
  if (timeOff !== undefined) update.timeOff = timeOff;

  const profile = await ProviderProfile.findOneAndUpdate(
    { userId: req.user!.id },
    { $set: update },
    { returnDocument: "after", runValidators: true },
  );
  if (!profile) {
    throw new AppError(404, "Provider profile not found");
  }
  res.json({ profile });
}

/**
 * Open slots for one calendar day. `date` is a day on the *customer's*
 * calendar when they send their timezone as `tz` — so "Saturday" means their
 * Saturday, however far the provider is from them. Without `tz`, the day is
 * read on the provider's own calendar (how older clients behave).
 */
export async function getAvailability(req: Request, res: Response): Promise<void> {
  const providerId = String(req.params.id);
  const { serviceId, date, tz } = req.query;

  if (typeof serviceId !== "string" || typeof date !== "string") {
    throw new AppError(400, "serviceId and date query params are required");
  }
  if (!isIsoDate(date)) {
    throw new AppError(400, "date must be a calendar date, e.g. 2026-08-03");
  }
  if (tz !== undefined && !isValidTimeZone(tz)) {
    throw new AppError(400, "tz must be an IANA time zone, e.g. America/Chicago");
  }

  const [profile, service] = await Promise.all([
    ProviderProfile.findOne({ userId: providerId }),
    Service.findOne({ _id: serviceId, providerId, isActive: true }),
  ]);
  if (!profile) throw new AppError(404, "Provider not found");
  if (!service) throw new AppError(404, "Service not found for this provider");

  const viewerTimeZone = tz ?? providerTimeZone(profile);
  const slots = await findOpenSlots({
    providerId,
    profile,
    serviceDurationMinutes: service.durationMinutes,
    rangeStart: startOfZonedDay(date, viewerTimeZone),
    rangeEnd: startOfZonedDay(addDaysIso(date, 1), viewerTimeZone),
  });

  res.json({ slots });
}
