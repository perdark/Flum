import { cn } from "@/lib/utils";

export function DeliveryBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-background/85 px-2 py-0.5 text-[10px] font-medium text-success backdrop-blur-sm",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success shadow-[0_0_8px_rgb(34_197_94_/_0.65)]" />
      Instant
    </span>
  );
}
