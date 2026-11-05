'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, UtensilsCrossed, Tag, CheckCircle2, XCircle, Search, Layers } from 'lucide-react';
import { fetchApi } from '@/lib/api'; // Import centralized dynamic API helper

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  isAvailable: boolean;
  sku?: string;
  description?: string;
  kitchenStation?: string;
  stockTrackingType?: string;
}

export default function AdvancedMenuManagementPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<string[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');

  // Modal state for adding a menu item
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);

  // Form states for Menu Item
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemSku, setNewItemSku] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemStation, setNewItemStation] = useState('MAIN_KITCHEN');
  const [newItemStockType, setNewItemStockType] = useState('RECIPE');

  const fetchMenuData = async () => {
    try {
      setIsLoading(true);
      // Fetch active menu records dynamically using fetchApi
      const result = await fetchApi('/api/v1/menu/active');
      
      setCategories(result.data.categories);
      setItems(result.data.items);
      if (result.data.categories.length > 0 && !newItemCategory) {
        setNewItemCategory(result.data.categories[0]);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuData();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesCategory = selectedCategoryFilter === 'All' || item.category === selectedCategoryFilter;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [items, selectedCategoryFilter, searchQuery]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const categoryId = categories.indexOf(newItemCategory) + 1;

      await fetchApi('/api/v1/menu/items', {
        method: 'POST',
        body: JSON.stringify({ 
          categoryId: categoryId > 0 ? categoryId : 1,
          name: newItemName,
          price: parseFloat(newItemPrice),
          sku: newItemSku || undefined,
          description: newItemDesc || undefined,
          kitchenStation: newItemStation,
          stockTrackingType: newItemStockType,
          isAvailable: true 
        })
      });

      setNewItemName('');
      setNewItemPrice('');
      setNewItemSku('');
      setNewItemDesc('');
      setIsItemModalOpen(false);
      fetchMenuData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-servora-navy">Advanced Menu & Catalog</h1>
          <p className="text-servora-deepTeal text-xs mt-1">Configure pricing, station routing, and active POS inventory mapping.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => router.push('/menu/categories')}
            className="bg-white border border-gray-200 text-servora-navy text-xs font-medium px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Tag size={14} /> Add Category
          </button>
          <button 
            onClick={() => setIsItemModalOpen(true)}
            className="bg-servora-core text-white text-xs font-medium px-4 py-2 rounded-lg shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={14} /> Add Menu Item
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-servora-core/20"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-hide">
          <button
            onClick={() => setSelectedCategoryFilter('All')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              selectedCategoryFilter === 'All' ? 'bg-servora-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Categories ({items.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                selectedCategoryFilter === cat ? 'bg-servora-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat} ({items.filter(i => i.category === cat).length})
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Categories Overview Sidebar */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm lg:col-span-1 h-fit space-y-4">
          <h3 className="text-sm font-semibold text-servora-navy flex items-center gap-2">
            <Layers size={16} className="text-servora-core" /> Categories Summary
          </h3>
          <div className="space-y-2">
            {categories.map((cat) => (
              <div key={cat} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 text-xs text-servora-navy border border-gray-100">
                <span className="font-medium">{cat}</span>
                <span className="text-[10px] bg-blue-50 text-servora-core px-2 py-0.5 rounded-full font-bold">
                  {items.filter(i => i.category === cat).length}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Menu Items Catalog Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm lg:col-span-3 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-servora-navy flex items-center gap-2">
              <UtensilsCrossed size={16} className="text-servora-core" /> Catalog Products ({filteredItems.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 text-center text-servora-deepTeal text-xs">Loading menu catalog...</div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <UtensilsCrossed size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm font-medium text-servora-navy">No items found matching filter</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-servora-deepTeal uppercase tracking-wider border-b border-gray-100">
                    <th className="p-4 font-semibold">Item Name</th>
                    <th className="p-4 font-semibold">Category</th>
                    <th className="p-4 font-semibold">Station</th>
                    <th className="p-4 font-semibold">Price (KES)</th>
                    <th className="p-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-servora-navy">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold">{item.name}</div>
                        {item.sku && <div className="text-[10px] text-gray-400 font-mono">SKU: {item.sku}</div>}
                      </td>
                      <td className="p-4 text-servora-deepTeal font-medium">{item.category}</td>
                      <td className="p-4">
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-mono">
                          {item.kitchenStation || 'MAIN_KITCHEN'}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-servora-core">KES {item.price.toLocaleString()}</td>
                      <td className="p-4">
                        {item.isAvailable ? (
                          <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-[11px] font-medium">
                            <CheckCircle2 size={12} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-1 rounded-full text-[11px] font-medium">
                            <XCircle size={12} /> Hidden
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* Add Menu Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <h3 className="text-base font-bold text-servora-navy">Add POS Menu Item</h3>
            <form onSubmit={handleCreateItem} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-servora-navy mb-1">Item Name *</label>
                <input 
                  type="text" 
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Nyama Choma Portion"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-servora-navy mb-1">Category *</label>
                  <select 
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-servora-navy mb-1">Kitchen Station</label>
                  <select 
                    value={newItemStation}
                    onChange={(e) => setNewItemStation(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  >
                    <option value="MAIN_KITCHEN">Main Kitchen</option>
                    <option value="GRILL">Grill & Choma</option>
                    <option value="BAR">Bar & Beverages</option>
                    <option value="PASTRY">Pastry & Bakery</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-servora-navy mb-1">Price (KES) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    placeholder="750"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-servora-navy mb-1">SKU / Code</label>
                  <input 
                    type="text" 
                    value={newItemSku}
                    onChange={(e) => setNewItemSku(e.target.value)}
                    placeholder="MEAT-01"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-servora-navy mb-1">Description / Recipe Note</label>
                <textarea 
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  placeholder="Ingredients or serving notes..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs h-16"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsItemModalOpen(false)} className="px-4 py-2 text-xs text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs text-white bg-servora-core rounded-lg font-bold">Publish Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}