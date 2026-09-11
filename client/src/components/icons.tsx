import type { ReactNode } from "react";

// Small stroke icons shared across pages. All decorative: the text beside
// each one already carries the meaning, so they're hidden from assistive tech.

interface IconProps {
  className?: string;
}

function StrokeIcon({ className = "h-4 w-4", children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function ArrowRight(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </StrokeIcon>
  );
}

export function ArrowLeft(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </StrokeIcon>
  );
}

export function Clock(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4l2.5 2.5" />
    </StrokeIcon>
  );
}

export function Check(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </StrokeIcon>
  );
}
