import { useEffect, useState } from "react";
import { getAvailability } from "../api/providers";
import { ApiError } from "../api/client";
import type { Slot } from "../api/types";
import { formatTime } from "../lib/format";

interface SlotPickerProps {
  providerId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
  selectedSlot: Slot | null;
  onSelectSlot: (slot: Slot) => void;
  /** Bump this after a booking mutation to force a refetch of availability. */
  refreshToken?: number;
}

export function SlotPicker({ providerId, serviceId, date, selectedSlot, onSelectSlot, refreshToken }: SlotPickerProps) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getAvailability(providerId, serviceId, date)
      .then((res) => {
        if (!cancelled) setSlots(res.slots);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Couldn't load availability");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [providerId, serviceId, date, refreshToken]);

  if (isLoading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Loading times…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }
  if (slots.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No open times on this day.</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {slots.map((slot) => {
        const isSelected = selectedSlot?.startTime === slot.startTime;
        return (
          <button
            key={slot.startTime}
            type="button"
            onClick={() => onSelectSlot(slot)}
            className={`rounded border px-3 py-2 text-sm ${
              isSelected
                ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                : "border-slate-300 hover:border-slate-500 dark:border-slate-700 dark:hover:border-slate-500"
            }`}
          >
            {formatTime(slot.startTime)}
          </button>
        );
      })}
    </div>
  );
}
