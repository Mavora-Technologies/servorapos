'use client';

import { useEffect, useState } from 'react';
import { 
  BadgePercent, 
  Save, 
  Plus, 
  Trash2, 
  X, 
  Clock, 
  Tag, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface PricingRule {
  id: number;
  ruleName: string;
  ruleType: 'FIXED_PRICE' | 'PERCENTAGE_DISCOUNT' | 'SURGE_ADDITION';
  value: string;
  startTime?: string;
  endTime?: string;
  daysOfWeek?: string;
  isActive: boolean;
}

interface ItemPricing {
  id: number;
  name: string;
  price: string;
  isAvailable: boolean;
  rules: PricingRule[];
}

export default function PricingPage() {
  const [items, setItems] = useState<ItemPricing[]>([]);
  const [editedPrices, setEditedPrices] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingBulk, setIsSavingBulk] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State for new Dynamic Rule
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number>(0);
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState<'FIXED_PRICE' | 'PERCENTAGE_DISCOUNT' | 'SURGE_ADDITION'>('PERCENTAGE_DISCOUNT');
  const [ruleValue, setRuleValue] = useState('');
  const [startTime, setStartTime] = useState('17:00');
  const [endTime, setEndTime] = useState('20:00');
  const [isSubmittingRule, setIsSubmittingRule] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetchApi('/api/v1/menu/pricing');
      if (res?.data) {
        setItems(res.data);
        const initialPrices: Record<number, string> = {};
        res.data.forEach((i: ItemPricing) => {
          initialPrices[i.id] = i.price;
        });
        setEditedPrices(initialPrices);
      }
    } catch (err) {
      console.error('Failed to load pricing:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePriceChange = (id: number, val: string) => {
    setEditedPrices((prev) => ({ ...prev, [id]: val }));
  };

  const handleSaveBulkPrices = async () => {
    setIsSavingBulk(true);
    setSuccessMsg(null);
    try {
      const updates = Object.entries(editedPrices).map(([id, price]) => ({
        id: Number(id),
        price: Number(price),
      }));

      await fetchApi('/api/v1/menu/pricing/bulk', {
        method: 'PUT',
        body: JSON.stringify({ updates }),
      });

      setSuccessMsg('Base prices updated successfully.');
      setTimeout(() => setSuccessMsg(null), 3500);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update prices');
    } finally {
      setIsSavingBulk(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingRule(true);
    try {
      await fetchApi('/api/v1/menu/pricing/rules', {
        method: 'POST',
        body: JSON.stringify({
          menuItemId: selectedItemId,
          ruleName,
          ruleType,
          value: Number(ruleValue),
          startTime,
          endTime,
        }),
      });

      setIsModalOpen(false);
      setRuleName('');
      setRuleValue('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create pricing rule');
    } finally {
      setIsSubmittingRule(false);
    }
  };

  const handleDeleteRule = async (ruleId: number) => {
    if (!confirm('Remove this pricing rule?')) return;
    try {
      await fetchApi(`/api/v1/menu/pricing/rules/${ruleId}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete rule');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-servora-navy">Menu Pricing & Tariff Rules</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-1">
            Configure POS base item prices, happy-hour percentage drops, and automated surge surcharges.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveBulkPrices}
            disabled={isSavingBulk}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-servora-core text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <Save size={15} />
            {isSavingBulk ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-servora-navy flex items-center gap-2">
            <Tag size={16} className="text-servora-core" />
            Active Menu Items & Schedules
          </h2>
          <span className="text-xs text-servora-deepTeal">
            {items.length} dishes and beverages
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse">
            Loading menu tariffs and active rules...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-servora-deepTeal font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Item Name</th>
                  <th className="py-3.5 px-4">Standard Price (KES)</th>
                  <th className="py-3.5 px-4">Active Pricing Overrides & Schedules</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-servora-navy">
                      {item.name}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 w-36">
                        <span className="text-gray-400 font-medium">KES</span>
                        <input
                          type="number"
                          step="0.01"
                          value={editedPrices[item.id] ?? item.price}
                          onChange={(e) => handlePriceChange(item.id, e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-bold border border-gray-200 rounded-lg focus:border-servora-core focus:outline-none bg-white"
                        />
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.rules?.length === 0 ? (
                          <span className="text-[11px] text-gray-400 italic">No automated rules</span>
                        ) : (
                          item.rules.map((rule) => (
                            <span
                              key={rule.id}
                              className="inline-flex items-center gap-1.5 py-1 px-2 rounded-lg bg-blue-50 text-blue-700 font-medium text-[11px] border border-blue-100"
                            >
                              <Clock size={11} />
                              <strong>{rule.ruleName}:</strong> 
                              {rule.ruleType === 'PERCENTAGE_DISCOUNT' ? `-${rule.value}%` : `KES ${rule.value}`}
                              {rule.startTime && ` (${rule.startTime}-${rule.endTime})`}
                              <button
                                onClick={() => handleDeleteRule(rule.id)}
                                className="hover:text-red-600 transition-colors ml-1"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedItemId(item.id);
                          setIsModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-servora-core hover:bg-servora-pale rounded-lg transition-colors"
                      >
                        <Plus size={13} />
                        Add Rule
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Pricing Rule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-sm font-bold text-servora-navy">Add Dynamic Pricing Rule</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Target Menu Item</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none bg-white"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} (KES {Number(i.price).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Rule Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Happy Hour Friday, Late Night Surcharge"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Rule Type</label>
                  <select
                    value={ruleType}
                    onChange={(e) => setRuleType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none bg-white"
                  >
                    <option value="PERCENTAGE_DISCOUNT">Percentage Discount (%)</option>
                    <option value="FIXED_PRICE">Special Fixed Price (KES)</option>
                    <option value="SURGE_ADDITION">Surge Addition (KES)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Value *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder={ruleType === 'PERCENTAGE_DISCOUNT' ? '15 (for 15%)' : '450'}
                    value={ruleValue}
                    onChange={(e) => setRuleValue(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRule}
                  className="px-4 py-2 text-xs font-semibold bg-servora-core text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isSubmittingRule ? 'Saving...' : 'Add Pricing Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}