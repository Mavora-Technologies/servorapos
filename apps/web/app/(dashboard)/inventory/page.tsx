'use client';

import { useState, useEffect } from 'react';
import { Package, Plus, AlertTriangle, ArrowUpDown, CheckCircle, X } from 'lucide-react';

interface InventoryItem {
  id: number;
  name: string;
  sku: string;
  category: string;
  unit: string;
  currentStock: string;
  minThreshold: string;
  costPrice: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Form States
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Ingredients');
  const [unit, setUnit] = useState('kg');
  const [currentStock, setCurrentStock] = useState('');
  const [minThreshold, setMinThreshold] = useState('');
  const [costPrice, setCostPrice] = useState('');

  // Adjustment State
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('PURCHASE');
  const [notes, setNotes] = useState('');

  const fetchInventory = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('servora_token');
      const res = await fetch('http://localhost:8000/api/v1/inventory', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch inventory');
      const result = await res.json();
      setItems(result.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('servora_token');
      const res = await fetch('http://localhost:8000/api/v1/inventory', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          name, sku, category, unit,
          currentStock: parseFloat(currentStock || '0'),
          minThreshold: parseFloat(minThreshold || '0'),
          costPrice: parseFloat(costPrice)
        })
      });

      if (!res.ok) throw new Error('Failed to create item');

      setIsAddModalOpen(false);
      setName(''); setSku(''); setCurrentStock(''); setMinThreshold(''); setCostPrice('');
      fetchInventory();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    try {
      const token = localStorage.getItem('servora_token');
      const res = await fetch('http://localhost:8000/api/v1/inventory/adjust', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          itemId: selectedItem.id,
          adjustment: parseFloat(adjustmentQty),
          type: adjustmentType,
          notes
        })
      });

      if (!res.ok) throw new Error('Failed to adjust stock');

      setIsAdjustModalOpen(false);
      setSelectedItem(null);
      setAdjustmentQty('');
      setNotes('');
      fetchInventory();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-servora-navy">Inventory & Stock Management</h1>
          <p className="text-servora-deepTeal text-xs mt-1">Track stock balances, reorder thresholds, and ingredient movements.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-servora-core text-white text-xs font-medium px-4 py-2 rounded-lg shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={14} /> Add Inventory Item
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-servora-navy flex items-center gap-2">
            <Package size={16} className="text-servora-core" /> Stock Inventory Ledger ({items.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-servora-deepTeal text-xs">Loading inventory...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Package size={32} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm font-medium text-servora-navy">No inventory items registered</p>
            <p className="text-xs mt-1">Click "Add Inventory Item" above to start tracking stock.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 text-servora-deepTeal uppercase tracking-wider border-b border-gray-100">
                  <th className="p-4 font-semibold">Item Name</th>
                  <th className="p-4 font-semibold">Category</th>
                  <th className="p-4 font-semibold">Current Stock</th>
                  <th className="p-4 font-semibold">Min Threshold</th>
                  <th className="p-4 font-semibold">Cost Price (KES)</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-servora-navy">
                {items.map((item) => {
                  const isLowStock = parseFloat(item.currentStock) <= parseFloat(item.minThreshold);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-medium">
                        {item.name}
                        <span className="block text-[10px] text-gray-400 font-mono">{item.sku || 'No SKU'}</span>
                      </td>
                      <td className="p-4 text-servora-deepTeal">{item.category}</td>
                      <td className="p-4 font-bold">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] ${
                          isLowStock ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
                        }`}>
                          {isLowStock && <AlertTriangle size={12} />}
                          {parseFloat(item.currentStock).toLocaleString()} {item.unit}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500">{parseFloat(item.minThreshold).toLocaleString()} {item.unit}</td>
                      <td className="p-4 font-medium">KES {parseFloat(item.costPrice).toLocaleString()}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => { setSelectedItem(item); setIsAdjustModalOpen(true); }}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-servora-navy rounded-lg font-medium transition-colors inline-flex items-center gap-1.5"
                        >
                          <ArrowUpDown size={12} /> Adjust Stock
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

      {/* ADD INVENTORY ITEM MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-servora-navy">Add Inventory Item</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateItem} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-servora-navy mb-1">Item Name</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Coffee Beans, Beef Patty" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-servora-navy mb-1">Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                    <option value="Ingredients">Ingredients</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Consumables">Consumables</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-servora-navy mb-1">Unit of Measure</label>
                  <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                    <option value="kg">Kilograms (kg)</option>
                    <option value="grams">Grams (g)</option>
                    <option value="litres">Litres (L)</option>
                    <option value="units">Units / Pcs</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-servora-navy mb-1">Opening Stock</label>
                  <input type="number" step="0.01" value={currentStock} onChange={e => setCurrentStock(e.target.value)} placeholder="100" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-servora-navy mb-1">Min Threshold</label>
                  <input type="number" step="0.01" value={minThreshold} onChange={e => setMinThreshold(e.target.value)} placeholder="10" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-servora-navy mb-1">Cost Price (KES)</label>
                  <input type="number" step="0.01" required value={costPrice} onChange={e => setCostPrice(e.target.value)} placeholder="150" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs font-medium text-white bg-servora-core rounded-lg hover:bg-blue-700 shadow-sm">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST STOCK MODAL */}
      {isAdjustModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-servora-navy">Adjust Stock: {selectedItem.name}</h3>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleAdjustStock} className="space-y-3">
              <div className="text-xs text-gray-500">
                Current Balance: <strong className="text-servora-navy">{parseFloat(selectedItem.currentStock).toLocaleString()} {selectedItem.unit}</strong>
              </div>
              <div>
                <label className="block text-xs font-medium text-servora-navy mb-1">Movement Type</label>
                <select value={adjustmentType} onChange={e => setAdjustmentType(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                  <option value="PURCHASE">Purchase / Goods Received (+)</option>
                  <option value="WASTE">Waste / Spoilage (-)</option>
                  <option value="ADJUSTMENT">Manual Stock Count Adjustment (+/-)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-servora-navy mb-1">Adjustment Quantity (+ to add, - to subtract)</label>
                <input type="number" step="0.01" required value={adjustmentQty} onChange={e => setAdjustmentQty(e.target.value)} placeholder="e.g. 50 or -5" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-servora-navy mb-1">Reason / Notes</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Weekly supplier delivery" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setIsAdjustModalOpen(false)} className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs font-medium text-white bg-servora-core rounded-lg hover:bg-blue-700 shadow-sm">Confirm Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}