/**
 * Edit Offer Page
 *
 * Edit an existing special offer with live preview
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Eye,
  Calendar,
  Tag,
  Palette,
  Clock,
  Link as LinkIcon,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const DISPLAY_TYPES = [
  { value: 'banner', label: 'Banner', description: 'Horizontal banner section' },
  { value: 'hero', label: 'Hero', description: 'Full-width hero carousel' },
  { value: 'card', label: 'Card', description: 'Grid card display' },
  { value: 'modal', label: 'Modal', description: 'Popup modal' },
];

const WARM_COLORS = [
  { name: 'Sunset', value: 'linear-gradient(135deg, #FF7F50 0%, #FFB800 100%)' },
  { name: 'Coral', value: 'linear-gradient(135deg, #F88379 0%, #DE6E70 100%)' },
  { name: 'Peach', value: 'linear-gradient(135deg, #FFB347 0%, #FFDAB9 100%)' },
  { name: 'Amber', value: 'linear-gradient(135deg, #FFB800 0%, #FFF5E6 100%)' },
  { name: 'Blue', value: 'linear-gradient(135deg, #0066FF 0%, #00D4FF 100%)' },
  { name: 'Custom', value: 'custom' },
];

interface OfferData {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  slug: string | null;
  type: string;
  value: string;
  minPurchase: string;
  maxDiscount: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  appliesTo: string;
  displayType: string;
  displayPosition: number;
  backgroundColor: string | null;
  textColor: string;
  showCountdown: boolean;
  ctaText: string | null;
  ctaTextAr: string | null;
  ctaLink: string | null;
  featuredImage: string | null;
  banner: string | null;
}

export default function EditOfferPage() {
  const router = useRouter();
  const params = useParams();
  const offerId = typeof params?.id === 'string' ? params.id : null;

  if (!offerId) {
    // Invalid route parameter; redirect to offers list.
    if (typeof window !== 'undefined') {
      router.push('/dashboard/offers');
    }
    return null;
  }

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    // Basic info
    name: '',
    nameAr: '',
    description: '',
    descriptionAr: '',
    slug: '',
    // Offer details
    type: 'percentage',
    value: '',
    minPurchase: '0',
    maxDiscount: '',
    startDate: '',
    endDate: '',
    isActive: true,
    appliesTo: 'all',
    // Display settings
    displayType: 'banner',
    displayPosition: 0,
    backgroundColor: '',
    textColor: '#FFFFFF',
    showCountdown: false,
    ctaText: 'Shop Now',
    ctaTextAr: '',
    ctaLink: '/products',
    featuredImage: '',
    banner: '',
  });

  const [showPreview, setShowPreview] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(WARM_COLORS[0]);

  // Fetch offer data
  useEffect(() => {
    async function fetchOffer() {
      try {
        const response = await fetch(`/api/offers/${offerId}`);

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          setError(errorBody?.error || 'Failed to load offer');
          setLoading(false);
          return;
        }

        const data = await response.json();

        if (data.success) {
          const offer: OfferData = data.data;
          setFormData({
            name: offer.name || '',
            nameAr: offer.nameAr || '',
            description: offer.description || '',
            descriptionAr: offer.descriptionAr || '',
            slug: offer.slug || '',
            type: offer.type || 'percentage',
            value: offer.value || '0',
            minPurchase: offer.minPurchase || '0',
            maxDiscount: offer.maxDiscount || '',
            startDate: (() => {
            const parsed = new Date(offer.startDate);
            return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 16);
          })(),
          endDate: (() => {
            const parsed = new Date(offer.endDate);
            return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 16);
          })(),
            isActive: offer.isActive ?? true,
            appliesTo: offer.appliesTo || 'all',
            displayType: offer.displayType || 'banner',
            displayPosition: offer.displayPosition || 0,
            backgroundColor: offer.backgroundColor || '',
            textColor: offer.textColor || '#FFFFFF',
            showCountdown: offer.showCountdown ?? false,
            ctaText: offer.ctaText || 'Shop Now',
            ctaTextAr: offer.ctaTextAr || '',
            ctaLink: offer.ctaLink || '/products',
            featuredImage: offer.featuredImage || '',
            banner: offer.banner || '',
          });

          // Set color preset
          if (offer.backgroundColor) {
            const matchingPreset = WARM_COLORS.find(c => c.value === offer.backgroundColor);
            if (matchingPreset) {
              setSelectedPreset(matchingPreset);
            } else {
              setSelectedPreset(WARM_COLORS.find(c => c.value === 'custom')!);
            }
          }
        } else {
          setError('Offer not found');
        }
      } catch (err) {
        console.error('Error fetching offer:', err);
        setError('Failed to load offer');
      } finally {
        setLoading(false);
      }
    }
    fetchOffer();
  }, [offerId]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const parsedStartDate = new Date(formData.startDate);
    const parsedEndDate = new Date(formData.endDate);

    if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
      alert('Please provide valid startDate and endDate');
      setSaving(false);
      return;
    }

    if (parsedEndDate.getTime() <= parsedStartDate.getTime()) {
      alert('End date must be after start date');
      setSaving(false);
      return;
    }

    const value = Number(formData.value);
    const minPurchase = Number(formData.minPurchase);
    const maxDiscount = formData.maxDiscount !== '' ? Number(formData.maxDiscount) : null;
    const displayPosition = Number.isInteger(Number(formData.displayPosition))
      ? parseInt(String(formData.displayPosition), 10)
      : 0;

    if (!Number.isFinite(value)) {
      alert('Please provide a valid offer value');
      setSaving(false);
      return;
    }

    if (!Number.isFinite(minPurchase)) {
      alert('Please provide a valid minimum purchase amount');
      setSaving(false);
      return;
    }

    if (maxDiscount !== null && !Number.isFinite(maxDiscount)) {
      alert('Please provide a valid max discount');
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(`/api/offers/${offerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          value,
          minPurchase,
          maxDiscount,
          displayPosition,
        }),
      });

      if (response.ok) {
        router.push('/dashboard/offers');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update offer');
      }
    } catch (error) {
      console.error('Error updating offer:', error);
      alert('Failed to update offer');
    } finally {
      setSaving(false);
    }
  };

  const getBackgroundStyle = () => {
    if (selectedPreset.value === 'custom' && formData.backgroundColor) {
      return { backgroundColor: formData.backgroundColor };
    }
    if (selectedPreset.value !== 'custom') {
      return { background: selectedPreset.value };
    }
    return { background: 'linear-gradient(135deg, #FF7F50 0%, #FFB800 100%)' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading offer...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-red-400 mb-4">{error}</div>
        <Link href="/dashboard/offers">
          <button className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700">
            Go Back
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/offers"
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center"
        >
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Edit Offer</h1>
          <p className="text-slate-400 text-sm">Update offer details and display settings</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5 text-amber-500" />
              Basic Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Offer Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g., Summer Sale 2024"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Arabic Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.nameAr}
                  onChange={(e) => handleChange('nameAr', e.target.value)}
                  placeholder="عربي"
                  dir="rtl"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => handleChange('slug', e.target.value)}
                  placeholder="summer-sale-2024"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Status
                </label>
                <select
                  value={formData.isActive.toString()}
                  onChange={(e) => handleChange('isActive', e.target.value === 'true')}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Offer description..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Offer Details */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5 text-amber-500" />
              Offer Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Discount Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                  <option value="buy_x_get_y">Buy X Get Y</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Discount Value *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => handleChange('value', e.target.value)}
                  placeholder={formData.type === 'percentage' ? '20' : '10'}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Min Purchase
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.minPurchase}
                  onChange={(e) => handleChange('minPurchase', e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Start Date *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  End Date *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Max Discount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.maxDiscount}
                  onChange={(e) => handleChange('maxDiscount', e.target.value)}
                  placeholder="No limit"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Display Settings */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5 text-amber-500" />
              Display Settings
            </h2>

            <div className="space-y-4">
              {/* Display Type */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Display Type
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {DISPLAY_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleChange('displayType', type.value)}
                      className={cn(
                        'p-3 rounded-lg border text-left transition-all',
                        formData.displayType === type.value
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-slate-700 hover:border-slate-600'
                      )}
                    >
                      <div className="text-white font-medium text-sm">{type.label}</div>
                      <div className="text-slate-400 text-xs">{type.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Hero Position */}
              {formData.displayType === 'hero' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Carousel Position
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.displayPosition}
                    onChange={(e) => handleChange('displayPosition', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  <p className="text-slate-400 text-xs mt-1">Lower numbers appear first</p>
                </div>
              )}

              {/* Colors */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Background Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {WARM_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setSelectedPreset(color)}
                      className={cn(
                        'w-10 h-10 rounded-lg border-2 transition-all',
                        selectedPreset.name === color.name
                          ? 'border-amber-500 scale-110'
                          : 'border-slate-700 hover:border-slate-500'
                      )}
                      style={color.value === 'custom' ? {} : { background: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>

                {selectedPreset.value === 'custom' && (
                  <div className="mt-3 flex gap-3">
                    <input
                      type="color"
                      value={formData.backgroundColor}
                      onChange={(e) => handleChange('backgroundColor', e.target.value)}
                      className="w-14 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.backgroundColor}
                      onChange={(e) => handleChange('backgroundColor', e.target.value)}
                      placeholder="#FFB800"
                      className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-400"
                    />
                  </div>
                )}
              </div>

              {/* Show Countdown */}
              <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <div>
                    <div className="text-white font-medium text-sm">Show Countdown</div>
                    <div className="text-slate-400 text-xs">Display expiry timer</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange('showCountdown', !formData.showCountdown)}
                  className={cn(
                    'w-12 h-6 rounded-full transition-colors relative',
                    formData.showCountdown ? 'bg-amber-500' : 'bg-slate-700'
                  )}
                >
                  <motion.span
                    className="absolute top-1 w-4 h-4 bg-white rounded-full"
                    animate={{ left: formData.showCountdown ? 28 : 4 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>

              {/* CTA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    CTA Text
                  </label>
                  <input
                    type="text"
                    value={formData.ctaText}
                    onChange={(e) => handleChange('ctaText', e.target.value)}
                    placeholder="Shop Now"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    CTA Link
                  </label>
                  <input
                    type="text"
                    value={formData.ctaLink}
                    onChange={(e) => handleChange('ctaLink', e.target.value)}
                    placeholder="/products"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Featured Image URL */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Featured Image URL
                </label>
                <input
                  type="text"
                  value={formData.featuredImage}
                  onChange={(e) => handleChange('featuredImage', e.target.value)}
                  placeholder="https://example.com/image.png"
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Link href="/dashboard/offers">
              <button
                type="button"
                className="px-6 py-2.5 text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-amber-500/20 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                Preview
              </h3>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-amber-500 hover:text-amber-400 text-sm flex items-center gap-1"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? 'Hide' : 'Show'}
              </button>
            </div>

            {showPreview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="rounded-xl overflow-hidden shadow-2xl"
                style={getBackgroundStyle()}
              >
                <div className="p-6">
                  {/* Discount Badge */}
                  <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 mb-4 border border-white/30">
                    <span className="text-xs font-semibold uppercase tracking-wider text-white">
                      Special Offer
                    </span>
                    <span className="text-sm font-bold text-white">
                      {formData.type === 'percentage' ? `${formData.value}%` : `$${formData.value}`} OFF
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-white mb-2">
                    {formData.name || 'Offer Name'}
                  </h3>

                  {/* Description */}
                  {formData.description && (
                    <p className="text-sm text-white/90 mb-4">
                      {formData.description}
                    </p>
                  )}

                  {/* CTA */}
                  <button className="inline-flex items-center gap-2 bg-white text-gray-900 px-4 py-2 rounded-lg font-semibold shadow-lg">
                    {formData.ctaText}
                    <LinkIcon className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
