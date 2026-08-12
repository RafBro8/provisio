import { Link, Outlet, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "./ThemeToggle";

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout(): Promise<void> {
    await logout();
    navigate("/");
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-lg font-semibold">
            Provisio
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/providers" className="hover:underline">
              Find a provider
            </Link>
            {user ? (
              <>
                {user.role === "provider" && (
                  <Link to="/provider/dashboard" className="hover:underline">
                    Dashboard
                  </Link>
                )}
                {user.role === "customer" && (
                  <Link to="/bookings" className="hover:underline">
                    My bookings
                  </Link>
                )}
                {user.role === "admin" && (
                  <Link to="/admin/dashboard" className="hover:underline">
                    Admin
                  </Link>
                )}
                <Link to="/account" className="hover:underline">
                  {user.name}
                </Link>
                <button type="button" onClick={handleLogout} className="hover:underline">
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:underline">
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="rounded bg-slate-900 px-3 py-1.5 text-white dark:bg-white dark:text-slate-900"
                >
                  Sign up
                </Link>
              </>
            )}
            <ThemeToggle />
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        Provisio — a portfolio project
      </footer>
    </div>
  );
}
