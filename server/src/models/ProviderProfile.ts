import { Schema, model, Types, type HydratedDocument } from "mongoose";

export interface IWorkingHoursBlock {
  dayOfWeek: number; // 0 (Sunday) – 6 (Saturday)
  startTime: string; // 24h "HH:mm", e.g. "09:00"
  endTime: string; // 24h "HH:mm", e.g. "17:00"
}

export interface ITimeOffBlock {
  startDate: Date;
  endDate: Date;
  reason?: string;
}

export interface IProviderProfile {
  userId: Types.ObjectId;
  bio?: string;
  bufferMinutes: number;
  workingHours: IWorkingHoursBlock[];
  timeOff: ITimeOffBlock[];
}

export type ProviderProfileDocument = HydratedDocument<IProviderProfile>;

const workingHoursSchema = new Schema<IWorkingHoursBlock>(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  },
  { _id: false },
);

const timeOffSchema = new Schema<ITimeOffBlock>(
  {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String },
  },
  { _id: false },
);

const providerProfileSchema = new Schema<IProviderProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    bio: { type: String, trim: true },
    bufferMinutes: { type: Number, required: true, default: 15, min: 0 },
    workingHours: { type: [workingHoursSchema], default: [] },
    timeOff: { type: [timeOffSchema], default: [] },
  },
  { timestamps: true },
);

export const ProviderProfile = model<IProviderProfile>("ProviderProfile", providerProfileSchema);
