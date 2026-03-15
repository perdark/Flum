import { Star, StarHalf } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  count?: number;
  showCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RatingStars({
  rating,
  maxRating = 5,
  count,
  showCount = false,
  size = 'md',
  className,
}: RatingStarsProps) {
  const sizeClasses = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = maxRating - fullStars - (hasHalfStar ? 1 : 0);

    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star
          key={`full-${i}`}
          className={cn(sizeClasses[size], 'fill-accent-yellow text-accent-yellow')}
        />
      );
    }

    // Half star
    if (hasHalfStar) {
      stars.push(
        <StarHalf
          key="half"
          className={cn(sizeClasses[size], 'fill-accent-yellow text-accent-yellow')}
        />
      );
    }

    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star
          key={`empty-${i}`}
          className={cn(sizeClasses[size], 'text-text-muted')}
        />
      );
    }

    return stars;
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center">{renderStars()}</div>
      {showCount && count !== undefined && (
        <span className="text-sm text-text-muted">
          ({count.toLocaleString()})
        </span>
      )}
    </div>
  );
}
