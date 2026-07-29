import type { Request, Response } from "express";
import { Service } from "../models";
import { AppError } from "../middleware/errorHandler";

export async function createService(req: Request, res: Response): Promise<void> {
  const { name, description, durationMinutes, price } = req.body ?? {};

  if (typeof name !== "string" || !name.trim()) {
    throw new AppError(400, "name is required");
  }
  if (typeof durationMinutes !== "number" || durationMinutes < 5) {
    throw new AppError(400, "durationMinutes must be a number >= 5");
  }
  if (typeof price !== "number" || price < 0) {
    throw new AppError(400, "price must be a non-negative number");
  }

  const service = await Service.create({
    providerId: req.user!.id,
    name,
    description,
    durationMinutes,
    price,
  });

  res.status(201).json({ service });
}

export async function listMyServices(req: Request, res: Response): Promise<void> {
  const services = await Service.find({ providerId: req.user!.id }).sort({ createdAt: -1 });
  res.json({ services });
}

export async function updateService(req: Request, res: Response): Promise<void> {
  const service = await Service.findById(req.params.id);
  if (!service) {
    throw new AppError(404, "Service not found");
  }
  if (service.providerId.toString() !== req.user!.id && req.user!.role !== "admin") {
    throw new AppError(403, "Forbidden");
  }

  const { name, description, durationMinutes, price, isActive } = req.body ?? {};
  if (name !== undefined) service.name = name;
  if (description !== undefined) service.description = description;
  if (durationMinutes !== undefined) service.durationMinutes = durationMinutes;
  if (price !== undefined) service.price = price;
  if (isActive !== undefined) service.isActive = isActive;

  await service.save();
  res.json({ service });
}
