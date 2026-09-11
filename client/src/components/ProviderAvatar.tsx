import { initials } from "../lib/format";

// A few warm and cool pairs so a list of providers doesn't read as one
// repeated purple circle. The brand pair comes first.
const GRADIENTS = [
  "from-brand to-brand-2",
  "from-[#f0803c] to-[#f5b544]",
  "from-[#2f9e6f] to-brand-2",
  "from-[#6d3bf5] to-[#b98cff]",
];

/** Stable per provider: the same person gets the same colours on every page. */
function gradientFor(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
}

interface ProviderAvatarProps {
  id: string;
  name: string;
  /** Size and type scale, e.g. "h-15 w-15 text-2xl". */
  className?: string;
}

/** Initials on a gradient. Decorative — the name is always shown beside it. */
export function ProviderAvatar({ id, name, className = "h-15 w-15 text-2xl" }: ProviderAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-display text-white ${gradientFor(id)} ${className}`}
    >
      {initials(name)}
    </span>
  );
}
