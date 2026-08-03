import { apiRequest } from "./client";
import type { Review } from "./types";

export interface CreateReviewPayload {
  appointmentId: string;
  rating: number;
  comment?: string;
}

export function createReview(payload: CreateReviewPayload): Promise<{ review: Review }> {
  return apiRequest<{ review: Review }>("/reviews", { method: "POST", body: payload });
}

export function listProviderReviews(providerId: string): Promise<{ reviews: Review[] }> {
  return apiRequest<{ reviews: Review[] }>(`/reviews/provider/${providerId}`);
}
