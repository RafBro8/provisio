import { apiRequest } from "./client";
import type { ProviderSummary, ProviderDetail, Slot, ProviderProfile, WorkingHoursBlock, TimeOffBlock } from "./types";

export function listProviders(): Promise<{ providers: ProviderSummary[] }> {
  return apiRequest<{ providers: ProviderSummary[] }>("/providers");
}

export function getProviderDetail(providerId: string): Promise<ProviderDetail> {
  return apiRequest<ProviderDetail>(`/providers/${providerId}`);
}

export function getAvailability(providerId: string, serviceId: string, date: string): Promise<{ slots: Slot[] }> {
  const params = new URLSearchParams({ serviceId, date });
  return apiRequest<{ slots: Slot[] }>(`/providers/${providerId}/availability?${params.toString()}`);
}

export function getMyProfile(): Promise<{ profile: ProviderProfile }> {
  return apiRequest<{ profile: ProviderProfile }>("/providers/me/profile");
}

export interface UpdateProfilePayload {
  bio?: string;
  bufferMinutes?: number;
  workingHours?: WorkingHoursBlock[];
  timeOff?: TimeOffBlock[];
}

export function updateMyProfile(payload: UpdateProfilePayload): Promise<{ profile: ProviderProfile }> {
  return apiRequest<{ profile: ProviderProfile }>("/providers/me/profile", { method: "PUT", body: payload });
}
