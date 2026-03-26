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
  available: "bg-success/20 text-success",
  reserved: "bg-warning/20 text-warning",
  sold: "bg-info/20 text-primary",
  expired: "bg-error/20 text-destructive",
};

export function InventorySearchResults({ results, query }: InventorySearchResultsProps) {
  const highlightMatch = (text: string) => {
    if (!text) return "";
    const str = String(text);
    const regex = new RegExp(`(${query})`, "gi");
    return str.replace(regex, '<mark class="bg-warning/50 text-foreground px-0.5 rounded">$1</mark>');
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
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Results Count */}
      <div className="px-6 py-4 border-b border-border">
        <p className="text-foreground">
          Found <span className="font-bold text-foreground">{results.length}</span>{" "}
          result{results.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Product
              </th>
              {fields.slice(0, 3).map((field) => (
                <th
                  key={field}
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
                >
                  {field}
                </th>
              ))}
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Batch
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {results.map((item) => (
              <tr key={item.id} className="hover:bg-accent">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-foreground">
                    {item.productName}
                  </div>
                </td>
                {fields.slice(0, 3).map((field) => (
                  <td key={field} className="px-6 py-4">
                    <div
                      className="text-sm text-foreground"
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
                  <div className="text-sm text-muted-foreground">
                    {item.batchName || "-"}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-muted-foreground">
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
