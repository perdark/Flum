"use client";

/**
 * New Product Page
 *
 * Form to create a new product with category tree selection, images,
 * purchase options / region pricing, and bundle builder
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CategoryTreeSelect } from "@/components/dashboard/CategoryTreeSelect";
import { BundleBuilder, BundleItem } from "@/components/dashboard/BundleBuilder";

interface Image {
  url: string;
  alt?: string;
  order?: number;
}

interface InventoryTemplate {
  id: string;
  name: string;
  description: string | null;
  fieldsSchema?: Array<{
    name: string;
    type: "string" | "number" | "boolean";
    required: boolean;
    label: string;
    repeatable: boolean;
  }>;
}

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<InventoryTemplate[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    nameAr: "",
    description: "",
    descriptionAr: "",
    cost: "",
    basePrice: "",
    enableDiscount: false,
    compareAtPrice: "",
    deliveryType: "manual",
    inventoryTemplateId: "",
    isActive: true,
    isFeatured: false,
    isNew: false,
    videoUrl: "",
    videoThumbnail: "",
    purchaseOptions: [] as Array<{ slug: string; label: string; fieldKeys: string }>,
    regionPrices: [] as Array<{ regionCode: string; price: string; purchaseOptionSlug: string }>,
    // Bundle fields
    isBundle: false,
    bundleTemplateId: "",
    bundleItems: [] as BundleItem[],
  });

  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [images, setImages] = useState<Image[]>([{ url: "", alt: "", order: 0 }]);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const response = await fetch("/api/inventory/templates");
        const result = await response.json();
        if (result.success) {
          setTemplates(result.data);
        }
      } catch (err) {
        console.error("Failed to load templates:", err);
      }
    }
    fetchTemplates();
  }, []);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleNameChange = (value: string) => {
    setFormData({ ...formData, name: value });
  };

  const addImage = () => {
    setImages([...images, { url: "", alt: "", order: images.length }]);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    // Reorder
    newImages.forEach((img, i) => img.order = i);
    setImages(newImages);
  };

  const updateImage = (index: number, field: keyof Image, value: string) => {
    const newImages = [...images];
    (newImages[index] as any)[field] = value;
    setImages(newImages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const validImages = images.filter((img) => img.url.trim() !== "");

      // Auto-generate slug from name
      const slug = generateSlug(formData.name);

      const purchaseOptions = formData.purchaseOptions
        .filter((o) => o.slug.trim() && o.label.trim())
        .map((o, i) => ({
          slug: o.slug.trim(),
          label: o.label.trim(),
          fieldKeys: o.fieldKeys
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
          sortOrder: i,
        }));
      const regionPrices = formData.regionPrices
        .filter((r) => r.regionCode.trim() && r.price.trim())
        .map((r) => ({
          regionCode: r.regionCode.trim(),
          price: parseFloat(r.price) || 0,
          purchaseOptionSlug: r.purchaseOptionSlug.trim() || null,
        }));

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          slug,
          basePrice: parseFloat(formData.basePrice) || 0,
          cost: formData.cost ? parseFloat(formData.cost) : undefined,
          compareAtPrice: formData.enableDiscount && formData.compareAtPrice ? parseFloat(formData.compareAtPrice) : undefined,
          categoryIds,
          images: validImages,
          purchaseOptions,
          regionPrices,
        }),
      });

      const result = await response.json();

      if (result.success) {
        router.push("/dashboard/products");
      } else {
        setError(result.error || "Failed to create product");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">New Product</h1>
        <p className="text-muted-foreground">Create a new digital product</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 text-destructive border border-destructive/30 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg shadow-sm p-6">
        {/* Basic Information */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Product Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                className="w-full px-4 py-2 bg-muted border border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                placeholder="e.g., Steam Game Account"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Arabic Name (الاسم بالعربية)
              </label>
              <input
                type="text"
                value={formData.nameAr}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                className="w-full px-4 py-2 bg-muted border border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground text-right"
                placeholder="اسم المنتج"
                dir="rtl"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 bg-muted border border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              placeholder="Product description..."
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Arabic Description (الوصف بالعربية)
            </label>
            <textarea
              value={formData.descriptionAr}
              onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 bg-muted border border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground text-right"
              placeholder="وصف المنتج..."
              dir="rtl"
            />
          </div>
        </div>

        {/* Pricing */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Pricing</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Cost (USD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                className="w-full px-4 py-2 bg-muted border border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                placeholder="15.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your cost (internal use)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Price (USD) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                required
                className="w-full px-4 py-2 bg-muted border border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                placeholder="29.99"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Selling price
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={formData.enableDiscount}
                  onChange={(e) => setFormData({ ...formData, enableDiscount: e.target.checked })}
                  className="w-4 h-4 text-primary bg-muted border-input rounded focus:ring-ring"
                />
                <span className="text-sm font-medium text-muted-foreground">Enable Discount</span>
              </label>
              {formData.enableDiscount && (
                <div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.compareAtPrice}
                    onChange={(e) => setFormData({ ...formData, compareAtPrice: e.target.value })}
                    className="w-full px-4 py-2 bg-muted border border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                    placeholder="39.99"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Compare at price (original price)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Inventory & Delivery */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Inventory & Delivery</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Delivery Type *
              </label>
              <select
                value={formData.deliveryType}
                onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
                required
                className="w-full px-4 py-2 bg-muted border border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="manual">Manual</option>
                <option value="auto">Automatic</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Inventory Template
              </label>
              <select
                value={formData.inventoryTemplateId}
                onChange={(e) => setFormData({ ...formData, inventoryTemplateId: e.target.value })}
                className="w-full px-4 py-2 bg-muted border border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">None - Manual Delivery</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} {template.description && `- ${template.description}`}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                {formData.inventoryTemplateId
                  ? "Products with templates auto-fulfill from inventory"
                  : "No template = manual delivery from orders page (no stock tracking)"}
              </p>
            </div>
          </div>

          {!formData.inventoryTemplateId && (
            <div className="mt-4 p-3 bg-warning/10 border border-warning/30 rounded-lg">
              <p className="text-warning text-sm">
                <strong>Manual Delivery Mode:</strong> This product won't track inventory. 
                Orders will be created as pending for manual fulfillment from the Orders page.
              </p>
            </div>
          )}
        </div>

        {/* Purchase options & regions (template field keys = what to deliver) */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-2">Purchase options &amp; regions</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Optional: e.g. &quot;My account&quot; vs &quot;User account&quot; with different template fields. Multi-sell is set per stock line in Inventory → Add stock batch.
          </p>
          <div className="space-y-3 mb-4">
            {formData.purchaseOptions.map((opt, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end bg-muted/40 p-3 rounded-lg border border-input">
                <div>
                  <label className="text-xs text-muted-foreground">Slug</label>
                  <input
                    className="w-full px-2 py-1.5 bg-muted border border-input rounded text-sm"
                    value={opt.slug}
                    onChange={(e) => {
                      const next = [...formData.purchaseOptions];
                      next[idx] = { ...next[idx], slug: e.target.value };
                      setFormData({ ...formData, purchaseOptions: next });
                    }}
                    placeholder="my_account"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Label</label>
                  <input
                    className="w-full px-2 py-1.5 bg-muted border border-input rounded text-sm"
                    value={opt.label}
                    onChange={(e) => {
                      const next = [...formData.purchaseOptions];
                      next[idx] = { ...next[idx], label: e.target.value };
                      setFormData({ ...formData, purchaseOptions: next });
                    }}
                    placeholder="My account"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-muted-foreground">Template field keys (comma-separated)</label>
                  <input
                    className="w-full px-2 py-1.5 bg-muted border border-input rounded text-sm"
                    value={opt.fieldKeys}
                    onChange={(e) => {
                      const next = [...formData.purchaseOptions];
                      next[idx] = { ...next[idx], fieldKeys: e.target.value };
                      setFormData({ ...formData, purchaseOptions: next });
                    }}
                    placeholder="code, email, password"
                  />
                </div>
                <button
                  type="button"
                  className="text-destructive text-sm md:col-span-4"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      purchaseOptions: formData.purchaseOptions.filter((_, i) => i !== idx),
                    })
                  }
                >
                  Remove option
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-sm text-primary"
              onClick={() =>
                setFormData({
                  ...formData,
                  purchaseOptions: [
                    ...formData.purchaseOptions,
                    { slug: "", label: "", fieldKeys: "" },
                  ],
                })
              }
            >
              + Add purchase option
            </button>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Region prices</h3>
            {formData.regionPrices.map((rp, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end bg-muted/40 p-3 rounded-lg border border-input">
                <div>
                  <label className="text-xs text-muted-foreground">Region code</label>
                  <input
                    className="w-full px-2 py-1.5 bg-muted border border-input rounded text-sm"
                    value={rp.regionCode}
                    onChange={(e) => {
                      const next = [...formData.regionPrices];
                      next[idx] = { ...next[idx], regionCode: e.target.value };
                      setFormData({ ...formData, regionPrices: next });
                    }}
                    placeholder="usa"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-2 py-1.5 bg-muted border border-input rounded text-sm"
                    value={rp.price}
                    onChange={(e) => {
                      const next = [...formData.regionPrices];
                      next[idx] = { ...next[idx], price: e.target.value };
                      setFormData({ ...formData, regionPrices: next });
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Option slug (optional)</label>
                  <input
                    className="w-full px-2 py-1.5 bg-muted border border-input rounded text-sm"
                    value={rp.purchaseOptionSlug}
                    onChange={(e) => {
                      const next = [...formData.regionPrices];
                      next[idx] = { ...next[idx], purchaseOptionSlug: e.target.value };
                      setFormData({ ...formData, regionPrices: next });
                    }}
                    placeholder="my_account"
                  />
                </div>
                <button
                  type="button"
                  className="text-destructive text-sm md:col-span-3"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      regionPrices: formData.regionPrices.filter((_, i) => i !== idx),
                    })
                  }
                >
                  Remove row
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-sm text-primary"
              onClick={() =>
                setFormData({
                  ...formData,
                  regionPrices: [
                    ...formData.regionPrices,
                    { regionCode: "", price: "", purchaseOptionSlug: "" },
                  ],
                })
              }
            >
              + Add region price
            </button>
          </div>
        </div>

        {/* Bundle Configuration */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Bundle Configuration</h2>
              <p className="text-sm text-muted-foreground">Group multiple products into one bundle product</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isBundle}
                onChange={(e) => setFormData({ ...formData, isBundle: e.target.checked })}
                className="w-4 h-4 text-primary bg-muted border-input rounded focus:ring-ring"
              />
              <span className="text-sm text-muted-foreground">This is a Bundle Product</span>
            </label>
          </div>

          {formData.isBundle && (
            <div className="bg-muted/50 p-4 rounded-lg border border-input">
              {/* Template Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Bundle Template *
                </label>
                <select
                  value={formData.bundleTemplateId}
                  onChange={(e) => setFormData({ ...formData, bundleTemplateId: e.target.value })}
                  className="w-full px-4 py-2 bg-muted border border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select a template...</option>
                  {templates
                    .filter((t) => t.fieldsSchema && t.fieldsSchema.some((f: any) => f.repeatable))
                    .map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} {template.description && `- ${template.description}`}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Only templates with repeatable fields are shown
                </p>
              </div>

              {/* Bundle Builder */}
              {formData.bundleTemplateId && (
                <BundleBuilder
                  bundleTemplateId={formData.bundleTemplateId}
                  bundleItems={formData.bundleItems}
                  onChange={(items) => setFormData({ ...formData, bundleItems: items })}
                />
              )}

              {!formData.bundleTemplateId && (
                <div className="p-4 bg-card/50 rounded border border-input text-center">
                  <p className="text-muted-foreground">Select a template to configure bundle items</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Media */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Media</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Video URL
              </label>
              <input
                type="url"
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                className="w-full px-4 py-2 bg-muted border border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Video Thumbnail URL
              </label>
              <input
                type="url"
                value={formData.videoThumbnail}
                onChange={(e) => setFormData({ ...formData, videoThumbnail: e.target.value })}
                className="w-full px-4 py-2 bg-muted border border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                placeholder="https://example.com/thumbnail.jpg"
              />
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Categories</h2>
              <p className="text-sm text-muted-foreground">
                Select which categories this product belongs to
              </p>
            </div>
            <a
              href="/dashboard/categories"
              target="_blank"
              className="text-sm text-primary hover:text-primary/80"
            >
              + Manage Categories
            </a>
          </div>

          <CategoryTreeSelect
            value={categoryIds}
            onChange={setCategoryIds}
          />
        </div>

        {/* Images */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Images</h2>
            <button
              type="button"
              onClick={addImage}
              className="text-sm text-primary hover:text-primary/80"
            >
              + Add Image
            </button>
          </div>

          {images.map((image, index) => (
            <div key={index} className="flex gap-4 mb-3 items-start">
              <div className="flex-1">
                <input
                  type="url"
                  value={image.url}
                  onChange={(e) => updateImage(index, "url", e.target.value)}
                  placeholder="Image URL (https://...)"
                  className="w-full px-4 py-2 bg-muted border border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                />
              </div>
              <input
                type="text"
                value={image.alt || ""}
                onChange={(e) => updateImage(index, "alt", e.target.value)}
                placeholder="Alt text"
                className="w-40 px-4 py-2 bg-muted border border-input text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              />
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="px-3 py-2 text-destructive hover:text-destructive/80 mt-1"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Settings */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Settings</h2>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-primary bg-muted border-input rounded focus:ring-ring"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-muted-foreground">
                Active (visible in store)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isFeatured"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="w-4 h-4 text-primary bg-muted border-input rounded focus:ring-ring"
              />
              <label htmlFor="isFeatured" className="text-sm font-medium text-muted-foreground">
                Featured Product
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isNew"
                checked={formData.isNew}
                onChange={(e) => setFormData({ ...formData, isNew: e.target.checked })}
                className="w-4 h-4 text-primary bg-muted border-input rounded focus:ring-ring"
              />
              <label htmlFor="isNew" className="text-sm font-medium text-muted-foreground">
                Mark as New
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-6 border-t border-border">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-input text-muted-foreground rounded-lg hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary text-primary-foreground text-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Product"}
          </button>
        </div>
      </form>
    </div>
  );
}
