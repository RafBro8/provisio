import { apiRequest } from "./client";
import type { Appointment, PopulatedAppointment } from "./types";

export interface CreateBookingPayload {
  providerId: string;
  serviceId: string;
  startTime: string;
}

export function createBooking(payload: CreateBookingPayload): Promise<{ appointment: Appointment }> {
  return apiRequest<{ appointment: Appointment }>("/bookings", { method: "POST", body: payload });
}

export function listMyBookings(): Promise<{ appointments: PopulatedAppointment[] }> {
  return apiRequest<{ appointments: PopulatedAppointment[] }>("/bookings/mine");
}

export function listProviderBookings(): Promise<{ appointments: PopulatedAppointment[] }> {
  return apiRequest<{ appointments: PopulatedAppointment[] }>("/bookings/provider-mine");
}

export function listAllBookings(): Promise<{ appointments: PopulatedAppointment[] }> {
  return apiRequest<{ appointments: PopulatedAppointment[] }>("/bookings");
}

export function completeBooking(id: string): Promise<{ appointment: Appointment }> {
  return apiRequest<{ appointment: Appointment }>(`/bookings/${id}/complete`, { method: "PATCH" });
}

export function cancelBooking(id: string, reason?: string): Promise<{ appointment: Appointment }> {
  return apiRequest<{ appointment: Appointment }>(`/bookings/${id}/cancel`, {
    method: "PATCH",
    body: { reason },
  });
}

export function rescheduleBooking(id: string, newStartTime: string): Promise<{ appointment: Appointment }> {
  return apiRequest<{ appointment: Appointment }>(`/bookings/${id}/reschedule`, {
    method: "PATCH",
    body: { newStartTime },
  });
}
