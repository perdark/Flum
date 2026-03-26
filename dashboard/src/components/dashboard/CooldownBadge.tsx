"use client";

/**
 * Cooldown Badge Component
 *
 * Displays the cooldown status of an inventory unit with visual indicators
 */

interface CooldownBadgeProps {
  cooldownUntil: Date | string | null;
  status: string;
  className?: string;
}

export function CooldownBadge({ cooldownUntil, status, className = "" }: CooldownBadgeProps) {
  const getCooldownDisplay = (): { text: string; color: string } => {
    const cooldownDate = cooldownUntil ? new Date(cooldownUntil) : null;

    if (!cooldownDate || cooldownDate < new Date()) {
      if (status === "exhausted") {
        return { text: "Exhausted", color: "red" };
      }
      return { text: "Available", color: "green" };
    }

    const now = Date.now();
    const diffMs = cooldownDate.getTime() - now;

    const hours = Math.ceil(diffMs / (1000 * 60 * 60));
    if (hours < 1) {
      const minutes = Math.ceil(diffMs / (1000 * 60));
      return { text: `${minutes} min left`, color: "yellow" };
    }
    return { text: `${hours}h left`, color: "yellow" };
  };

  const { text, color } = getCooldownDisplay();

  const colorClasses: Record<string, string> = {
    green: "bg-green-950 text-green-400 border-green-900",
    yellow: "bg-yellow-950 text-yellow-400 border-yellow-900",
    red: "bg-red-950 text-red-400 border-red-900",
  };

  return (
    <span className={`px-2 py-1 text-xs rounded border ${colorClasses[color]} ${className}`}>
      {text}
    </span>
  );
}

/**
 * Compact version for tables - shows icon only or minimal text
 */
interface CompactCooldownBadgeProps {
  cooldownUntil: Date | string | null;
  status: string;
}

export function CompactCooldownBadge({ cooldownUntil, status }: CompactCooldownBadgeProps) {
  const cooldownDate = cooldownUntil ? new Date(cooldownUntil) : null;
  const isInCooldown = cooldownDate && cooldownDate > new Date();

  if (status === "exhausted") {
    return <span className="text-red-400" title="Exhausted">✕</span>;
  }

  if (isInCooldown) {
    return <span className="text-yellow-400" title="In cooldown">⏱</span>;
  }

  return <span className="text-green-400" title="Available">✓</span>;
}
