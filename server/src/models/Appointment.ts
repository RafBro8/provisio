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
  lateCancellation?: boolean;
  lateReschedule?: boolean;
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
    lateCancellation: { type: Boolean, default: false },
    lateReschedule: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Availability lookups filter by provider + time range, and this same index
// doubles as the hard guarantee against double-booking: MongoDB enforces
// uniqueness atomically, so two concurrent requests for the exact same
// provider+startTime can't both succeed even without multi-document
// transactions (which a single-node MongoDB instance doesn't support).
// Scoped to status "booked" via a partial filter so a cancelled slot frees
// up the time again.
appointmentSchema.index(
  { providerId: 1, startTime: 1 },
  { unique: true, partialFilterExpression: { status: "booked" } },
);

export const Appointment = model<IAppointment>("Appointment", appointmentSchema);
