import { useEffect, useState } from "react";
import { Link } from "react-router";
import { listProviders } from "../api/providers";
import { ApiError } from "../api/client";
import { ProviderAvatar } from "../components/ProviderAvatar";
import { ArrowRight } from "../components/icons";
import type { ProviderListItem } from "../api/types";

type SortKey = "rating" | "price" | "name";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "rating", label: "Top rated" },
  { key: "price", label: "Lowest price" },
  { key: "name", label: "A–Z" },
];

/** Providers with no rating or no services sort last rather than first. */
function compareProviders(sort: SortKey) {
  return (a: ProviderListItem, b: ProviderListItem): number => {
    if (sort === "rating") {
      return (b.avgRating ?? -1) - (a.avgRating ?? -1) || b.reviewCount - a.reviewCount || a.name.localeCompare(b.name);
    }
    if (sort === "price") {
      return (a.fromPrice ?? Infinity) - (b.fromPrice ?? Infinity) || a.name.localeCompare(b.name);
    }
    return a.name.localeCompare(b.name);
  };
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[17px] w-[17px] shrink-0"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.6-3.6" />
    </svg>
  );
}

function ProviderRow({ provider }: { provider: ProviderListItem }) {
  const hasServices = provider.fromPrice !== null;

  return (
    <li>
      <Link
        to={`/providers/${provider.id}`}
        className="group grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-5 gap-y-4 border-t border-rule py-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand sm:flex sm:gap-6 dark:border-rule-dark"
      >
        <ProviderAvatar
          id={provider.id}
          name={provider.name}
          className="h-12 w-12 text-xl sm:h-15 sm:w-15 sm:text-2xl"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span className="font-display text-[1.45rem] leading-tight tracking-[-0.012em] sm:text-[1.6rem]">
              {provider.name}
            </span>
            {provider.avgRating !== null ? (
              <span className="text-[13.5px] text-muted dark:text-muted-dark">
                <span className="text-star">★</span> {provider.avgRating.toFixed(1)}{" "}
                <span className="text-faint dark:text-faint-dark">
                  ({provider.reviewCount}
                  <span className="sr-only"> review{provider.reviewCount === 1 ? "" : "s"}</span>)
                </span>
              </span>
            ) : (
              <span className="text-[13px] text-faint dark:text-faint-dark">New</span>
            )}
          </div>
          <p className="line-clamp-2 text-[15px] leading-relaxed text-muted sm:line-clamp-1 dark:text-muted-dark">
            {provider.bio || "No bio yet."}
          </p>
        </div>

        <div className="col-span-2 flex items-center justify-between gap-5 sm:shrink-0 sm:justify-end">
          {hasServices ? (
            <span className="font-mono text-[14.5px] text-ink/85 dark:text-ink-dark/85">
              from ${provider.fromPrice}
              <span className="text-faint dark:text-faint-dark"> · {provider.shortestMinutes} min</span>
            </span>
          ) : (
            <span className="text-[13.5px] text-faint dark:text-faint-dark">No services yet</span>
          )}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13.5px] font-semibold transition-opacity ${
              hasServices
                ? "bg-ink text-ground group-hover:opacity-90 dark:bg-ink-dark dark:text-ground-dark"
                : "border border-rule font-medium text-muted dark:border-rule-dark dark:text-muted-dark"
            }`}
          >
            {hasServices ? "Book" : "View"}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </li>
  );
}

function LoadingRows() {
  return (
    <div aria-busy="true" className="flex animate-pulse flex-col">
      <span className="sr-only">Loading…</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-6 border-t border-rule py-6 dark:border-rule-dark">
          <div className="h-15 w-15 rounded-full bg-rule-soft dark:bg-rule-soft-dark" />
          <div className="flex flex-1 flex-col gap-2.5">
            <div className="h-6 w-48 rounded bg-rule-soft dark:bg-rule-soft-dark" />
            <div className="h-4 w-80 max-w-full rounded bg-rule-soft dark:bg-rule-soft-dark" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Providers() {
  const [providers, setProviders] = useState<ProviderListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("rating");

  useEffect(() => {
    listProviders()
      .then((res) => setProviders(res.providers))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load providers"))
      .finally(() => setIsLoading(false));
  }, []);

  const query = search.trim().toLowerCase();
  const visible = providers
    .filter((p) => !query || p.name.toLowerCase().includes(query) || p.bio.toLowerCase().includes(query))
    .sort(compareProviders(sort));

  return (
    <div className="flex flex-col">
      <header className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <div className="flex flex-col gap-3.5">
          <h1 className="font-display text-[2.75rem] leading-[1.05] tracking-[-0.02em] sm:text-[3.25rem]">
            Find a provider
          </h1>
          <p className="max-w-[520px] text-[17px] leading-relaxed text-muted dark:text-muted-dark">
            Every time shown is a real opening — pulled from working hours and existing bookings, not a calendar
            someone forgot to update.
          </p>
        </div>

        <label className="flex w-full items-center gap-2.5 rounded-full border border-[#ded8ce] bg-surface px-[17px] py-3 text-faint transition-colors focus-within:border-brand/60 focus-within:ring-3 focus-within:ring-brand/15 lg:w-[380px] dark:border-rule-dark dark:bg-surface-dark dark:text-faint-dark dark:focus-within:border-brand-soft/70 dark:focus-within:ring-brand-soft/20">
          <SearchIcon />
          <span className="sr-only">Search providers</span>
          <input
            type="search"
            placeholder="Search by name or specialty"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-[14.5px] text-ink outline-none placeholder:text-faint dark:text-ink-dark dark:placeholder:text-faint-dark"
          />
        </label>
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
        <div role="radiogroup" aria-label="Sort providers" className="flex flex-wrap gap-2">
          {SORTS.map(({ key, label }) => (
            <label key={key} className="group cursor-pointer">
              <input
                type="radio"
                name="provider-sort"
                value={key}
                checked={sort === key}
                onChange={() => setSort(key)}
                className="sr-only"
              />
              <span className="block rounded-full border border-[#ded8ce] px-[15px] py-2 text-[13.5px] font-medium text-muted transition-colors group-hover:border-ink/40 group-has-[:checked]:border-transparent group-has-[:checked]:bg-ink group-has-[:checked]:font-semibold group-has-[:checked]:text-ground group-has-[:focus-visible]:outline-2 group-has-[:focus-visible]:outline-offset-2 group-has-[:focus-visible]:outline-brand dark:border-rule-dark dark:text-muted-dark dark:group-hover:border-ink-dark/40 dark:group-has-[:checked]:bg-ink-dark dark:group-has-[:checked]:text-ground-dark">
                {label}
              </span>
            </label>
          ))}
        </div>
        {!isLoading && !error && (
          <span aria-live="polite" className="ml-auto text-[13.5px] text-faint dark:text-faint-dark">
            {visible.length} provider{visible.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="mt-8">
        {isLoading && <LoadingRows />}
        {error && (
          <p role="alert" className="text-danger-text dark:text-red-300">
            {error}
          </p>
        )}

        {!isLoading && !error && visible.length > 0 && (
          <ul className="flex flex-col border-b border-rule dark:border-rule-dark">
            {visible.map((provider) => (
              <ProviderRow key={provider.id} provider={provider} />
            ))}
          </ul>
        )}

        {!isLoading && !error && visible.length === 0 && (
          <div className="flex flex-col items-start gap-3 border-t border-rule py-10 dark:border-rule-dark">
            {providers.length === 0 ? (
              <p className="text-muted dark:text-muted-dark">No providers yet — check back soon.</p>
            ) : (
              <>
                <p className="text-muted dark:text-muted-dark">No providers match “{search.trim()}”.</p>
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="border-b border-rule pb-0.5 text-sm font-medium text-ink transition-colors hover:border-ink dark:border-rule-dark dark:text-ink-dark dark:hover:border-ink-dark"
                >
                  Clear search
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
