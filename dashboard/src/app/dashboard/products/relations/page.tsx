"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  slug: string;
  inventoryTemplateId?: string | null;
  inventoryCatalogItemId?: string | null;
}

interface RelationRow {
  id: string;
  relatedProductId: string;
  relationType: string;
  score: number | null;
  relatedName: string;
  relatedSlug: string;
}

interface CatalogProductRow {
  id: string;
  templateId: string;
  name: string;
  templateName: string;
}

export default function ProductRelationsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [relations, setRelations] = useState<RelationRow[]>([]);
  const [relatedId, setRelatedId] = useState("");
  const [relationType, setRelationType] = useState("related");
  const [loading, setLoading] = useState(false);
  const [productDetail, setProductDetail] = useState<{
    inventoryTemplateId: string | null;
    inventoryCatalogItemId: string | null;
  } | null>(null);
  const [catalogRows, setCatalogRows] = useState<CatalogProductRow[]>([]);
  const [catalogPick, setCatalogPick] = useState("");
  const [attachStock, setAttachStock] = useState(true);
  const [savingCatalog, setSavingCatalog] = useState(false);

  useEffect(() => {
    fetch("/api/products?limit=500")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) setProducts(d.data);
      })
      .catch(() => toast.error("Failed to load products"));
  }, []);

  useEffect(() => {
    fetch("/api/inventory/catalog-products")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) setCatalogRows(d.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!productId) {
      setRelations([]);
      setProductDetail(null);
      setCatalogPick("");
      return;
    }
    setLoading(true);
    Promise.all([
      fetch(`/api/products/${productId}/relations`).then((r) => r.json()),
      fetch(`/api/products/${productId}`).then((r) => r.json()),
    ])
      .then(([relRes, prodRes]) => {
        if (relRes.success) setRelations(relRes.data || []);
        else toast.error(relRes.error || "Failed to load relations");
        if (prodRes.success && prodRes.data) {
          const d = prodRes.data;
          setProductDetail({
            inventoryTemplateId: d.inventoryTemplateId ?? null,
            inventoryCatalogItemId: d.inventoryCatalogItemId ?? null,
          });
          setCatalogPick(d.inventoryCatalogItemId ?? "");
        } else {
          setProductDetail(null);
        }
      })
      .finally(() => setLoading(false));
  }, [productId]);

  const catalogOptions = useMemo(() => {
    const tid = productDetail?.inventoryTemplateId;
    if (!tid) return [];
    return catalogRows.filter((c) => c.templateId === tid);
  }, [catalogRows, productDetail?.inventoryTemplateId]);

  const addRelation = async () => {
    if (!productId || !relatedId) {
      toast.error("Select both products");
      return;
    }
    const res = await fetch(`/api/products/${productId}/relations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ relatedProductId: relatedId, relationType }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("Linked");
      setRelatedId("");
      const ref = await fetch(`/api/products/${productId}/relations`).then((r) => r.json());
      if (ref.success) setRelations(ref.data);
    } else {
      toast.error(data.error || "Failed");
    }
  };

  const remove = async (relationId: string) => {
    const res = await fetch(`/api/products/${productId}/relations?relationId=${relationId}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (data.success) {
      setRelations((prev) => prev.filter((r) => r.id !== relationId));
    } else {
      toast.error(data.error || "Failed");
    }
  };

  const saveInventoryLink = async () => {
    if (!productId) return;
    setSavingCatalog(true);
    try {
      const body: Record<string, unknown> = {
        inventoryCatalogItemId: catalogPick || null,
        attachStockToRows: attachStock && Boolean(catalogPick),
      };
      const res = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Inventory link saved");
        setProductDetail({
          inventoryTemplateId: data.data?.inventoryTemplateId ?? null,
          inventoryCatalogItemId: data.data?.inventoryCatalogItemId ?? null,
        });
      } else {
        toast.error(data.error || "Failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSavingCatalog(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div className="mb-6">
        <Link href="/dashboard/products" className="text-sm text-primary hover:underline">
          ← Products
        </Link>
        <h1 className="text-2xl font-bold text-foreground mt-2">Product links</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Link related products (upsell, cross-sell, related). Uses <code>product_relations</code>.
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">Product</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full px-4 py-2 bg-muted border border-input rounded-lg"
          >
            <option value="">Select product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {productId && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Related product</label>
                <select
                  value={relatedId}
                  onChange={(e) => setRelatedId(e.target.value)}
                  className="w-full px-4 py-2 bg-muted border border-input rounded-lg"
                >
                  <option value="">Select…</option>
                  {products
                    .filter((p) => p.id !== productId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Relation type</label>
                <input
                  value={relationType}
                  onChange={(e) => setRelationType(e.target.value)}
                  className="w-full px-4 py-2 bg-muted border border-input rounded-lg"
                  placeholder="related, upsell, …"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={addRelation}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
            >
              Add link
            </button>

            <div className="border-t border-border pt-4">
              <h2 className="text-sm font-semibold mb-2">Current links</h2>
              {loading ? (
                <p className="text-xs text-muted-foreground">Loading…</p>
              ) : relations.length === 0 ? (
                <p className="text-xs text-muted-foreground">None yet.</p>
              ) : (
                <ul className="space-y-2">
                  {relations.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-2 text-sm bg-muted/40 px-3 py-2 rounded border border-input"
                    >
                      <span>
                        <span className="text-muted-foreground">{r.relationType}</span> →{" "}
                        {r.relatedName || r.relatedSlug}
                      </span>
                      <button type="button" className="text-destructive text-xs" onClick={() => remove(r.id)}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Storefront ↔ inventory catalog SKU</h2>
        <p className="text-muted-foreground text-sm">
          Tie this product to one internal inventory SKU (same template as the product). Optional: attach existing
          unlinked stock rows on that SKU to this product.
        </p>
        {!productId ? (
          <p className="text-xs text-muted-foreground">Select a product above first.</p>
        ) : !productDetail?.inventoryTemplateId ? (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            This product has no inventory template. Set one on the product edit page, then pick a catalog SKU here.
          </p>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Inventory catalog SKU</label>
              <select
                value={catalogPick}
                onChange={(e) => setCatalogPick(e.target.value)}
                className="w-full px-4 py-2 bg-muted border border-input rounded-lg"
              >
                <option value="">None (clear link)</option>
                {catalogOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.templateName})
                  </option>
                ))}
              </select>
              {catalogOptions.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  No catalog SKUs for this template. Create one under Inventory → Products.
                </p>
              )}
            </div>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={attachStock}
                onChange={(e) => setAttachStock(e.target.checked)}
              />
              <span>
                Attach available stock rows for this SKU that have no storefront product yet (
                <code className="text-xs">product_id</code> null → this product)
              </span>
            </label>
            <button
              type="button"
              disabled={savingCatalog}
              onClick={() => void saveInventoryLink()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
            >
              {savingCatalog ? "Saving…" : "Save inventory link"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
