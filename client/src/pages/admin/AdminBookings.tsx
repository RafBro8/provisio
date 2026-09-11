import { useState } from "react";
import { cancelBooking } from "../../api/bookings";
import { ApiError } from "../../api/client";
import { StatusBadge, LateBadge } from "../../components/StatusBadge";
import { ErrorNote, LoadingNote } from "../../components/ui";
import { CARD_CLASS, DANGER_BUTTON, FIELD_CLASS, OUTLINE_BUTTON } from "../../lib/styles";
import { formatDateTime } from "../../lib/format";
import type { AppointmentStatus, PopulatedAppointment } from "../../api/types";

type Filter = "all" | AppointmentStatus;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "booked", label: "Booked" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

function resolveName(ref: string | { _id: string; name: string }): string {
  return typeof ref === "string" ? "Unknown" : ref.name;
}

interface RowProps {
  appointment: PopulatedAppointment;
  onChange: (updated: PopulatedAppointment) => void;
}

function BookingRow({ appointment, onChange }: RowProps) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <li className="px-5 py-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <span className="w-44 shrink-0 font-mono text-[13px] text-muted dark:text-muted-dark">
          {formatDateTime(appointment.startTime)}
        </span>
        <div className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
          <span className="font-semibold">{appointment.serviceId.name}</span>
          <span className="text-[14px] text-muted dark:text-muted-dark">
            {resolveName(appointment.customerId)} with {resolveName(appointment.providerId)}
          </span>
          {appointment.status === "cancelled" && appointment.cancellationReason && (
            <span className="text-[13px] text-faint italic dark:text-faint-dark">
              “{appointment.cancellationReason}”
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={appointment.status} />
          {appointment.lateCancellation && <LateBadge>Inside the 24h window</LateBadge>}
        </div>
        {appointment.status === "booked" && (
          <button
            type="button"
            onClick={() => setCancelOpen((open) => !open)}
            className={`sm:ml-auto ${OUTLINE_BUTTON}`}
          >
            {cancelOpen ? "Never mind" : "Cancel (admin override)"}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      {cancelOpen && (
        <div className="mt-4 flex max-w-xl flex-col gap-3 border-t border-rule-soft pt-4 dark:border-rule-soft-dark">
          <p className="text-sm text-muted dark:text-muted-dark">
            Both the customer and the provider are notified. The 24-hour rule still applies to the record.
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

interface AdminBookingsProps {
  appointments: PopulatedAppointment[];
  isLoading: boolean;
  error: string | null;
  onChange: (updated: PopulatedAppointment) => void;
}

export function AdminBookings({ appointments, isLoading, error, onChange }: AdminBookingsProps) {
  const [filter, setFilter] = useState<Filter>("all");

  if (isLoading) return <LoadingNote />;
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (appointments.length === 0) {
    return <p className="text-muted dark:text-muted-dark">No bookings on the platform yet.</p>;
  }

  const visible = appointments
    .filter((a) => filter === "all" || a.status === filter)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div role="radiogroup" aria-label="Filter by status" className="flex flex-wrap gap-2">
          {FILTERS.map(({ id, label }) => (
            <label key={id} className="group cursor-pointer">
              <input
                type="radio"
                name="admin-booking-filter"
                value={id}
                checked={filter === id}
                onChange={() => setFilter(id)}
                className="sr-only"
              />
              <span className="block rounded-full border border-[#ded8ce] px-[15px] py-2 text-[13.5px] font-medium text-muted transition-colors group-hover:border-ink/40 group-has-[:checked]:border-transparent group-has-[:checked]:bg-ink group-has-[:checked]:font-semibold group-has-[:checked]:text-ground group-has-[:focus-visible]:outline-2 group-has-[:focus-visible]:outline-offset-2 group-has-[:focus-visible]:outline-brand dark:border-rule-dark dark:text-muted-dark dark:group-hover:border-ink-dark/40 dark:group-has-[:checked]:bg-ink-dark dark:group-has-[:checked]:text-ground-dark">
                {label}
              </span>
            </label>
          ))}
        </div>
        <span aria-live="polite" className="ml-auto text-[13.5px] text-faint dark:text-faint-dark">
          {visible.length} booking{visible.length === 1 ? "" : "s"}
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="text-muted dark:text-muted-dark">Nothing matches this filter.</p>
      ) : (
        <ul className={`${CARD_CLASS} flex flex-col divide-y divide-rule-soft dark:divide-rule-soft-dark`}>
          {visible.map((appointment) => (
            <BookingRow key={appointment._id} appointment={appointment} onChange={onChange} />
          ))}
        </ul>
      )}
    </div>
  );
}
