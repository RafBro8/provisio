import { useState } from "react";
import { cancelBooking, completeBooking } from "../../api/bookings";
import { ApiError } from "../../api/client";
import { StatusBadge, LateBadge } from "../../components/StatusBadge";
import { DateBlock, ErrorNote, LoadingNote, SectionTitle } from "../../components/ui";
import { Check } from "../../components/icons";
import { DANGER_BUTTON, FIELD_CLASS, OUTLINE_BUTTON, SOLID_BUTTON } from "../../lib/styles";
import { formatDateTime } from "../../lib/format";
import type { PopulatedAppointment } from "../../api/types";

function resolveRef(ref: string | { _id: string; name: string }): { id: string; name: string } {
  return typeof ref === "string" ? { id: ref, name: "Unknown" } : { id: ref._id, name: ref.name };
}

type Variant = "upcoming" | "to-complete" | "earlier";

interface RowProps {
  appointment: PopulatedAppointment;
  onChange: (updated: PopulatedAppointment) => void;
  variant: Variant;
}

function BookingRow({ appointment, onChange, variant }: RowProps) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customer = resolveRef(appointment.customerId);
  const isEarlier = variant === "earlier";

  async function handleCancel(): Promise<void> {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await cancelBooking(appointment._id, reason.trim() || undefined);
      onChange({
        ...appointment,
        status: res.appointment.status,
        lateCancellation: res.appointment.lateCancellation,
        cancellationReason: res.appointment.cancellationReason,
      });
      setCancelOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't cancel this booking");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleComplete(): Promise<void> {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await completeBooking(appointment._id);
      onChange({ ...appointment, status: res.appointment.status });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't mark this booking complete");
    } finally {
      setIsSubmitting(false);
    }
  }

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

        <div className="flex min-w-0 flex-1 basis-40 flex-col gap-1">
          <span
            className={`font-semibold tracking-[-0.012em] ${isEarlier ? "text-[16.5px] text-ink/85 dark:text-ink-dark/85" : "text-lg"}`}
          >
            {appointment.serviceId.name}
          </span>
          <span
            className={`text-[14.5px] ${isEarlier ? "text-faint dark:text-faint-dark" : "text-muted dark:text-muted-dark"}`}
          >
            with {customer.name} · {appointment.serviceId.durationMinutes} minutes
            <span className="sr-only">, {formatDateTime(appointment.startTime)}</span>
          </span>
          {appointment.status === "cancelled" && appointment.cancellationReason && (
            <span className="text-[13.5px] text-faint italic dark:text-faint-dark">
              “{appointment.cancellationReason}”
            </span>
          )}
        </div>

        <div className={`flex flex-wrap items-center gap-2 ${isEarlier ? "sm:ml-auto" : ""}`}>
          <StatusBadge status={appointment.status} />
          {appointment.lateCancellation && <LateBadge>Inside the 24h window</LateBadge>}
          {appointment.lateReschedule && <LateBadge>Moved inside the 24h window</LateBadge>}
        </div>

        {!isEarlier && (
          <div className="flex items-center gap-3 sm:ml-auto">
            {variant === "to-complete" && (
              <button type="button" onClick={handleComplete} disabled={isSubmitting} className={SOLID_BUTTON}>
                <Check className="h-3.5 w-3.5" />
                Mark complete
              </button>
            )}
            {variant === "upcoming" && (
              <button type="button" onClick={() => setCancelOpen((open) => !open)} className={OUTLINE_BUTTON}>
                {cancelOpen ? "Never mind" : "Cancel"}
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      {cancelOpen && (
        <div className="mt-5 flex max-w-xl flex-col gap-4 border-t border-rule-soft pt-5 dark:border-rule-soft-dark">
          <p className="text-sm text-muted dark:text-muted-dark">
            {customer.name} will be notified. A reason helps them rebook.
          </p>
          <label className="flex flex-col gap-1.5 text-sm text-muted dark:text-muted-dark">
            Reason (optional)
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className={FIELD_CLASS} />
          </label>
          <button type="button" onClick={handleCancel} disabled={isSubmitting} className={`w-fit ${DANGER_BUTTON}`}>
            {isSubmitting ? "Cancelling…" : "Confirm cancellation"}
          </button>
        </div>
      )}
    </li>
  );
}

interface ProviderBookingsProps {
  appointments: PopulatedAppointment[];
  isLoading: boolean;
  error: string | null;
  onChange: (updated: PopulatedAppointment) => void;
}

export function ProviderBookings({ appointments, isLoading, error, onChange }: ProviderBookingsProps) {
  if (isLoading) return <LoadingNote />;
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (appointments.length === 0) {
    return (
      <div className="rounded-[14px] border border-dashed border-rule px-6 py-10 dark:border-rule-dark">
        <p className="font-display text-2xl">No bookings yet</p>
        <p className="mt-2 text-muted dark:text-muted-dark">
          Once customers book you, their sessions show up here. Check your Services and Availability tabs are set up.
        </p>
      </div>
    );
  }

  const now = Date.now();
  const startMs = (a: PopulatedAppointment) => new Date(a.startTime).getTime();
  const isPast = (a: PopulatedAppointment) => new Date(a.endTime).getTime() <= now;

  const toComplete = appointments
    .filter((a) => a.status === "booked" && isPast(a))
    .sort((a, b) => startMs(a) - startMs(b));
  const upcoming = appointments
    .filter((a) => a.status === "booked" && !isPast(a))
    .sort((a, b) => startMs(a) - startMs(b));
  const earlier = appointments.filter((a) => a.status !== "booked").sort((a, b) => startMs(b) - startMs(a));

  return (
    <div className="flex flex-col gap-14">
      {toComplete.length > 0 && (
        <section className="flex flex-col gap-4" aria-labelledby="to-complete-heading">
          <div className="flex flex-col gap-1">
            <SectionTitle id="to-complete-heading">Waiting to be marked complete</SectionTitle>
            <p className="text-sm text-muted dark:text-muted-dark">
              These have happened. Marking them complete lets the customer leave a review.
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {toComplete.map((a) => (
              <BookingRow key={a._id} appointment={a} onChange={onChange} variant="to-complete" />
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-4" aria-labelledby="provider-upcoming-heading">
        <SectionTitle id="provider-upcoming-heading">Upcoming</SectionTitle>
        {upcoming.length === 0 ? (
          <p className="text-muted dark:text-muted-dark">Nothing booked ahead right now.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {upcoming.map((a) => (
              <BookingRow key={a._id} appointment={a} onChange={onChange} variant="upcoming" />
            ))}
          </ul>
        )}
      </section>

      {earlier.length > 0 && (
        <section className="flex flex-col" aria-labelledby="provider-earlier-heading">
          <div className="border-b border-rule pb-3 dark:border-rule-dark">
            <SectionTitle id="provider-earlier-heading">Earlier</SectionTitle>
          </div>
          <ul className="flex flex-col">
            {earlier.map((a) => (
              <BookingRow key={a._id} appointment={a} onChange={onChange} variant="earlier" />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
