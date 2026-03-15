/**
 * Special Offers Management Page
 *
 * Admins can create, edit, and delete special offers
 * Offers can be discounts, bonus points, or limited time deals
 */

import { offers } from "@/db/schema";
import { getDb } from "@/db";
import { eq } from "drizzle-orm";
import { Plus } from "lucide-react";

async function getOffers() {
  const db = getDb();
  return await db.select().from(offers).orderBy(offers.createdAt);
}

export default async function OffersPage() {
  const allOffers = await getOffers();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Special Offers</h1>
          <p className="text-slate-400 mt-1">
            Manage discounts, bonus points, and limited time deals
          </p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-amber-500/20">
          <Plus className="w-4 h-4" />
          <span>New Offer</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <p className="text-slate-400 text-sm">Active Offers</p>
          <p className="text-3xl font-bold text-white mt-2">
            {allOffers.filter((o) => o.isActive).length}
          </p>
        </div>
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <p className="text-slate-400 text-sm">Total Offers</p>
          <p className="text-3xl font-bold text-white mt-2">{allOffers.length}</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <p className="text-slate-400 text-sm">Expired</p>
          <p className="text-3xl font-bold text-white mt-2">
            {allOffers.filter(
              (o) => new Date(o.endDate) < new Date()
            ).length}
          </p>
        </div>
      </div>

      {/* Offers Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Offer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Valid Period
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {allOffers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-3">
                    <svg
                      className="w-12 h-12 text-slate-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                      />
                    </svg>
                    <p>No offers yet. Create your first special offer!</p>
                  </div>
                </td>
              </tr>
            ) : (
              allOffers.map((offer) => {
                const isExpired = new Date(offer.endDate) < new Date();
                const isActive = offer.isActive && !isExpired;

                return (
                  <tr key={offer.id} className="hover:bg-slate-800/30">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {offer.name}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {offer.slug}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-800 text-slate-300 capitalize">
                        {offer.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {offer.type === "percentage"
                        ? `${offer.value}%`
                        : `$${offer.value}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      <div>
                        <p>From: {new Date(offer.startDate).toLocaleDateString()}</p>
                        <p>To: {new Date(offer.endDate).toLocaleDateString()}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isExpired ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-800 text-slate-400">
                          Expired
                        </span>
                      ) : isActive ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-800 text-slate-400">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
