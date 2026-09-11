import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import { PageHeader } from "../components/ui";
import { ArrowRight } from "../components/icons";
import { CARD_CLASS, SOLID_BUTTON } from "../lib/styles";
import { initials } from "../lib/format";
import type { UserRole } from "../api/types";

const HOME_FOR_ROLE: Record<UserRole, { to: string; label: string }> = {
  customer: { to: "/bookings", label: "Go to my bookings" },
  provider: { to: "/provider/dashboard", label: "Go to your dashboard" },
  admin: { to: "/admin/dashboard", label: "Go to the admin dashboard" },
};

export function Account() {
  const { user } = useAuth();
  // ProtectedRoute guarantees this only renders when authenticated.
  if (!user) return null;

  const next = HOME_FOR_ROLE[user.role];

  return (
    <div className="flex flex-col">
      <PageHeader title="Your account" />

      <div className={`${CARD_CLASS} mt-10 flex max-w-2xl flex-wrap items-center gap-6 px-6 py-6 sm:px-8`}>
        <span
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 font-display text-[1.7rem] text-white"
        >
          {initials(user.name)}
        </span>
        <dl className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-col">
            <dt className="sr-only">Name</dt>
            <dd className="font-display text-[1.8rem] leading-tight tracking-[-0.01em]">{user.name}</dd>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <dt className="sr-only">Email</dt>
            <dd className="text-muted dark:text-muted-dark">{user.email}</dd>
            <dt className="sr-only">Role</dt>
            <dd className="rounded-full bg-neutral-bg px-3 py-1 text-[12.5px] font-semibold text-muted capitalize dark:bg-white/8 dark:text-muted-dark">
              {user.role}
            </dd>
          </div>
        </dl>
      </div>

      <Link to={next.to} className={`mt-6 w-fit ${SOLID_BUTTON}`}>
        {next.label}
        <ArrowRight />
      </Link>
    </div>
  );
}
