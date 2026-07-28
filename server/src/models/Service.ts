import { Schema, model, Types, type HydratedDocument } from "mongoose";

export interface IService {
  providerId: Types.ObjectId; // ref User (role: "provider")
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
}

export type ServiceDocument = HydratedDocument<IService>;

const serviceSchema = new Schema<IService>(
  {
    providerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    durationMinutes: { type: Number, required: true, min: 5 },
    price: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

export const Service = model<IService>("Service", serviceSchema);
