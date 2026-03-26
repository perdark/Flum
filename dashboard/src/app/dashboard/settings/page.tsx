/**
 * Settings Page
 *
 * Global settings for Fulmen Empire store
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isActive: boolean;
}

interface StoreSettings {
  id: string;
  storeName: string;
  description: string | null;
  storeUrl: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  defaultCurrencyId: string | null;
  defaultLanguage: string;
  contactEmail: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  allowGuestCheckout: boolean;
  requireEmailVerification: boolean;
  enableReviews: boolean;
  autoApproveReviews: boolean;
  pointsPerDollar: number;
  maxPointsRedemption: number;
  timezone: string;
  dateFormat: string;
  metaTitle: string | null;
  metaDescription: string | null;
  googleAnalyticsId: string | null;
  facebookPixelId: string | null;
  defaultCurrency?: Currency;
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [activeTab, setActiveTab] = useState("general");

  const [formData, setFormData] = useState<Partial<StoreSettings>>({
    storeName: "Fulmen Empire",
    description: "",
    storeUrl: "",
    logoUrl: "",
    faviconUrl: "",
    defaultCurrencyId: "",
    defaultLanguage: "en",
    contactEmail: "",
    supportEmail: "",
    supportPhone: "",
    maintenanceMode: false,
    maintenanceMessage: "",
    allowGuestCheckout: true,
    requireEmailVerification: false,
    enableReviews: true,
    autoApproveReviews: false,
    pointsPerDollar: 10,
    maxPointsRedemption: 1000,
    timezone: "UTC",
    dateFormat: "MM/DD/YYYY",
    metaTitle: "",
    metaDescription: "",
    googleAnalyticsId: "",
    facebookPixelId: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load settings
      const settingsRes = await fetch("/api/store-settings");
      if (!settingsRes.ok) {
        router.push("/dashboard");
        return;
      }
      const settingsData = await settingsRes.json();
      if (settingsData.success) {
        setFormData(settingsData.data);
      }

      // Load currencies
      const currenciesRes = await fetch("/api/currencies");
      const currenciesData = await currenciesRes.json();
      if (currenciesData.success) {
        setCurrencies(currenciesData.data.filter((c: Currency) => c.isActive));
      }
    } catch (err) {
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/store-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (result.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || "Failed to save settings");
      }
    } catch (err) {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof StoreSettings, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  const tabs = [
    { id: "general", label: "General", icon: "⚙️" },
    { id: "localization", label: "Localization", icon: "🌐" },
    { id: "checkout", label: "Checkout", icon: "🛒" },
    { id: "seo", label: "SEO & Analytics", icon: "📊" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your Fulmen Empire store settings
          </p>
        </div>
        {success && (
          <div className="px-4 py-2 bg-success/20 text-success border border-success/30 rounded-lg">
            Settings saved successfully!
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive border border-destructive/30 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="bg-background rounded-xl border border-border p-4 h-fit">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? "bg-amber-600/20 text-brand border border-amber-600/30"
                      : "text-foreground hover:bg-secondary"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
              <a
                href="/dashboard/currencies"
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-foreground hover:bg-secondary transition-colors"
              >
                <span>💰</span>
                <span>Currencies</span>
              </a>
            </nav>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* General Settings */}
            {activeTab === "general" && (
              <>
                <div className="bg-background rounded-xl border border-border p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">General Settings</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Store Name
                      </label>
                      <input
                        type="text"
                        value={formData.storeName || ""}
                        onChange={(e) => updateField("storeName", e.target.value)}
                        className="w-full px-3 py-2 bg-secondary border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        The name displayed in your storefront
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Store Description
                      </label>
                      <textarea
                        rows={3}
                        value={formData.description || ""}
                        onChange={(e) => updateField("description", e.target.value)}
                        className="w-full px-3 py-2 bg-secondary border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Store URL
                      </label>
                      <input
                        type="url"
                        value={formData.storeUrl || ""}
                        onChange={(e) => updateField("storeUrl", e.target.value)}
                        className="w-full px-3 py-2 bg-secondary border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="https://yourstore.com"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Logo URL
                        </label>
                        <input
                          type="url"
                          value={formData.logoUrl || ""}
                          onChange={(e) => updateField("logoUrl", e.target.value)}
                          className="w-full px-3 py-2 bg-secondary border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                          placeholder="https://example.com/logo.png"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Favicon URL
                        </label>
                        <input
                          type="url"
                          value={formData.faviconUrl || ""}
                          onChange={(e) => updateField("faviconUrl", e.target.value)}
                          className="w-full px-3 py-2 bg-secondary border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                          placeholder="https://example.com/favicon.ico"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Default Currency
                      </label>
                      <select
                        value={formData.defaultCurrencyId || ""}
                        onChange={(e) => updateField("defaultCurrencyId", e.target.value)}
                        className="w-full px-3 py-2 bg-secondary border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="">Select a currency...</option>
                        {currencies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code} - {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between py-3 border-t border-border">
                      <div>
                        <p className="text-sm font-medium text-foreground">Maintenance Mode</p>
                        <p className="text-xs text-muted-foreground">
                          Temporarily disable the storefront
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateField("maintenanceMode", !formData.maintenanceMode)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          formData.maintenanceMode ? "bg-amber-600" : "bg-secondary"
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            formData.maintenanceMode ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {formData.maintenanceMode && (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Maintenance Message
                        </label>
                        <textarea
                          rows={2}
                          value={formData.maintenanceMessage || ""}
                          onChange={(e) => updateField("maintenanceMessage", e.target.value)}
                          className="w-full px-3 py-2 bg-secondary border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                          placeholder="We're currently performing maintenance. Please check back soon."
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Settings */}
                <div className="bg-background rounded-xl border border-border p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Contact Information</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Contact Email
                      </label>
                      <input
                        type="email"
                        value={formData.contactEmail || ""}
                        onChange={(e) => updateField("contactEmail", e.target.value)}
                        className="w-full px-3 py-2 bg-secondary border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="contact@store.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Support Email
                      </label>
                      <input
                        type="email"
                        value={formData.supportEmail || ""}
                        onChange={(e) => updateField("supportEmail", e.target.value)}
                        className="w-full px-3 py-2 bg-secondary border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="support@store.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Support Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.supportPhone || ""}
                        onChange={(e) => updateField("supportPhone", e.target.value)}
                        className="w-full px-3 py-2 bg-secondary border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Localization Settings */}
            {activeTab === "localization" && (
              <div className="bg-background rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Localization</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Default Language
                    </label>
                    <select
                      value={formData.defaultLanguage || "en"}
                      onChange={(e) => updateField("defaultLanguage", e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="en">English</option>
                      <option value="ar">العربية (Arabic)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Timezone
                    </label>
                    <select
                      value={formData.timezone || "UTC"}
                      onChange={(e) => updateField("timezone", e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time (US)</option>
                      <option value="America/Chicago">Central Time (US)</option>
                      <option value="America/Denver">Mountain Time (US)</option>
                      <option value="America/Los_Angeles">Pacific Time (US)</option>
                      <option value="Europe/London">GMT (London)</option>
                      <option value="Europe/Paris">CET (Paris)</option>
                      <option value="Asia/Riyadh">AST (Riyadh)</option>
                      <option value="Asia/Dubai">GST (Dubai)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Date Format
                    </label>
                    <select
                      value={formData.dateFormat || "MM/DD/YYYY"}
                      onChange={(e) => updateField("dateFormat", e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Checkout Settings */}
            {activeTab === "checkout" && (
              <div className="bg-background rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Checkout Settings</h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">Guest Checkout</p>
                      <p className="text-xs text-muted-foreground">
                        Allow customers to checkout without creating an account
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateField("allowGuestCheckout", !formData.allowGuestCheckout)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        formData.allowGuestCheckout ? "bg-primary" : "bg-secondary"
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          formData.allowGuestCheckout ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">Email Verification</p>
                      <p className="text-xs text-muted-foreground">
                        Require email verification for new accounts
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateField("requireEmailVerification", !formData.requireEmailVerification)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        formData.requireEmailVerification ? "bg-primary" : "bg-secondary"
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          formData.requireEmailVerification ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Auto-approve Reviews</p>
                      <p className="text-xs text-muted-foreground">
                        Automatically approve customer reviews
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateField("autoApproveReviews", !formData.autoApproveReviews)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        formData.autoApproveReviews ? "bg-primary" : "bg-secondary"
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          formData.autoApproveReviews ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Points & Rewards */}
                  <div className="pt-4 border-t border-border">
                    <h3 className="text-md font-semibold text-foreground mb-4">Points & Rewards</h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Points per Dollar
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.pointsPerDollar || 10}
                          onChange={(e) => updateField("pointsPerDollar", parseInt(e.target.value) || 10)}
                          className="w-full px-3 py-2 bg-secondary border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Points earned per $1 spent
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Max Redemption
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.maxPointsRedemption || 1000}
                          onChange={(e) => updateField("maxPointsRedemption", parseInt(e.target.value) || 1000)}
                          className="w-full px-3 py-2 bg-secondary border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Max points per order
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SEO & Analytics */}
            {activeTab === "seo" && (
              <div className="bg-background rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">SEO & Analytics</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Meta Title
                    </label>
                    <input
                      type="text"
                      value={formData.metaTitle || ""}
                      onChange={(e) => updateField("metaTitle", e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Fulmen Empire - Digital Products Store"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Default title for search engines
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Meta Description
                    </label>
                    <textarea
                      rows={2}
                      value={formData.metaDescription || ""}
                      onChange={(e) => updateField("metaDescription", e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Your destination for premium digital products"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Google Analytics ID
                      </label>
                      <input
                        type="text"
                        value={formData.googleAnalyticsId || ""}
                        onChange={(e) => updateField("googleAnalyticsId", e.target.value)}
                        className="w-full px-3 py-2 bg-secondary border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="G-XXXXXXXXXX"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Facebook Pixel ID
                      </label>
                      <input
                        type="text"
                        value={formData.facebookPixelId || ""}
                        onChange={(e) => updateField("facebookPixelId", e.target.value)}
                        className="w-full px-3 py-2 bg-secondary border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="XXXXXXXXXX"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 text-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
