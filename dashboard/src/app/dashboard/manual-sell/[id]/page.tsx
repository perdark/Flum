/**
 * Manual Sell Delivery Page
 *
 * Display delivered items with copy functionality:
 * - Order metadata header
 * - Per-cell click-to-copy
 * - Per-row copy button
 * - Bulk TSV/CSV copy
 */

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

interface DeliveryItem {
  productId: string;
  productName: string;
  quantity: number;
  items: Array<{
    inventoryId: string;
    values: Record<string, string | number | boolean>;
  }>;
}

interface OrderMeta {
  id: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string | null;
  status: string;
  fulfillmentStatus: string;
  total: string;
  subtotal: string;
  customerType: string | null;
  createdAt: string;
  deliveredAt: string | null;
}

interface DeliveryData {
  order: OrderMeta | null;
  deliveryItems: DeliveryItem[];
  fromSnapshot: boolean;
}

export default function ManualSellDeliveryPage() {
  const params = useParams();
  const orderId = params.id as string;

  const [data, setData] = useState<DeliveryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCell, setCopiedCell] = useState<string | null>(null);

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
        toast.error("Failed to load delivery data");
      }
    } catch (err) {
      toast.error("Failed to load delivery data");
    } finally {
      setLoading(false);
    }
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCell(label);
    setTimeout(() => setCopiedCell(null), 1500);
  };

  const copyAsTSV = () => {
    if (!data || !data.deliveryItems || !Array.isArray(data.deliveryItems)) return;

    const lines: string[] = [];
    const fieldNames = new Set<string>();
    for (const item of data.deliveryItems) {
      if (item?.items && Array.isArray(item.items)) {
        for (const row of item.items) {
          if (row?.values) Object.keys(row.values).forEach((k) => fieldNames.add(k));
        }
      }
    }
    const fields = Array.from(fieldNames);
    lines.push(["Product", ...fields].join("\t"));

    for (const item of data.deliveryItems) {
      if (item?.items && Array.isArray(item.items)) {
        for (const row of item.items) {
          if (row?.values) {
            lines.push([
              item.productName,
              ...fields.map((f) => String(row.values[f] ?? "")),
            ].join("\t"));
          }
        }
      }
    }

    copyText(lines.join("\n"), "tsv");
    toast.success("Copied as TSV");
  };

  const copyAsCSV = () => {
    if (!data || !data.deliveryItems || !Array.isArray(data.deliveryItems)) return;

    const lines: string[] = [];
    const fieldNames = new Set<string>();
    for (const item of data.deliveryItems) {
      if (item?.items && Array.isArray(item.items)) {
        for (const row of item.items) {
          if (row?.values) Object.keys(row.values).forEach((k) => fieldNames.add(k));
        }
      }
    }
    const fields = Array.from(fieldNames);
    lines.push(["Product", ...fields].join(","));

    for (const item of data.deliveryItems) {
      if (item?.items && Array.isArray(item.items)) {
        for (const row of item.items) {
          if (row?.values) {
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

    copyText(lines.join("\n"), "csv");
    toast.success("Copied as CSV");
  };

  const copyFieldAsList = (fieldName: string) => {
    if (!data || !data.deliveryItems || !Array.isArray(data.deliveryItems)) return;

    const values: string[] = [];
    for (const item of data.deliveryItems) {
      if (item?.items && Array.isArray(item.items)) {
        for (const row of item.items) {
          if (row?.values) {
            const val = row.values[fieldName];
            if (val) values.push(String(val));
          }
        }
      }
    }

    copyText(values.join("\n"), `field-${fieldName}`);
    toast.success(`Copied "${fieldName}" values`);
  };

  const copyRowAsText = (item: DeliveryItem, row: { inventoryId: string; values: Record<string, string | number | boolean> }) => {
    const fieldNames = getAllFields();
    const line = fieldNames.map((f) => `${f}: ${String(row.values[f] ?? "-")}`).join(" | ");
    copyText(`${item.productName} - ${line}`, `row-${row.inventoryId}`);
    toast.success("Row copied");
  };

  const getAllFields = () => {
    if (!data || !data.deliveryItems || !Array.isArray(data.deliveryItems)) return [];
    const fieldNames = new Set<string>();
    for (const item of data.deliveryItems) {
      if (item?.items && Array.isArray(item.items)) {
        for (const row of item.items) {
          if (row?.values) Object.keys(row.values).forEach((k) => fieldNames.add(k));
        }
      }
    }
    return Array.from(fieldNames);
  };

  const allFields = getAllFields();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading delivery data...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load delivery data</p>
      </div>
    );
  }

  const totalItems = data.deliveryItems?.reduce((sum, item) => sum + (item?.quantity || 0), 0) || 0;
  const order = data.order;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Delivery Details</h1>
          <p className="text-muted-foreground mt-1">
            {totalItems} items delivered
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyAsTSV}
            className="px-4 py-2 bg-secondary hover:bg-secondary text-foreground rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            Copy TSV
          </button>
          <button
            onClick={copyAsCSV}
            className="px-4 py-2 bg-secondary hover:bg-secondary text-foreground rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            Copy CSV
          </button>
        </div>
      </div>

      {/* Copy confirmation */}
      {copiedCell && (
        <div className="mb-4 p-3 bg-success/20 border border-success/30 rounded-lg text-success text-center text-sm">
          Copied to clipboard!
        </div>
      )}

      {/* Order Metadata Header */}
      {order && (
        <div className="mb-6 p-4 bg-card rounded-lg border border-border">
          <h3 className="text-sm font-medium text-foreground mb-3">Order Info</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetaField
              label="Order #"
              value={order.orderNumber}
              copiedCell={copiedCell}
              onCopy={() => copyText(order.orderNumber, "meta-orderNumber")}
            />
            <MetaField
              label="Customer"
              value={order.customerName || order.customerEmail}
              copiedCell={copiedCell}
              onCopy={() => copyText(order.customerName || order.customerEmail, "meta-customer")}
            />
            <MetaField
              label="Email"
              value={order.customerEmail}
              copiedCell={copiedCell}
              onCopy={() => copyText(order.customerEmail, "meta-email")}
            />
            <MetaField
              label="Total"
              value={`$${parseFloat(order.total).toFixed(2)}`}
              copiedCell={copiedCell}
              onCopy={() => copyText(order.total, "meta-total")}
            />
            <MetaField
              label="Status"
              value={order.status}
              copiedCell={copiedCell}
              onCopy={() => copyText(order.status, "meta-status")}
            />
            <MetaField
              label="Fulfillment"
              value={order.fulfillmentStatus}
              copiedCell={copiedCell}
              onCopy={() => copyText(order.fulfillmentStatus, "meta-fulfillment")}
            />
            <MetaField
              label="Type"
              value={order.customerType || "retail"}
              copiedCell={copiedCell}
              onCopy={() => copyText(order.customerType || "retail", "meta-type")}
            />
            <MetaField
              label="Date"
              value={new Date(order.createdAt).toLocaleString()}
              copiedCell={copiedCell}
              onCopy={() => copyText(new Date(order.createdAt).toLocaleString(), "meta-date")}
            />
          </div>
        </div>
      )}

      {/* Quick Copy Buttons */}
      {allFields.length > 0 && (
        <div className="mb-6 p-4 bg-card rounded-lg border border-border">
          <h3 className="text-sm font-medium text-foreground mb-3">Quick Copy Field Values:</h3>
          <div className="flex flex-wrap gap-2">
            {allFields.map((field) => (
              <button
                key={field}
                onClick={() => copyFieldAsList(field)}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  copiedCell === `field-${field}`
                    ? "bg-success/20 text-success"
                    : "bg-secondary hover:bg-secondary text-foreground"
                }`}
              >
                Copy &quot;{field}&quot;
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Delivery Items Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase w-10">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Product
                </th>
                {allFields.map((field) => (
                  <th
                    key={field}
                    className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase"
                  >
                    {field}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase w-16">
                  Copy
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.deliveryItems && Array.isArray(data.deliveryItems) && data.deliveryItems.map((deliveryItem) =>
                deliveryItem.items && Array.isArray(deliveryItem.items) ? deliveryItem.items.map((row, idx) => (
                  <tr key={row.inventoryId} className="hover:bg-muted/50 group">
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {deliveryItem.productName || "-"}
                    </td>
                    {allFields.map((field) => {
                      const cellValue = String((row.values && row.values[field]) ?? "-");
                      const cellId = `${row.inventoryId}-${field}`;
                      return (
                        <td
                          key={field}
                          className={`px-4 py-3 text-sm font-mono cursor-pointer transition-colors ${
                            copiedCell === cellId
                              ? "bg-success/10 text-success"
                              : "text-foreground hover:bg-muted"
                          }`}
                          onClick={() => copyText(cellValue, cellId)}
                          title="Click to copy"
                        >
                          {cellValue.length > 50 ? cellValue.slice(0, 50) + "..." : cellValue}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => copyRowAsText(deliveryItem, row)}
                        className={`p-1.5 rounded transition-colors ${
                          copiedCell === `row-${row.inventoryId}`
                            ? "text-success bg-success/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100"
                        }`}
                        title="Copy row"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </td>
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

// ============================================================================
// Meta Field Component
// ============================================================================

function MetaField({
  label,
  value,
  copiedCell,
  onCopy,
}: {
  label: string;
  value: string;
  copiedCell: string | null;
  onCopy: () => void;
}) {
  const cellId = `meta-${label}`;
  return (
    <div
      className={`cursor-pointer p-2 rounded transition-colors ${
        copiedCell === cellId
          ? "bg-success/10 ring-1 ring-success/30"
          : "hover:bg-muted"
      }`}
      onClick={onCopy}
      title="Click to copy"
    >
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium text-foreground truncate">{value}</p>
    </div>
  );
}
