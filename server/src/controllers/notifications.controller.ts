import type { Request, Response } from "express";
import { Notification } from "../models";
import { AppError } from "../middleware/errorHandler";

export async function listMyNotifications(req: Request, res: Response): Promise<void> {
  const notifications = await Notification.find({ userId: req.user!.id }).sort({ createdAt: -1 });
  res.json({ notifications });
}

export async function markAsRead(req: Request, res: Response): Promise<void> {
  const notification = await Notification.findOne({ _id: req.params.id, userId: req.user!.id });
  if (!notification) {
    throw new AppError(404, "Notification not found");
  }
  notification.read = true;
  await notification.save();
  res.json({ notification });
}

export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  await Notification.updateMany({ userId: req.user!.id, read: false }, { $set: { read: true } });
  res.status(204).send();
}
