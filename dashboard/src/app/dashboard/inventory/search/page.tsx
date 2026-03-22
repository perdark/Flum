/**
 * Global Inventory Search Page
 *
 * Emergency search for inventory items across all products
 */

"use client";

import { useState } from "react";
import { InventorySearchResults } from "@/components/dashboard/InventorySearchResults";

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
        alert(data.error || "Search failed");
      }
    } catch (err) {
      alert("Search failed");
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
        <h1 className="text-2xl font-bold text-white">Inventory Search</h1>
        <p className="text-slate-400 mt-1">
          Global search across all inventory items
        </p>
      </div>

      {/* Search Box */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-6">
        <div className="flex gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search by code, email, or any value..."
            className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="w-16 h-16 mx-auto text-slate-600 mb-4"
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
          <h3 className="text-lg font-medium text-white mb-2">
            Search Inventory
          </h3>
          <p className="text-slate-400">
            Enter a code, email, or any value to search across all inventory items
          </p>
        </div>
      )}

      {/* No Results */}
      {!searching && results.length === 0 && query !== "" && (
        <div className="text-center py-16">
          <p className="text-slate-400">No results found for "{query}"</p>
        </div>
      )}
    </div>
  );
}
