import { Link, Outlet } from "react-router";

export function Layout() {
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
