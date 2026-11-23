// apps/web/app/(dashboard)/menu/pricing/page.tsx
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Save,
  Plus,
  Trash2,
  Edit3,
  X,
  Clock,
  Tag,
  Search,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  PauseCircle,
  PlayCircle,
  Sparkles,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

type PricingRuleType = 'FIXED_PRICE' | 'PERCENTAGE_DISCOUNT' | 'SURGE_ADDITION';
type RuleFilter = 'ALL' | 'WITH_RULES' | 'LIVE_OVERRIDE';

const DAY_OPTIONS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

interface PricingRule {
  id: number;
  menuItemId: number;
  ruleName: string;
  ruleType: PricingRuleType;
  value: string;
  startTime: string | null;
  endTime: string | null;
  daysOfWeek: string | null;
  isActive: boolean;
}

interface ItemPricing {
  id: number;
  categoryId: number;
  categoryName: string;
  name: string;
  sku: string | null;
  price: string;
  costEstimate: string;
  effectivePrice: string;
  activeRuleId: number | null;
  activeRuleName: string | null;
  isAvailable: boolean;
  rules: PricingRule[];
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default function PricingPage() {
  const [items, setItems] = useState<ItemPricing[]>([]);
  const [editedPrices, setEditedPrices] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  // Feedback States
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [ruleFilter, setRuleFilter] = useState<RuleFilter>('ALL');

  // Create / Edit Rule Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState<PricingRuleType>('PERCENTAGE_DISCOUNT');
  const [ruleValue, setRuleValue] = useState('');
  const [startTime, setStartTime] = useState('17:00');
  const [endTime, setEndTime] = useState('20:00');
  const [selectedDays, setSelectedDays] = useState<string[]>([]); // empty = ALL days
  const [ruleIsActive, setRuleIsActive] = useState(true);
  const [isSubmittingRule, setIsSubmittingRule] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete Rule Confirmation Modal State
  const [pendingDeleteRule, setPendingDeleteRule] = useState<PricingRule | null>(null);
  const [isDeletingRule, setIsDeletingRule] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetchApi('/api/v1/menu/pricing');
      if (Array.isArray(res?.data)) {
        setItems(res.data);
        const initialPrices: Record<number, string> = {};
        res.data.forEach((i: ItemPricing) => {
          initialPrices[i.id] = (parseFloat(i.price) || 0).toFixed(2);
        });
        setEditedPrices(initialPrices);
      } else {
        setItems([]);
        setLoadError('Unexpected response structure received from pricing API.');
      }
    } catch (err: unknown) {
      setItems([]);
      setLoadError(getErrorMessage(err, 'Failed to load menu pricing and tariff rules.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Identify only modified base prices
  const dirtyPriceUpdates = useMemo(() => {
    const changes: Array<{ id: number; price: number }> = [];
    for (const item of items) {
      const original = parseFloat(item.price) || 0;
      const editedRaw = editedPrices[item.id];
      if (editedRaw === undefined || editedRaw.trim() === '') continue;
      const edited = parseFloat(editedRaw);
      if (!Number.isNaN(edited) && edited >= 0 && Math.abs(edited - original) > 0.001) {
        changes.push({ id: item.id, price: edited });
      }
    }
    return changes;
  }, [items, editedPrices]);

  const categories = useMemo(() => {
    const unique = new Set(items.map((i) => i.categoryName).filter(Boolean));
    return ['ALL', ...Array.from(unique).sort()];
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        item.rules.some((r) => r.ruleName.toLowerCase().includes(q));

      const matchesCat = categoryFilter === 'ALL' || item.categoryName === categoryFilter;
      const matchesRule =
        ruleFilter === 'ALL' ||
        (ruleFilter === 'WITH_RULES' && item.rules.length > 0) ||
        (ruleFilter === 'LIVE_OVERRIDE' && item.activeRuleId !== null);

      return matchesSearch && matchesCat && matchesRule;
    });
  }, [items, searchQuery, categoryFilter, ruleFilter]);

  // Live preview inside modal
  const modalPreviewPrice = useMemo(() => {
    const target = items.find((i) => String(i.id) === selectedItemId);
    if (!target) return null;
    const base = parseFloat(target.price) || 0;
    const val = parseFloat(ruleValue);
    if (Number.isNaN(val) || val < 0) return { base, resulting: base };

    let resulting = base;
    if (ruleType === 'FIXED_PRICE') resulting = val;
    else if (ruleType === 'PERCENTAGE_DISCOUNT') resulting = Math.max(0, base * (1 - val / 100));
    else if (ruleType === 'SURGE_ADDITION') resulting = base + val;

    return { base, resulting: Number(resulting.toFixed(2)) };
  }, [items, selectedItemId, ruleType, ruleValue]);

  const handlePriceChange = (id: number, val: string) => {
    setEditedPrices((prev) => ({ ...prev, [id]: val }));
  };

  const handleSaveBulkPrices = async () => {
    if (dirtyPriceUpdates.length === 0 || isSavingBulk) return;
    setIsSavingBulk(true);
    setActionError(null);
    setStatusBanner(null);

    try {
      await fetchApi('/api/v1/menu/pricing/bulk', {
        method: 'PUT',
        body: JSON.stringify({ updates: dirtyPriceUpdates }),
      });

      setStatusBanner(
        `Saved ${dirtyPriceUpdates.length} updated base price${
          dirtyPriceUpdates.length === 1 ? '' : 's'
        }.`
      );
      await loadData();
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, 'Failed to save base price updates.'));
    } finally {
      setIsSavingBulk(false);
    }
  };

  const openRuleModal = (itemId: number, rule?: PricingRule) => {
    setModalError(null);
    setSelectedItemId(String(itemId));

    if (rule) {
      setEditingRule(rule);
      setRuleName(rule.ruleName);
      setRuleType(rule.ruleType);
      setRuleValue(String(parseFloat(rule.value)));
      setStartTime(rule.startTime || '');
      setEndTime(rule.endTime || '');
      setRuleIsActive(rule.isActive);
      const rawDays = (rule.daysOfWeek || 'ALL').trim().toUpperCase();
      setSelectedDays(
        rawDays === 'ALL'
          ? []
          : rawDays
              .split(',')
              .map((d) => d.trim())
              .filter(Boolean)
      );
    } else {
      setEditingRule(null);
      setRuleName('');
      setRuleType('PERCENTAGE_DISCOUNT');
      setRuleValue('');
      setStartTime('17:00');
      setEndTime('20:00');
      setSelectedDays([]);
      setRuleIsActive(true);
    }
    setIsModalOpen(true);
  };

  const closeRuleModal = () => {
    if (isSubmittingRule) return;
    setIsModalOpen(false);
    setEditingRule(null);
    setModalError(null);
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRule) return;
    setModalError(null);

    const parsedItemId = parseInt(selectedItemId, 10);
    if (Number.isNaN(parsedItemId) || parsedItemId <= 0) {
      setModalError('Please select a target menu item.');
      return;
    }

    if (ruleName.trim().length < 2) {
      setModalError('Rule name must be at least 2 characters.');
      return;
    }

    const parsedValue = parseFloat(ruleValue);
    if (Number.isNaN(parsedValue) || parsedValue < 0) {
      setModalError('Rule value must be zero or greater.');
      return;
    }
    if (ruleType === 'PERCENTAGE_DISCOUNT' && (parsedValue <= 0 || parsedValue > 100)) {
      setModalError('Percentage discount must be between 0.01% and 100%.');
      return;
    }
    if ((startTime && !endTime) || (!startTime && endTime)) {
      setModalError('Provide both start time and end time, or clear both for an all-day rule.');
      return;
    }

    setIsSubmittingRule(true);
    try {
      const payload = {
        menuItemId: parsedItemId,
        ruleName: ruleName.trim(),
        ruleType,
        value: parsedValue,
        startTime: startTime || null,
        endTime: endTime || null,
        daysOfWeek: selectedDays.length === 0 ? 'ALL' : selectedDays.join(','),
        isActive: ruleIsActive,
      };

      if (editingRule) {
        await fetchApi(`/api/v1/menu/pricing/rules/${editingRule.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setStatusBanner(`Updated pricing rule "${ruleName.trim()}".`);
      } else {
        await fetchApi('/api/v1/menu/pricing/rules', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setStatusBanner(`Created pricing rule "${ruleName.trim()}".`);
      }

      setIsModalOpen(false);
      setEditingRule(null);
      await loadData();
    } catch (err: unknown) {
      setModalError(getErrorMessage(err, 'Failed to save pricing rule.'));
    } finally {
      setIsSubmittingRule(false);
    }
  };

  const handleToggleRuleActive = async (rule: PricingRule) => {
    setActionError(null);
    try {
      await fetchApi(`/api/v1/menu/pricing/rules/${rule.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      setStatusBanner(
        `Rule "${rule.ruleName}" is now ${!rule.isActive ? 'Active' : 'Paused'}.`
      );
      await loadData();
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, 'Failed to toggle pricing rule status.'));
    }
  };

  const handleConfirmDeleteRule = async () => {
    if (!pendingDeleteRule || isDeletingRule) return;
    setIsDeletingRule(true);
    setActionError(null);
    try {
      await fetchApi(`/api/v1/menu/pricing/rules/${pendingDeleteRule.id}`, {
        method: 'DELETE',
      });
      const deletedName = pendingDeleteRule.ruleName;
      setPendingDeleteRule(null);
      setStatusBanner(`Removed pricing rule "${deletedName}".`);
      await loadData();
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, 'Failed to remove pricing rule.'));
      setPendingDeleteRule(null);
    } finally {
      setIsDeletingRule(false);
    }
  };

  const formatRuleBadgeValue = (rule: PricingRule) => {
    const val = parseFloat(rule.value) || 0;
    if (rule.ruleType === 'PERCENTAGE_DISCOUNT') return `-${val}%`;
    if (rule.ruleType === 'SURGE_ADDITION') return `+KES ${val.toFixed(0)}`;
    return `KES ${val.toFixed(0)}`;
  };

  return (
    <div className="space-y-6">
      {/* Feedback Banners */}
      {statusBanner && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-900"
        >
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{statusBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            aria-label="Dismiss notification"
            className="text-emerald-700 hover:text-emerald-950"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs text-rose-900"
        >
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="Dismiss error"
            className="text-rose-700 hover:text-rose-950"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Top Bar Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/menu"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core inline-flex items-center gap-1 transition-colors"
            >
              Menu Catalog <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Pricing &amp; Tariff Rules</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Menu Pricing &amp; Tariff Rules</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-1">
            Manage POS base tariffs, scheduled happy-hour drops, fixed specials, and peak surge surcharges.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="px-3 py-2 text-xs font-semibold text-servora-deepTeal bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200 inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            type="button"
            onClick={handleSaveBulkPrices}
            disabled={isSavingBulk || dirtyPriceUpdates.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-servora-core text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Save size={15} />
            {isSavingBulk
              ? 'Saving...'
              : dirtyPriceUpdates.length > 0
                ? `Save ${dirtyPriceUpdates.length} Price Change${dirtyPriceUpdates.length === 1 ? '' : 's'}`
                : 'No Price Changes'}
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              aria-label="Search items, SKUs, or pricing rules"
              placeholder="Search item, SKU, or rule name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core"
            />
          </div>

          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white font-medium text-servora-navy focus:border-servora-core focus:outline-none"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'ALL' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-gray-50 border border-gray-100 rounded-xl">
          {(
            [
              { id: 'ALL', label: `All (${items.length})` },
              { id: 'WITH_RULES', label: 'With Rules' },
              { id: 'LIVE_OVERRIDE', label: 'Live Now' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRuleFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                ruleFilter === tab.id
                  ? 'bg-white shadow-xs text-servora-navy font-bold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Pricing Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-servora-navy flex items-center gap-2">
            <Tag size={16} className="text-servora-core" />
            Menu Tariffs &amp; Automated Schedules
          </h2>
          <span className="text-xs text-servora-deepTeal">
            Showing {filteredItems.length} of {items.length} items
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse">
            Loading menu tariffs and active schedules...
          </div>
        ) : loadError ? (
          <div role="alert" className="p-12 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-rose-50 text-rose-600">
              <AlertTriangle size={20} />
            </div>
            <p className="text-xs font-bold text-rose-800">{loadError}</p>
            <button
              type="button"
              onClick={loadData}
              className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700"
            >
              Retry Request
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-xs text-servora-deepTeal">
            No menu items matched your active filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-servora-deepTeal font-bold uppercase tracking-wider text-[11px]">
                  <th scope="col" className="py-3.5 px-4">Item &amp; Category</th>
                  <th scope="col" className="py-3.5 px-4">Standard Base Price (KES)</th>
                  <th scope="col" className="py-3.5 px-4">Live Effective Price</th>
                  <th scope="col" className="py-3.5 px-4">Scheduled Tariff Rules</th>
                  <th scope="col" className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map((item) => {
                  const originalPrice = parseFloat(item.price) || 0;
                  const editedVal = parseFloat(editedPrices[item.id] ?? item.price) || 0;
                  const isDirty = Math.abs(editedVal - originalPrice) > 0.001;
                  const effectivePrice = parseFloat(item.effectivePrice) || originalPrice;
                  const costEst = parseFloat(item.costEstimate) || 0;
                  const marginPct =
                    effectivePrice > 0 && costEst > 0
                      ? ((effectivePrice - costEst) / effectivePrice) * 100
                      : null;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-servora-navy">{item.name}</div>
                        <div className="text-[10px] text-gray-400">
                          {item.categoryName}
                          {item.sku ? ` • ${item.sku}` : ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 w-36">
                          <span className="text-gray-400 font-medium">KES</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            aria-label={`Standard price for ${item.name}`}
                            value={editedPrices[item.id] ?? item.price}
                            onChange={(e) => handlePriceChange(item.id, e.target.value)}
                            className={`w-full px-2.5 py-1.5 text-xs font-mono font-bold border rounded-lg focus:border-servora-core focus:outline-none bg-white ${
                              isDirty ? 'border-amber-400 bg-amber-50/40' : 'border-gray-200'
                            }`}
                          />
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-servora-core">
                          KES {effectivePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        {item.activeRuleName ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded mt-0.5">
                            <Sparkles size={9} /> {item.activeRuleName}
                          </span>
                        ) : marginPct !== null ? (
                          <span className="block text-[10px] text-gray-400 font-mono">
                            Margin: {marginPct.toFixed(1)}%
                          </span>
                        ) : null}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {item.rules.length === 0 ? (
                            <span className="text-[11px] text-gray-400 italic">
                              No automated rules
                            </span>
                          ) : (
                            item.rules.map((rule) => {
                              const isFiringNow = item.activeRuleId === rule.id;
                              return (
                                <div
                                  key={rule.id}
                                  className={`inline-flex items-center gap-1.5 py-1 px-2 rounded-lg font-medium text-[11px] border ${
                                    !rule.isActive
                                      ? 'bg-gray-100 text-gray-500 border-gray-200 line-through'
                                      : isFiringNow
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : 'bg-blue-50 text-blue-700 border-blue-100'
                                  }`}
                                >
                                  <Clock size={11} className="shrink-0" />
                                  <span>
                                    <strong>{rule.ruleName}:</strong> {formatRuleBadgeValue(rule)}
                                    {rule.startTime && rule.endTime
                                      ? ` (${rule.startTime}–${rule.endTime})`
                                      : ' (All Day)'}
                                    {rule.daysOfWeek && rule.daysOfWeek !== 'ALL'
                                      ? ` [${rule.daysOfWeek}]`
                                      : ''}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleRuleActive(rule)}
                                    title={rule.isActive ? 'Pause rule' : 'Activate rule'}
                                    aria-label={rule.isActive ? `Pause ${rule.ruleName}` : `Activate ${rule.ruleName}`}
                                    className="hover:text-servora-navy ml-0.5 cursor-pointer"
                                  >
                                    {rule.isActive ? <PauseCircle size={12} /> : <PlayCircle size={12} />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openRuleModal(item.id, rule)}
                                    title="Edit rule"
                                    aria-label={`Edit ${rule.ruleName}`}
                                    className="hover:text-servora-core cursor-pointer"
                                  >
                                    <Edit3 size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPendingDeleteRule(rule)}
                                    title="Delete rule"
                                    aria-label={`Delete ${rule.ruleName}`}
                                    className="hover:text-rose-600 cursor-pointer"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openRuleModal(item.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-servora-core hover:bg-servora-pale rounded-lg transition-colors cursor-pointer"
                        >
                          <Plus size={13} />
                          Add Rule
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT PRICING RULE MODAL */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pricing-rule-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 id="pricing-rule-modal-title" className="text-sm font-bold text-servora-navy">
                  {editingRule ? `Edit Pricing Rule: ${editingRule.ruleName}` : 'Add Dynamic Pricing Rule'}
                </h2>
                <p className="text-[11px] text-servora-deepTeal">
                  Schedule time-of-day discounts, fixed specials, or surge surcharges
                </p>
              </div>
              <button
                type="button"
                onClick={closeRuleModal}
                aria-label="Close modal"
                className="text-gray-400 hover:text-servora-navy cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
              {modalError && (
                <div
                  role="alert"
                  className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs border border-rose-200 flex items-center gap-2 font-semibold"
                >
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="pr-item">
                  Target Menu Item *
                </label>
                <select
                  id="pr-item"
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none bg-white font-medium"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} (KES {parseFloat(i.price).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="pr-name">
                  Rule Name *
                </label>
                <input
                  id="pr-name"
                  type="text"
                  required
                  placeholder="e.g. Happy Hour Friday, Late Night Surcharge"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="pr-type">
                    Rule Type
                  </label>
                  <select
                    id="pr-type"
                    value={ruleType}
                    onChange={(e) => setRuleType(e.target.value as PricingRuleType)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none bg-white"
                  >
                    <option value="PERCENTAGE_DISCOUNT">Percentage Discount (%)</option>
                    <option value="FIXED_PRICE">Special Fixed Price (KES)</option>
                    <option value="SURGE_ADDITION">Surge Addition (KES)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="pr-val">
                    Value *
                  </label>
                  <input
                    id="pr-val"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder={ruleType === 'PERCENTAGE_DISCOUNT' ? '15 (for 15%)' : '450'}
                    value={ruleValue}
                    onChange={(e) => setRuleValue(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                  />
                </div>
              </div>

              {modalPreviewPrice && (
                <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-servora-deepTeal font-medium">Resulting POS Price:</span>
                  <span className="font-mono font-bold text-servora-core">
                    KES {modalPreviewPrice.base.toLocaleString()} &rarr; KES{' '}
                    {modalPreviewPrice.resulting.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="pr-start">
                    Start Time (Optional)
                  </label>
                  <input
                    id="pr-start"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="pr-end">
                    End Time (Optional)
                  </label>
                  <input
                    id="pr-end"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                  />
                </div>
              </div>

              {/* Days of Week Picker */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-servora-navy">Active Days</span>
                  <button
                    type="button"
                    onClick={() => setSelectedDays([])}
                    className="text-[11px] font-semibold text-servora-core hover:underline cursor-pointer"
                  >
                    {selectedDays.length === 0 ? 'Every Day (ALL)' : 'Reset to Every Day'}
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {DAY_OPTIONS.map((day) => {
                    const active = selectedDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                          active
                            ? 'bg-servora-core text-white border-servora-core'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-servora-navy">
                <input
                  type="checkbox"
                  checked={ruleIsActive}
                  onChange={(e) => setRuleIsActive(e.target.checked)}
                  className="rounded border-gray-300 text-servora-core w-4 h-4"
                />
                <span>Rule Active</span>
              </label>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeRuleModal}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRule}
                  className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSubmittingRule
                    ? 'Saving...'
                    : editingRule
                      ? 'Save Changes'
                      : 'Add Pricing Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE RULE CONFIRMATION MODAL */}
      {pendingDeleteRule && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-rule-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 id="delete-rule-title" className="text-sm font-bold text-servora-navy">
                  Remove Pricing Rule?
                </h3>
                <p className="text-xs text-servora-deepTeal mt-1 leading-relaxed">
                  Are you sure you want to delete{' '}
                  <strong className="text-servora-navy">{pendingDeleteRule.ruleName}</strong>? The item will revert to its standard base price.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setPendingDeleteRule(null)}
                disabled={isDeletingRule}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRule}
                disabled={isDeletingRule}
                className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeletingRule ? 'Removing...' : 'Remove Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}