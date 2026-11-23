// apps/web/app/(dashboard)/menu/recipes/units/page.tsx
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Scale,
  Plus,
  Trash2,
  Edit3,
  ArrowLeft,
  ArrowRightLeft,
  Search,
  X,
  Package,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Calculator,
  RefreshCw,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

type UnitCategory = 'WEIGHT' | 'VOLUME' | 'PACKAGING' | 'CUSTOM';
type CategoryFilter = 'ALL' | UnitCategory;

const BASE_LEDGER_UNITS = [
  { value: 'kg', label: 'kg (Kilograms)' },
  { value: 'g', label: 'g (Grams)' },
  { value: 'litres', label: 'litres (Litres)' },
  { value: 'ml', label: 'ml (Millilitres)' },
  { value: 'pcs', label: 'pcs (Pieces)' },
] as const;

interface UnitConversion {
  id: number;
  fromUnit: string;
  toUnit: string;
  conversionFactor: string;
  inventoryItemId: number | null;
  inventoryItemName: string | null;
  inventoryItemSku: string | null;
  inventoryBaseUnit: string | null;
  unitCategory: UnitCategory;
  description: string | null;
  isDefault: boolean;
}

interface InventoryItemOption {
  id: number;
  name: string;
  sku?: string | null;
  unit: string;
  category: string;
  isActive?: boolean;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default function UnitConversionsPage() {
  const [conversions, setConversions] = useState<UnitConversion[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItemOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Feedback States
  const [loadError, setLoadError] = useState<string | null>(null);
  const [referenceWarning, setReferenceWarning] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<UnitConversion | null>(null);
  const [fromUnit, setFromUnit] = useState('');
  const [toUnit, setToUnit] = useState('kg');
  const [conversionFactor, setConversionFactor] = useState('');
  const [unitCategory, setUnitCategory] = useState<UnitCategory>('PACKAGING');
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [pendingDeleteRule, setPendingDeleteRule] = useState<UnitConversion | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Live DB-Driven Calculator State
  const [calcRuleId, setCalcRuleId] = useState<string>('');
  const [calcAmount, setCalcAmount] = useState<string>('1');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setReferenceWarning(null);

    const [convResult, invResult] = await Promise.allSettled([
      fetchApi('/api/v1/menu/recipes/units'),
      fetchApi('/api/v1/inventory/items'),
    ]);

    if (convResult.status === 'fulfilled' && Array.isArray(convResult.value?.data)) {
      const list: UnitConversion[] = convResult.value.data;
      setConversions(list);
      setCalcRuleId((prev) =>
        prev && list.some((c) => String(c.id) === prev)
          ? prev
          : list.length > 0
            ? String(list[0].id)
            : ''
      );
    } else {
      setConversions([]);
      setLoadError(
        convResult.status === 'rejected'
          ? getErrorMessage(convResult.reason, 'Failed to load unit conversion rules.')
          : 'Unexpected response structure received from unit conversions API.'
      );
    }

    if (invResult.status === 'fulfilled') {
      const payload = invResult.value?.data;
      const rawInv = Array.isArray(payload) ? payload : payload?.items;
      if (Array.isArray(rawInv)) {
        setInventoryList(
          rawInv
            .filter((i: InventoryItemOption) => i.isActive !== false)
            .sort((a: InventoryItemOption, b: InventoryItemOption) =>
              a.name.localeCompare(b.name)
            )
        );
      } else {
        setInventoryList([]);
      }
    } else {
      setInventoryList([]);
      setReferenceWarning(
        'Inventory items could not be loaded. Rules can still be configured as universal standards.'
      );
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredConversions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return conversions.filter((c) => {
      const matchesCategory = activeCategory === 'ALL' || c.unitCategory === activeCategory;
      const matchesSearch =
        !q ||
        c.fromUnit.toLowerCase().includes(q) ||
        c.toUnit.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.inventoryItemName && c.inventoryItemName.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [conversions, activeCategory, searchTerm]);

  const activeCalcRule = useMemo(
    () => conversions.find((c) => String(c.id) === calcRuleId) || null,
    [conversions, calcRuleId]
  );

  const calcResult = useMemo(() => {
    if (!activeCalcRule) return 0;
    const amt = parseFloat(calcAmount) || 0;
    const factor = parseFloat(activeCalcRule.conversionFactor) || 0;
    return amt * factor;
  }, [activeCalcRule, calcAmount]);

  const openModal = (rule?: UnitConversion) => {
    setModalError(null);
    if (rule) {
      setEditingRule(rule);
      setFromUnit(rule.fromUnit);
      setToUnit(rule.toUnit);
      setConversionFactor(String(parseFloat(rule.conversionFactor)));
      setUnitCategory(rule.unitCategory);
      setSelectedInventoryId(rule.inventoryItemId ? String(rule.inventoryItemId) : '');
      setDescription(rule.description || '');
    } else {
      setEditingRule(null);
      setFromUnit('');
      setToUnit('kg');
      setConversionFactor('');
      setUnitCategory('PACKAGING');
      setSelectedInventoryId('');
      setDescription('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingRule(null);
    setModalError(null);
  };

  const handleInventorySelectChange = (invIdStr: string) => {
    setSelectedInventoryId(invIdStr);
    if (invIdStr) {
      const matched = inventoryList.find((inv) => String(inv.id) === invIdStr);
      if (matched?.unit) {
        setToUnit(matched.unit);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setModalError(null);

    if (!fromUnit.trim() || !toUnit.trim()) {
      setModalError('Both source unit and base ledger unit are required.');
      return;
    }

    if (fromUnit.trim().toLowerCase() === toUnit.trim().toLowerCase()) {
      setModalError('Source unit and base ledger unit cannot be identical.');
      return;
    }

    const parsedFactor = parseFloat(conversionFactor);
    if (Number.isNaN(parsedFactor) || parsedFactor <= 0) {
      setModalError('Conversion factor must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        fromUnit: fromUnit.trim(),
        toUnit: toUnit.trim(),
        conversionFactor: parsedFactor,
        inventoryItemId: selectedInventoryId ? parseInt(selectedInventoryId, 10) : null,
        unitCategory,
        description: description.trim() || null,
      };

      if (editingRule) {
        await fetchApi(`/api/v1/menu/recipes/units/${editingRule.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setStatusBanner(
          `Updated conversion rule: 1 ${fromUnit.trim()} = ${parsedFactor} ${toUnit.trim()}.`
        );
      } else {
        await fetchApi('/api/v1/menu/recipes/units', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setStatusBanner(
          `Created conversion rule: 1 ${fromUnit.trim()} = ${parsedFactor} ${toUnit.trim()}.`
        );
      }

      setIsModalOpen(false);
      setEditingRule(null);
      await loadData();
    } catch (err: unknown) {
      setModalError(getErrorMessage(err, 'Failed to save conversion rule.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteRule || isDeleting) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await fetchApi(`/api/v1/menu/recipes/units/${pendingDeleteRule.id}`, {
        method: 'DELETE',
      });
      const label = `1 ${pendingDeleteRule.fromUnit} = ${parseFloat(pendingDeleteRule.conversionFactor)} ${pendingDeleteRule.toUnit}`;
      setPendingDeleteRule(null);
      setStatusBanner(`Removed conversion rule (${label}).`);
      await loadData();
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, 'Failed to delete conversion rule.'));
      setPendingDeleteRule(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const parsedModalFactor = parseFloat(conversionFactor);
  const reverseFactor =
    !Number.isNaN(parsedModalFactor) && parsedModalFactor > 0 ? 1 / parsedModalFactor : null;

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

      {referenceWarning && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-900"
        >
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <span>{referenceWarning}</span>
          </div>
          <button
            type="button"
            onClick={() => setReferenceWarning(null)}
            aria-label="Dismiss warning"
            className="text-amber-700 hover:text-amber-950"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/menu/recipes"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core inline-flex items-center gap-1 transition-colors"
            >
              <ArrowLeft size={13} /> Back to Standard Recipes &amp; BOM
            </Link>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">
            Measurement Units &amp; Recipe Conversions
          </h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Convert bulk supplier purchasing units (crates, sacks, kegs) into standardized kitchen base units.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="px-3 py-2.5 text-xs font-semibold text-servora-deepTeal bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-servora-core text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
          >
            <Plus size={15} />
            Add Conversion Rule
          </button>
        </div>
      </div>

      {/* Live Database-Driven Quick Conversion Calculator */}
      {conversions.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-servora-navy shrink-0">
            <div className="w-7 h-7 rounded-lg bg-servora-pale text-servora-core flex items-center justify-center">
              <Calculator size={14} />
            </div>
            <span>Live Unit Calculator</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
            <input
              type="number"
              step="0.01"
              min="0"
              aria-label="Quantity to convert"
              value={calcAmount}
              onChange={(e) => setCalcAmount(e.target.value)}
              className="w-24 px-2.5 py-1.5 text-xs font-mono font-bold border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none text-center"
            />
            <select
              aria-label="Select conversion rule"
              value={calcRuleId}
              onChange={(e) => setCalcRuleId(e.target.value)}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-slate-50 font-medium text-servora-navy focus:border-servora-core focus:outline-none max-w-xs"
            >
              {conversions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fromUnit} &rarr; {c.toUnit}
                  {c.inventoryItemName ? ` (${c.inventoryItemName})` : ''}
                </option>
              ))}
            </select>
            {activeCalcRule && (
              <div className="px-3.5 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-xs font-mono font-bold text-servora-core">
                = {calcResult.toLocaleString(undefined, { maximumFractionDigits: 4 })}{' '}
                {activeCalcRule.toUnit}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter and Category Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
          <input
            type="text"
            aria-label="Search unit conversions or ingredients"
            placeholder="Search units (e.g. Crate, tbsp, Sack, g) or ingredient..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-gray-50 border border-gray-100 rounded-xl">
          {(['ALL', 'PACKAGING', 'WEIGHT', 'VOLUME', 'CUSTOM'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeCategory === cat
                  ? 'bg-white shadow-xs text-servora-navy font-bold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {cat === 'ALL' ? `All (${conversions.length})` : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Conversions Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse">
            Loading unit conversion matrices...
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
        ) : conversions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-servora-pale text-servora-core flex items-center justify-center mx-auto">
              <Scale size={24} />
            </div>
            <h3 className="text-sm font-bold text-servora-navy">No conversion rules configured</h3>
            <p className="text-xs text-servora-deepTeal max-w-sm mx-auto">
              Define how supplier packaging (e.g. 1 Crate = 30 pcs, 1 Sack = 50 kg) translates into kitchen base ledger units.
            </p>
            <button
              type="button"
              onClick={() => openModal()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700"
            >
              <Plus size={14} /> Add First Conversion Rule
            </button>
          </div>
        ) : filteredConversions.length === 0 ? (
          <div className="p-12 text-center text-xs text-servora-deepTeal">
            No conversion rules matched your search or category filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-servora-deepTeal font-bold uppercase tracking-wider text-[11px]">
                  <th scope="col" className="py-3.5 px-4">From Unit</th>
                  <th scope="col" className="py-3.5 px-4 text-center">Conversion Factor</th>
                  <th scope="col" className="py-3.5 px-4">Base Ledger Unit</th>
                  <th scope="col" className="py-3.5 px-4">Applicable Scope</th>
                  <th scope="col" className="py-3.5 px-4">Category</th>
                  <th scope="col" className="py-3.5 px-4">Description</th>
                  <th scope="col" className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredConversions.map((conv) => (
                  <tr key={conv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-servora-navy">1 {conv.fromUnit}</td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-servora-pale text-servora-core font-mono font-bold rounded-lg text-xs">
                        <ArrowRightLeft size={11} />
                        = {parseFloat(conv.conversionFactor).toLocaleString()}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-servora-navy">
                      {conv.toUnit}
                    </td>

                    <td className="py-3.5 px-4">
                      {conv.inventoryItemName ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-servora-navy">
                          <Package size={12} className="text-servora-core shrink-0" />
                          {conv.inventoryItemName}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">Universal Standard</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-100 text-servora-deepTeal">
                        {conv.unitCategory}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-gray-500">
                      {conv.description || '—'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openModal(conv)}
                          aria-label={`Edit ${conv.fromUnit} to ${conv.toUnit}`}
                          title="Edit Rule"
                          className="p-1.5 text-gray-500 hover:text-servora-core rounded-lg hover:bg-servora-pale transition-colors cursor-pointer"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteRule(conv)}
                          aria-label={`Delete ${conv.fromUnit} to ${conv.toUnit}`}
                          title="Delete Rule"
                          className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT CONVERSION MODAL */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="unit-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-servora-pale text-servora-core flex items-center justify-center">
                  <Scale size={18} />
                </div>
                <div>
                  <h2 id="unit-modal-title" className="text-sm font-bold text-servora-navy">
                    {editingRule ? 'Edit Conversion Factor' : 'Create Conversion Factor'}
                  </h2>
                  <p className="text-[11px] text-servora-deepTeal">
                    Bridge supplier packaging with kitchen ledger measurements
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close modal"
                className="text-gray-400 hover:text-servora-navy cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {modalError && (
                <div
                  role="alert"
                  className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2 font-semibold"
                >
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="uc-inv">
                  Specific Inventory Item (Optional)
                </label>
                <select
                  id="uc-inv"
                  value={selectedInventoryId}
                  onChange={(e) => handleInventorySelectChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none bg-white"
                >
                  <option value="">Universal Rule (Applies to all ingredients)</option>
                  {inventoryList.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.name} (Base unit: {inv.unit})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-servora-deepTeal mt-1">
                  Selecting an inventory item automatically aligns the base ledger unit below.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="uc-from">
                    From Unit (Source) *
                  </label>
                  <input
                    id="uc-from"
                    type="text"
                    required
                    placeholder="e.g. Crate, tbsp, Sack 50kg"
                    value={fromUnit}
                    onChange={(e) => setFromUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="uc-to">
                    To Unit (Base Ledger) *
                  </label>
                  <select
                    id="uc-to"
                    value={toUnit}
                    onChange={(e) => setToUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none bg-white font-medium"
                  >
                    {BASE_LEDGER_UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                    {!BASE_LEDGER_UNITS.some((u) => u.value === toUnit) && toUnit && (
                      <option value={toUnit}>{toUnit}</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="uc-factor">
                    Conversion Factor *
                  </label>
                  <input
                    id="uc-factor"
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    required
                    placeholder="e.g. 30 or 0.015"
                    value={conversionFactor}
                    onChange={(e) => setConversionFactor(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="uc-cat">
                    Category
                  </label>
                  <select
                    id="uc-cat"
                    value={unitCategory}
                    onChange={(e) => setUnitCategory(e.target.value as UnitCategory)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none bg-white"
                  >
                    <option value="PACKAGING">Packaging (Crates, Sacks)</option>
                    <option value="WEIGHT">Weight (kg, g, lbs)</option>
                    <option value="VOLUME">Volume (litres, ml, cups)</option>
                    <option value="CUSTOM">Custom Culinary Unit</option>
                  </select>
                </div>
              </div>

              {fromUnit.trim() && reverseFactor !== null && (
                <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-[11px] font-mono text-servora-navy space-y-0.5">
                  <div className="font-bold text-servora-core">
                    1 {fromUnit.trim()} = {parsedModalFactor.toLocaleString()} {toUnit}
                  </div>
                  <div className="text-gray-500">
                    1 {toUnit} = {reverseFactor.toFixed(4)} {fromUnit.trim()}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="uc-desc">
                  Description (Optional)
                </label>
                <input
                  id="uc-desc"
                  type="text"
                  placeholder="e.g. 1 egg tray contains 30 pieces"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : editingRule ? 'Save Changes' : 'Save Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {pendingDeleteRule && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-unit-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 id="delete-unit-title" className="text-sm font-bold text-servora-navy">
                  Remove Conversion Rule?
                </h3>
                <p className="text-xs text-servora-deepTeal mt-1 leading-relaxed">
                  Are you sure you want to delete{' '}
                  <strong className="text-servora-navy">
                    1 {pendingDeleteRule.fromUnit} ={' '}
                    {parseFloat(pendingDeleteRule.conversionFactor)} {pendingDeleteRule.toUnit}
                  </strong>
                  ?
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setPendingDeleteRule(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeleting ? 'Removing...' : 'Remove Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}