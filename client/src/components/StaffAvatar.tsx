import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/staff-roster";

interface StaffAvatarProps {
  name: string;
  photo?: string;
  /** "teacher" renders larger than "ta". */
  variant: "teacher" | "ta";
}

// A small, curated set of calm cool tints so monogram placeholders are
// distinguishable without leaving the site's one-hue (sky/teal/indigo) family.
const PLACEHOLDER_TINTS = [
  "from-sky-500/25 to-indigo-500/25 text-sky-100",
  "from-teal-500/25 to-emerald-500/25 text-teal-100",
  "from-indigo-500/25 to-violet-500/25 text-indigo-100",
  "from-cyan-500/25 to-sky-500/25 text-cyan-100",
];

function tintFor(name: string): string {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return PLACEHOLDER_TINTS[sum % PLACEHOLDER_TINTS.length];
}

export function StaffAvatar({ name, photo, variant }: StaffAvatarProps) {
  const sizeClasses =
    variant === "teacher"
      ? "w-28 h-28 sm:w-32 sm:h-32"
      : "w-20 h-20 sm:w-24 sm:h-24";

  const initialsSize = variant === "teacher" ? "text-2xl" : "text-lg";

  // 1px inset ring keeps photo edges crisp against the glass background
  // without a harsh, tinted border (per image-outline guidance).
  const ring =
    "ring-1 ring-inset ring-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.35)]";

  if (photo) {
    return (
      <img
        src={photo}
        alt={`${name}, ${variant === "teacher" ? "teacher" : "teaching assistant"}`}
        loading="lazy"
        decoding="async"
        className={cn(
          sizeClasses,
          ring,
          "rounded-full object-cover object-center bg-white/5",
        )}
      />
    );
  }

  return (
    <div
      aria-label={`${name} — photo coming soon`}
      className={cn(
        sizeClasses,
        ring,
        "rounded-full flex items-center justify-center bg-gradient-to-br font-semibold tracking-wide select-none",
        initialsSize,
        tintFor(name),
      )}
    >
      {getInitials(name)}
    </div>
  );
}
