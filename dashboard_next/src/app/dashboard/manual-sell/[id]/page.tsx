/**
 * Manual Sell Delivery Page
 *
 * Display delivered items with copy functionality
 */

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface DeliveryItem {
  productId: string;
  productName: string;
  quantity: number;
  items: Array<{
    inventoryId: string;
    values: Record<string, string | number | boolean>;
  }>;
}

interface DeliveryData {
  order: any;
  deliveryItems: DeliveryItem[];
  fromSnapshot: boolean;
}

export default function ManualSellDeliveryPage() {
  const params = useParams();
  const orderId = params.id as string;

  const [data, setData] = useState<DeliveryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  useEffect(() => {
    fetchDelivery();
  }, [orderId]);

  const fetchDelivery = async () => {
    try {
      const res = await fetch(`/api/manual-sell/${orderId}`);
      const result = await res.json();

      if (result.success) {
        setData(result.data);
      } else {
        alert("Failed to load delivery data");
      }
    } catch (err) {
      alert("Failed to load delivery data");
    } finally {
      setLoading(false);
    }
  };

  const copyAsTSV = () => {
    if (!data || !data.deliveryItems || !Array.isArray(data.deliveryItems)) return;

    const lines: string[] = [];

    // Header row with field names
    const fieldNames = new Set<string>();
    for (const item of data.deliveryItems) {
      if (item && item.items && Array.isArray(item.items)) {
        for (const row of item.items) {
          if (row && row.values) {
            Object.keys(row.values).forEach((k) => fieldNames.add(k));
          }
        }
      }
    }
    const fields = Array.from(fieldNames);
    lines.push(["Product", ...fields].join("\t"));

    // Data rows
    for (const item of data.deliveryItems) {
      if (item && item.items && Array.isArray(item.items)) {
        for (const row of item.items) {
          if (row && row.values) {
            lines.push([
              item.productName,
              ...fields.map((f) => String(row.values[f] ?? "")),
            ].join("\t"));
          }
        }
      }
    }

    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedFormat("tsv");
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const copyAsCSV = () => {
    if (!data || !data.deliveryItems || !Array.isArray(data.deliveryItems)) return;

    const lines: string[] = [];

    // Header row
    const fieldNames = new Set<string>();
    for (const item of data.deliveryItems) {
      if (item && item.items && Array.isArray(item.items)) {
        for (const row of item.items) {
          if (row && row.values) {
            Object.keys(row.values).forEach((k) => fieldNames.add(k));
          }
        }
      }
    }
    const fields = Array.from(fieldNames);
    lines.push(["Product", ...fields].join(","));

    // Data rows
    for (const item of data.deliveryItems) {
      if (item && item.items && Array.isArray(item.items)) {
        for (const row of item.items) {
          if (row && row.values) {
            lines.push([
              `"${item.productName}"`,
              ...fields.map((f) => {
                const val = String(row.values[f] ?? "");
                return `"${val.replace(/"/g, '""')}"`;
              }),
            ].join(","));
          }
        }
      }
    }

    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedFormat("csv");
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const copyFieldAsList = (fieldName: string) => {
    if (!data || !data.deliveryItems || !Array.isArray(data.deliveryItems)) return;

    const values: string[] = [];

    for (const item of data.deliveryItems) {
      if (item && item.items && Array.isArray(item.items)) {
        for (const row of item.items) {
          if (row && row.values) {
            const val = row.values[fieldName];
            if (val) values.push(String(val));
          }
        }
      }
    }

    navigator.clipboard.writeText(values.join("\n"));
    setCopiedFormat(fieldName);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  // Get all unique field names
  const getAllFields = () => {
    if (!data || !data.deliveryItems || !Array.isArray(data.deliveryItems)) return [];
    const fieldNames = new Set<string>();
    for (const item of data.deliveryItems) {
      if (item && item.items && Array.isArray(item.items)) {
        for (const row of item.items) {
          if (row && row.values) {
            Object.keys(row.values).forEach((k) => fieldNames.add(k));
          }
        }
      }
    }
    return Array.from(fieldNames);
  };

  const allFields = getAllFields();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading delivery data...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">Failed to load delivery data</p>
      </div>
    );
  }

  const totalItems = data.deliveryItems?.reduce((sum, item) => sum + (item?.quantity || 0), 0) || 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Delivery Details</h1>
          <p className="text-slate-400 mt-1">
            Order: {orderId} • {totalItems} items delivered
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyAsTSV}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            Copy TSV
          </button>
          <button
            onClick={copyAsCSV}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            Copy CSV
          </button>
        </div>
      </div>

      {/* Copy confirmation */}
      {copiedFormat && (
        <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-center">
          Copied as {copiedFormat === "tsv" || copiedFormat === "csv" ? copiedFormat.toUpperCase() : copiedFormat}!
        </div>
      )}

      {/* Quick Copy Buttons */}
      {allFields.length > 0 && (
        <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
          <h3 className="text-sm font-medium text-slate-300 mb-3">Quick Copy Field Values:</h3>
          <div className="flex flex-wrap gap-2">
            {allFields.map((field) => (
              <button
                key={field}
                onClick={() => copyFieldAsList(field)}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
              >
                Copy "{field}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Delivery Items Table */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">
                  Product
                </th>
                {allFields.map((field) => (
                  <th
                    key={field}
                    className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase"
                  >
                    {field}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {data.deliveryItems && Array.isArray(data.deliveryItems) && data.deliveryItems.map((deliveryItem) =>
                deliveryItem.items && Array.isArray(deliveryItem.items) ? deliveryItem.items.map((row, idx) => (
                  <tr key={row.inventoryId} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-white">
                      {deliveryItem.productName || "-"}
                    </td>
                    {allFields.map((field) => (
                      <td key={field} className="px-4 py-3 text-sm text-slate-300 font-mono">
                        {String((row.values && row.values[field]) ?? "-")}
                      </td>
                    ))}
                  </tr>
                )) : null
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
