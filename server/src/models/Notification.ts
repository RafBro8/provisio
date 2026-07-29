import { Schema, model, Types, type HydratedDocument } from "mongoose";

export type NotificationType =
  | "booking_created"
  | "booking_cancelled"
  | "booking_rescheduled"
  | "review_received";

export interface INotification {
  userId: Types.ObjectId; // recipient
  type: NotificationType;
  message: string;
  relatedAppointmentId?: Types.ObjectId;
  read: boolean;
}

export type NotificationDocument = HydratedDocument<INotification>;

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["booking_created", "booking_cancelled", "booking_rescheduled", "review_received"],
      required: true,
    },
    message: { type: String, required: true },
    relatedAppointmentId: { type: Schema.Types.ObjectId, ref: "Appointment" },
    read: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification = model<INotification>("Notification", notificationSchema);
