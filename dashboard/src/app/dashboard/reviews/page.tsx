/**
 * Reviews Dashboard Page
 *
 * View and moderate customer reviews
 */

import { ReviewsTable } from "@/components/dashboard/ReviewsTable";

export default function ReviewsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Reviews</h1>

      <ReviewsTable />
    </div>
  );
}
