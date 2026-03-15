import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  href?: string;
  variant?: 'full' | 'icon' | 'compact';
}

/**
 * Fulmen Empire Logo Component
 *
 * Uses a lightning bolt motif with the brand name.
 * In production, replace this SVG with actual brand assets.
 */
export function Logo({ className, href = '/', variant = 'full' }: LogoProps) {
  const logoContent = (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Lightning Bolt Icon - Replace with actual logo asset */}
      <svg
        className="h-8 w-8"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="lightning-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0052FF" />
            <stop offset="50%" stopColor="#064ACB" />
            <stop offset="100%" stopColor="#FFC241" />
          </linearGradient>
          <filter id="lightning-glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Lightning Bolt */}
        <path
          d="M28 4L12 26H22L18 44L36 20H24L30 4Z"
          fill="url(#lightning-gradient)"
          filter="url(#lightning-glow)"
        />
      </svg>

      {/* Brand Name */}
      {(variant === 'full' || variant === 'compact') && (
        <div className="flex flex-col">
          <span className="text-xl font-bold leading-none tracking-tight">
            FULMEN
          </span>
          {variant === 'full' && (
            <span className="text-xs font-medium tracking-[0.3em] text-accent-amber">
              EMPIRE
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{logoContent}</Link>;
  }

  return logoContent;
}
