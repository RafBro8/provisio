import { Link } from "react-router";
import { ArrowRight } from "../components/icons";
import { SOLID_BUTTON } from "../lib/styles";

export function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-5 py-16 text-center">
      <span className="bg-gradient-to-br from-brand to-brand-2 bg-clip-text font-display text-[5.5rem] leading-none text-transparent">
        404
      </span>
      <h1 className="font-display text-[2.4rem] leading-tight tracking-[-0.02em]">Page not found</h1>
      <p className="text-muted dark:text-muted-dark">
        That link doesn't lead anywhere. It may have moved, or never existed.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <Link to="/providers" className={SOLID_BUTTON}>
          Find a provider
          <ArrowRight />
        </Link>
        <Link
          to="/"
          className="border-b border-rule pb-0.5 text-sm font-medium text-muted transition-colors hover:border-ink hover:text-ink dark:border-rule-dark dark:text-muted-dark dark:hover:border-ink-dark dark:hover:text-ink-dark"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
