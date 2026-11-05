'use client';

import { useEffect, useState } from 'react';
import { Plus, ShoppingBasket, Trash2, X, AlertCircle, Layers, CheckCircle2 } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface ComboItem {
  id?: number;
  menuItemId: number;
  quantity: number;
  additionalPrice: number;
  itemName?: string;
  itemPrice?: string;
}

interface ComboBundle {
  id: number;
  name: string;
  description?: string;
  sku?: string;
  basePrice: string;
  isAvailable: boolean;
  items: ComboItem[];
}

interface MenuItemOption {
  id: number;
  name: string;
  price: string;
}

export default function CombosPage() {
  const [combos, setCombos] = useState<ComboBundle[]>([]);
  const [menuItemsList, setMenuItemsList] = useState<MenuItemOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [items, setItems] = useState<{ menuItemId: number; quantity: number; additionalPrice: number }[]>([
    { menuItemId: 0, quantity: 1, additionalPrice: 0 },
  ]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [comboRes, itemsRes] = await Promise.all([
        fetchApi('/api/v1/menu/combos').catch((err) => {
          console.error('Failed to load combos:', err);
          return null;
        }),
        fetchApi('/api/v1/menu/items').catch((err) => {
          console.error('Failed to load menu items:', err);
          return null;
        }),
      ]);

      if (comboRes?.data) {
        const rawCombos = Array.isArray(comboRes.data)
          ? comboRes.data
          : comboRes.data.items || [];
        setCombos(rawCombos);
      }

      if (itemsRes?.data) {
        // Handle both res.data and res.data.items / res.data.menuItems
        const rawItems = Array.isArray(itemsRes.data)
          ? itemsRes.data
          : itemsRes.data.items || itemsRes.data.menuItems || [];

        // Normalize item object fields in case keys are named differently
        const normalized = rawItems.map((item: any) => ({
          id: item.id,
          name: item.name || item.itemName || item.item_name || item.title || 'Unnamed Item',
          price: item.price || item.basePrice || item.base_price || 0,
        }));

        setMenuItemsList(normalized);
      }
    } catch (err) {
      console.error('Combo page load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddItemRow = () => {
    setItems([...items, { menuItemId: 0, quantity: 1, additionalPrice: 0 }]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: string, val: any) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: val };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const validItems = items.filter((i) => Number(i.menuItemId) > 0);
    if (validItems.length === 0) {
      setError('Please select at least one menu item for the bundle.');
      setIsSubmitting(false);
      return;
    }

    try {
      await fetchApi('/api/v1/menu/combos', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description,
          sku: sku || undefined,
          basePrice: Number(basePrice),
          items: validItems.map((i) => ({
            menuItemId: Number(i.menuItemId),
            quantity: Number(i.quantity),
            additionalPrice: Number(i.additionalPrice) || 0,
          })),
        }),
      });

      setIsModalOpen(false);
      setName('');
      setDescription('');
      setSku('');
      setBasePrice('');
      setItems([{ menuItemId: 0, quantity: 1, additionalPrice: 0 }]);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create combo bundle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this combo bundle?')) return;
    try {
      await fetchApi(`/api/v1/menu/combos/${id}`, { method: 'DELETE' });
      setCombos((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete combo');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-servora-navy">Combos & Meal Bundles</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-1">
            Package multiple POS dishes and drinks into discounted bundles for fast checkout.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-servora-core text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={16} />
          Create Combo Bundle
        </button>
      </div>

      {/* Grid of Combos */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-gray-100">
          <p className="text-xs font-medium text-servora-deepTeal animate-pulse">Loading combo bundles...</p>
        </div>
      ) : combos.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-100 text-center">
          <div className="w-12 h-12 rounded-2xl bg-servora-pale text-servora-core flex items-center justify-center mb-3">
            <ShoppingBasket size={24} />
          </div>
          <h3 className="text-sm font-bold text-servora-navy">No combo bundles created</h3>
          <p className="text-xs text-servora-deepTeal mt-1 max-w-sm">
            Group burgers, drinks, and sides into single SKU meals with combined pricing.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {combos.map((combo) => (
            <div
              key={combo.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-servora-teal bg-servora-teal/10 px-2 py-0.5 rounded-md">
                      {combo.sku || 'COMBO'}
                    </span>
                    <h3 className="text-sm font-bold text-servora-navy mt-1.5">{combo.name}</h3>
                    {combo.description && (
                      <p className="text-xs text-servora-deepTeal mt-0.5">{combo.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(combo.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="my-3 py-2 px-3 bg-servora-pale rounded-xl flex items-center justify-between">
                  <span className="text-xs font-medium text-servora-deepTeal">Bundle Price:</span>
                  <span className="text-sm font-bold text-servora-core">KES {Number(combo.basePrice).toLocaleString()}</span>
                </div>

                {/* Sub-item inventory */}
                <div className="space-y-1.5 border-t border-gray-100 pt-3">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Includes Items:</p>
                  {combo.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                      <span className="text-servora-navy font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-servora-core"></span>
                        {item.quantity}x {item.itemName || 'Item'}
                      </span>
                      {Number(item.additionalPrice) > 0 && (
                        <span className="text-[11px] font-semibold text-gray-500">
                          +KES {Number(item.additionalPrice).toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-sm font-bold text-servora-navy">Create Combo Bundle</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-100 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Bundle Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nyama Choma Feast Platter, Burger Deal"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Bundle Price (KES) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="1500"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">SKU / Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="BNDL-001"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Details of what's included for kitchen and cashier"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                />
              </div>

              {/* Items in Combo */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-servora-navy">Included Menu Items</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs font-semibold text-servora-core hover:underline flex items-center gap-1"
                  >
                    <Plus size={13} /> Add Dish/Drink
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={row.menuItemId}
                        onChange={(e) => handleItemChange(idx, 'menuItemId', Number(e.target.value))}
                        className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none bg-white"
                      >
                        <option value={0}>Select a menu item...</option>
                        {menuItemsList.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} (KES {Number(item.price).toLocaleString()})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={row.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                        className="w-16 px-2.5 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                      />

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-2 text-gray-400 hover:text-red-500 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
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
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-servora-core text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Creating...' : 'Save Combo Bundle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}