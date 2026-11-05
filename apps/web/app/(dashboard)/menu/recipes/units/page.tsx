'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Scale, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  ArrowRightLeft, 
  Search, 
  X, 
  Package, 
  CheckCircle2, 
  AlertCircle,
  Calculator
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface UnitConversion {
  id: number;
  fromUnit: string;
  toUnit: string;
  conversionFactor: string;
  inventoryItemId: number | null;
  inventoryItemName?: string | null;
  unitCategory: 'WEIGHT' | 'VOLUME' | 'PACKAGING' | 'CUSTOM';
  description?: string | null;
  isDefault: boolean;
}

interface InventoryItemOption {
  id: number;
  name: string;
  unit: string;
  category: string;
}

export default function UnitConversionsPage() {
  const [conversions, setConversions] = useState<UnitConversion[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItemOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Add Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fromUnit, setFromUnit] = useState('');
  const [toUnit, setToUnit] = useState('g');
  const [conversionFactor, setConversionFactor] = useState('');
  const [unitCategory, setUnitCategory] = useState<'WEIGHT' | 'VOLUME' | 'PACKAGING' | 'CUSTOM'>('PACKAGING');
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Quick Calculator State
  const [calcFromUnit, setCalcFromUnit] = useState('');
  const [calcAmount, setCalcAmount] = useState<number>(1);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [convRes, invRes] = await Promise.all([
        fetchApi('/api/v1/menu/recipes/units'),
        fetchApi('/api/v1/inventory'),
      ]);

      if (convRes?.data) setConversions(convRes.data);
      if (invRes?.data) setInventoryList(invRes.data);
    } catch (err) {
      console.error('Failed to load unit conversions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError(null);

    try {
      await fetchApi('/api/v1/menu/recipes/units', {
        method: 'POST',
        body: JSON.stringify({
          fromUnit,
          toUnit,
          conversionFactor: Number(conversionFactor),
          inventoryItemId: selectedInventoryId ? Number(selectedInventoryId) : null,
          unitCategory,
          description: description || undefined,
        }),
      });

      setIsModalOpen(false);
      setFromUnit('');
      setConversionFactor('');
      setDescription('');
      setSelectedInventoryId('');
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save conversion factor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this conversion rule?')) return;
    try {
      await fetchApi(`/api/v1/menu/recipes/units/${id}`, { method: 'DELETE' });
      setConversions((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete conversion');
    }
  };

  const filteredConversions = conversions.filter((c) => {
    const matchesCategory = activeCategory === 'ALL' || c.unitCategory === activeCategory;
    const matchesSearch =
      c.fromUnit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.toUnit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.inventoryItemName && c.inventoryItemName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/menu/recipes"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              <ArrowLeft size={13} /> Back to Recipes
            </Link>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Measurement Units & Recipe Conversions</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Convert bulk supplier units (crates, bags, kegs) into standardized kitchen portioning units.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-servora-core text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={15} />
          Add Conversion Rule
        </button>
      </div>

      {/* Filter and Category Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Search units (e.g. Crate, tbsp, Sack, g)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-gray-50 border border-gray-100 rounded-xl">
          {['ALL', 'PACKAGING', 'WEIGHT', 'VOLUME', 'CUSTOM'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeCategory === cat ? 'bg-white shadow-xs text-servora-navy' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {cat === 'ALL' ? 'All Units' : cat}
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
        ) : filteredConversions.length === 0 ? (
          <div className="p-12 text-center text-xs text-servora-deepTeal">
            No conversion rules found matching your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-servora-deepTeal font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">From Unit</th>
                  <th className="py-3.5 px-4 text-center">Conversion Ratio</th>
                  <th className="py-3.5 px-4">Base Ledger Unit</th>
                  <th className="py-3.5 px-4">Applicable Ingredient</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Description / Use Case</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredConversions.map((conv) => (
                  <tr key={conv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-servora-navy">
                      1 {conv.fromUnit}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-servora-pale text-servora-core font-mono font-bold rounded-lg text-xs">
                        <ArrowRightLeft size={11} />
                        = {Number(conv.conversionFactor).toLocaleString()}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-servora-navy">
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
                      {conv.description || 'Standard portion conversion'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDelete(conv.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD CONVERSION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-servora-pale text-servora-core flex items-center justify-center">
                  <Scale size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-servora-navy">Create Conversion Factor</h2>
                  <p className="text-[11px] text-servora-deepTeal">Bridge purchasing units with kitchen measurements</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">From Unit (Source) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Crate, tbsp, Sack 50kg"
                    value={fromUnit}
                    onChange={(e) => setFromUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">To Unit (Base Ledger) *</label>
                  <select
                    value={toUnit}
                    onChange={(e) => setToUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none bg-white font-medium"
                  >
                    <option value="kg">kg (Kilograms)</option>
                    <option value="g">g (Grams)</option>
                    <option value="litres">litres (Litres)</option>
                    <option value="ml">ml (Millilitres)</option>
                    <option value="pcs">pcs (Pieces)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Conversion Factor *</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    placeholder="e.g. 1000 or 0.015"
                    value={conversionFactor}
                    onChange={(e) => setConversionFactor(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Category</label>
                  <select
                    value={unitCategory}
                    onChange={(e) => setUnitCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none bg-white"
                  >
                    <option value="PACKAGING">Packaging (Crates, Boxes)</option>
                    <option value="WEIGHT">Weight (kg, g, lbs)</option>
                    <option value="VOLUME">Volume (ltr, ml, cups)</option>
                    <option value="CUSTOM">Custom Culinary Unit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">
                  Specific Inventory Item (Optional)
                </label>
                <select
                  value={selectedInventoryId}
                  onChange={(e) => setSelectedInventoryId(e.target.value)}
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
                  Leave as universal for standard metric rules like 1 kg = 1,000 g.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. 1 crate contains 30 eggs"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                />
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
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700 transition-colors shadow-xs"
                >
                  {isSubmitting ? 'Saving...' : 'Save Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}