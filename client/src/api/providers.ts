import { apiRequest } from "./client";
import { browserTimeZone } from "../lib/format";
import type { ProviderListItem, ProviderDetail, Slot, ProviderProfile, WorkingHoursBlock, TimeOffBlock } from "./types";

export function listProviders(): Promise<{ providers: ProviderListItem[] }> {
  return apiRequest<{ providers: ProviderListItem[] }>("/providers");
}

export function getProviderDetail(providerId: string): Promise<ProviderDetail> {
  return apiRequest<ProviderDetail>(`/providers/${providerId}`);
}

export function getAvailability(providerId: string, serviceId: string, date: string): Promise<{ slots: Slot[] }> {
  // Sending our timezone makes `date` mean this calendar day for the person
  // looking, however far away the provider is.
  const params = new URLSearchParams({ serviceId, date, tz: browserTimeZone() });
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
  timezone?: string;
}

export function updateMyProfile(payload: UpdateProfilePayload): Promise<{ profile: ProviderProfile }> {
  return apiRequest<{ profile: ProviderProfile }>("/providers/me/profile", { method: "PUT", body: payload });
}
