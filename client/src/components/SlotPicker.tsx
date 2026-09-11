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

const LABEL_CLASS = "text-[11.5px] font-bold tracking-[0.09em] uppercase text-faint dark:text-faint-dark";

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

  let body;
  if (isLoading) {
    body = <p className="py-3 text-sm text-faint dark:text-faint-dark">Loading times…</p>;
  } else if (error) {
    body = <p className="py-3 text-sm text-danger-text dark:text-red-300">{error}</p>;
  } else if (slots.length === 0) {
    body = (
      <p className="rounded-lg border border-dashed border-rule px-4 py-5 text-center text-sm text-muted dark:border-rule-dark dark:text-muted-dark">
        No open times on this day.
      </p>
    );
  } else {
    // Only slot buttons carry aria-pressed on the booking page — the e2e
    // suite finds them with `main button[aria-pressed]`, so nothing else
    // there should use it.
    body = (
      <div role="group" aria-label="Available times" className="grid grid-cols-3 gap-2 font-mono sm:grid-cols-4">
        {slots.map((slot) => {
          const isSelected = selectedSlot?.startTime === slot.startTime;
          return (
            <button
              key={slot.startTime}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelectSlot(slot)}
              className={`rounded-lg border py-2.5 text-center text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                isSelected
                  ? "border-transparent bg-gradient-to-br from-brand via-[#6d3bf5] to-brand-2 font-medium text-white"
                  : "border-rule text-ink/85 hover:border-ink/50 hover:text-ink dark:border-[#372f47] dark:text-ink-dark/85 dark:hover:border-ink-dark/50 dark:hover:text-ink-dark"
              }`}
            >
              {formatTime(slot.startTime)}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <span className={LABEL_CLASS}>Available times</span>
        {!isLoading && !error && slots.length > 0 && (
          <span className="text-[12.5px] text-faint dark:text-faint-dark">{slots.length} open</span>
        )}
      </div>
      {body}
    </div>
  );
}
