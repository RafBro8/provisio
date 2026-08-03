import { useEffect, useState } from "react";
import { listMyBookings, cancelBooking, rescheduleBooking } from "../api/bookings";
import { createReview } from "../api/reviews";
import { ApiError } from "../api/client";
import { SlotPicker } from "../components/SlotPicker";
import { formatDateTime, todayIso } from "../lib/format";
import type { PopulatedAppointment, Slot, AppointmentStatus } from "../api/types";

function resolveRef(ref: string | { _id: string; name: string }): { id: string; name: string } {
  return typeof ref === "string" ? { id: ref, name: "Unknown" } : { id: ref._id, name: ref.name };
}

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  booked: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
};

type ExpandedPanel = "none" | "cancel" | "reschedule" | "review";

interface BookingRowProps {
  appointment: PopulatedAppointment;
  onChange: (updated: PopulatedAppointment) => void;
}

function BookingRow({ appointment, onChange }: BookingRowProps) {
  const [expanded, setExpanded] = useState<ExpandedPanel>("none");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState(todayIso());
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  const provider = resolveRef(appointment.providerId);

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

  return (
    <li className="rounded border border-slate-300 p-4 dark:border-slate-700">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">{appointment.serviceId.name}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">with {provider.name}</p>
          <p className="mt-1 text-sm">{formatDateTime(appointment.startTime)}</p>
          {appointment.status === "cancelled" && appointment.cancellationReason && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Reason: {appointment.cancellationReason}</p>
          )}
          {appointment.lateCancellation && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Cancelled inside the 24h window</p>
          )}
          {appointment.lateReschedule && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Rescheduled inside the 24h window</p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_STYLES[appointment.status]}`}
        >
          {appointment.status}
        </span>
      </div>

      {appointment.status === "booked" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => toggle("cancel")}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700"
          >
            {expanded === "cancel" ? "Never mind" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={() => toggle("reschedule")}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700"
          >
            {expanded === "reschedule" ? "Close" : "Reschedule"}
          </button>
        </div>
      )}

      {appointment.status === "completed" && !appointment.hasReview && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => toggle("review")}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700"
          >
            {expanded === "review" ? "Never mind" : "Leave a review"}
          </button>
        </div>
      )}
      {appointment.status === "completed" && appointment.hasReview && (
        <p className="mt-3 text-sm text-green-600 dark:text-green-400">✓ You reviewed this appointment</p>
      )}

      {actionError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{actionError}</p>}

      {expanded === "cancel" && (
        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
          <label className="flex flex-col gap-1 text-sm">
            Reason (optional)
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={2}
              className="rounded border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <button
            type="button"
            onClick={handleConfirmCancel}
            disabled={isSubmitting}
            className="mt-3 rounded bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {isSubmitting ? "Cancelling…" : "Confirm cancellation"}
          </button>
        </div>
      )}

      {expanded === "reschedule" && (
        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
          <input
            type="date"
            value={rescheduleDate}
            min={todayIso()}
            onChange={(e) => {
              setRescheduleDate(e.target.value);
              setSelectedSlot(null);
            }}
            className="rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <div className="mt-3">
            <SlotPicker
              providerId={provider.id}
              serviceId={appointment.serviceId._id}
              date={rescheduleDate}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
            />
          </div>
          {selectedSlot && (
            <button
              type="button"
              onClick={handleConfirmReschedule}
              disabled={isSubmitting}
              className="mt-3 rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
            >
              {isSubmitting ? "Rescheduling…" : `Move to ${formatDateTime(selectedSlot.startTime)}`}
            </button>
          )}
        </div>
      )}

      {expanded === "review" && (
        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
          <label className="flex w-fit flex-col gap-1 text-sm">
            Rating
            <select
              value={reviewRating}
              onChange={(e) => setReviewRating(Number(e.target.value))}
              className="rounded border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} star{n === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-2 flex flex-col gap-1 text-sm">
            Comment (optional)
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={2}
              className="rounded border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <button
            type="button"
            onClick={handleSubmitReview}
            disabled={isSubmitting}
            className="mt-3 rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
          >
            {isSubmitting ? "Submitting…" : "Submit review"}
          </button>
        </div>
      )}
    </li>
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

  return (
    <div>
      <h1 className="text-2xl font-semibold">My bookings</h1>
      {isLoading && <p className="mt-6 text-slate-500 dark:text-slate-400">Loading…</p>}
      {error && <p className="mt-6 text-red-600 dark:text-red-400">{error}</p>}
      {!isLoading && !error && appointments.length === 0 && (
        <p className="mt-6 text-slate-500 dark:text-slate-400">You don't have any bookings yet.</p>
      )}
      {!isLoading && !error && appointments.length > 0 && (
        <ul className="mt-6 flex flex-col gap-4">
          {appointments.map((appointment) => (
            <BookingRow key={appointment._id} appointment={appointment} onChange={handleChange} />
          ))}
        </ul>
      )}
    </div>
  );
}
