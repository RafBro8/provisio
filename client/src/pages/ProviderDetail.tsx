import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router";
import { getProviderDetail } from "../api/providers";
import { createBooking } from "../api/bookings";
import { listProviderReviews } from "../api/reviews";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { SlotPicker } from "../components/SlotPicker";
import { formatDateTime, formatStars, todayIso } from "../lib/format";
import type { ProviderDetail as ProviderDetailData, Service, Slot, Review } from "../api/types";

function resolveReviewerName(ref: string | { _id: string; name: string }): string {
  return typeof ref === "string" ? "A customer" : ref.name;
}

export function ProviderDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const location = useLocation();

  const [data, setData] = useState<ProviderDetailData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [date, setDate] = useState(todayIso());
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedSlot, setConfirmedSlot] = useState<Slot | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);

  useEffect(() => {
    if (!id) return;
    getProviderDetail(id)
      .then((res) => {
        setData(res);
        setSelectedService(res.services[0] ?? null);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Couldn't load this provider"));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    listProviderReviews(id)
      .then((res) => setReviews(res.reviews))
      .catch((err) => setReviewsError(err instanceof ApiError ? err.message : "Couldn't load reviews"))
      .finally(() => setIsLoadingReviews(false));
  }, [id]);

  function handleSelectService(service: Service): void {
    setSelectedService(service);
    setSelectedSlot(null);
    setConfirmedSlot(null);
  }

  function handleDateChange(newDate: string): void {
    setDate(newDate);
    setSelectedSlot(null);
    setConfirmedSlot(null);
  }

  async function handleConfirmBooking(): Promise<void> {
    if (!id || !selectedService || !selectedSlot) return;
    setIsBooking(true);
    setBookingError(null);
    try {
      await createBooking({ providerId: id, serviceId: selectedService._id, startTime: selectedSlot.startTime });
      setConfirmedSlot(selectedSlot);
      setSelectedSlot(null);
      setRefreshToken((n) => n + 1);
    } catch (err) {
      setBookingError(err instanceof ApiError ? err.message : "Something went wrong booking this slot");
    } finally {
      setIsBooking(false);
    }
  }

  if (loadError) return <p className="text-red-600 dark:text-red-400">{loadError}</p>;
  if (!data) return <p className="text-slate-500 dark:text-slate-400">Loading…</p>;

  const { provider, services } = data;

  return (
    <div>
      <h1 className="text-2xl font-semibold">{provider.name}</h1>
      {provider.bio && <p className="mt-2 text-slate-600 dark:text-slate-400">{provider.bio}</p>}
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {provider.avgRating !== null
          ? `★ ${provider.avgRating} (${provider.reviewCount} review${provider.reviewCount === 1 ? "" : "s"})`
          : "No reviews yet"}
      </p>

      {services.length === 0 ? (
        <p className="mt-6 text-slate-500 dark:text-slate-400">This provider has no active services right now.</p>
      ) : (
        <div className="mt-8 grid gap-8 md:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="font-medium">Services</h2>
            <ul className="mt-2 flex flex-col gap-2">
              {services.map((service) => (
                <li key={service._id}>
                  <button
                    type="button"
                    onClick={() => handleSelectService(service)}
                    className={`w-full rounded border px-3 py-2 text-left text-sm ${
                      selectedService?._id === service._id
                        ? "border-slate-900 dark:border-white"
                        : "border-slate-300 dark:border-slate-700"
                    }`}
                  >
                    <span className="font-medium">{service.name}</span>
                    <span className="block text-slate-500 dark:text-slate-400">
                      {service.durationMinutes} min · ${service.price}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-medium">Pick a time</h2>
            <input
              type="date"
              value={date}
              min={todayIso()}
              onChange={(e) => handleDateChange(e.target.value)}
              className="mt-2 rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />

            <div className="mt-4">
              {selectedService && (
                <SlotPicker
                  providerId={provider.id}
                  serviceId={selectedService._id}
                  date={date}
                  selectedSlot={selectedSlot}
                  onSelectSlot={setSelectedSlot}
                  refreshToken={refreshToken}
                />
              )}
            </div>

            {selectedSlot && selectedService && (
              <div className="mt-6 rounded border border-slate-300 p-4 dark:border-slate-700">
                <p className="text-sm">
                  Book <strong>{selectedService.name}</strong> with <strong>{provider.name}</strong> on{" "}
                  <strong>{formatDateTime(selectedSlot.startTime)}</strong> for ${selectedService.price}?
                </p>

                {!user && (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    <Link to="/login" state={{ from: location }} className="underline">
                      Log in
                    </Link>{" "}
                    to book this appointment.
                  </p>
                )}
                {user && user.role !== "customer" && (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    Only customer accounts can book appointments.
                  </p>
                )}
                {user && user.role === "customer" && (
                  <>
                    {bookingError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{bookingError}</p>}
                    <button
                      type="button"
                      disabled={isBooking}
                      onClick={handleConfirmBooking}
                      className="mt-3 rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
                    >
                      {isBooking ? "Booking…" : "Confirm booking"}
                    </button>
                  </>
                )}
              </div>
            )}

            {confirmedSlot && selectedService && (
              <div className="mt-6 rounded border border-green-300 bg-green-50 p-4 text-sm dark:border-green-800 dark:bg-green-950">
                Booked! {selectedService.name} on {formatDateTime(confirmedSlot.startTime)}.{" "}
                <Link to="/bookings" className="underline">
                  View my bookings
                </Link>
                .
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-10">
        <h2 className="font-medium">Reviews</h2>
        {isLoadingReviews && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Loading…</p>}
        {reviewsError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{reviewsError}</p>}
        {!isLoadingReviews && !reviewsError && reviews.length === 0 && (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No reviews yet.</p>
        )}
        {!isLoadingReviews && !reviewsError && reviews.length > 0 && (
          <ul className="mt-3 flex flex-col gap-3">
            {reviews.map((review) => (
              <li key={review._id} className="rounded border border-slate-300 p-3 dark:border-slate-700">
                <p className="text-amber-500" aria-label={`${review.rating} out of 5 stars`}>
                  {formatStars(review.rating)}
                </p>
                {review.comment && (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{review.comment}</p>
                )}
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  — {resolveReviewerName(review.customerId)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
