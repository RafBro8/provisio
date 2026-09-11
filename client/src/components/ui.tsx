import type { ReactNode } from "react";
import { formatTime } from "../lib/format";
import { CARD_CLASS, FOCUS_RING } from "../lib/styles";

// Shared building blocks for the inner pages: headers, tabs, stat tiles.

export function PageHeader({ title, intro, aside }: { title: string; intro?: ReactNode; aside?: ReactNode }) {
  return (
    <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-[2.75rem] leading-[1.05] tracking-[-0.02em] sm:text-[3.25rem]">{title}</h1>
        {intro && <p className="max-w-xl text-[17px] leading-relaxed text-muted dark:text-muted-dark">{intro}</p>}
      </div>
      {aside}
    </header>
  );
}

export function SectionTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="font-display text-[1.65rem] tracking-[-0.015em]">
      {children}
    </h2>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-lg bg-danger-bg px-4 py-3 text-sm text-danger-text dark:bg-red-400/10 dark:text-red-300"
    >
      {children}
    </p>
  );
}

export function LoadingNote() {
  return <p className="text-sm text-faint dark:text-faint-dark">Loading…</p>;
}

interface TabsProps<T extends string> {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
  label: string;
}

/**
 * The dashboard section switcher. Plain buttons (the e2e suite clicks them by
 * name) marked with aria-current rather than aria-pressed, which is reserved
 * for booking-page time slots.
 */
export function Tabs<T extends string>({ tabs, active, onChange, label }: TabsProps<T>) {
  return (
    <nav
      aria-label={label}
      className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-rule-soft p-1 dark:bg-rule-soft-dark"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          aria-current={active === tab.id ? "true" : undefined}
          onClick={() => onChange(tab.id)}
          className={`shrink-0 rounded-full px-4 py-2 text-[13.5px] font-medium transition-colors ${FOCUS_RING} ${
            active === tab.id
              ? "bg-surface text-ink shadow-[0_1px_3px_rgba(34,31,43,0.12)] dark:bg-surface-dark dark:text-ink-dark"
              : "text-muted hover:text-ink dark:text-muted-dark dark:hover:text-ink-dark"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

/** A headline number: sentence-case label, then the value. No colour — the label says what it is. */
export function StatTile({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <div className={`${CARD_CLASS} flex flex-col gap-1.5 px-5 py-4`}>
      <span className="text-[13px] text-muted dark:text-muted-dark">{label}</span>
      <span className="text-[1.75rem] leading-tight font-semibold tracking-[-0.02em] tabular-nums">{value}</span>
      {detail && <span className="text-[12.5px] text-faint dark:text-faint-dark">{detail}</span>}
    </div>
  );
}

/**
 * The calendar-page block on the left of a booking row. Decorative — the
 * full date and time are in the row's text for screen readers.
 */
export function DateBlock({ iso, muted }: { iso: string; muted?: boolean }) {
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
