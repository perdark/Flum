"use client";

/**
 * New Product Page
 *
 * Form to create a new product with category tree selection, images,
 * multi-sell configuration, and bundle builder
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
    // Multi-sell fields
    multiSellEnabled: false,
    multiSellFactor: 5,
    cooldownEnabled: false,
    cooldownDurationHours: 12,
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
        <h1 className="text-2xl font-bold text-white">New Product</h1>
        <p className="text-slate-400">Create a new digital product</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-950/50 text-red-400 border border-red-900 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-lg shadow-sm p-6">
        {/* Basic Information */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
                placeholder="e.g., Steam Game Account"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Arabic Name (الاسم بالعربية)
              </label>
              <input
                type="text"
                value={formData.nameAr}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500 text-right"
                placeholder="اسم المنتج"
                dir="rtl"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
              placeholder="Product description..."
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Arabic Description (الوصف بالعربية)
            </label>
            <textarea
              value={formData.descriptionAr}
              onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500 text-right"
              placeholder="وصف المنتج..."
              dir="rtl"
            />
          </div>
        </div>

        {/* Pricing */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Pricing</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Cost (USD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
                placeholder="15.00"
              />
              <p className="text-xs text-slate-500 mt-1">
                Your cost (internal use)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Price (USD) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                required
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
                placeholder="29.99"
              />
              <p className="text-xs text-slate-500 mt-1">
                Selling price
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={formData.enableDiscount}
                  onChange={(e) => setFormData({ ...formData, enableDiscount: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-700 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-300">Enable Discount</span>
              </label>
              {formData.enableDiscount && (
                <div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.compareAtPrice}
                    onChange={(e) => setFormData({ ...formData, compareAtPrice: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
                    placeholder="39.99"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Compare at price (original price)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Inventory & Delivery */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Inventory & Delivery</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Delivery Type *
              </label>
              <select
                value={formData.deliveryType}
                onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
                required
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="manual">Manual</option>
                <option value="auto">Automatic</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Inventory Template *
              </label>
              <select
                value={formData.inventoryTemplateId}
                onChange={(e) => setFormData({ ...formData, inventoryTemplateId: e.target.value })}
                required
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a template...</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} {template.description && `- ${template.description}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Multi-Sell Configuration */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Multi-Sell Configuration</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.multiSellEnabled}
                onChange={(e) => setFormData({ ...formData, multiSellEnabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-700 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-slate-300">Enable Multi-Sell</span>
            </label>
          </div>

          <p className="text-sm text-slate-400 mb-4">
            Allow this product to be sold multiple times before each unit enters cooldown
          </p>

          {formData.multiSellEnabled && (
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Sales Factor *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.multiSellFactor}
                    onChange={(e) => setFormData({ ...formData, multiSellFactor: parseInt(e.target.value) || 5 })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
                    placeholder="5"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    How many times each unit can be sold
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Enable Cooldown
                  </label>
                  <div className="flex items-center h-10">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.cooldownEnabled}
                        onChange={(e) => setFormData({ ...formData, cooldownEnabled: e.target.checked })}
                        className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-700 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-300">
                        {formData.cooldownEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </label>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Require cooldown between sales cycles
                  </p>
                </div>

                {formData.cooldownEnabled && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Cooldown Duration (hours) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.cooldownDurationHours}
                      onChange={(e) => setFormData({ ...formData, cooldownDurationHours: parseInt(e.target.value) || 12 })}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
                      placeholder="12"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Hours before unit can sell again
                    </p>
                  </div>
                )}
              </div>

              {formData.cooldownEnabled && (
                <div className="mt-3 text-xs text-slate-500">
                  <span className="text-yellow-400">⚠</span> After a unit reaches {formData.multiSellFactor} sales, it will enter cooldown for {formData.cooldownDurationHours} hour{formData.cooldownDurationHours > 1 ? "s" : ""} before becoming available again.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bundle Configuration */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Bundle Configuration</h2>
              <p className="text-sm text-slate-400">Group multiple products into one bundle product</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isBundle}
                onChange={(e) => setFormData({ ...formData, isBundle: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-700 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-slate-300">This is a Bundle Product</span>
            </label>
          </div>

          {formData.isBundle && (
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
              {/* Template Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Bundle Template *
                </label>
                <select
                  value={formData.bundleTemplateId}
                  onChange={(e) => setFormData({ ...formData, bundleTemplateId: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <p className="text-xs text-slate-500 mt-1">
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
                <div className="p-4 bg-slate-900/50 rounded border border-slate-700 text-center">
                  <p className="text-slate-500">Select a template to configure bundle items</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Media */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Media</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Video URL
              </label>
              <input
                type="url"
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Video Thumbnail URL
              </label>
              <input
                type="url"
                value={formData.videoThumbnail}
                onChange={(e) => setFormData({ ...formData, videoThumbnail: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
                placeholder="https://example.com/thumbnail.jpg"
              />
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Categories</h2>
              <p className="text-sm text-slate-400">
                Select which categories this product belongs to
              </p>
            </div>
            <a
              href="/dashboard/categories"
              target="_blank"
              className="text-sm text-blue-400 hover:text-blue-300"
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
            <h2 className="text-lg font-semibold text-white">Images</h2>
            <button
              type="button"
              onClick={addImage}
              className="text-sm text-blue-400 hover:text-blue-300"
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
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
                />
              </div>
              <input
                type="text"
                value={image.alt || ""}
                onChange={(e) => updateImage(index, "alt", e.target.value)}
                placeholder="Alt text"
                className="w-40 px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
              />
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="px-3 py-2 text-red-400 hover:text-red-300 mt-1"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Settings */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Settings</h2>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-700 rounded focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-slate-300">
                Active (visible in store)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isFeatured"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-700 rounded focus:ring-blue-500"
              />
              <label htmlFor="isFeatured" className="text-sm font-medium text-slate-300">
                Featured Product
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isNew"
                checked={formData.isNew}
                onChange={(e) => setFormData({ ...formData, isNew: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-700 rounded focus:ring-blue-500"
              />
              <label htmlFor="isNew" className="text-sm font-medium text-slate-300">
                Mark as New
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-6 border-t border-slate-800">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Product"}
          </button>
        </div>
      </form>
    </div>
  );
}
