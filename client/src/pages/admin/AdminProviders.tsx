import { useEffect, useState } from "react";
import { Link } from "react-router";
import { listProviders } from "../../api/providers";
import { ApiError } from "../../api/client";
import type { ProviderSummary } from "../../api/types";

export function AdminProviders() {
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProviders()
      .then((res) => setProviders(res.providers))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load providers"))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <h3 className="font-medium">All providers</h3>
      {isLoading && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Loading…</p>}
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {!isLoading && !error && providers.length === 0 && (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No providers on the platform yet.</p>
      )}
      {!isLoading && !error && providers.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {providers.map((provider) => (
            <li key={provider.id}>
              <Link
                to={`/providers/${provider.id}`}
                className="block rounded border border-slate-300 p-3 hover:border-slate-500 dark:border-slate-700 dark:hover:border-slate-500"
              >
                <p className="font-medium">{provider.name}</p>
                {provider.bio && <p className="text-sm text-slate-600 dark:text-slate-400">{provider.bio}</p>}
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {provider.avgRating !== null
                    ? `★ ${provider.avgRating} (${provider.reviewCount} review${provider.reviewCount === 1 ? "" : "s"})`
                    : "No reviews yet"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
