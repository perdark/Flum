import { RatingStars } from "@/components/ui/rating-stars";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";

interface ReviewsListProps {
  reviews: Array<{
    rating: number;
    title: string | null;
    comment: string | null;
    isVerifiedPurchase: boolean;
    createdAt: string;
  }>;
  totalCount: number;
  averageRating: number;
}

export function ReviewsList({ reviews, totalCount, averageRating }: ReviewsListProps) {
  if (totalCount === 0) return null;

  // Rating distribution
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const maxCount = Math.max(1, ...distribution.map((d) => d.count));

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Customer Reviews</h2>

      {/* Summary */}
      <div className="flex items-start gap-8 flex-wrap">
        <div className="text-center">
          <p className="text-4xl font-bold">{averageRating.toFixed(1)}</p>
          <RatingStars rating={averageRating} showCount count={totalCount} size="sm" />
        </div>
        <div className="flex-1 min-w-[200px] space-y-1.5">
          {distribution.map(({ star, count }) => (
            <div key={star} className="flex items-center gap-2 text-sm">
              <span className="w-3 text-right text-muted-foreground">{star}</span>
              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
              <span className="w-6 text-xs text-muted-foreground">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Review list */}
      <div className="divide-y">
        {reviews.map((review, i) => (
          <div key={i} className="py-4 first:pt-0">
            <div className="flex items-center gap-3 mb-2">
              <RatingStars rating={review.rating} size="sm" />
              {review.isVerifiedPurchase && (
                <Badge variant="success" size="sm">Verified Purchase</Badge>
              )}
            </div>
            {review.title && (
              <h4 className="font-medium text-sm mb-1">{review.title}</h4>
            )}
            {review.comment && (
              <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {formatRelativeTime(new Date(review.createdAt))}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
