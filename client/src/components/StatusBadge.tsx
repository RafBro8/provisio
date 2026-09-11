import type { ReactNode } from "react";
import type { AppointmentStatus } from "../api/types";

const BASE = "inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-[12.5px] leading-none";

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  booked: "bg-ok-bg text-ok-text dark:bg-emerald-400/12 dark:text-emerald-300",
  completed: "bg-neutral-bg text-muted dark:bg-white/8 dark:text-muted-dark",
  cancelled: "bg-warn-bg text-warn-text dark:bg-amber-400/12 dark:text-amber-300",
};

/**
 * An appointment's status as a coloured pill. The DOM text stays the raw
 * lowercase status ("booked") and is capitalised with CSS only — the e2e
 * suite matches on that exact text.
 */
export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return <span className={`${BASE} font-semibold capitalize ${STATUS_STYLES[status]}`}>{status}</span>;
}

/** The one red badge: a late cancellation or reschedule, the only state with consequences. */
export function LateBadge({ children }: { children: ReactNode }) {
  return (
    <span className={`${BASE} font-medium bg-danger-bg text-danger-text dark:bg-red-400/12 dark:text-red-300`}>
      {children}
    </span>
  );
}
