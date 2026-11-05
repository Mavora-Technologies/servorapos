'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Plus, Utensils, Check, X, FolderPlus, Tag } from 'lucide-react';
import { fetchApi } from '@/lib/api'; // Import centralized dynamic API helper

interface Category {
  id: number;
  name: string;
  description?: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  isAvailable: boolean;
  description?: string;
}

export default function MenuCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state (Only keeping Category modal here now)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Form states for Category
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  const fetchMenuData = async () => {
    try {
      setIsLoading(true);
      // Fetch categories & full active menu items concurrently using dynamic fetchApi
      const [catResult, menuResult] = await Promise.all([
        fetchApi('/api/v1/menu/categories'),
        fetchApi('/api/v1/menu/active')
      ]);

      setCategories(catResult.data);
      setItems(menuResult.data.items);
    } catch (error) {
      console.error(error);
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
      await fetchApi('/api/v1/menu/categories', {
        method: 'POST',
        body: JSON.stringify({ name: catName, description: catDesc })
      });

      setCatName('');
      setCatDesc('');
      setIsCategoryModalOpen(false);
      fetchMenuData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      
      {/* Header & Action Buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-servora-navy flex items-center gap-2">
            <Layers size={28} className="text-servora-core" /> Menu & Categories Management
          </h1>
          <p className="text-servora-deepTeal text-xs mt-1">
            Organize catalog categories, sections, and items for POS checkout.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-4 py-2 bg-white border border-gray-200 text-servora-navy text-xs font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-1.5"
          >
            <FolderPlus size={16} /> New Category
          </button>
          {/* Redirects to main /menu page */}
          <button 
            onClick={() => router.push('/menu')}
            className="px-4 py-2 bg-servora-core text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Plus size={16} /> Add Menu Item
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-servora-deepTeal">Loading menu catalog...</div>
        ) : (
          categories.map(category => {
            const categoryItems = items.filter(i => i.category === category.name);

            return (
              <div key={category.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-servora-navy text-base flex items-center gap-2">
                      <Tag size={16} className="text-servora-core" /> {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{category.description}</p>
                    )}
                  </div>
                  <span className="text-xs font-semibold bg-blue-50 text-servora-core px-2.5 py-1 rounded-full border border-blue-100">
                    {categoryItems.length} items
                  </span>
                </div>

                <div className="p-4">
                  {categoryItems.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-2">No items listed under this category yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                      {categoryItems.map(item => (
                        <div key={item.id} className="flex flex-col justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50 shadow-xs">
                          <div>
                            <div className="flex justify-between items-start">
                              <h4 className="text-xs font-bold text-servora-navy line-clamp-1">{item.name}</h4>
                              <span className={`w-2 h-2 rounded-full ${item.isAvailable ? 'bg-green-500' : 'bg-red-400'}`} title={item.isAvailable ? 'Available' : 'Unavailable'} />
                            </div>
                            {item.description && (
                              <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                            )}
                          </div>
                          <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-200/60">
                            <span className="text-xs font-bold text-servora-core">KES {item.price.toLocaleString()}</span>
                            <span className="text-[10px] text-gray-400 uppercase font-mono">POS Active</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE CATEGORY MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-servora-navy">Create Menu Category</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g., Main Courses, Beverages" 
                  value={catName} 
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-servora-core/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description (Optional)</label>
                <textarea 
                  placeholder="Short description..." 
                  value={catDesc} 
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-servora-core/20 h-20"
                />
              </div>
              <button type="submit" className="w-full py-2.5 bg-servora-core text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition-colors shadow-sm">
                Save Category
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}