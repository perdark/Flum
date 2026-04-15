"use client";

import { useState } from "react";
import { Star, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewFormProps {
  productId: string;
  onSubmitted?: () => void;
}

export function ReviewForm({ productId, onSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/store/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          rating,
          title: title.trim() || null,
          comment: comment.trim() || null,
        }),
      });
      const j = await res.json();
      if (!j.success) {
        setError(j.error || "Failed to submit review");
        return;
      }
      setSuccess(true);
      setRating(0);
      setTitle("");
      setComment("");
      onSubmitted?.();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/5 p-6 text-center">
        <p className="font-semibold text-success">Thank you for your review!</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your review has been submitted and will appear after moderation.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-base font-semibold">Write a Review</h3>

      {/* Star rating */}
      <div>
        <label className="mb-2 block text-sm font-medium">
          Your Rating <span className="text-destructive">*</span>
        </label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(star)}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  "h-7 w-7 transition-colors",
                  (hover || rating) >= star
                    ? "fill-amber-400 text-amber-400"
                    : "text-border",
                )}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="review-title" className="mb-1.5 block text-sm font-medium">
          Title
        </label>
        <input
          id="review-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarize your experience"
          maxLength={200}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Comment */}
      <div>
        <label htmlFor="review-comment" className="mb-1.5 block text-sm font-medium">
          Comment
        </label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What did you like or dislike?"
          rows={4}
          maxLength={2000}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        />
      </div>

      {error && (
        <p className="text-sm font-medium text-destructive">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        Submit Review
      </button>
    </form>
  );
}
