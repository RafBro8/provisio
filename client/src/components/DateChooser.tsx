import { useId } from "react";
import { addDaysIso, dayParts, todayIso } from "../lib/format";

const DATE_STRIP_DAYS = 7;
const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

interface DateChooserProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

/**
 * The next week as a row of day chips — the common case is booking soon, and
 * this makes it one tap — plus a date input for anything further out.
 *
 * The chips are native radio inputs (visually hidden) rather than buttons:
 * arrow-key navigation comes for free, and it keeps the only
 * `button[aria-pressed]` elements on a page the time slots themselves, which
 * is how the e2e suite finds them. Each instance gets its own radio group
 * name, so two open at once (e.g. rescheduling two bookings) don't interfere.
 */
export function DateChooser({ value, onChange }: DateChooserProps) {
  const groupName = useId();
  const today = todayIso();
  const days = Array.from({ length: DATE_STRIP_DAYS }, (_, i) => addDaysIso(today, i));

  return (
    <div className="flex flex-col gap-2.5">
      <div role="radiogroup" aria-label="Date" className="grid grid-cols-7 gap-1.5">
        {days.map((iso) => {
          const { weekday, day, full } = dayParts(iso);
          return (
            // Styled from the label with :has(:checked) — a peer-* variant only
            // reaches the input's siblings, not the text nested inside them.
            <label key={iso} className="group cursor-pointer">
              <input
                type="radio"
                name={groupName}
                value={iso}
                aria-label={full}
                checked={value === iso}
                onChange={() => onChange(iso)}
                className="sr-only"
              />
              <span className="flex flex-col items-center gap-0.5 rounded-[10px] border border-rule py-2.5 transition-colors group-hover:border-ink/40 group-has-[:checked]:border-transparent group-has-[:checked]:bg-ink group-has-[:focus-visible]:outline-2 group-has-[:focus-visible]:outline-offset-2 group-has-[:focus-visible]:outline-brand dark:border-rule-dark dark:group-hover:border-ink-dark/40 dark:group-has-[:checked]:bg-ink-dark">
                <span className="text-[10.5px] tracking-[0.06em] uppercase text-faint group-has-[:checked]:text-[#b9b2c6] dark:text-faint-dark dark:group-has-[:checked]:text-[#857e93]">
                  {weekday}
                </span>
                <span className="font-mono text-[15px] text-ink/85 group-has-[:checked]:text-white dark:text-ink-dark/85 dark:group-has-[:checked]:text-ground-dark">
                  {day}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      <label className="flex items-center justify-between gap-3 pt-1 text-[13px] text-muted dark:text-muted-dark">
        Or pick another date
        <input
          type="date"
          value={value}
          min={today}
          onChange={(e) => onChange(e.target.value)}
          className={`rounded-lg border border-rule bg-transparent px-2.5 py-1.5 font-mono text-[13px] text-ink dark:border-rule-dark dark:text-ink-dark ${FOCUS_RING}`}
        />
      </label>
    </div>
  );
}
