import { cn } from "@/lib/utils";

/**
 * Small uppercase "eyebrow" label placed above a section title — the recurring
 * cue that a section was deliberately composed. Used site-wide for consistency.
 */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-custom/80",
        className,
      )}
    >
      {children}
    </p>
  );
}
