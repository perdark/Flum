"use client";

/**
 * Reviews Table Component
 *
 * Displays customer product reviews
 */

import { useEffect, useState } from "react";

interface Review {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  customerEmail: string;
  rating: number;
  comment: string | null;
  isVerifiedPurchase: boolean;
  isActive: boolean;
  createdAt: string;
}

export function ReviewsTable() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function fetchReviews() {
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
        });
        if (activeFilter !== "") params.set("isActive", activeFilter);

        const response = await fetch(`/api/reviews?${params}`);
        const result = await response.json();

        if (result.success) {
          setReviews(result.data);
          setTotalPages(result.pagination.totalPages);
        } else {
          setError(result.error || "Failed to load reviews");
        }
      } catch (err) {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }

    fetchReviews();
  }, [page, activeFilter]);

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? "text-yellow-400" : "text-slate-700"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-950/50 text-red-400 border border-red-900 p-4 rounded-lg">
        Error loading reviews: {error}
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-sm overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex gap-4">
          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Reviews</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Rating
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Comment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {reviews.map((review) => (
              <tr key={review.id} className="hover:bg-slate-800">
                <td className="px-6 py-4">
                  <p className="font-medium text-white">
                    {review.productName}
                  </p>
                  <p className="text-sm text-slate-500">{review.productSlug}</p>
                </td>
                <td className="px-6 py-4 text-sm text-slate-300">
                  {review.customerEmail}
                  {review.isVerifiedPurchase && (
                    <span className="ml-2 px-2 py-0.5 bg-green-950 text-green-400 border border-green-900 text-xs rounded">
                      Verified
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">{renderStars(review.rating)}</td>
                <td className="px-6 py-4 text-sm text-slate-300 max-w-md truncate">
                  {review.comment || <span className="text-slate-600">No comment</span>}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      review.isActive
                        ? "bg-green-950 text-green-400 border border-green-900"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {review.isActive ? "Active" : "Hidden"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-400">
                  {new Date(review.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
