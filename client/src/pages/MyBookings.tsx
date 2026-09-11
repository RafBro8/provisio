import { useEffect, useId, useState } from "react";
import { Link } from "react-router";
import { listMyBookings, cancelBooking, rescheduleBooking } from "../api/bookings";
import { createReview } from "../api/reviews";
import { ApiError } from "../api/client";
import { SlotPicker } from "../components/SlotPicker";
import { DateChooser } from "../components/DateChooser";
import { StatusBadge, LateBadge } from "../components/StatusBadge";
import { ArrowRight, Check } from "../components/icons";
import { formatDateTime, formatTime, todayIso } from "../lib/format";
import type { PopulatedAppointment, Slot } from "../api/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
const LABEL_CLASS = "text-[11.5px] font-bold tracking-[0.09em] uppercase text-faint dark:text-faint-dark";
const FIELD_CLASS = `w-full rounded-lg border border-rule bg-transparent px-3 py-2 text-sm text-ink dark:border-rule-dark dark:text-ink-dark ${FOCUS_RING}`;
const OUTLINE_BUTTON = `rounded-full border border-[#ded8ce] px-4 py-2 text-[13.5px] font-medium text-muted transition-colors hover:border-ink/40 hover:text-ink dark:border-rule-dark dark:text-muted-dark dark:hover:border-ink-dark/40 dark:hover:text-ink-dark ${FOCUS_RING}`;
const SOLID_BUTTON = `inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-ground transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-ink-dark dark:text-ground-dark ${FOCUS_RING}`;

function resolveRef(ref: string | { _id: string; name: string }): {
  id: string;
  name: string;
} {
  return typeof ref === "string" ? { id: ref, name: "Unknown" } : { id: ref._id, name: ref.name };
}

function isUpcoming(appointment: PopulatedAppointment, now: number): boolean {
  return appointment.status === "booked" && new Date(appointment.endTime).getTime() > now;
}

function startsWithin24h(appointment: PopulatedAppointment): boolean {
  return new Date(appointment.startTime).getTime() - Date.now() < DAY_MS;
}

/**
 * The calendar-page block on the left of each row. Decorative — the full
 * date and time are in the row's text for screen readers.
 */
function DateBlock({ iso, muted }: { iso: string; muted?: boolean }) {
  const date = new Date(iso);
  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 flex-col items-center gap-0.5 whitespace-nowrap ${muted ? "w-14 sm:w-[74px]" : "w-[84px] border-r border-rule-soft pr-5 dark:border-rule-soft-dark"}`}
    >
      <span
        className={`text-[11.5px] font-semibold tracking-[0.08em] uppercase ${muted ? "text-faint/80 dark:text-faint-dark" : "text-faint dark:text-faint-dark"}`}
      >
        {date.toLocaleDateString(undefined, muted ? { month: "short" } : { weekday: "short" })}
      </span>
      <span
        className={`font-display leading-none ${muted ? "text-[1.75rem] text-muted/80 dark:text-muted-dark" : "text-[2.1rem]"}`}
      >
        {date.getDate()}
      </span>
      {!muted && <span className="font-mono text-[11.5px] text-muted dark:text-muted-dark">{formatTime(iso)}</span>}
    </div>
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (rating: number) => void }) {
  const groupName = useId();
  return (
    <div role="radiogroup" aria-label="Rating" className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <label key={n} className="group cursor-pointer">
          <input
            type="radio"
            name={groupName}
            value={n}
            checked={value === n}
            onChange={() => onChange(n)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            className="sr-only"
          />
          <span
            className={`block rounded text-[1.6rem] leading-none transition-colors group-has-[:focus-visible]:outline-2 group-has-[:focus-visible]:outline-offset-2 group-has-[:focus-visible]:outline-brand ${
              n <= value ? "text-star" : "text-rule dark:text-rule-dark"
            }`}
          >
            ★
          </span>
        </label>
      ))}
    </div>
  );
}

type ExpandedPanel = "none" | "cancel" | "reschedule" | "review";

interface BookingRowProps {
  appointment: PopulatedAppointment;
  onChange: (updated: PopulatedAppointment) => void;
  variant: "upcoming" | "earlier";
}

function BookingRow({ appointment, onChange, variant }: BookingRowProps) {
  const [expanded, setExpanded] = useState<ExpandedPanel>("none");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState(todayIso());
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  const provider = resolveRef(appointment.providerId);
  const service = appointment.serviceId;
  const isEarlier = variant === "earlier";

  function toggle(panel: ExpandedPanel): void {
    setActionError(null);
    setExpanded((current) => (current === panel ? "none" : panel));
  }

  async function handleConfirmCancel(): Promise<void> {
    setActionError(null);
    setIsSubmitting(true);
    try {
      const res = await cancelBooking(appointment._id, cancelReason.trim() || undefined);
      onChange({
        ...appointment,
        status: res.appointment.status,
        lateCancellation: res.appointment.lateCancellation,
        cancellationReason: res.appointment.cancellationReason,
      });
      setExpanded("none");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't cancel this booking");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmReschedule(): Promise<void> {
    if (!selectedSlot) return;
    setActionError(null);
    setIsSubmitting(true);
    try {
      const res = await rescheduleBooking(appointment._id, selectedSlot.startTime);
      onChange({
        ...appointment,
        startTime: res.appointment.startTime,
        endTime: res.appointment.endTime,
        lateReschedule: res.appointment.lateReschedule,
      });
      setExpanded("none");
      setSelectedSlot(null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't reschedule this booking");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmitReview(): Promise<void> {
    setActionError(null);
    setIsSubmitting(true);
    try {
      await createReview({
        appointmentId: appointment._id,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });
      onChange({ ...appointment, hasReview: true });
      setExpanded("none");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't submit your review");
    } finally {
      setIsSubmitting(false);
    }
  }

  const canChange = appointment.status === "booked" && !isEarlier;
  const canReview = appointment.status === "completed" && !appointment.hasReview;

  return (
    <li
      className={
        isEarlier
          ? "border-b border-rule-soft py-5 dark:border-rule-soft-dark"
          : "rounded-[14px] border border-rule bg-surface px-5 py-5 sm:px-6 dark:border-rule-dark dark:bg-surface-dark"
      }
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <DateBlock iso={appointment.startTime} muted={isEarlier} />

        <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
          <span
            className={`font-semibold tracking-[-0.012em] ${isEarlier ? "text-[16.5px] text-ink/85 dark:text-ink-dark/85" : "text-lg"}`}
          >
            {service.name}
          </span>
          <span
            className={`text-[14.5px] ${isEarlier ? "text-faint dark:text-faint-dark" : "text-muted dark:text-muted-dark"}`}
          >
            with {provider.name} · {service.durationMinutes} minutes
            <span className="sr-only">, {formatDateTime(appointment.startTime)}</span>
          </span>
          {appointment.status === "cancelled" && appointment.cancellationReason && (
            <span className="text-[13.5px] text-faint italic dark:text-faint-dark">
              “{appointment.cancellationReason}”
            </span>
          )}
          {isEarlier && appointment.status === "booked" && (
            <span className="text-[13px] text-faint dark:text-faint-dark">
              Waiting for {provider.name} to mark it complete
            </span>
          )}
        </div>

        <div className={`flex flex-wrap items-center gap-2 ${isEarlier ? "sm:ml-auto" : ""}`}>
          <StatusBadge status={appointment.status} />
          {appointment.lateCancellation && <LateBadge>Inside the 24h window</LateBadge>}
          {appointment.lateReschedule && <LateBadge>Moved inside the 24h window</LateBadge>}
        </div>

        {/* Rendered only when it has something in it, so an empty slot
            doesn't push the badges in from the right edge. */}
        {(!isEarlier || canReview || appointment.hasReview) && (
          <div className={`flex items-center gap-3 ${isEarlier ? "" : "sm:ml-auto"}`}>
            {!isEarlier && (
              <span className="font-mono text-[15px] text-ink/85 dark:text-ink-dark/85">${service.price}</span>
            )}
            {canChange && (
              <>
                <button type="button" onClick={() => toggle("reschedule")} className={OUTLINE_BUTTON}>
                  {expanded === "reschedule" ? "Close" : "Reschedule"}
                </button>
                <button type="button" onClick={() => toggle("cancel")} className={OUTLINE_BUTTON}>
                  {expanded === "cancel" ? "Never mind" : "Cancel"}
                </button>
              </>
            )}
            {canReview && (
              <button type="button" onClick={() => toggle("review")} className={OUTLINE_BUTTON}>
                {expanded === "review" ? "Never mind" : "Leave a review"}
              </button>
            )}
            {appointment.status === "completed" && appointment.hasReview && (
              <span className="inline-flex items-center gap-1.5 text-[13.5px] text-ok-text dark:text-emerald-300">
                <Check className="h-3.5 w-3.5" />
                Reviewed
              </span>
            )}
          </div>
        )}
      </div>

      {actionError && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-danger-bg px-4 py-3 text-sm text-danger-text dark:bg-red-400/10 dark:text-red-300"
        >
          {actionError}
        </p>
      )}

      {expanded === "cancel" && (
        <div className="mt-5 flex max-w-xl flex-col gap-4 border-t border-rule-soft pt-5 dark:border-rule-soft-dark">
          {startsWithin24h(appointment) && (
            <p className="rounded-lg bg-warn-bg px-4 py-3 text-sm text-warn-text dark:bg-amber-400/10 dark:text-amber-300">
              This starts within 24 hours, so cancelling now is recorded as a late cancellation.
            </p>
          )}
          <label className="flex flex-col gap-1.5 text-sm text-muted dark:text-muted-dark">
            Reason (optional)
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={2}
              className={FIELD_CLASS}
            />
          </label>
          <button
            type="button"
            onClick={handleConfirmCancel}
            disabled={isSubmitting}
            className={`w-fit rounded-full bg-danger-text px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-red-400 dark:text-[#16131c] ${FOCUS_RING}`}
          >
            {isSubmitting ? "Cancelling…" : "Confirm cancellation"}
          </button>
        </div>
      )}

      {expanded === "reschedule" && (
        <div className="mt-5 flex max-w-xl flex-col gap-5 border-t border-rule-soft pt-5 dark:border-rule-soft-dark">
          {startsWithin24h(appointment) && (
            <p className="rounded-lg bg-warn-bg px-4 py-3 text-sm text-warn-text dark:bg-amber-400/10 dark:text-amber-300">
              This starts within 24 hours, so moving it now is recorded as a late reschedule.
            </p>
          )}
          <div className="flex flex-col gap-2.5">
            <span className={LABEL_CLASS}>New date</span>
            <DateChooser
              value={rescheduleDate}
              onChange={(date) => {
                setRescheduleDate(date);
                setSelectedSlot(null);
              }}
            />
          </div>
          <SlotPicker
            providerId={provider.id}
            serviceId={service._id}
            date={rescheduleDate}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
          />
          {selectedSlot && (
            <button
              type="button"
              onClick={handleConfirmReschedule}
              disabled={isSubmitting}
              className={`w-fit ${SOLID_BUTTON}`}
            >
              {isSubmitting ? "Rescheduling…" : `Move to ${formatDateTime(selectedSlot.startTime)}`}
              {!isSubmitting && <ArrowRight />}
            </button>
          )}
        </div>
      )}

      {expanded === "review" && (
        <div className="mt-5 flex max-w-xl flex-col gap-4 border-t border-rule-soft pt-5 dark:border-rule-soft-dark">
          <div className="flex flex-col gap-2">
            <span className={LABEL_CLASS}>Your rating</span>
            <StarRating value={reviewRating} onChange={setReviewRating} />
          </div>
          <label className="flex flex-col gap-1.5 text-sm text-muted dark:text-muted-dark">
            Comment (optional)
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={3}
              className={FIELD_CLASS}
            />
          </label>
          <button
            type="button"
            onClick={handleSubmitReview}
            disabled={isSubmitting}
            className={`w-fit ${SOLID_BUTTON}`}
          >
            {isSubmitting ? "Submitting…" : "Submit review"}
          </button>
        </div>
      )}
    </li>
  );
}

function LoadingSkeleton() {
  return (
    <div aria-busy="true" className="flex animate-pulse flex-col gap-3">
      <span className="sr-only">Loading…</span>
      {[0, 1].map((i) => (
        <div
          key={i}
          className="h-[102px] rounded-[14px] border border-rule bg-surface dark:border-rule-dark dark:bg-surface-dark"
        />
      ))}
    </div>
  );
}

export function MyBookings() {
  const [appointments, setAppointments] = useState<PopulatedAppointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    listMyBookings()
      .then((res) => setAppointments(res.appointments))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load your bookings"))
      .finally(() => setIsLoading(false));
  }, []);

  function handleChange(updated: PopulatedAppointment): void {
    setAppointments((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
  }

  // Both lists stay on one page rather than behind Upcoming/Past tabs: a
  // booking you cancel moves down to "Earlier" and stays in view, so you can
  // see what was recorded.
  const now = Date.now();
  const byStart = (a: PopulatedAppointment, b: PopulatedAppointment) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  const upcoming = appointments.filter((a) => isUpcoming(a, now)).sort(byStart);
  const earlier = appointments.filter((a) => !isUpcoming(a, now)).sort((a, b) => byStart(b, a));

  return (
    <div className="flex flex-col">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-[2.75rem] leading-[1.05] tracking-[-0.02em] sm:text-[3.25rem]">
            My bookings
          </h1>
          <p className="max-w-xl text-[17px] leading-relaxed text-muted dark:text-muted-dark">
            Upcoming and past sessions, with the cancellation policy applied the same way every time.
          </p>
        </div>
        <Link to="/providers" className={`w-fit ${SOLID_BUTTON}`}>
          Book a session
          <ArrowRight />
        </Link>
      </header>

      <div className="mt-10">
        {isLoading && <LoadingSkeleton />}
        {error && (
          <p role="alert" className="text-danger-text dark:text-red-300">
            {error}
          </p>
        )}

        {!isLoading && !error && appointments.length === 0 && (
          <div className="flex flex-col items-start gap-3 rounded-[14px] border border-dashed border-rule px-6 py-10 dark:border-rule-dark">
            <p className="font-display text-2xl">No bookings yet</p>
            <p className="text-muted dark:text-muted-dark">When you book a session, it shows up here.</p>
            <Link
              to="/providers"
              className="mt-1 border-b border-rule pb-0.5 text-sm font-medium transition-colors hover:border-ink dark:border-rule-dark dark:hover:border-ink-dark"
            >
              Find a provider
            </Link>
          </div>
        )}

        {!isLoading && !error && appointments.length > 0 && (
          <div className="flex flex-col gap-14">
            <section className="flex flex-col gap-4" aria-labelledby="upcoming-heading">
              <h2 id="upcoming-heading" className="font-display text-[1.65rem] tracking-[-0.015em]">
                Upcoming
              </h2>
              {upcoming.length === 0 ? (
                <p className="text-muted dark:text-muted-dark">
                  Nothing coming up.{" "}
                  <Link
                    to="/providers"
                    className="font-medium text-ink underline underline-offset-2 dark:text-ink-dark"
                  >
                    Book a session
                  </Link>
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {upcoming.map((appointment) => (
                    <BookingRow
                      key={appointment._id}
                      appointment={appointment}
                      onChange={handleChange}
                      variant="upcoming"
                    />
                  ))}
                </ul>
              )}
            </section>

            {earlier.length > 0 && (
              <section className="flex flex-col" aria-labelledby="earlier-heading">
                <h2
                  id="earlier-heading"
                  className="border-b border-rule pb-3 font-display text-[1.65rem] tracking-[-0.015em] dark:border-rule-dark"
                >
                  Earlier
                </h2>
                <ul className="flex flex-col">
                  {earlier.map((appointment) => (
                    <BookingRow
                      key={appointment._id}
                      appointment={appointment}
                      onChange={handleChange}
                      variant="earlier"
                    />
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
