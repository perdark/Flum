"use client";

/**
 * New Product Page — stepped wizard (minimal full-page scroll; panel scrolls inside).
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CategoryTreeSelect } from "@/components/dashboard/CategoryTreeSelect";
import { BundleBuilder, BundleItem } from "@/components/dashboard/BundleBuilder";
import { cn } from "@/lib/utils";
import { Check, ChevronRight } from "lucide-react";

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

const FORM_STEPS = [
  { id: "basics", label: "Basics", hint: "Name & descriptions" },
  { id: "pricing", label: "Pricing", hint: "Cost & sell price" },
  { id: "inventory", label: "Inventory", hint: "Delivery & template" },
  { id: "options", label: "Options", hint: "Purchase options & regions" },
  { id: "bundle", label: "Bundle", hint: "Optional bundle product" },
  { id: "media", label: "Media", hint: "Video links" },
  { id: "categories", label: "Categories", hint: "Where it appears" },
  { id: "finish", label: "Images & publish", hint: "Gallery & visibility" },
] as const;

const stepMotion = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -12 },
  transition: { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] as const },
};

export default function NewProductPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
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
    isBundle: false,
    bundleTemplateId: "",
    bundleItems: [] as BundleItem[],
  });

  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [images, setImages] = useState<Image[]>([{ url: "", alt: "", order: 0 }]);

  const lastStep = FORM_STEPS.length - 1;

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
    newImages.forEach((img, i) => (img.order = i));
    setImages(newImages);
  };

  const updateImage = (index: number, field: "url" | "alt", value: string) => {
    const newImages = [...images];
    newImages[index] = { ...newImages[index], [field]: value };
    setImages(newImages);
  };

  const submitProduct = async () => {
    setError(null);
    if (!formData.name.trim()) {
      setError("Product name is required.");
      setStep(0);
      return;
    }
    const priceNum = parseFloat(formData.basePrice);
    if (formData.basePrice.trim() === "" || Number.isNaN(priceNum) || priceNum < 0) {
      setError("Enter a valid base price (USD).");
      setStep(1);
      return;
    }
    setLoading(true);

    try {
      const validImages = images.filter((img) => img.url.trim() !== "");
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
          compareAtPrice:
            formData.enableDiscount && formData.compareAtPrice ? parseFloat(formData.compareAtPrice) : undefined,
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
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < lastStep) {
      goNext();
      return;
    }
    void submitProduct();
  };

  const goNext = () => {
    setError(null);
    if (step === 0 && !formData.name.trim()) {
      setError("Enter a product name to continue.");
      return;
    }
    if (step === 1) {
      const p = parseFloat(formData.basePrice);
      if (formData.basePrice.trim() === "" || Number.isNaN(p) || p < 0) {
        setError("Enter a valid base price to continue.");
        return;
      }
    }
    setStep((s) => Math.min(s + 1, lastStep));
  };
  const goBack = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-4.5rem)] min-h-[480px] max-w-6xl mx-auto">
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-3 border-b border-border/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">New product</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Step-by-step — only this panel scrolls</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums font-medium text-foreground">
            {step + 1} / {FORM_STEPS.length}
          </span>
          <div className="hidden sm:block h-1 w-24 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={false}
              animate={{ width: `${((step + 1) / FORM_STEPS.length) * 100}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-destructive/10 text-destructive border border-destructive/30 rounded-lg text-sm shrink-0">
          {error}
        </div>
      )}

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row gap-4 pt-4">
        {/* Step rail */}
        <nav
          className="shrink-0 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-y-auto lg:max-h-full pb-1 lg:pb-0 lg:w-52 lg:pr-2 scrollbar-thin"
          aria-label="Form steps"
        >
          {FORM_STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                "flex-shrink-0 text-left rounded-xl px-3 py-2.5 transition-all duration-200 border",
                i === step
                  ? "bg-primary/15 border-primary/40 text-foreground shadow-sm"
                  : i < step
                    ? "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"
                    : "bg-transparent border-transparent text-muted-foreground hover:bg-muted/30"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                    i < step ? "bg-emerald-500/20 text-emerald-600" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-tight">{s.label}</div>
                  <div className="text-[10px] text-muted-foreground truncate hidden sm:block">{s.hint}</div>
                </div>
              </div>
            </button>
          ))}
        </nav>

        <form
          onSubmit={handleFormSubmit}
          className="flex flex-1 flex-col min-h-0 rounded-xl border border-border bg-card shadow-md shadow-black/[0.06] overflow-hidden"
        >
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6">
            <AnimatePresence mode="wait">
              <motion.div key={step} {...stepMotion} className="space-y-6">
                {step === 0 && (
                  <>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground mb-1">Basic information</h2>
                      <p className="text-sm text-muted-foreground mb-4">How the product appears in the catalog</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-2">Product name *</label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            required
                            className="w-full px-4 py-2.5 bg-muted border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground transition-shadow"
                            placeholder="e.g., Steam Game Account"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-2">Arabic name</label>
                          <input
                            type="text"
                            value={formData.nameAr}
                            onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                            className="w-full px-4 py-2.5 bg-muted border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground text-right transition-shadow"
                            placeholder="اسم المنتج"
                            dir="rtl"
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-muted-foreground mb-2">Description</label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={4}
                          className="w-full px-4 py-2.5 bg-muted border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground transition-shadow"
                          placeholder="Product description…"
                        />
                      </div>
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-muted-foreground mb-2">Arabic description</label>
                        <textarea
                          value={formData.descriptionAr}
                          onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                          rows={4}
                          className="w-full px-4 py-2.5 bg-muted border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground text-right transition-shadow"
                          placeholder="وصف المنتج…"
                          dir="rtl"
                        />
                      </div>
                    </div>
                  </>
                )}

                {step === 1 && (
                  <div>
                    <h2 className="text-lg font-semibold text-foreground mb-1">Pricing</h2>
                    <p className="text-sm text-muted-foreground mb-4">Cost basis and customer-facing price</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">Cost (USD)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.cost}
                          onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                          className="w-full px-4 py-2.5 bg-muted border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                          placeholder="15.00"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Internal cost</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">Price (USD) *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.basePrice}
                          onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                          required
                          className="w-full px-4 py-2.5 bg-muted border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                          placeholder="29.99"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Selling price</p>
                      </div>
                      <div>
                        <label className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            checked={formData.enableDiscount}
                            onChange={(e) => setFormData({ ...formData, enableDiscount: e.target.checked })}
                            className="w-4 h-4 rounded border-input"
                          />
                          <span className="text-sm font-medium text-muted-foreground">Enable compare-at price</span>
                        </label>
                        {formData.enableDiscount && (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.compareAtPrice}
                            onChange={(e) => setFormData({ ...formData, compareAtPrice: e.target.value })}
                            className="w-full px-4 py-2.5 bg-muted border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                            placeholder="39.99"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <h2 className="text-lg font-semibold text-foreground mb-1">Inventory & delivery</h2>
                    <p className="text-sm text-muted-foreground mb-4">How fulfillment runs</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">Delivery type *</label>
                        <select
                          value={formData.deliveryType}
                          onChange={(e) => setFormData({ ...formData, deliveryType: e.target.value })}
                          required
                          className="w-full px-4 py-2.5 bg-muted border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="manual">Manual</option>
                          <option value="auto">Automatic</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">Inventory template</label>
                        <select
                          value={formData.inventoryTemplateId}
                          onChange={(e) => setFormData({ ...formData, inventoryTemplateId: e.target.value })}
                          className="w-full px-4 py-2.5 bg-muted border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">None — manual delivery</option>
                          {templates.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name} {template.description && `— ${template.description}`}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formData.inventoryTemplateId
                            ? "Stock rows auto-fulfill from inventory."
                            : "No template — fulfill from Orders manually."}
                        </p>
                      </div>
                    </div>
                    {!formData.inventoryTemplateId && (
                      <div className="mt-4 p-3 bg-warning/10 border border-warning/30 rounded-xl text-warning text-sm max-w-3xl">
                        <strong>Manual mode:</strong> no stock tracking; orders stay pending for staff fulfillment.
                      </div>
                    )}
                  </div>
                )}

                {step === 3 && (
                  <div>
                    <h2 className="text-lg font-semibold text-foreground mb-1">Purchase options & regions</h2>
                    <p className="text-sm text-muted-foreground mb-4">Optional advanced pricing axes</p>
                    <div className="space-y-3 mb-4">
                      {formData.purchaseOptions.map((opt, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end bg-muted/40 p-3 rounded-xl border border-input"
                        >
                          <div>
                            <label className="text-xs text-muted-foreground">Slug</label>
                            <input
                              className="w-full px-2 py-1.5 bg-muted border border-input rounded-lg text-sm"
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
                              className="w-full px-2 py-1.5 bg-muted border border-input rounded-lg text-sm"
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
                            <label className="text-xs text-muted-foreground">Field keys (comma-separated)</label>
                            <input
                              className="w-full px-2 py-1.5 bg-muted border border-input rounded-lg text-sm"
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
                        className="text-sm text-primary font-medium"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            purchaseOptions: [...formData.purchaseOptions, { slug: "", label: "", fieldKeys: "" }],
                          })
                        }
                      >
                        + Add purchase option
                      </button>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-foreground">Region prices</h3>
                      {formData.regionPrices.map((rp, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end bg-muted/40 p-3 rounded-xl border border-input"
                        >
                          <div>
                            <label className="text-xs text-muted-foreground">Region code</label>
                            <input
                              className="w-full px-2 py-1.5 bg-muted border border-input rounded-lg text-sm"
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
                              className="w-full px-2 py-1.5 bg-muted border border-input rounded-lg text-sm"
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
                              className="w-full px-2 py-1.5 bg-muted border border-input rounded-lg text-sm"
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
                        className="text-sm text-primary font-medium"
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
                )}

                {step === 4 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">Bundle</h2>
                        <p className="text-sm text-muted-foreground">Sell multiple products as one listing</p>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isBundle}
                          onChange={(e) => setFormData({ ...formData, isBundle: e.target.checked })}
                          className="w-4 h-4 rounded border-input"
                        />
                        <span className="text-sm text-muted-foreground">Bundle product</span>
                      </label>
                    </div>
                    {formData.isBundle && (
                      <div className="bg-muted/50 p-4 rounded-xl border border-input space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-2">Bundle template *</label>
                          <select
                            value={formData.bundleTemplateId}
                            onChange={(e) => setFormData({ ...formData, bundleTemplateId: e.target.value })}
                            className="w-full px-4 py-2.5 bg-muted border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="">Select a template…</option>
                            {templates
                              .filter((t) => t.fieldsSchema && t.fieldsSchema.some((f: { repeatable?: boolean }) => f.repeatable))
                              .map((template) => (
                                <option key={template.id} value={template.id}>
                                  {template.name}
                                </option>
                              ))}
                          </select>
                          <p className="text-xs text-muted-foreground mt-1">Templates with repeatable fields only</p>
                        </div>
                        {formData.bundleTemplateId && (
                          <BundleBuilder
                            bundleTemplateId={formData.bundleTemplateId}
                            bundleItems={formData.bundleItems}
                            onChange={(items) => setFormData({ ...formData, bundleItems: items })}
                          />
                        )}
                        {!formData.bundleTemplateId && (
                          <div className="p-4 bg-card/50 rounded-lg border border-dashed border-input text-center text-sm text-muted-foreground">
                            Choose a template to configure bundle lines
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {step === 5 && (
                  <div>
                    <h2 className="text-lg font-semibold text-foreground mb-1">Media</h2>
                    <p className="text-sm text-muted-foreground mb-4">Optional video assets</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">Video URL</label>
                        <input
                          type="url"
                          value={formData.videoUrl}
                          onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                          className="w-full px-4 py-2.5 bg-muted border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                          placeholder="https://…"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">Video thumbnail URL</label>
                        <input
                          type="url"
                          value={formData.videoThumbnail}
                          onChange={(e) => setFormData({ ...formData, videoThumbnail: e.target.value })}
                          className="w-full px-4 py-2.5 bg-muted border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                          placeholder="https://…"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step === 6 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-lg font-semibold text-foreground mb-1">Categories</h2>
                        <p className="text-sm text-muted-foreground">Where this product appears in the tree</p>
                      </div>
                      <a
                        href="/dashboard/categories"
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Manage categories ↗
                      </a>
                    </div>
                    <CategoryTreeSelect value={categoryIds} onChange={setCategoryIds} />
                  </div>
                )}

                {step === 7 && (
                  <div className="space-y-8">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-foreground">Images</h2>
                        <button
                          type="button"
                          onClick={addImage}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          + Add image
                        </button>
                      </div>
                      {images.map((image, index) => (
                        <div key={index} className="flex flex-col sm:flex-row gap-3 mb-3 items-start">
                          <div className="flex-1 w-full">
                            <input
                              type="url"
                              value={image.url}
                              onChange={(e) => updateImage(index, "url", e.target.value)}
                              placeholder="Image URL"
                              className="w-full px-4 py-2.5 bg-muted border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                            />
                          </div>
                          <input
                            type="text"
                            value={image.alt || ""}
                            onChange={(e) => updateImage(index, "alt", e.target.value)}
                            placeholder="Alt text"
                            className="w-full sm:w-40 px-4 py-2.5 bg-muted border border-input text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                          />
                          {images.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="text-sm text-destructive px-2 py-2"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground mb-4">Visibility</h2>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.isActive}
                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            className="w-4 h-4 rounded border-input"
                          />
                          <span className="text-sm text-muted-foreground">Active (visible in store)</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.isFeatured}
                            onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                            className="w-4 h-4 rounded border-input"
                          />
                          <span className="text-sm text-muted-foreground">Featured</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.isNew}
                            onChange={(e) => setFormData({ ...formData, isNew: e.target.checked })}
                            className="w-4 h-4 rounded border-input"
                          />
                          <span className="text-sm text-muted-foreground">Mark as new</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="shrink-0 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-t border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2.5 text-sm border border-input text-muted-foreground rounded-xl hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={step === 0}
                onClick={goBack}
                className="px-4 py-2.5 text-sm rounded-xl border border-input text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Back
              </button>
              {step < lastStep ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:opacity-95 transition-opacity"
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-95 disabled:opacity-50 transition-opacity"
                >
                  {loading ? "Creating…" : "Create product"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
