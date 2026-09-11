import { useEffect, useState } from "react";
import { Link } from "react-router";
import { listProviderBookings } from "../../api/bookings";
import { ApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { PageHeader, StatTile, Tabs } from "../../components/ui";
import { ArrowRight } from "../../components/icons";
import { OUTLINE_BUTTON } from "../../lib/styles";
import { formatDateTime } from "../../lib/format";
import { ProviderBookings } from "./ProviderBookings";
import { ProviderServices } from "./ProviderServices";
import { ProviderAvailability } from "./ProviderAvailability";
import type { PopulatedAppointment } from "../../api/types";

type Tab = "bookings" | "services" | "availability";

const TABS: { id: Tab; label: string }[] = [
  { id: "bookings", label: "Bookings" },
  { id: "services", label: "Services" },
  { id: "availability", label: "Availability" },
];

export function ProviderDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("bookings");
  // Loaded here rather than inside the Bookings tab so the headline numbers
  // and the list below them always come from the same data.
  const [appointments, setAppointments] = useState<PopulatedAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProviderBookings()
      .then((res) => setAppointments(res.appointments))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load your bookings"))
      .finally(() => setIsLoading(false));
  }, []);

  function handleChange(updated: PopulatedAppointment): void {
    setAppointments((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
  }

  const now = Date.now();
  const booked = appointments.filter((a) => a.status === "booked");
  const upcoming = booked
    .filter((a) => new Date(a.endTime).getTime() > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const toComplete = booked.filter((a) => new Date(a.endTime).getTime() <= now);
  const lateCancellations = appointments.filter((a) => a.lateCancellation).length;

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Dashboard"
        intro={
          user ? `Hi, ${user.name.split(/\s+/)[0]}. Here's your schedule, your services, and your hours.` : undefined
        }
        aside={
          user && (
            <Link to={`/providers/${user.id}`} className={`w-fit ${OUTLINE_BUTTON}`}>
              View your public page
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )
        }
      />

      {!isLoading && !error && (
        <div className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Upcoming sessions" value={upcoming.length} />
          <StatTile
            label="Next session"
            value={upcoming[0] ? <span className="text-[1.15rem]">{formatDateTime(upcoming[0].startTime)}</span> : "—"}
            detail={upcoming[0] ? upcoming[0].serviceId.name : "Nothing booked yet"}
          />
          <StatTile label="Waiting to be marked complete" value={toComplete.length} />
          <StatTile label="Late cancellations" value={lateCancellations} detail="All time" />
        </div>
      )}

      <div className="mt-10">
        <Tabs label="Dashboard sections" tabs={TABS} active={tab} onChange={setTab} />
      </div>

      <div className="mt-8">
        {tab === "bookings" && (
          <ProviderBookings appointments={appointments} isLoading={isLoading} error={error} onChange={handleChange} />
        )}
        {tab === "services" && <ProviderServices />}
        {tab === "availability" && <ProviderAvailability />}
      </div>
    </div>
  );
}
