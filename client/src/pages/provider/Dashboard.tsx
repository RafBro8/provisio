import { useState } from "react";
import { ProviderBookings } from "./ProviderBookings";
import { ProviderServices } from "./ProviderServices";
import { ProviderAvailability } from "./ProviderAvailability";

type Tab = "bookings" | "services" | "availability";

const TABS: { id: Tab; label: string }[] = [
  { id: "bookings", label: "Bookings" },
  { id: "services", label: "Services" },
  { id: "availability", label: "Availability" },
];

export function ProviderDashboard() {
  const [tab, setTab] = useState<Tab>("bookings");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Provider dashboard</h1>
      <div className="mt-4 flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm ${
              tab === t.id
                ? "border-b-2 border-slate-900 font-medium dark:border-white"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "bookings" && <ProviderBookings />}
        {tab === "services" && <ProviderServices />}
        {tab === "availability" && <ProviderAvailability />}
      </div>
    </div>
  );
}
