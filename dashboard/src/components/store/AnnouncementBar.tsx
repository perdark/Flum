"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const MESSAGES = [
  "Instant digital delivery on thousands of products",
  "24/7 customer support — we are here when you need us",
  "Secure payments — your checkout is protected",
  "Trusted keys & codes — shop with confidence",
];

export function AnnouncementBar({ className }: { className?: string }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => {
      setI((n) => (n + 1) % MESSAGES.length);
    }, 4500);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div
      className={cn(
        "overflow-hidden border-b border-border bg-primary/10 px-4 py-2 text-center text-xs font-medium text-foreground sm:text-sm",
        className,
      )}
    >
      <AnimatePresence mode="wait">
        <motion.p
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
        >
          {MESSAGES[i]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
