import { Link } from "react-router";
import { ArrowRight } from "../components/icons";

/**
 * A still illustration of the real booking UI, deliberately built from spans
 * rather than buttons: it isn't operable, and the e2e suite locates real slots
 * with `main button[aria-pressed]` and a button named "Confirm booking", so
 * making these real controls would put decorative copies of them in the DOM.
 * Hidden from assistive tech — the surrounding copy already says everything
 * this picture says.
 */
function BookingPreview() {
  const slots = [
    { time: "09:00", state: "open" },
    { time: "09:30", state: "selected" },
    { time: "10:00", state: "taken" },
    { time: "10:30", state: "open" },
    { time: "11:00", state: "open" },
    { time: "13:00", state: "taken" },
    { time: "13:30", state: "open" },
    { time: "14:00", state: "open" },
  ] as const;

  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-2xl border border-rule bg-surface shadow-[0_34px_64px_-34px_rgba(58,42,26,0.30)] dark:border-[#302941] dark:bg-surface-dark dark:shadow-[0_34px_70px_-30px_rgba(0,0,0,0.7)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-rule-soft px-6 py-5 dark:border-rule-soft-dark">
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-bold tracking-[-0.018em]">Dana Whitfield</span>
          <span className="text-[13px] text-faint dark:text-faint-dark">Career coach · ★ 4.9 (28 reviews)</span>
        </div>
        <span className="shrink-0 rounded-full bg-ok-bg px-3 py-1.5 text-xs font-semibold text-ok-text dark:bg-emerald-400/15 dark:text-emerald-300">
          Free today
        </span>
      </div>

      <div className="flex flex-col gap-4 px-6 pt-5 pb-6">
        <div className="flex flex-col gap-2">
          <span className="text-[11.5px] font-bold tracking-[0.09em] uppercase text-faint dark:text-faint-dark">
            Service
          </span>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-lg bg-ink px-3 py-2 text-[13px] font-semibold text-ground dark:bg-ink-dark dark:text-ground-dark">
              Career session · 30 min
            </span>
            <span className="rounded-lg border border-rule px-3 py-2 text-[13px] font-medium text-muted dark:border-[#372f47] dark:text-muted-dark">
              Resume review · 60 min
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11.5px] font-bold tracking-[0.09em] uppercase text-faint dark:text-faint-dark">
            Pick a time
          </span>
          <div className="grid grid-cols-4 gap-2 font-mono">
            {slots.map(({ time, state }) => {
              const base = "rounded-lg py-2.5 text-center text-[13px]";
              if (state === "selected") {
                return (
                  <span
                    key={time}
                    className={`${base} bg-gradient-to-br from-brand via-[#6d3bf5] to-brand-2 font-medium text-white`}
                  >
                    {time}
                  </span>
                );
              }
              if (state === "taken") {
                return (
                  <span
                    key={time}
                    className={`${base} border border-rule-soft text-faint line-through dark:border-rule-soft-dark dark:text-[#5d5570]`}
                  >
                    {time}
                  </span>
                );
              }
              return (
                <span
                  key={time}
                  className={`${base} border border-rule text-ink/80 dark:border-[#372f47] dark:text-ink-dark/85`}
                >
                  {time}
                </span>
              );
            })}
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-brand/15 bg-brand/6 p-3.5 dark:border-brand/25 dark:bg-brand/12">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-0.5 h-4 w-4 shrink-0 text-brand dark:text-[#b98cff]"
            aria-hidden="true"
          >
            <path d="M12 3l7.5 3.3v5.2c0 4.4-3.1 7.9-7.5 9.2-4.4-1.3-7.5-4.8-7.5-9.2V6.3z" />
            <path d="M9.2 12.2l2 2 3.6-4" />
          </svg>
          <span className="text-[13px] leading-relaxed text-[#4c3b7a] dark:text-[#c6b5e8]">
            Struck-through times are already taken — a slot is held the moment someone books it.
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted dark:text-muted-dark">
            Thu 09:30 · <strong className="font-bold text-ink dark:text-ink-dark">$75</strong>
          </span>
          <span className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-ground dark:bg-ink-dark dark:text-ground-dark">
            Confirm booking
          </span>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  "Browse providers and see the times they're genuinely free.",
  "Pick a slot and book it. If someone beats you to it, you'll know at once.",
  "Need to cancel? The 24-hour policy is applied the same way for everyone.",
];

const BENEFITS = [
  {
    title: "Real availability",
    body: "Open slots are derived from each provider's working hours and existing bookings — never a stale calendar someone forgot to update.",
  },
  {
    title: "No double bookings",
    body: "Two people reaching for the same slot at the same moment: exactly one gets it, and the other finds out immediately.",
  },
  {
    title: "A policy that holds",
    body: "Cancellations inside 24 hours are recorded as late — automatically, and identically for every booking.",
  },
];

export function Home() {
  return (
    <div className="relative">
      {/* One restrained warm glow behind the preview card, rather than a
          page-wide wash — keeps the gradient feeling like an accent. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -right-72 hidden h-[700px] w-[760px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(126,20,255,0.10)_0%,rgba(71,191,255,0.05)_42%,rgba(250,248,244,0)_70%)] lg:block dark:bg-[radial-gradient(ellipse_at_center,rgba(126,20,255,0.20)_0%,rgba(71,191,255,0.09)_44%,rgba(22,19,28,0)_70%)]"
      />

      <section className="relative grid gap-14 lg:grid-cols-12 lg:items-center lg:gap-14">
        <div className="flex flex-col gap-7 lg:col-span-7">
          <h1 className="font-display text-[2.75rem] leading-[1.03] tracking-[-0.022em] text-balance sm:text-[3.5rem] lg:text-[4.625rem]">
            Book time with a professional, <em className="italic">without</em> the back-and-forth.
          </h1>

          <div className="h-[3px] w-42 rounded-sm bg-gradient-to-r from-brand to-brand-2" />

          <p className="max-w-xl text-lg leading-relaxed text-muted dark:text-muted-dark sm:text-[1.22rem]">
            Provisio is a scheduling platform for consultants, coaches, and tutors — real availability,
            automatic conflict prevention, and a clear cancellation policy.
          </p>

          <div className="flex flex-wrap items-center gap-x-7 gap-y-4 pt-1">
            <Link
              to="/providers"
              className="inline-flex items-center gap-2.5 rounded-full bg-ink px-7 py-4 text-[15.5px] font-semibold text-ground transition-opacity hover:opacity-90 dark:bg-ink-dark dark:text-ground-dark"
            >
              Find a provider
              <ArrowRight />
            </Link>
            <Link
              to="/register"
              className="border-b border-rule pb-0.5 text-[15.5px] font-medium text-muted transition-colors hover:border-ink hover:text-ink dark:border-[#4a4257] dark:text-muted-dark dark:hover:border-ink-dark dark:hover:text-ink-dark"
            >
              Offer your services
            </Link>
          </div>
        </div>

        <div className="lg:col-span-5">
          <BookingPreview />
        </div>
      </section>

      <section className="relative mt-24 border-t border-rule pt-10 dark:border-rule-dark">
        <ol className="grid gap-10 sm:grid-cols-3 sm:gap-12">
          {STEPS.map((step, index) => (
            <li key={step} className="flex gap-4">
              <span
                aria-hidden="true"
                className="bg-gradient-to-br from-brand to-brand-2 bg-clip-text font-display text-[2.1rem] leading-none text-transparent"
              >
                {index + 1}
              </span>
              <p className="pt-1 leading-relaxed text-muted dark:text-muted-dark">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="relative mt-24 border-t border-rule pt-11 dark:border-rule-dark">
        <div className="grid gap-10 sm:grid-cols-3 sm:gap-12">
          {BENEFITS.map(({ title, body }) => (
            <div key={title} className="flex flex-col gap-3">
              <h2 className="font-display text-[1.75rem] tracking-[-0.015em]">{title}</h2>
              <p className="leading-relaxed text-muted dark:text-muted-dark">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
