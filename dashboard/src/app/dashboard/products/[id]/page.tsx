"use client";

/**
 * Product Edit Page
 *
 * Edit an existing product with platforms and images
 */

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

interface Platform {
  id?: string;
  name: string;
  region?: string;
}

interface Image {
  id?: string;
  url: string;
  alt?: string;
  order?: number;
}

interface InventoryTemplate {
  id: string;
  name: string;
  description: string | null;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  inventoryTemplateId: string | null;
  isActive: boolean;
  platforms: Platform[];
  images: Image[];
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [templates, setTemplates] = useState<InventoryTemplate[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    price: "",
    inventoryTemplateId: "",
    isActive: true,
  });

  const [platforms, setPlatforms] = useState<Platform[]>([{ name: "", region: "" }]);
  const [images, setImages] = useState<Image[]>([{ url: "", alt: "", order: 0 }]);

  useEffect(() => {
    async function loadData() {
      try {
        // Load templates
        const templatesResponse = await fetch("/api/inventory/templates");
        const templatesResult = await templatesResponse.json();
        if (templatesResult.success) {
          setTemplates(templatesResult.data);
        }

        // Load product
        const productResponse = await fetch(`/api/products/${productId}`);
        if (productResponse.status === 404) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const productResult = await productResponse.json();
        if (productResult.success) {
          const product: Product = productResult.data;
          setFormData({
            name: product.name,
            slug: product.slug,
            description: product.description || "",
            price: product.price,
            inventoryTemplateId: product.inventoryTemplateId || "",
            isActive: product.isActive,
          });

          if (product.platforms && product.platforms.length > 0) {
            setPlatforms(product.platforms);
          }

          if (product.images && product.images.length > 0) {
            const sortedImages = product.images.sort((a, b) => (a.order || 0) - (b.order || 0));
            setImages(sortedImages);
          }
        } else {
          setError(productResult.error || "Failed to load product");
        }
      } catch (err) {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }

    if (productId) {
      loadData();
    }
  }, [productId]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleNameChange = (value: string) => {
    setFormData({ ...formData, name: value, slug: generateSlug(value) });
  };

  const addPlatform = () => {
    setPlatforms([...platforms, { name: "", region: "" }]);
  };

  const removePlatform = (index: number) => {
    setPlatforms(platforms.filter((_, i) => i !== index));
  };

  const updatePlatform = (index: number, field: keyof Platform, value: string) => {
    const newPlatforms = [...platforms];
    newPlatforms[index][field] = value;
    setPlatforms(newPlatforms);
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
    newImages[index][field] = value;
    setImages(newImages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const validPlatforms = platforms.filter((p) => p.name.trim() !== "");
      const validImages = images.filter((img) => img.url.trim() !== "");

      const response = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          price: formData.price,
          platforms: validPlatforms,
          images: validImages,
        }),
      });

      const result = await response.json();

      if (result.success) {
        router.push("/dashboard/products");
      } else {
        setError(result.error || "Failed to update product");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading product...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Product Not Found</h1>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-sm p-6 text-center">
          <p className="text-slate-400 mb-4">The product you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push("/dashboard/products")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Edit Product</h1>
        <p className="text-slate-400">Update product details</p>
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
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Slug *
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                required
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Price (USD) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
              />
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

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
            />
          </div>

          <div className="mt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-700 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-300">Active</span>
            </label>
          </div>
        </div>

        {/* Platforms */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Platforms</h2>
            <button
              type="button"
              onClick={addPlatform}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              + Add Platform
            </button>
          </div>

          {platforms.map((platform, index) => (
            <div key={index} className="flex gap-4 mb-3">
              <input
                type="text"
                value={platform.name}
                onChange={(e) => updatePlatform(index, "name", e.target.value)}
                placeholder="Platform name (e.g., Steam, Epic Games)"
                className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
              />
              <input
                type="text"
                value={platform.region || ""}
                onChange={(e) => updatePlatform(index, "region", e.target.value)}
                placeholder="Region (optional)"
                className="w-40 px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
              />
              {platforms.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePlatform(index)}
                  className="px-3 py-2 text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
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

        {/* Actions */}
        <div className="flex justify-between pt-6 border-t border-slate-800">
          <button
            type="button"
            onClick={async () => {
              if (confirm("Are you sure you want to delete this product?")) {
                const response = await fetch(`/api/products/${productId}`, {
                  method: "DELETE",
                });
                if (response.ok) {
                  router.push("/dashboard/products");
                }
              }
            }}
            className="px-6 py-2 text-red-400 hover:text-red-300"
          >
            Delete Product
          </button>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
