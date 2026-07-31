import { useState } from "react";
import { AdminBookings } from "./AdminBookings";
import { AdminProviders } from "./AdminProviders";

type Tab = "bookings" | "providers";

const TABS: { id: Tab; label: string }[] = [
  { id: "bookings", label: "All bookings" },
  { id: "providers", label: "All providers" },
];

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("bookings");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Admin dashboard</h1>
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
        {tab === "bookings" && <AdminBookings />}
        {tab === "providers" && <AdminProviders />}
      </div>
    </div>
  );
}
