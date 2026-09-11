import type { ReactNode } from "react";
import { CARD_CLASS } from "../lib/styles";

/** The centred card Login and Register sit in. */
export function AuthCard({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-4">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-display text-[2.6rem] leading-[1.05] tracking-[-0.02em]">{title}</h1>
        <p className="text-muted dark:text-muted-dark">{intro}</p>
      </div>
      <div className={`${CARD_CLASS} px-6 py-7 shadow-[0_30px_60px_-40px_rgba(58,42,26,0.25)] sm:px-8`}>{children}</div>
      <p className="text-center text-sm text-muted dark:text-muted-dark">{footer}</p>
    </div>
  );
}
