import { Link, Outlet, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "./ThemeToggle";

/** Small gradient mark used beside the wordmark. */
function BrandMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="provisio-mark" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--color-brand)" />
          <stop offset="1" stopColor="var(--color-brand-2)" />
        </linearGradient>
      </defs>
      <path d="M13 2 4 14h6l-1 8 9-12h-6z" fill="url(#provisio-mark)" />
    </svg>
  );
}

// Nav links are visually uppercased via CSS only — text-transform doesn't
// change the DOM text, so accessible names (and the e2e locators that match
// on them) stay exactly as written here.
const navLinkClass =
  "text-[13px] font-medium uppercase tracking-[0.085em] text-muted transition-colors hover:text-ink dark:text-muted-dark dark:hover:text-ink-dark";

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout(): Promise<void> {
    await logout();
    navigate("/");
  }

  return (
    <div className="flex min-h-screen flex-col bg-ground text-ink dark:bg-ground-dark dark:text-ink-dark">
      <header className="border-b border-rule dark:border-rule-dark">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-6 sm:px-10">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandMark />
            <span className="font-display text-2xl tracking-[-0.01em]">Provisio</span>
          </Link>

          <div className="flex items-center gap-6 sm:gap-8">
            <Link to="/providers" className={navLinkClass}>
              Find a provider
            </Link>

            {user ? (
              <>
                {user.role === "provider" && (
                  <Link to="/provider/dashboard" className={navLinkClass}>
                    Dashboard
                  </Link>
                )}
                {user.role === "customer" && (
                  <Link to="/bookings" className={navLinkClass}>
                    My bookings
                  </Link>
                )}
                {user.role === "admin" && (
                  <Link to="/admin/dashboard" className={navLinkClass}>
                    Admin
                  </Link>
                )}
                <Link to="/account" className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-xs font-bold text-white">
                    {user.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-ink dark:text-ink-dark">{user.name}</span>
                </Link>
                <button type="button" onClick={handleLogout} className={navLinkClass}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={navLinkClass}>
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-ground transition-opacity hover:opacity-90 dark:bg-ink-dark dark:text-ground-dark"
                >
                  Sign up
                </Link>
              </>
            )}

            <ThemeToggle />
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-12 sm:px-10">
        <Outlet />
      </main>

      <footer className="mt-auto">
        <div className="mx-auto max-w-7xl px-6 pb-12 sm:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-6 text-sm text-faint dark:border-rule-dark dark:text-faint-dark">
            <span>Provisio — a portfolio project</span>
            <div className="flex gap-7">
              <Link to="/providers" className="transition-colors hover:text-ink dark:hover:text-ink-dark">
                Find a provider
              </Link>
              {user ? (
                <Link to="/account" className="transition-colors hover:text-ink dark:hover:text-ink-dark">
                  Account
                </Link>
              ) : (
                <Link to="/login" className="transition-colors hover:text-ink dark:hover:text-ink-dark">
                  Log in
                </Link>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
