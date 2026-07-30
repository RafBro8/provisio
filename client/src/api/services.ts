import { apiRequest } from "./client";
import type { Service } from "./types";

export interface CreateServicePayload {
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
}

export function createService(payload: CreateServicePayload): Promise<{ service: Service }> {
  return apiRequest<{ service: Service }>("/services", { method: "POST", body: payload });
}

export function listMyServices(): Promise<{ services: Service[] }> {
  return apiRequest<{ services: Service[] }>("/services/mine");
}

export interface UpdateServicePayload {
  name?: string;
  description?: string;
  durationMinutes?: number;
  price?: number;
  isActive?: boolean;
}

export function updateService(id: string, payload: UpdateServicePayload): Promise<{ service: Service }> {
  return apiRequest<{ service: Service }>(`/services/${id}`, { method: "PATCH", body: payload });
}
