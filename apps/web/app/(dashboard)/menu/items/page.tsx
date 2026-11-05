'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, UtensilsCrossed, Search, CheckCircle2, XCircle, Tag, ArrowLeft, Layers } from 'lucide-react';
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

export default function MenuItemsPage() {
  const router = useRouter();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryObjects, setCategoryObjects] = useState<{ id: number; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form States
  const [itemName, setItemName] = useState('');
  const [itemCategoryId, setItemCategoryId] = useState<number | ''>('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemSku, setItemSku] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemStation, setItemStation] = useState('MAIN_KITCHEN');
  const [itemStockType, setItemStockType] = useState('RECIPE');

  const fetchItemsData = async () => {
    try {
      setIsLoading(true);
      // Fetch active menu items and categories concurrently via dynamic fetchApi
      const [menuResult, catResult] = await Promise.all([
        fetchApi('/api/v1/menu/active'),
        fetchApi('/api/v1/menu/categories')
      ]);

      setItems(menuResult.data.items);
      setCategories(menuResult.data.categories);

      setCategoryObjects(catResult.data);
      if (catResult.data.length > 0 && itemCategoryId === '') {
        setItemCategoryId(catResult.data[0].id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItemsData();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itemCategoryId === '') return alert('Please select a category');

    try {
      await fetchApi('/api/v1/menu/items', {
        method: 'POST',
        body: JSON.stringify({
          categoryId: Number(itemCategoryId),
          name: itemName,
          price: parseFloat(itemPrice),
          sku: itemSku || undefined,
          description: itemDesc || undefined,
          kitchenStation: itemStation,
          stockTrackingType: itemStockType,
          isAvailable: true
        })
      });

      setItemName('');
      setItemPrice('');
      setItemSku('');
      setItemDesc('');
      setIsAddModalOpen(false);
      fetchItemsData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button 
              onClick={() => router.push('/menu')}
              className="text-gray-400 hover:text-servora-navy transition-colors"
              title="Back to Catalog"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-2xl font-bold text-servora-navy flex items-center gap-2">
              <UtensilsCrossed size={28} className="text-servora-core" /> Menu Items Directory
            </h1>
          </div>
          <p className="text-servora-deepTeal text-xs">
            Manage individual catalog items, pricing, SKU mappings, and station routing.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-servora-core text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Plus size={16} /> Add Menu Item
          </button>
        </div>
      </div>

      {/* Toolbar: Search & Category Filter */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center mb-4 shrink-0">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search items by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-servora-core/20"
          />
        </div>

        {/* Category Pills */}
        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              selectedCategory === 'All' ? 'bg-servora-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Items ({items.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                selectedCategory === cat ? 'bg-servora-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat} ({items.filter(i => i.category === cat).length})
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-servora-deepTeal text-xs">Loading items directory...</div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center">
            <UtensilsCrossed size={48} className="mb-3 opacity-20 text-servora-core" />
            <p className="text-base font-bold text-servora-navy">No Menu Items Found</p>
            <p className="text-xs mt-1">Try adjusting your search filter or add a new item.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 sticky top-0 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
                <tr>
                  <th className="p-4">Item Details</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Kitchen Station</th>
                  <th className="p-4">Price (KES)</th>
                  <th className="p-4">Availability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-servora-navy">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-sm">{item.name}</div>
                      {item.sku && <div className="text-[10px] text-gray-400 font-mono mt-0.5">SKU: {item.sku}</div>}
                      {item.description && <div className="text-[11px] text-gray-500 mt-1 line-clamp-1">{item.description}</div>}
                    </td>
                    <td className="p-4 font-medium text-servora-deepTeal">
                      <span className="bg-gray-100 px-2.5 py-1 rounded-md">{item.category}</span>
                    </td>
                    <td className="p-4 font-mono text-gray-600">
                      {item.kitchenStation || 'MAIN_KITCHEN'}
                    </td>
                    <td className="p-4 font-bold text-servora-core text-sm">
                      KES {item.price.toLocaleString()}
                    </td>
                    <td className="p-4">
                      {item.isAvailable ? (
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-[11px] font-medium border border-green-200">
                          <CheckCircle2 size={12} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-1 rounded-full text-[11px] font-medium border border-red-200">
                          <XCircle size={12} /> Hidden
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD MENU ITEM MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-servora-navy">Add New POS Menu Item</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600"><XCircle size={20} /></button>
            </div>
            <form onSubmit={handleCreateItem} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Item Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., Grilled Chicken Burger" 
                  value={itemName} 
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category *</label>
                  <select 
                    required
                    value={itemCategoryId}
                    onChange={(e) => setItemCategoryId(Number(e.target.value))}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  >
                    <option value="">Select category</option>
                    {categoryObjects.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Kitchen Station</label>
                  <select 
                    value={itemStation}
                    onChange={(e) => setItemStation(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  >
                    <option value="MAIN_KITCHEN">Main Kitchen</option>
                    <option value="GRILL">Grill & Choma</option>
                    <option value="BAR">Bar & Beverages</option>
                    <option value="PASTRY">Pastry & Bakery</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Price (KES) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    placeholder="950" 
                    value={itemPrice} 
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">SKU / Code</label>
                  <input 
                    type="text" 
                    placeholder="CHIX-01" 
                    value={itemSku} 
                    onChange={(e) => setItemSku(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description / Recipe Note</label>
                <textarea 
                  placeholder="Ingredients or serving details..." 
                  value={itemDesc} 
                  onChange={(e) => setItemDesc(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs h-16"
                />
              </div>

              <button type="submit" className="w-full py-2.5 bg-servora-core text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition-colors shadow-sm mt-2">
                Save & Publish Item
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}