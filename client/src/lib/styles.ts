// Shared Tailwind class strings for the inner pages, so the dashboards,
// forms, and booking pages all draw from one set of styles.

export const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

/** Small uppercase label above a group of controls, e.g. "AVAILABLE TIMES". */
export const LABEL_CLASS = "text-[11.5px] font-bold tracking-[0.09em] uppercase text-faint dark:text-faint-dark";

export const FIELD_CLASS = `w-full rounded-lg border border-rule bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint dark:border-rule-dark dark:bg-surface-dark dark:text-ink-dark dark:placeholder:text-faint-dark ${FOCUS_RING}`;

export const SOLID_BUTTON = `inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-ground transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-ink-dark dark:text-ground-dark ${FOCUS_RING}`;

export const OUTLINE_BUTTON = `inline-flex items-center justify-center gap-1.5 rounded-full border border-[#ded8ce] px-4 py-2 text-[13.5px] font-medium text-muted transition-colors hover:border-ink/40 hover:text-ink disabled:opacity-50 dark:border-rule-dark dark:text-muted-dark dark:hover:border-ink-dark/40 dark:hover:text-ink-dark ${FOCUS_RING}`;

export const DANGER_BUTTON = `inline-flex items-center justify-center rounded-full bg-danger-text px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-red-400 dark:text-[#16131c] ${FOCUS_RING}`;

/** A quiet text-style action, e.g. "Edit" or "Remove" on a row. */
export const TEXT_BUTTON = `rounded text-[13.5px] font-medium text-muted underline-offset-2 transition-colors hover:text-ink hover:underline dark:text-muted-dark dark:hover:text-ink-dark ${FOCUS_RING}`;

export const CARD_CLASS = "rounded-[14px] border border-rule bg-surface dark:border-rule-dark dark:bg-surface-dark";
