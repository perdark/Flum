"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function CountdownTimer({
  endAt,
  className,
  expiredLabel = "Ended",
}: {
  endAt: Date | string;
  className?: string;
  expiredLabel?: string;
}) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const end = typeof endAt === "string" ? new Date(endAt) : endAt;
    const tick = () => {
      const diff = end.getTime() - Date.now();
      if (diff <= 0) {
        setLabel(expiredLabel);
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setLabel(`${d}d ${pad(h)}:${pad(m)}:${pad(s)}`);
      else setLabel(`${pad(h)}:${pad(m)}:${pad(s)}`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endAt, expiredLabel]);

  return (
    <span className={cn("font-mono text-sm font-semibold tabular-nums", className)}>{label}</span>
  );
}
