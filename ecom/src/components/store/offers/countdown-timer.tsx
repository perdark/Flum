'use client';

/**
 * CountdownTimer Component
 *
 * Animated countdown timer for offer expiry
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  endDate: Date | string;
  className?: string;
  variant?: 'default' | 'compact' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  onComplete?: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export function CountdownTimer({
  endDate,
  className,
  variant = 'default',
  size = 'md',
  showIcon = true,
  onComplete,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  const targetDate = useMemo(() => new Date(endDate), [endDate]);
  const isExpiredRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference <= 0) {
        const expired = { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
        setTimeLeft(expired);

        if (!isExpiredRef.current) {
          isExpiredRef.current = true;
          onCompleteRef.current?.();
        }

        return expired;
      }

      isExpiredRef.current = false;
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isExpired: false,
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.isExpired) {
    return null;
  }

  // Size variants
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const digitSizeClasses = {
    sm: 'text-lg min-w-[1.5rem]',
    md: 'text-2xl min-w-[2rem]',
    lg: 'text-3xl min-w-[2.5rem]',
  };

  const labelSizeClasses = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  };

  // Minimal variant - simple text
  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-1 text-text-muted', className)}>
        {showIcon && <Clock className={cn(size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />}
        <span className={cn(sizeClasses[size], 'font-medium')}>
          {timeLeft.days > 0 && `${timeLeft.days}d `}
          {String(timeLeft.hours).padStart(2, '0')}:
          {String(timeLeft.minutes).padStart(2, '0')}:
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
      </div>
    );
  }

  // Compact variant - inline boxes
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {showIcon && (
          <Clock className={cn(size === 'sm' ? 'w-3 h-3' : 'w-4 h-4', 'text-accent-amber')} />
        )}
        <div className="flex items-center gap-1">
          {timeLeft.days > 0 && (
            <>
              <span className={cn(digitSizeClasses[size], 'font-bold text-text')}>{timeLeft.days}</span>
              <span className={cn(labelSizeClasses[size], 'text-text-muted')}>d</span>
            </>
          )}
          <span className={cn(digitSizeClasses[size], 'font-bold text-text')}>
            {String(timeLeft.hours).padStart(2, '0')}
          </span>:
          <span className={cn(digitSizeClasses[size], 'font-bold text-text')}>
            {String(timeLeft.minutes).padStart(2, '0')}
          </span>:
          <span className={cn(digitSizeClasses[size], 'font-bold text-accent-amber animate-countdown-pulse')}>
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
        </div>
      </div>
    );
  }

  // Default variant - card with separate units
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showIcon && (
        <Clock className={cn(size === 'sm' ? 'w-4 h-4' : 'w-5 h-5', 'text-accent-amber')} />
      )}
      <div className="flex items-center gap-1.5">
        {timeLeft.days > 0 && (
          <div className="flex flex-col items-center bg-background/50 backdrop-blur-sm rounded-lg px-2 py-1 border border-border/50">
            <span className={cn(digitSizeClasses[size], 'font-bold text-text leading-none')}>
              {String(timeLeft.days).padStart(2, '0')}
            </span>
            <span className={cn(labelSizeClasses[size], 'text-text-muted uppercase tracking-wider')}>
              Days
            </span>
          </div>
        )}
        <div className="flex flex-col items-center bg-background/50 backdrop-blur-sm rounded-lg px-2 py-1 border border-border/50">
          <span className={cn(digitSizeClasses[size], 'font-bold text-text leading-none')}>
            {String(timeLeft.hours).padStart(2, '0')}
          </span>
          <span className={cn(labelSizeClasses[size], 'text-text-muted uppercase tracking-wider')}>
            Hours
          </span>
        </div>
        <span className="text-text-muted">:</span>
        <div className="flex flex-col items-center bg-background/50 backdrop-blur-sm rounded-lg px-2 py-1 border border-border/50">
          <span className={cn(digitSizeClasses[size], 'font-bold text-text leading-none')}>
            {String(timeLeft.minutes).padStart(2, '0')}
          </span>
          <span className={cn(labelSizeClasses[size], 'text-text-muted uppercase tracking-wider')}>
            Mins
          </span>
        </div>
        <span className="text-text-muted">:</span>
        <div className="flex flex-col items-center bg-warm-sunset/20 backdrop-blur-sm rounded-lg px-2 py-1 border border-warm-sunset/50">
          <span className={cn(digitSizeClasses[size], 'font-bold text-warm-sunset leading-none animate-countdown-pulse')}>
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
          <span className={cn(labelSizeClasses[size], 'text-warm-sunset uppercase tracking-wider')}>
            Secs
          </span>
        </div>
      </div>
    </div>
  );
}
