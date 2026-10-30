'use client';

import { useState, useEffect } from 'react';
import { Plus, UtensilsCrossed, Tag, DollarSign, CheckCircle2, XCircle } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  isAvailable: boolean;
  sku?: string;
  description?: string;
}

export default function MenuManagementPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);

  // Form states
  const [newCatName, setNewCatName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemSku, setNewItemSku] = useState('');

  const fetchMenuData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('servora_token');
      const res = await fetch('http://localhost:8000/api/v1/menu/active', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to fetch menu data');
      
      const result = await res.json();
      setCategories(result.data.categories);
      setItems(result.data.items);
      if (result.data.categories.length > 0 && !newItemCategory) {
        setNewItemCategory(result.data.categories[0]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuData();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('servora_token');
      // Note: We need the backend category creation endpoint. We will pass category name.
      const res = await fetch('http://localhost:8000/api/v1/menu/categories', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ name: newCatName })
      });

      if (!res.ok) throw new Error('Failed to create category');

      setNewCatName('');
      setIsCategoryModalOpen(false);
      fetchMenuData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('servora_token');
      // Find category ID or send matching structure. For simplicity, match backend validator requirements.
      // We will look up category ID index + 1 or map it properly.
      const categoryId = categories.indexOf(newItemCategory) + 1;

      const res = await fetch('http://localhost:8000/api/v1/menu/items', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          categoryId: categoryId > 0 ? categoryId : 1,
          name: newItemName,
          price: parseFloat(newItemPrice),
          sku: newItemSku || undefined,
          isAvailable: true 
        })
      });

      if (!res.ok) throw new Error('Failed to create menu item');

      setNewItemName('');
      setNewItemPrice('');
      setNewItemSku('');
      setIsItemModalOpen(false);
      fetchMenuData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-servora-navy">Menu & Recipe Management</h1>
          <p className="text-servora-deepTeal text-xs mt-1">Configure categories, pricing, availability, and POS products.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsCategoryModalOpen(true)}
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Categories Sidebar */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm lg:col-span-1 h-fit">
          <h3 className="text-sm font-semibold text-servora-navy mb-4 flex items-center gap-2">
            <Tag size={16} className="text-servora-core" /> Categories ({categories.length})
          </h3>
          {categories.length === 0 ? (
            <p className="text-xs text-gray-400">No categories created yet.</p>
          ) : (
            <div className="space-y-1">
              {categories.map((cat) => (
                <div key={cat} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 text-xs font-medium text-servora-navy">
                  <span>{cat}</span>
                  <span className="text-[10px] bg-blue-50 text-servora-core px-2 py-0.5 rounded-full">
                    {items.filter(i => i.category === cat).length} items
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Menu Items Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm lg:col-span-3 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-servora-navy flex items-center gap-2">
              <UtensilsCrossed size={16} className="text-servora-core" /> Menu Items ({items.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 text-center text-servora-deepTeal text-xs">Loading menu records from database...</div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <UtensilsCrossed size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm font-medium text-servora-navy">No menu items found</p>
                <p className="text-xs mt-1">Click "Add Menu Item" above to add your first product.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-servora-deepTeal uppercase tracking-wider border-b border-gray-100">
                    <th className="p-4 font-semibold">Item Name</th>
                    <th className="p-4 font-semibold">Category</th>
                    <th className="p-4 font-semibold">SKU</th>
                    <th className="p-4 font-semibold">Price (KES)</th>
                    <th className="p-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-servora-navy">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-medium">{item.name}</td>
                      <td className="p-4 text-servora-deepTeal">{item.category}</td>
                      <td className="p-4 font-mono text-gray-500">{item.sku || 'N/A'}</td>
                      <td className="p-4 font-bold text-servora-core">KES {item.price.toLocaleString()}</td>
                      <td className="p-4">
                        {item.isAvailable ? (
                          <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-[11px] font-medium">
                            <CheckCircle2 size={12} /> Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-1 rounded-full text-[11px] font-medium">
                            <XCircle size={12} /> Unavailable
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

      {/* Add Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
            <h3 className="text-lg font-bold text-servora-navy mb-4">Add Menu Category</h3>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-servora-navy mb-1">Category Name</label>
                <input 
                  type="text" 
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Beverages, Main Courses"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-servora-core/20 focus:border-servora-core"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-xs font-medium text-white bg-servora-core rounded-lg hover:bg-blue-700 shadow-sm"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Menu Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
            <h3 className="text-lg font-bold text-servora-navy mb-4">Add Menu Item</h3>
            <form onSubmit={handleCreateItem} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-servora-navy mb-1">Item Name</label>
                <input 
                  type="text" 
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Cappuccino, Cheeseburger"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-servora-core/20 focus:border-servora-core"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-servora-navy mb-1">Category</label>
                <select 
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-servora-core/20 focus:border-servora-core"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-servora-navy mb-1">Price (KES)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    placeholder="350.00"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-servora-core/20 focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-servora-navy mb-1">SKU / Code (Optional)</label>
                  <input 
                    type="text" 
                    value={newItemSku}
                    onChange={(e) => setNewItemSku(e.target.value)}
                    placeholder="BEV-001"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-servora-core/20 focus:border-servora-core"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-xs font-medium text-white bg-servora-core rounded-lg hover:bg-blue-700 shadow-sm"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}