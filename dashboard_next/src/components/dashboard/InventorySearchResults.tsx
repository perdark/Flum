/**
 * Inventory Search Results Component
 *
 * Displays global inventory search results
 */

"use client";

interface InventorySearchResultsProps {
  results: Array<{
    id: string;
    values: Record<string, string | number | boolean>;
    status: string;
    createdAt: string;
    purchasedAt: string | null;
    productId: string;
    productName: string;
    productSlug: string;
    templateName: string | null;
    batchName: string | null;
  }>;
  query: string;
}

const statusColors = {
  available: "bg-green-500/20 text-green-400",
  reserved: "bg-yellow-500/20 text-yellow-400",
  sold: "bg-blue-500/20 text-blue-400",
  expired: "bg-red-500/20 text-red-400",
};

export function InventorySearchResults({ results, query }: InventorySearchResultsProps) {
  const highlightMatch = (text: string) => {
    if (!text) return "";
    const str = String(text);
    const regex = new RegExp(`(${query})`, "gi");
    return str.replace(regex, '<mark class="bg-yellow-500/50 text-white px-0.5 rounded">$1</mark>');
  };

  // Get all unique field names from results
  const fieldNames = new Set<string>();
  for (const item of results) {
    if (item.values) {
      Object.keys(item.values).forEach((key) => fieldNames.add(key));
    }
  }
  const fields = Array.from(fieldNames);

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      {/* Results Count */}
      <div className="px-6 py-4 border-b border-slate-700">
        <p className="text-slate-300">
          Found <span className="font-bold text-white">{results.length}</span>{" "}
          result{results.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Product
              </th>
              {fields.slice(0, 3).map((field) => (
                <th
                  key={field}
                  className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase"
                >
                  {field}
                </th>
              ))}
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Batch
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {results.map((item) => (
              <tr key={item.id} className="hover:bg-slate-700/50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-white">
                    {item.productName}
                  </div>
                </td>
                {fields.slice(0, 3).map((field) => (
                  <td key={field} className="px-6 py-4">
                    <div
                      className="text-sm text-slate-300"
                      dangerouslySetInnerHTML={{
                        __html: highlightMatch(String(item.values?.[field] ?? "")),
                      }}
                    />
                  </td>
                ))}
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      statusColors[item.status as keyof typeof statusColors]
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-400">
                    {item.batchName || "-"}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-400">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
