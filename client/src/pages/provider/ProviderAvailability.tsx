import { useEffect, useState } from "react";
import { getMyProfile, updateMyProfile } from "../../api/providers";
import { ApiError } from "../../api/client";
import { todayIso } from "../../lib/format";
import type { ProviderProfile, WorkingHoursBlock, TimeOffBlock } from "../../api/types";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const inputClass = "rounded border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900";

export function ProviderAvailability() {
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [bio, setBio] = useState("");
  const [bufferMinutes, setBufferMinutes] = useState(15);
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
      const res = await updateMyProfile({ bio, bufferMinutes, workingHours, timeOff });
      setProfile(res.profile);
      setSavedMessage("Saved.");
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Couldn't save changes");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) return <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>;
  if (loadError) return <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>;
  if (!profile) return null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <label className="flex flex-col gap-1 text-sm">
          Bio
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className={inputClass} />
        </label>
        <label className="mt-4 flex max-w-xs flex-col gap-1 text-sm">
          Buffer time between appointments (minutes)
          <input
            type="number"
            min={0}
            value={bufferMinutes}
            onChange={(e) => setBufferMinutes(Number(e.target.value))}
            className={inputClass}
          />
        </label>
      </div>

      <div>
        <h3 className="font-medium">Working hours</h3>
        <div className="mt-2 flex flex-col gap-2">
          {workingHours.map((block, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <select
                value={block.dayOfWeek}
                onChange={(e) => updateWorkingHoursBlock(index, { dayOfWeek: Number(e.target.value) })}
                className={inputClass}
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
                className={inputClass}
              />
              <span className="text-sm text-slate-500 dark:text-slate-400">to</span>
              <input
                type="time"
                value={block.endTime}
                onChange={(e) => updateWorkingHoursBlock(index, { endTime: e.target.value })}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => removeWorkingHoursBlock(index)}
                className="text-sm text-red-600 dark:text-red-400"
              >
                Remove
              </button>
            </div>
          ))}
          {workingHours.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">No working hours set yet.</p>
          )}
        </div>
        <button type="button" onClick={addWorkingHoursBlock} className="mt-2 text-sm underline">
          + Add working hours block
        </button>
      </div>

      <div>
        <h3 className="font-medium">Time off</h3>
        <div className="mt-2 flex flex-col gap-2">
          {timeOff.map((block, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={block.startDate}
                onChange={(e) => updateTimeOffBlock(index, { startDate: e.target.value })}
                className={inputClass}
              />
              <span className="text-sm text-slate-500 dark:text-slate-400">to</span>
              <input
                type="date"
                value={block.endDate}
                onChange={(e) => updateTimeOffBlock(index, { endDate: e.target.value })}
                className={inputClass}
              />
              <input
                type="text"
                placeholder="Reason (optional)"
                value={block.reason ?? ""}
                onChange={(e) => updateTimeOffBlock(index, { reason: e.target.value })}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => removeTimeOffBlock(index)}
                className="text-sm text-red-600 dark:text-red-400"
              >
                Remove
              </button>
            </div>
          ))}
          {timeOff.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No time off scheduled.</p>}
        </div>
        <button type="button" onClick={addTimeOffBlock} className="mt-2 text-sm underline">
          + Add time off
        </button>
      </div>

      {saveError && <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>}
      {savedMessage && <p className="text-sm text-green-600 dark:text-green-400">{savedMessage}</p>}
      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="w-fit rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
      >
        {isSaving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
