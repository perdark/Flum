/**
 * Special Offers Management Page
 *
 * Admins can create, edit, and delete special offers
 * Modern card-based UI with animations
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Calendar,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Offer {
  id: string;
  name: string;
  slug: string;
  nameAr: string | null;
  description: string | null;
  type: string;
  value: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  displayType: string;
  displayPosition: number;
  backgroundColor: string | null;
  showCountdown: boolean;
  createdAt: string;
}

type FilterType = 'all' | 'active' | 'inactive' | 'hero' | 'banner' | 'card';

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    async function fetchOffers() {
      try {
        const response = await fetch('/api/offers');
        const data = await response.json();
        if (data.success) {
          setOffers(data.data);
        }
      } catch (error) {
        console.error('Error fetching offers:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchOffers();
  }, []);

  async function toggleActive(offerId: string, isActive: boolean) {
    const currentOffer = offers.find(o => o.id === offerId);
    if (!currentOffer) {
      console.warn(`Offer ${offerId} not found`);
      return;
    }

    try {
      const response = await fetch(`/api/offers/${offerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentOffer, isActive: !isActive }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Failed toggling offer:', errorData || response.statusText);
        return;
      }

      const updatedOffer = await response.json();
      if (updatedOffer?.success) {
        setOffers(prev => prev.map(o => o.id === offerId ? { ...o, isActive: !isActive } : o));
      } else {
        console.error('Failed toggling offer:', updatedOffer?.error);
      }
    } catch (error) {
      console.error('Error toggling offer:', error);
    }
  }

  async function deleteOffer(offerId: string) {
    if (!confirm('Are you sure you want to delete this offer?')) return;
    try {
      const response = await fetch(`/api/offers/${offerId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setOffers(offers.filter(o => o.id !== offerId));
      }
    } catch (error) {
      console.error('Error deleting offer:', error);
    }
  }

  // Filter and search offers
  const filteredOffers = offers.filter(offer => {
    const matchesSearch = offer.name.toLowerCase().includes(search.toLowerCase()) ||
      offer.slug.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' ||
      (filter === 'active' && offer.isActive) ||
      (filter === 'inactive' && !offer.isActive) ||
      (filter === 'hero' && offer.displayType === 'hero') ||
      (filter === 'banner' && offer.displayType === 'banner') ||
      (filter === 'card' && offer.displayType === 'card');
    return matchesSearch && matchesFilter;
  });

  // Stats
  const activeCount = offers.filter(o => o.isActive && new Date(o.endDate) >= new Date()).length;
  const expiredCount = offers.filter(o => new Date(o.endDate) < new Date()).length;
  const heroCount = offers.filter(o => o.displayType === 'hero').length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-800 rounded animate-pulse w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-slate-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Special Offers
          </h1>
          <p className="text-slate-400 mt-1">
            Manage discounts, deals, and promotions
          </p>
        </div>

        <Link href="/dashboard/offers/new">
          <button
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-amber-500/20 font-medium"
          >
            <Plus className="w-4 h-4" />
            New Offer
          </button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-xl p-5 border border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-400 text-sm font-medium">Active Offers</p>
              <p className="text-3xl font-bold text-white mt-1">{activeCount}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Tag className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl p-5 border border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-400 text-sm font-medium">Total Offers</p>
              <p className="text-3xl font-bold text-white mt-1">{offers.length}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500/10 to-orange-600/5 rounded-xl p-5 border border-amber-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-400 text-sm font-medium">Hero Offers</p>
              <p className="text-3xl font-bold text-white mt-1">{heroCount}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Eye className="w-6 h-6 text-amber-400" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-500/10 to-slate-600/5 rounded-xl p-5 border border-slate-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Expired</p>
              <p className="text-3xl font-bold text-white mt-1">{expiredCount}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-slate-500/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search offers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'active', 'inactive', 'hero', 'banner', 'card'] as FilterType[]).map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                filter === filterType
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700'
              )}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Offers Grid */}
      {filteredOffers.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
            <Tag className="w-10 h-10 text-slate-600" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {search ? 'No offers found' : 'No offers yet'}
          </h3>
          <p className="text-slate-400 mb-6">
            {search ? 'Try a different search term' : 'Create your first special offer'}
          </p>
          {!search && (
            <Link href="/dashboard/offers/new">
              <button className="px-6 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium">
                Create Offer
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOffers.map((offer, index) => {
            const isExpired = new Date(offer.endDate) < new Date();
            const displayTypeColors = {
              hero: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
              banner: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
              card: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
              modal: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
            };

            return (
              <div
                key={offer.id}
                className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden hover:border-slate-700 transition-colors group"
              >
                {/* Color bar */}
                <div
                  className="h-1.5 w-full"
                  style={{ backgroundColor: offer.backgroundColor || '#FFB800' }}
                />

                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold truncate">
                        {offer.name}
                      </h3>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {offer.slug}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <span
                        className={cn(
                          'px-2 py-1 rounded text-xs font-medium border capitalize',
                          displayTypeColors[offer.displayType as keyof typeof displayTypeColors] ||
                          'bg-slate-700 text-slate-300 border-slate-600'
                        )}
                      >
                        {offer.displayType}
                      </span>

                      <button
                        onClick={() => toggleActive(offer.id, offer.isActive)}
                        className={cn(
                          'p-1.5 rounded transition-colors',
                          offer.isActive
                            ? 'text-emerald-400 hover:bg-emerald-500/10'
                            : 'text-slate-400 hover:bg-slate-800'
                        )}
                      >
                        {offer.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Offer details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Discount</span>
                      <span className="text-white font-medium">
                        {offer.type === 'percentage' ? `${offer.value}%` : `$${offer.value}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Valid Until</span>
                      <span className={cn(
                        'font-medium',
                        isExpired ? 'text-red-400' : 'text-white'
                      )}>
                        {new Date(offer.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    {offer.showCountdown && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Countdown enabled</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                    <Link
                      href={`/dashboard/offers/${offer.id}/edit`}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Link>
                    <button
                      onClick={() => deleteOffer(offer.id)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
