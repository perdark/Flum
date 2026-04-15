"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ReviewsList } from "@/components/store/ReviewsList";
import { ReviewForm } from "@/components/store/ReviewForm";

interface ProductTabsProps {
  description: string | null;
  videoUrl: string | null;
  productName: string;
  productId: string;
  reviews: {
    items: Array<{
      rating: number;
      title: string | null;
      comment: string | null;
      isVerifiedPurchase: boolean;
      createdAt: string;
    }>;
    total: number;
    averageRating: number;
  };
  categories: Array<{ name: string; slug: string }>;
  tags: Array<{ tag: string; tagGroup: string }>;
}

type Tab = "description" | "details" | "reviews" | "faq";

const TAB_LABELS: Record<Tab, string> = {
  description: "Description",
  details: "Details",
  reviews: "Reviews",
  faq: "FAQ",
};

export function ProductTabs({
  description,
  videoUrl,
  productName,
  productId,
  reviews,
  categories,
  tags,
}: ProductTabsProps) {
  const [active, setActive] = useState<Tab>("description");

  // Group tags by tagGroup for details tab
  const tagsByGroup: Record<string, string[]> = {};
  for (const t of tags) {
    if (!tagsByGroup[t.tagGroup]) tagsByGroup[t.tagGroup] = [];
    tagsByGroup[t.tagGroup].push(t.tag);
  }

  const tabs: Tab[] = ["description", "details", "reviews", "faq"];

  return (
    <div>
      {/* Tab headers */}
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={cn(
              "relative shrink-0 px-5 py-3 text-sm font-medium transition-colors",
              active === tab
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {TAB_LABELS[tab]}
            {tab === "reviews" && reviews.total > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({reviews.total})
              </span>
            )}
            {active === tab && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="py-6">
        {/* Description */}
        {active === "description" && (
          <div className="space-y-6">
            {description ? (
              <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
                {description}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No description available.
              </p>
            )}

            {videoUrl && (
              <div>
                <h3 className="mb-3 text-sm font-semibold">Product Video</h3>
                <div className="aspect-video max-w-2xl overflow-hidden rounded-xl bg-secondary">
                  <iframe
                    src={videoUrl}
                    title={productName}
                    className="h-full w-full"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Details */}
        {active === "details" && (
          <div className="space-y-4">
            {categories.length > 0 && (
              <div className="flex items-start gap-3">
                <span className="w-24 shrink-0 text-sm font-medium text-muted-foreground">
                  Category
                </span>
                <span className="text-sm">
                  {categories.map((c) => c.name).join(", ")}
                </span>
              </div>
            )}
            {Object.entries(tagsByGroup).map(([group, values]) => (
              <div key={group} className="flex items-start gap-3">
                <span className="w-24 shrink-0 text-sm font-medium capitalize text-muted-foreground">
                  {group}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {values.map((v) => (
                    <span
                      key={v}
                      className="rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-medium"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {categories.length === 0 &&
              Object.keys(tagsByGroup).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No additional details available.
                </p>
              )}
          </div>
        )}

        {/* Reviews */}
        {active === "reviews" && (
          <div className="space-y-8">
            {reviews.total > 0 && (
              <ReviewsList
                reviews={reviews.items}
                totalCount={reviews.total}
                averageRating={reviews.averageRating}
              />
            )}

            <div className="border-t pt-6">
              <ReviewForm productId={productId} />
            </div>
          </div>
        )}

        {/* FAQ */}
        {active === "faq" && (
          <div className="space-y-4">
            <FaqItem
              q="How will I receive my product?"
              a="After completing your purchase, digital keys and codes will be delivered instantly to your account and displayed on the order confirmation page."
            />
            <FaqItem
              q="Can I get a refund?"
              a="Since this is a digital product, refunds are handled on a case-by-case basis. Please contact our support team if you encounter any issues."
            />
            <FaqItem
              q="Is this product region-locked?"
              a="Region restrictions depend on the specific product. Please check the product details and tags for region information before purchasing."
            />
            <FaqItem
              q="How do I activate my key?"
              a="Activation instructions vary by platform. After purchase, you'll find specific activation steps on the order confirmation page along with your key."
            />
          </div>
        )}
      </div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-medium transition-colors hover:bg-secondary/50"
      >
        {q}
        <span
          className={cn(
            "ml-2 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </span>
      </button>
      {open && (
        <div className="border-t px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          {a}
        </div>
      )}
    </div>
  );
}
