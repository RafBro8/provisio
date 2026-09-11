import { useEffect, useState } from "react";
import { listAllBookings } from "../../api/bookings";
import { listProviders } from "../../api/providers";
import { ApiError } from "../../api/client";
import { PageHeader, StatTile, Tabs } from "../../components/ui";
import { AdminBookings } from "./AdminBookings";
import { AdminProviders } from "./AdminProviders";
import type { PopulatedAppointment, ProviderListItem } from "../../api/types";

type Tab = "bookings" | "providers";

const TABS: { id: Tab; label: string }[] = [
  { id: "bookings", label: "All bookings" },
  { id: "providers", label: "All providers" },
];

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("bookings");
  // Both lists load here so the headline numbers and the tabs share one copy.
  const [appointments, setAppointments] = useState<PopulatedAppointment[]>([]);
  const [providers, setProviders] = useState<ProviderListItem[]>([]);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [providersError, setProvidersError] = useState<string | null>(null);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);

  useEffect(() => {
    listAllBookings()
      .then((res) => setAppointments(res.appointments))
      .catch((err) => setBookingsError(err instanceof ApiError ? err.message : "Couldn't load bookings"))
      .finally(() => setIsLoadingBookings(false));
    listProviders()
      .then((res) => setProviders(res.providers))
      .catch((err) => setProvidersError(err instanceof ApiError ? err.message : "Couldn't load providers"))
      .finally(() => setIsLoadingProviders(false));
  }, []);

  function handleChange(updated: PopulatedAppointment): void {
    setAppointments((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
  }

  const now = Date.now();
  const upcoming = appointments.filter((a) => a.status === "booked" && new Date(a.endTime).getTime() > now).length;
  const completed = appointments.filter((a) => a.status === "completed").length;
  const lateCancellations = appointments.filter((a) => a.lateCancellation).length;
  const bookable = providers.filter((p) => p.serviceCount > 0).length;

  return (
    <div className="flex flex-col">
      <PageHeader title="Admin" intro="Every booking and provider on the platform, with the power to step in." />

      {!isLoadingBookings && !isLoadingProviders && !bookingsError && !providersError && (
        <div className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Upcoming bookings" value={upcoming} />
          <StatTile label="Completed sessions" value={completed} />
          <StatTile label="Late cancellations" value={lateCancellations} detail="All time" />
          <StatTile label="Providers" value={providers.length} detail={`${bookable} with bookable services`} />
        </div>
      )}

      <div className="mt-10">
        <Tabs label="Admin sections" tabs={TABS} active={tab} onChange={setTab} />
      </div>

      <div className="mt-8">
        {tab === "bookings" && (
          <AdminBookings
            appointments={appointments}
            isLoading={isLoadingBookings}
            error={bookingsError}
            onChange={handleChange}
          />
        )}
        {tab === "providers" && (
          <AdminProviders providers={providers} isLoading={isLoadingProviders} error={providersError} />
        )}
      </div>
    </div>
  );
}
