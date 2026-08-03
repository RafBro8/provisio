export type UserRole = "admin" | "provider" | "customer";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Service {
  _id: string;
  providerId: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
}

export interface ProviderSummary {
  id: string;
  name: string;
  bio: string;
  avgRating: number | null;
  reviewCount: number;
}

export interface ProviderDetail {
  provider: ProviderSummary;
  services: Service[];
}

export interface Slot {
  startTime: string;
  endTime: string;
}

export interface WorkingHoursBlock {
  dayOfWeek: number; // 0 (Sunday) – 6 (Saturday)
  startTime: string; // 24h "HH:mm"
  endTime: string;
}

export interface TimeOffBlock {
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface ProviderProfile {
  _id: string;
  userId: string;
  bio?: string;
  bufferMinutes: number;
  workingHours: WorkingHoursBlock[];
  timeOff: TimeOffBlock[];
}

export type AppointmentStatus = "booked" | "cancelled" | "completed";

export interface Appointment {
  _id: string;
  customerId: string;
  providerId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  cancellationReason?: string;
  lateCancellation?: boolean;
  lateReschedule?: boolean;
}

/** Shape returned by /bookings/mine and /bookings/provider-mine, which populate references for display. */
export interface PopulatedAppointment {
  _id: string;
  customerId: string | { _id: string; name: string };
  providerId: string | { _id: string; name: string };
  serviceId: { _id: string; name: string; durationMinutes: number; price: number };
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  cancellationReason?: string;
  lateCancellation?: boolean;
  lateReschedule?: boolean;
  /** Only present on /bookings/mine — whether the customer already reviewed this appointment. */
  hasReview?: boolean;
}

export interface Review {
  _id: string;
  appointmentId: string;
  customerId: string | { _id: string; name: string };
  providerId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}
