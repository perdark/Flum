"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

interface Props {
  className?: string;
  onNavigate?: () => void;
}

export function PriceDropBell({ className, onNavigate }: Props) {
  const [count, setCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/store/price-alerts?triggered=1", { cache: "no-store" });
        if (res.status === 401) {
          if (!cancelled) {
            setCount(0);
            setLoaded(true);
          }
          return;
        }
        const j = await res.json();
        if (!cancelled && j.success) {
          setCount(Array.isArray(j.data) ? j.data.length : 0);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    load();
    const iv = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, []);

  if (!loaded) return null;

  return (
    <Link
      href="/store/account/notifications"
      onClick={onNavigate}
      className={
        "relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-secondary " +
        (className ?? "")
      }
      aria-label={`Price alerts${count > 0 ? ` (${count} new)` : ""}`}
      title="Price alerts"
    >
      <Bell className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-green-600 px-1 text-[10px] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
