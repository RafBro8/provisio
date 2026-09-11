import { Link } from "react-router";
import { ProviderAvatar } from "../../components/ProviderAvatar";
import { ErrorNote, LoadingNote } from "../../components/ui";
import { ArrowRight } from "../../components/icons";
import { CARD_CLASS } from "../../lib/styles";
import type { ProviderListItem } from "../../api/types";

interface AdminProvidersProps {
  providers: ProviderListItem[];
  isLoading: boolean;
  error: string | null;
}

export function AdminProviders({ providers, isLoading, error }: AdminProvidersProps) {
  if (isLoading) return <LoadingNote />;
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (providers.length === 0) {
    return <p className="text-muted dark:text-muted-dark">No providers on the platform yet.</p>;
  }

  return (
    <ul className={`${CARD_CLASS} flex flex-col divide-y divide-rule-soft dark:divide-rule-soft-dark`}>
      {[...providers]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((provider) => (
          <li key={provider.id}>
            <Link
              to={`/providers/${provider.id}`}
              className="group flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 transition-colors hover:bg-rule-soft/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand sm:px-6 dark:hover:bg-rule-soft-dark/50"
            >
              <ProviderAvatar id={provider.id} name={provider.name} className="h-10 w-10 text-lg" />
              <div className="flex min-w-0 flex-1 basis-48 flex-col gap-0.5">
                <span className="font-semibold">{provider.name}</span>
                <span className="line-clamp-1 text-[13.5px] text-muted dark:text-muted-dark">
                  {provider.bio || "No bio yet."}
                </span>
              </div>
              <span className="text-[13.5px] text-muted dark:text-muted-dark">
                {provider.avgRating !== null ? (
                  <>
                    <span className="text-star">★</span> {provider.avgRating.toFixed(1)} ({provider.reviewCount})
                  </>
                ) : (
                  "No reviews"
                )}
              </span>
              <span className="w-28 text-right font-mono text-[13px] text-faint dark:text-faint-dark">
                {provider.serviceCount === 0
                  ? "no services"
                  : `${provider.serviceCount} service${provider.serviceCount === 1 ? "" : "s"}`}
              </span>
              <ArrowRight className="h-4 w-4 text-faint transition-transform group-hover:translate-x-0.5 dark:text-faint-dark" />
            </Link>
          </li>
        ))}
    </ul>
  );
}
