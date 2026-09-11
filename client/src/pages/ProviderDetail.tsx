import { useEffect, useState, type ReactNode } from "react";
import { useParams, useLocation, Link } from "react-router";
import { getProviderDetail } from "../api/providers";
import { createBooking } from "../api/bookings";
import { listProviderReviews } from "../api/reviews";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { SlotPicker } from "../components/SlotPicker";
import { ArrowLeft, ArrowRight, Check, Clock } from "../components/icons";
import { ProviderAvatar } from "../components/ProviderAvatar";
import { addDaysIso, dayParts, formatDate, formatDateTime, formatStars, todayIso } from "../lib/format";
import type { ProviderDetail as ProviderDetailData, Service, Slot, Review } from "../api/types";

const DATE_STRIP_DAYS = 7;

const LABEL_CLASS = "text-[11.5px] font-bold tracking-[0.09em] uppercase text-faint dark:text-faint-dark";
const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

function resolveReviewerName(ref: string | { _id: string; name: string }): string {
  return typeof ref === "string" ? "A customer" : ref.name;
}

function SectionHeading({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-3 dark:border-rule-dark">
      <h2 className="font-display text-[1.65rem] tracking-[-0.015em]">{title}</h2>
      {aside}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/providers"
      className="inline-flex items-center gap-1.5 text-[13.5px] text-faint transition-colors hover:text-ink dark:text-faint-dark dark:hover:text-ink-dark"
    >
      <ArrowLeft className="h-[15px] w-[15px]" />
      All providers
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div aria-busy="true" className="flex animate-pulse flex-col gap-6">
      <span className="sr-only">Loading…</span>
      <div className="h-4 w-28 rounded bg-rule-soft dark:bg-rule-soft-dark" />
      <div className="flex items-center gap-5">
        <div className="h-[74px] w-[74px] rounded-full bg-rule-soft dark:bg-rule-soft-dark" />
        <div className="flex flex-col gap-3">
          <div className="h-9 w-64 rounded bg-rule-soft dark:bg-rule-soft-dark" />
          <div className="h-4 w-40 rounded bg-rule-soft dark:bg-rule-soft-dark" />
        </div>
      </div>
    </div>
  );
}

/**
 * The next week as a row of day chips — the common case is booking soon, and
 * this makes it one tap. Native radio inputs (visually hidden) rather than
 * buttons: arrow-key navigation comes for free, and it keeps the page's only
 * `button[aria-pressed]` elements the time slots themselves.
 */
function DateStrip({ value, onChange }: { value: string; onChange: (date: string) => void }) {
  const today = todayIso();
  const days = Array.from({ length: DATE_STRIP_DAYS }, (_, i) => addDaysIso(today, i));

  return (
    <div role="radiogroup" aria-label="Date" className="grid grid-cols-7 gap-1.5">
      {days.map((iso) => {
        const { weekday, day, full } = dayParts(iso);
        return (
          // Styled from the label with :has(:checked) — a peer-* variant only
          // reaches the input's siblings, not the text nested inside them.
          <label key={iso} className="group cursor-pointer">
            <input
              type="radio"
              name="booking-date"
              value={iso}
              aria-label={full}
              checked={value === iso}
              onChange={() => onChange(iso)}
              className="sr-only"
            />
            <span className="flex flex-col items-center gap-0.5 rounded-[10px] border border-rule py-2.5 transition-colors group-hover:border-ink/40 group-has-[:checked]:border-transparent group-has-[:checked]:bg-ink group-has-[:focus-visible]:outline-2 group-has-[:focus-visible]:outline-offset-2 group-has-[:focus-visible]:outline-brand dark:border-rule-dark dark:group-hover:border-ink-dark/40 dark:group-has-[:checked]:bg-ink-dark">
              <span className="text-[10.5px] tracking-[0.06em] uppercase text-faint group-has-[:checked]:text-[#b9b2c6] dark:text-faint-dark dark:group-has-[:checked]:text-[#857e93]">
                {weekday}
              </span>
              <span className="font-mono text-[15px] text-ink/85 group-has-[:checked]:text-white dark:text-ink-dark/85 dark:group-has-[:checked]:text-ground-dark">
                {day}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
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

  function handleSelectSlot(slot: Slot): void {
    setSelectedSlot(slot);
    setBookingError(null);
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

  if (loadError) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <p role="alert" className="text-danger-text dark:text-red-300">
          {loadError}
        </p>
      </div>
    );
  }
  if (!data) return <LoadingSkeleton />;

  const { provider, services } = data;
  const lowestPrice = services.length > 0 ? Math.min(...services.map((s) => s.price)) : null;

  return (
    <div className="flex flex-col">
      <BackLink />

      <header className="mt-6 flex items-start gap-5 sm:gap-6">
        <ProviderAvatar
          id={provider.id}
          name={provider.name}
          className="h-16 w-16 text-[1.6rem] sm:h-[74px] sm:w-[74px] sm:text-[1.9rem]"
        />
        <div className="flex flex-col gap-2.5 pt-1">
          <h1 className="font-display text-[2.4rem] leading-[1.05] tracking-[-0.02em] sm:text-[2.9rem]">
            {provider.name}
          </h1>
          <p className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[15px] text-muted dark:text-muted-dark">
            {provider.avgRating !== null ? (
              <span>
                <span className="text-star">★</span> {provider.avgRating.toFixed(1)}{" "}
                <span className="text-faint dark:text-faint-dark">
                  ({provider.reviewCount} review{provider.reviewCount === 1 ? "" : "s"})
                </span>
              </span>
            ) : (
              <span>No reviews yet</span>
            )}
            {lowestPrice !== null && (
              <>
                <span aria-hidden="true" className="h-1 w-1 rounded-full bg-rule dark:bg-rule-dark" />
                <span>
                  From <span className="font-mono text-ink dark:text-ink-dark">${lowestPrice}</span>
                </span>
              </>
            )}
          </p>
        </div>
      </header>

      <div className="mt-11 grid gap-12 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-14 lg:gap-y-12">
        <div className="flex flex-col gap-10 lg:col-span-7">
          {provider.bio && (
            <p className="max-w-[620px] text-[17px] leading-[1.68] text-muted dark:text-muted-dark">{provider.bio}</p>
          )}

          <section className="flex flex-col gap-4">
            <SectionHeading
              title="Services"
              aside={services.length > 1 ? <span className={LABEL_CLASS}>Select one</span> : undefined}
            />
            {services.length === 0 ? (
              <p className="text-muted dark:text-muted-dark">This provider has no active services right now.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {services.map((service) => {
                  const isSelected = selectedService?._id === service._id;
                  return (
                    <li key={service._id}>
                      {/* aria-current rather than aria-pressed: see the note in SlotPicker. */}
                      <button
                        type="button"
                        aria-current={isSelected || undefined}
                        onClick={() => handleSelectService(service)}
                        className={`flex w-full items-center justify-between gap-4 rounded-xl border px-5 py-4 text-left transition-colors ${FOCUS_RING} ${
                          isSelected
                            ? "border-ink bg-surface ring-1 ring-ink dark:border-ink-dark dark:bg-surface-dark dark:ring-ink-dark"
                            : "border-rule hover:border-ink/40 dark:border-rule-dark dark:hover:border-ink-dark/40"
                        }`}
                      >
                        <span className="flex flex-col gap-0.5">
                          <span className="text-base font-semibold">{service.name}</span>
                          <span className="text-[13.5px] text-faint dark:text-faint-dark">
                            {service.durationMinutes} minutes
                            {service.description ? ` · ${service.description}` : ""}
                          </span>
                        </span>
                        <span className="font-mono text-base font-medium">${service.price}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {selectedService && (
          <aside className="lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1">
            <div className="overflow-hidden rounded-[18px] border border-rule bg-surface shadow-[0_30px_60px_-34px_rgba(58,42,26,0.28)] lg:sticky lg:top-8 dark:border-[#302941] dark:bg-surface-dark dark:shadow-[0_34px_70px_-30px_rgba(0,0,0,0.7)]">
              <div className="border-b border-rule-soft px-6 pt-5 pb-4 dark:border-rule-soft-dark">
                <h2 className="font-display text-[1.45rem] tracking-[-0.01em]">Pick a time</h2>
              </div>

              <div className="flex flex-col gap-5 px-6 pt-5 pb-6">
                <div className="flex flex-col gap-2.5">
                  <span className={LABEL_CLASS}>Date</span>
                  <DateStrip value={date} onChange={handleDateChange} />
                  <label className="flex items-center justify-between gap-3 pt-1 text-[13px] text-muted dark:text-muted-dark">
                    Or pick another date
                    <input
                      type="date"
                      value={date}
                      min={todayIso()}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className={`rounded-lg border border-rule bg-transparent px-2.5 py-1.5 font-mono text-[13px] text-ink dark:border-rule-dark dark:text-ink-dark ${FOCUS_RING}`}
                    />
                  </label>
                </div>

                <SlotPicker
                  providerId={provider.id}
                  serviceId={selectedService._id}
                  date={date}
                  selectedSlot={selectedSlot}
                  onSelectSlot={handleSelectSlot}
                  refreshToken={refreshToken}
                />

                {selectedSlot && (
                  <div className="flex flex-col gap-4 border-t border-rule-soft pt-4 dark:border-rule-soft-dark">
                    <div className="flex flex-col gap-2 text-[14.5px]">
                      <p className="text-muted dark:text-muted-dark">
                        Book <strong className="font-semibold text-ink dark:text-ink-dark">{selectedService.name}</strong>{" "}
                        with {provider.name}
                      </p>
                      <div className="flex items-baseline justify-between gap-3">
                        <span>{formatDateTime(selectedSlot.startTime)}</span>
                        <span className="font-mono">${selectedService.price}</span>
                      </div>
                      <div className="flex items-baseline justify-between gap-3 text-[13px] text-faint dark:text-faint-dark">
                        <span>{selectedService.durationMinutes} minutes</span>
                        <span>Shown in your local time</span>
                      </div>
                    </div>

                    {!user && (
                      <p className="rounded-lg bg-rule-soft px-4 py-3 text-sm text-muted dark:bg-rule-soft-dark dark:text-muted-dark">
                        <Link
                          to="/login"
                          state={{ from: location }}
                          className="font-semibold text-ink underline underline-offset-2 dark:text-ink-dark"
                        >
                          Log in
                        </Link>{" "}
                        to book this appointment.
                      </p>
                    )}
                    {user && user.role !== "customer" && (
                      <p className="rounded-lg bg-rule-soft px-4 py-3 text-sm text-muted dark:bg-rule-soft-dark dark:text-muted-dark">
                        Only customer accounts can book appointments.
                      </p>
                    )}
                    {user && user.role === "customer" && (
                      <>
                        {bookingError && (
                          <p
                            role="alert"
                            className="rounded-lg bg-danger-bg px-4 py-3 text-sm text-danger-text dark:bg-red-400/10 dark:text-red-300"
                          >
                            {bookingError}
                          </p>
                        )}
                        <button
                          type="button"
                          disabled={isBooking}
                          onClick={handleConfirmBooking}
                          className={`flex items-center justify-center gap-2 rounded-full bg-ink py-3.5 text-[15.5px] font-semibold text-ground transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-ink-dark dark:text-ground-dark ${FOCUS_RING}`}
                        >
                          {isBooking ? "Booking…" : "Confirm booking"}
                          {!isBooking && <ArrowRight />}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {confirmedSlot && (
                  <div
                    role="status"
                    className="flex items-start gap-3 rounded-xl bg-ok-bg p-4 text-ok-text dark:bg-emerald-400/12 dark:text-emerald-200"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ok-text text-white dark:bg-emerald-300 dark:text-[#16131c]">
                      <Check className="h-3 w-3" />
                    </span>
                    <div className="flex flex-col gap-1.5 text-sm">
                      <p>
                        <strong className="font-semibold">Booked!</strong> {selectedService.name} on{" "}
                        {formatDateTime(confirmedSlot.startTime)}.
                      </p>
                      <Link
                        to="/bookings"
                        className="inline-flex items-center gap-1.5 self-start font-semibold underline underline-offset-2"
                      >
                        View my bookings
                      </Link>
                    </div>
                  </div>
                )}

                <p className="flex items-start gap-2 border-t border-rule-soft pt-4 text-[12.8px] leading-normal text-faint dark:border-rule-soft-dark dark:text-faint-dark">
                  <Clock className="mt-0.5 h-[15px] w-[15px] shrink-0" />
                  Free to cancel up to 24 hours before. Later than that is recorded as a late cancellation.
                </p>
              </div>
            </div>
          </aside>
        )}

        <section className="flex flex-col gap-5 lg:col-span-7">
          <SectionHeading
            title="Reviews"
            aside={
              provider.avgRating !== null ? (
                <span className="text-[13.5px] text-faint dark:text-faint-dark">
                  <span className="text-star">★</span> {provider.avgRating.toFixed(1)} average · {provider.reviewCount} review
                  {provider.reviewCount === 1 ? "" : "s"}
                </span>
              ) : undefined
            }
          />
          {isLoadingReviews && <p className="text-sm text-faint dark:text-faint-dark">Loading…</p>}
          {reviewsError && <p className="text-sm text-danger-text dark:text-red-300">{reviewsError}</p>}
          {!isLoadingReviews && !reviewsError && reviews.length === 0 && (
            <p className="text-muted dark:text-muted-dark">No reviews yet.</p>
          )}
          {!isLoadingReviews && !reviewsError && reviews.length > 0 && (
            <ul className="flex flex-col divide-y divide-rule-soft dark:divide-rule-soft-dark">
              {reviews.map((review) => (
                <li key={review._id} className="flex flex-col gap-2 py-5 first:pt-1">
                  <p
                    className="text-sm tracking-[0.1em] text-star"
                    aria-label={`${review.rating} out of 5 stars`}
                  >
                    {formatStars(review.rating)}
                  </p>
                  {review.comment && (
                    <p className="max-w-[620px] text-[15.5px] leading-[1.65] text-ink/85 dark:text-ink-dark/85">
                      {review.comment}
                    </p>
                  )}
                  <p className="text-[13px] text-faint dark:text-faint-dark">
                    — {resolveReviewerName(review.customerId)}, {formatDate(review.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
