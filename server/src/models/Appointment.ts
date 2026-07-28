import { Schema, model, Types, type HydratedDocument } from "mongoose";

export type AppointmentStatus = "booked" | "cancelled" | "completed";

export interface IAppointment {
  customerId: Types.ObjectId;
  providerId: Types.ObjectId;
  serviceId: Types.ObjectId;
  startTime: Date;
  endTime: Date;
  status: AppointmentStatus;
  cancellationReason?: string;
}

export type AppointmentDocument = HydratedDocument<IAppointment>;

const appointmentSchema = new Schema<IAppointment>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    providerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ["booked", "cancelled", "completed"],
      required: true,
      default: "booked",
    },
    cancellationReason: { type: String, trim: true },
  },
  { timestamps: true },
);

// Availability lookups and conflict checks both filter by provider + time range.
appointmentSchema.index({ providerId: 1, startTime: 1 });

export const Appointment = model<IAppointment>("Appointment", appointmentSchema);
