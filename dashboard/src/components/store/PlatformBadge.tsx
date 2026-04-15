import { cn } from "@/lib/utils";

export function PlatformBadge({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  if (!label.trim()) return null;
  return (
    <span
      className={cn(
        "inline-flex max-w-[9rem] truncate rounded-md bg-background/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      {label}
    </span>
  );
}
