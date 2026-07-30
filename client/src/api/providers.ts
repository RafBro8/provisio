import { apiRequest } from "./client";
import type { ProviderSummary, ProviderDetail, Slot } from "./types";

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
