import type { Types } from "mongoose";
import { Notification, type NotificationType } from "../models/Notification";

export async function notify(
  userId: Types.ObjectId | string,
  type: NotificationType,
  message: string,
  relatedAppointmentId?: Types.ObjectId | string,
): Promise<void> {
  await Notification.create({ userId, type, message, relatedAppointmentId });
}

/**
 * Notifies both sides of a booking except whoever just performed the
 * action — so a customer cancelling notifies the provider, a provider
 * cancelling notifies the customer, and an admin acting on either party's
 * behalf notifies both of them.
 */
export async function notifyOtherParties(
  appointment: { customerId: Types.ObjectId; providerId: Types.ObjectId },
  actorId: string,
  type: NotificationType,
  message: string,
  relatedAppointmentId?: Types.ObjectId | string,
): Promise<void> {
  const recipients = [appointment.customerId.toString(), appointment.providerId.toString()].filter(
    (id) => id !== actorId,
  );
  await Promise.all(recipients.map((id) => notify(id, type, message, relatedAppointmentId)));
}
