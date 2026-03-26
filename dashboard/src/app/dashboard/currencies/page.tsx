/**
 * Currencies Management Page
 *
 * CRUD interface for managing store currencies and exchange rates
 */

"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function CurrenciesPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    symbol: "",
    exchangeRate: "1.0000",
    isActive: true,
  });

  const fetchCurrencies = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/currencies");
      const data = await res.json();

      if (data.success) {
        setCurrencies(data.data);
      } else {
        setError(data.error || "Failed to load currencies");
      }
    } catch (err) {
      setError("Failed to load currencies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const handleCreate = () => {
    setEditingCurrency(null);
    setFormData({
      code: "",
      name: "",
      symbol: "",
      exchangeRate: "1.0000",
      isActive: true,
    });
    setModalOpen(true);
  };

  const handleEdit = (currency: Currency) => {
    setEditingCurrency(currency);
    setFormData({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      exchangeRate: currency.exchangeRate,
      isActive: currency.isActive,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete the currency "${code}"?`)) return;

    try {
      const res = await fetch(`/api/currencies/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        fetchCurrencies();
      } else {
        toast.error(data.error || "Failed to delete currency");
      }
    } catch (err) {
      toast.error("Failed to delete currency");
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingCurrency
        ? `/api/currencies/${editingCurrency.id}`
        : "/api/currencies";
      const method = editingCurrency ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (result.success) {
        fetchCurrencies();
        setModalOpen(false);
      } else {
        toast.error(result.error || "Failed to save currency");
      }
    } catch (err) {
      toast.error("Failed to save currency");
    } finally {
      setSaving(false);
    }
  };

  const filteredCurrencies = currencies.filter((c) =>
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Currencies</h1>
          <p className="text-muted-foreground mt-1">
            Manage supported currencies and exchange rates
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors"
        >
          Add Currency
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search currencies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md px-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading currencies...</div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">{error}</div>
      ) : filteredCurrencies.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery ? "No currencies found matching your search." : "No currencies yet. Create your first currency!"}
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Exchange Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCurrencies.map((currency) => (
                <tr key={currency.id} className="hover:bg-accent">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono text-foreground font-medium">{currency.code}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-foreground">
                    {currency.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-foreground">
                    {currency.symbol}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-foreground">
                    {parseFloat(currency.exchangeRate).toFixed(4)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        currency.isActive
                          ? "bg-success/20 text-success"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {currency.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => handleEdit(currency)}
                      className="text-primary hover:text-primary/80 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(currency.id, currency.code)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg border border-border w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">
              {editingCurrency ? "Edit Currency" : "Add Currency"}
            </h2>

            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Currency Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  maxLength={3}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="USD"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">3-letter ISO code (e.g., USD, EUR)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Currency Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="US Dollar"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Symbol *
                </label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="$"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Exchange Rate (to USD)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={formData.exchangeRate}
                  onChange={(e) => setFormData({ ...formData, exchangeRate: e.target.value })}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="1.0000"
                />
                <p className="text-xs text-muted-foreground mt-1">Rate relative to base currency (USD)</p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-border bg-card text-primary focus:ring-2 focus:ring-ring"
                />
                <label htmlFor="isActive" className="text-sm text-muted-foreground">
                  Active
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingCurrency ? "Save Changes" : "Add Currency"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
