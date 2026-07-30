import { useEffect, useState } from "react";
import { listProviderBookings, cancelBooking, completeBooking } from "../../api/bookings";
import { ApiError } from "../../api/client";
import { formatDateTime } from "../../lib/format";
import type { PopulatedAppointment, AppointmentStatus } from "../../api/types";

function resolveRef(ref: string | { _id: string; name: string }): { id: string; name: string } {
  return typeof ref === "string" ? { id: ref, name: "Unknown" } : { id: ref._id, name: ref.name };
}

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  booked: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
};

interface RowProps {
  appointment: PopulatedAppointment;
  onChange: (updated: PopulatedAppointment) => void;
}

function BookingRow({ appointment, onChange }: RowProps) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customer = resolveRef(appointment.customerId);
  const isPast = new Date(appointment.endTime).getTime() <= Date.now();

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
    <li className="rounded border border-slate-300 p-4 dark:border-slate-700">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">{appointment.serviceId.name}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">with {customer.name}</p>
          <p className="mt-1 text-sm">{formatDateTime(appointment.startTime)}</p>
          {appointment.status === "cancelled" && appointment.cancellationReason && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Reason: {appointment.cancellationReason}</p>
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
            onClick={() => setCancelOpen((open) => !open)}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700"
          >
            {cancelOpen ? "Never mind" : "Cancel"}
          </button>
          {isPast && (
            <button
              type="button"
              onClick={handleComplete}
              disabled={isSubmitting}
              className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
            >
              Mark complete
            </button>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {cancelOpen && (
        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
          <label className="flex flex-col gap-1 text-sm">
            Reason (optional)
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="rounded border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="mt-3 rounded bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {isSubmitting ? "Cancelling…" : "Confirm cancellation"}
          </button>
        </div>
      )}
    </li>
  );
}

export function ProviderBookings() {
  const [appointments, setAppointments] = useState<PopulatedAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProviderBookings()
      .then((res) => setAppointments(res.appointments))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load your bookings"))
      .finally(() => setIsLoading(false));
  }, []);

  function handleChange(updated: PopulatedAppointment): void {
    setAppointments((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
  }

  return (
    <div>
      <h3 className="font-medium">Your bookings</h3>
      {isLoading && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Loading…</p>}
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {!isLoading && !error && appointments.length === 0 && (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No bookings yet.</p>
      )}
      {!isLoading && !error && appointments.length > 0 && (
        <ul className="mt-3 flex flex-col gap-3">
          {appointments.map((appointment) => (
            <BookingRow key={appointment._id} appointment={appointment} onChange={handleChange} />
          ))}
        </ul>
      )}
    </div>
  );
}
