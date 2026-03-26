/**
 * Global Inventory Search Page
 *
 * Emergency search for inventory items across all products
 */

"use client";

import { useState } from "react";
import { InventorySearchResults } from "@/components/dashboard/InventorySearchResults";
import { toast } from "sonner";

export default function InventorySearchPage() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const handleSearch = async () => {
    if (!query.trim()) return;

    setSearching(true);
    try {
      const params = new URLSearchParams({ q: query });
      if (statusFilter) params.append("status", statusFilter);

      const res = await fetch(`/api/inventory/search?${params}`);
      const data = await res.json();

      if (data.success) {
        setResults(data.data);
      } else {
        toast.error(data.error || "Search failed");
      }
    } catch (err) {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Inventory Search</h1>
        <p className="text-muted-foreground mt-1">
          Global search across all inventory items
        </p>
      </div>

      {/* Search Box */}
      <div className="bg-card rounded-lg border border-border p-6 mb-6">
        <div className="flex gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search by code, email, or any value..."
            className="flex-1 px-4 py-3 bg-muted border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-muted border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Statuses</option>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="sold">Sold</option>
            <option value="expired">Expired</option>
          </select>
          <button
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {searching ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <InventorySearchResults results={results} query={query} />
      )}

      {/* Empty State */}
      {!searching && results.length === 0 && query === "" && (
        <div className="text-center py-16">
          <svg
            className="w-16 h-16 mx-auto text-muted-foreground mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <h3 className="text-lg font-medium text-foreground mb-2">
            Search Inventory
          </h3>
          <p className="text-muted-foreground">
            Enter a code, email, or any value to search across all inventory items
          </p>
        </div>
      )}

      {/* No Results */}
      {!searching && results.length === 0 && query !== "" && (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No results found for "{query}"</p>
        </div>
      )}
    </div>
  );
}
