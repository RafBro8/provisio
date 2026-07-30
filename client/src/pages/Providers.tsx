import { useEffect, useState } from "react";
import { Link } from "react-router";
import { listProviders } from "../api/providers";
import { ApiError } from "../api/client";
import type { ProviderSummary } from "../api/types";

export function Providers() {
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listProviders()
      .then((res) => setProviders(res.providers))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load providers"))
      .finally(() => setIsLoading(false));
  }, []);

  const query = search.trim().toLowerCase();
  const filtered = providers.filter(
    (p) => !query || p.name.toLowerCase().includes(query) || p.bio.toLowerCase().includes(query),
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold">Find a provider</h1>
      <input
        type="search"
        placeholder="Search by name or specialty"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-4 w-full max-w-sm rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
      />

      {isLoading && <p className="mt-6 text-slate-500 dark:text-slate-400">Loading…</p>}
      {error && <p className="mt-6 text-red-600 dark:text-red-400">{error}</p>}

      {!isLoading && !error && (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {filtered.map((provider) => (
            <li key={provider.id}>
              <Link
                to={`/providers/${provider.id}`}
                className="block rounded border border-slate-300 p-4 hover:border-slate-500 dark:border-slate-700 dark:hover:border-slate-500"
              >
                <p className="font-medium">{provider.name}</p>
                {provider.bio && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{provider.bio}</p>}
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {provider.avgRating !== null
                    ? `★ ${provider.avgRating} (${provider.reviewCount} review${provider.reviewCount === 1 ? "" : "s"})`
                    : "No reviews yet"}
                </p>
              </Link>
            </li>
          ))}
          {filtered.length === 0 && (
            <p className="text-slate-500 dark:text-slate-400">No providers match your search.</p>
          )}
        </ul>
      )}
    </div>
  );
}
