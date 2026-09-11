import { useEffect, useState } from "react";
import { getMyProfile, updateMyProfile } from "../../api/providers";
import { ApiError } from "../../api/client";
import { browserTimeZone, todayIso } from "../../lib/format";
import { CARD_CLASS, FIELD_CLASS, FOCUS_RING, SOLID_BUTTON, TEXT_BUTTON } from "../../lib/styles";
import { ErrorNote, LoadingNote } from "../../components/ui";
import { Check } from "../../components/icons";
import type { ProviderProfile, WorkingHoursBlock, TimeOffBlock } from "../../api/types";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// Every zone the browser knows, plus UTC (which some browsers leave out).
const TIME_ZONES = ["UTC", ...Intl.supportedValuesOf("timeZone").filter((zone) => zone !== "UTC")];

const FIELD_LABEL = "flex flex-col gap-1.5 text-[13px] text-muted dark:text-muted-dark";
const COMPACT_FIELD = `rounded-lg border border-rule bg-surface px-2.5 py-2 text-sm text-ink dark:border-rule-dark dark:bg-surface-dark dark:text-ink-dark ${FOCUS_RING}`;

function timeZoneHint(saved: string | undefined, current: string): string {
  const browser = browserTimeZone();
  if (!saved) return "Filled in from your browser. Your working hours are read in this time zone once you save.";
  if (current.trim() !== browser)
    return `Your working hours are read in this time zone. Your browser is on ${browser}.`;
  return "Your working hours are read in this time zone.";
}

export function ProviderAvailability() {
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [bio, setBio] = useState("");
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const [timezone, setTimezone] = useState("");
  const [workingHours, setWorkingHours] = useState<WorkingHoursBlock[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOffBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    getMyProfile()
      .then((res) => {
        setProfile(res.profile);
        setBio(res.profile.bio ?? "");
        setBufferMinutes(res.profile.bufferMinutes);
        // Providers who never picked one start from where their browser is;
        // saving the form stores it.
        setTimezone(res.profile.timezone ?? browserTimeZone());
        setWorkingHours(res.profile.workingHours);
        setTimeOff(
          res.profile.timeOff.map((t) => ({
            ...t,
            startDate: t.startDate.slice(0, 10),
            endDate: t.endDate.slice(0, 10),
          })),
        );
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : "Couldn't load your profile"))
      .finally(() => setIsLoading(false));
  }, []);

  function addWorkingHoursBlock(): void {
    setWorkingHours((prev) => [...prev, { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }]);
  }

  function updateWorkingHoursBlock(index: number, patch: Partial<WorkingHoursBlock>): void {
    setWorkingHours((prev) => prev.map((block, i) => (i === index ? { ...block, ...patch } : block)));
  }

  function removeWorkingHoursBlock(index: number): void {
    setWorkingHours((prev) => prev.filter((_, i) => i !== index));
  }

  function addTimeOffBlock(): void {
    const today = todayIso();
    setTimeOff((prev) => [...prev, { startDate: today, endDate: today, reason: "" }]);
  }

  function updateTimeOffBlock(index: number, patch: Partial<TimeOffBlock>): void {
    setTimeOff((prev) => prev.map((block, i) => (i === index ? { ...block, ...patch } : block)));
  }

  function removeTimeOffBlock(index: number): void {
    setTimeOff((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave(): Promise<void> {
    setIsSaving(true);
    setSaveError(null);
    setSavedMessage(null);
    try {
      const res = await updateMyProfile({ bio, bufferMinutes, workingHours, timeOff, timezone: timezone.trim() });
      setProfile(res.profile);
      setSavedMessage("Saved.");
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Couldn't save changes");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <LoadingNote />;
  if (loadError) return <ErrorNote>{loadError}</ErrorNote>;
  if (!profile) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`${CARD_CLASS} flex flex-col gap-4 px-5 py-5 sm:px-6`} aria-labelledby="profile-heading">
          <h3 id="profile-heading" className="font-display text-[1.4rem] tracking-[-0.01em]">
            Profile
          </h3>
          <label className={FIELD_LABEL}>
            Bio
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="What you do and who you help — shown on your public page."
              className={FIELD_CLASS}
            />
          </label>
          <label className={`${FIELD_LABEL} max-w-xs`}>
            Buffer time between appointments (minutes)
            <input
              type="number"
              min={0}
              value={bufferMinutes}
              onChange={(e) => setBufferMinutes(Number(e.target.value))}
              className={`${FIELD_CLASS} font-mono`}
            />
          </label>
        </section>

        <section className={`${CARD_CLASS} flex flex-col gap-4 px-5 py-5 sm:px-6`} aria-labelledby="timezone-heading">
          <h3 id="timezone-heading" className="font-display text-[1.4rem] tracking-[-0.01em]">
            Time zone
          </h3>
          {/* A text input with suggestions rather than a <select>: there are
              hundreds of zones, and typing a city is quicker than scrolling. */}
          <label className={FIELD_LABEL}>
            Time zone
            <input
              list="provisio-time-zones"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className={`${FIELD_CLASS} font-mono`}
            />
          </label>
          <datalist id="provisio-time-zones">
            {TIME_ZONES.map((zone) => (
              <option key={zone} value={zone} />
            ))}
          </datalist>
          <p className="text-[13px] leading-relaxed text-faint dark:text-faint-dark">
            {timeZoneHint(profile.timezone, timezone)} Customers always see times on their own clock.
          </p>
        </section>
      </div>

      <section className={`${CARD_CLASS} flex flex-col gap-4 px-5 py-5 sm:px-6`} aria-labelledby="hours-heading">
        <div className="flex flex-col gap-1">
          <h3 id="hours-heading" className="font-display text-[1.4rem] tracking-[-0.01em]">
            Weekly hours
          </h3>
          <p className="text-[13.5px] text-muted dark:text-muted-dark">
            Add a block for each stretch you work. Two blocks on one day leave a gap, like lunch.
          </p>
        </div>
        {workingHours.length === 0 ? (
          <p className="rounded-lg border border-dashed border-rule px-4 py-4 text-sm text-muted dark:border-rule-dark dark:text-muted-dark">
            No working hours set yet, so customers won't see any open times.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-rule-soft dark:divide-rule-soft-dark">
            {workingHours.map((block, index) => (
              <div key={index} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <select
                  value={block.dayOfWeek}
                  onChange={(e) => updateWorkingHoursBlock(index, { dayOfWeek: Number(e.target.value) })}
                  aria-label="Day"
                  className={`${COMPACT_FIELD} w-36`}
                >
                  {DAY_NAMES.map((name, dayIndex) => (
                    <option key={dayIndex} value={dayIndex}>
                      {name}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={block.startTime}
                  onChange={(e) => updateWorkingHoursBlock(index, { startTime: e.target.value })}
                  aria-label="From"
                  className={`${COMPACT_FIELD} font-mono`}
                />
                <span className="text-sm text-faint dark:text-faint-dark">to</span>
                <input
                  type="time"
                  value={block.endTime}
                  onChange={(e) => updateWorkingHoursBlock(index, { endTime: e.target.value })}
                  aria-label="To"
                  className={`${COMPACT_FIELD} font-mono`}
                />
                <button
                  type="button"
                  onClick={() => removeWorkingHoursBlock(index)}
                  className={`ml-auto ${TEXT_BUTTON}`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={addWorkingHoursBlock}
          className={`w-fit ${TEXT_BUTTON} text-ink dark:text-ink-dark`}
        >
          + Add working hours block
        </button>
      </section>

      <section className={`${CARD_CLASS} flex flex-col gap-4 px-5 py-5 sm:px-6`} aria-labelledby="timeoff-heading">
        <div className="flex flex-col gap-1">
          <h3 id="timeoff-heading" className="font-display text-[1.4rem] tracking-[-0.01em]">
            Time off
          </h3>
          <p className="text-[13.5px] text-muted dark:text-muted-dark">
            Whole days you're away. No times are offered on them, whatever your weekly hours say.
          </p>
        </div>
        {timeOff.length === 0 ? (
          <p className="text-sm text-muted dark:text-muted-dark">No time off scheduled.</p>
        ) : (
          <div className="flex flex-col divide-y divide-rule-soft dark:divide-rule-soft-dark">
            {timeOff.map((block, index) => (
              <div key={index} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <input
                  type="date"
                  value={block.startDate}
                  onChange={(e) => updateTimeOffBlock(index, { startDate: e.target.value })}
                  aria-label="First day off"
                  className={`${COMPACT_FIELD} font-mono`}
                />
                <span className="text-sm text-faint dark:text-faint-dark">to</span>
                <input
                  type="date"
                  value={block.endDate}
                  onChange={(e) => updateTimeOffBlock(index, { endDate: e.target.value })}
                  aria-label="Last day off"
                  className={`${COMPACT_FIELD} font-mono`}
                />
                <input
                  type="text"
                  placeholder="Reason (optional)"
                  value={block.reason ?? ""}
                  onChange={(e) => updateTimeOffBlock(index, { reason: e.target.value })}
                  className={`${COMPACT_FIELD} min-w-0 flex-1 basis-40`}
                />
                <button type="button" onClick={() => removeTimeOffBlock(index)} className={TEXT_BUTTON}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <button type="button" onClick={addTimeOffBlock} className={`w-fit ${TEXT_BUTTON} text-ink dark:text-ink-dark`}>
          + Add time off
        </button>
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={handleSave} disabled={isSaving} className={SOLID_BUTTON}>
          {isSaving ? "Saving…" : "Save changes"}
        </button>
        {savedMessage && (
          <span role="status" className="inline-flex items-center gap-1.5 text-sm text-ok-text dark:text-emerald-300">
            <Check className="h-3.5 w-3.5" />
            {savedMessage}
          </span>
        )}
        {saveError && <ErrorNote>{saveError}</ErrorNote>}
      </div>
    </div>
  );
}
