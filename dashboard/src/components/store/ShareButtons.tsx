"use client";

import { useState } from "react";
import { Link2, Check, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareButtonsProps {
  productName: string;
  className?: string;
}

export function ShareButtons({ productName, className }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const url = typeof window !== "undefined" ? window.location.href : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: productName, url });
      } catch {
        /* user cancelled */
      }
    } else {
      copyLink();
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        onClick={copyLink}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all",
          copied
            ? "border-success/30 bg-success/10 text-success"
            : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
        )}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Link2 className="h-3.5 w-3.5" />
        )}
        {copied ? "Copied!" : "Copy Link"}
      </button>

      <button
        type="button"
        onClick={shareNative}
        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:border-primary/30 hover:text-foreground"
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
      </button>
    </div>
  );
}
