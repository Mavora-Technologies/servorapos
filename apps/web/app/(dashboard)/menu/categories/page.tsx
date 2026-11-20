// apps/web/app/(dashboard)/menu/categories/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Layers,
  Plus,
  X,
  FolderPlus,
  Tag,
  Edit3,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

interface CategoryRecord {
  id: number;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface CatalogMenuItem {
  id: number;
  categoryId: number;
  name: string;
  sku: string | null;
  price: number;
  isAvailable: boolean;
  description: string | null;
  kitchenStation: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export default function MenuCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [items, setItems] = useState<CatalogMenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Page Feedback States
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  // Create / Edit Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryRecord | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catSortOrder, setCatSortOrder] = useState('0');
  const [catIsActive, setCatIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState<CategoryRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMenuData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const [catResult, catalogResult] = await Promise.allSettled([
      fetchApi('/api/v1/menu/categories?includeInactive=true'),
      fetchApi('/api/v1/menu/catalog'),
    ]);

    if (catResult.status === 'fulfilled' && Array.isArray(catResult.value?.data)) {
      setCategories(catResult.value.data);
    } else {
      setCategories([]);
      setLoadError(
        catResult.status === 'rejected'
          ? getErrorMessage(catResult.reason, 'Failed to load menu categories.')
          : 'Unexpected response structure received from categories API.'
      );
    }

    if (catalogResult.status === 'fulfilled' && Array.isArray(catalogResult.value?.data?.items)) {
      setItems(catalogResult.value.data.items);
    } else {
      setItems([]);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchMenuData();
  }, [fetchMenuData]);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return categories.filter((cat) => {
      const catItems = items.filter((i) => i.categoryId === cat.id);
      const matchesSearch =
        !q ||
        cat.name.toLowerCase().includes(q) ||
        (cat.description && cat.description.toLowerCase().includes(q)) ||
        catItems.some((i) => i.name.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && cat.isActive) ||
        (statusFilter === 'INACTIVE' && !cat.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [categories, items, searchQuery, statusFilter]);

  const openCategoryModal = (category?: CategoryRecord) => {
    setModalError(null);
    if (category) {
      setEditingCategory(category);
      setCatName(category.name);
      setCatDesc(category.description || '');
      setCatSortOrder(String(category.sortOrder ?? 0));
      setCatIsActive(category.isActive);
    } else {
      setEditingCategory(null);
      setCatName('');
      setCatDesc('');
      setCatSortOrder(String(categories.length));
      setCatIsActive(true);
    }
    setIsCategoryModalOpen(true);
  };

  const closeCategoryModal = () => {
    if (isSubmitting) return;
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
    setModalError(null);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setModalError(null);

    if (catName.trim().length < 2) {
      setModalError('Category name must be at least 2 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: catName.trim(),
        description: catDesc.trim() || null,
        sortOrder: Math.max(0, parseInt(catSortOrder, 10) || 0),
        isActive: catIsActive,
      };

      if (editingCategory) {
        await fetchApi(`/api/v1/menu/categories/${editingCategory.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setStatusBanner(`Updated category "${catName.trim()}".`);
      } else {
        await fetchApi('/api/v1/menu/categories', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setStatusBanner(`Created category "${catName.trim()}".`);
      }

      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      await fetchMenuData();
    } catch (error: unknown) {
      setModalError(getErrorMessage(error, 'Failed to save category.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (category: CategoryRecord) => {
    setActionError(null);
    try {
      await fetchApi(`/api/v1/menu/categories/${category.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !category.isActive }),
      });
      setStatusBanner(
        `Category "${category.name}" is now ${!category.isActive ? 'Active on POS' : 'Inactive'}.`
      );
      await fetchMenuData();
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, 'Failed to update category status.'));
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteCategory || isDeleting) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await fetchApi(`/api/v1/menu/categories/${pendingDeleteCategory.id}`, {
        method: 'DELETE',
      });
      const deletedName = pendingDeleteCategory.name;
      setPendingDeleteCategory(null);
      setStatusBanner(`Deleted category "${deletedName}".`);
      await fetchMenuData();
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, 'Failed to delete category.'));
      setPendingDeleteCategory(null);
    } finally {
      setIsDeleting(false);
    }
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

      {/* Header & Action Buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/menu"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core inline-flex items-center gap-1 transition-colors"
            >
              Menu Catalog <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Categories Management</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Layers size={22} className="text-servora-core" /> Menu &amp; Categories Management
          </h1>
          <p className="text-servora-deepTeal text-xs mt-1">
            Organize catalog sections, POS display order, and active status across your menu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchMenuData}
            disabled={isLoading}
            className="px-3 py-2 text-xs font-semibold text-servora-deepTeal bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200 inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => openCategoryModal()}
            className="px-4 py-2 bg-white border border-gray-200 text-servora-navy text-xs font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <FolderPlus size={15} /> New Category
          </button>
          <button
            type="button"
            onClick={() => router.push('/menu')}
            className="px-4 py-2 bg-servora-core text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} /> Add Menu Item
          </button>
        </div>
      </div>

      {/* Search & Status Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            aria-label="Search categories or menu items"
            placeholder="Search categories or menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-gray-50 border border-gray-100 rounded-xl">
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === tab
                  ? 'bg-white shadow-xs text-servora-navy font-bold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab === 'ALL'
                ? `All (${categories.length})`
                : tab === 'ACTIVE'
                  ? 'Active'
                  : 'Inactive'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="space-y-5">
        {isLoading ? (
          <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-gray-100 text-xs font-medium text-servora-deepTeal animate-pulse">
            Loading menu categories...
          </div>
        ) : loadError ? (
          <div
            role="alert"
            className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-100 text-center space-y-3"
          >
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <p className="text-xs font-bold text-rose-800">{loadError}</p>
            <button
              type="button"
              onClick={fetchMenuData}
              className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700"
            >
              Retry Request
            </button>
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-100 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-servora-pale text-servora-core flex items-center justify-center">
              <Layers size={24} />
            </div>
            <h3 className="text-sm font-bold text-servora-navy">No Menu Categories Configured</h3>
            <p className="text-xs text-servora-deepTeal max-w-sm">
              Create your first category (e.g., Main Courses, Beverages, Desserts) to organize your POS catalog.
            </p>
            <button
              type="button"
              onClick={() => openCategoryModal()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700"
            >
              <FolderPlus size={14} /> Create First Category
            </button>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-12 bg-white rounded-2xl border border-gray-100 text-center text-xs text-servora-deepTeal">
            No categories matched your search or status filter.
          </div>
        ) : (
          filteredCategories.map((category) => {
            const categoryItems = items.filter((i) => i.categoryId === category.id);

            return (
              <div
                key={category.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden"
              >
                <div className="p-4 bg-slate-50 border-b border-gray-100 flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-servora-navy text-sm flex items-center gap-2">
                        <Tag size={15} className="text-servora-core" /> {category.name}
                      </h3>
                      <span className="text-[10px] font-mono font-semibold text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-md">
                        Order #{category.sortOrder}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(category)}
                        title="Toggle category POS visibility"
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                          category.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {category.isActive ? (
                          <>
                            <CheckCircle2 size={10} /> Active
                          </>
                        ) : (
                          <>
                            <XCircle size={10} /> Inactive
                          </>
                        )}
                      </button>
                    </div>
                    {category.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{category.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold bg-blue-50 text-servora-core px-2.5 py-1 rounded-full border border-blue-100">
                      {categoryItems.length} item{categoryItems.length === 1 ? '' : 's'}
                    </span>
                    <button
                      type="button"
                      onClick={() => openCategoryModal(category)}
                      title="Edit Category"
                      aria-label={`Edit ${category.name}`}
                      className="p-1.5 text-gray-500 hover:text-servora-core hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-colors cursor-pointer"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteCategory(category)}
                      title="Delete Category"
                      aria-label={`Delete ${category.name}`}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="p-4">
                  {categoryItems.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-2">
                      No items assigned to this category yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                      {categoryItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/60"
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="text-xs font-bold text-servora-navy line-clamp-1">
                                {item.name}
                              </h4>
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 mt-1 ${
                                  item.isAvailable ? 'bg-emerald-500' : 'bg-rose-400'
                                }`}
                                title={item.isAvailable ? 'Available on POS' : 'Hidden from POS'}
                              />
                            </div>
                            {item.description && (
                              <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-200/60">
                            <span className="text-xs font-mono font-bold text-servora-core">
                              KES {item.price.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-gray-400 uppercase font-mono">
                              {item.isAvailable ? 'POS Active' : 'Hidden'}
                            </span>
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

      {/* CREATE / EDIT CATEGORY MODAL */}
      {isCategoryModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-modal-title"
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 id="category-modal-title" className="text-sm font-bold text-servora-navy">
                  {editingCategory
                    ? `Edit Category: ${editingCategory.name}`
                    : 'Create Menu Category'}
                </h3>
                <p className="text-[11px] text-servora-deepTeal">
                  Configure section label, POS sort order, and visibility
                </p>
              </div>
              <button
                type="button"
                onClick={closeCategoryModal}
                aria-label="Close modal"
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div
                role="alert"
                className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold"
              >
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="cat-name">
                  Category Name *
                </label>
                <input
                  id="cat-name"
                  type="text"
                  required
                  placeholder="e.g. Main Courses, Beverages"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-servora-core"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="cat-desc">
                  Description (Optional)
                </label>
                <textarea
                  id="cat-desc"
                  placeholder="Short section description..."
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="cat-sort">
                    POS Sort Order
                  </label>
                  <input
                    id="cat-sort"
                    type="number"
                    min="0"
                    value={catSortOrder}
                    onChange={(e) => setCatSortOrder(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:border-servora-core"
                  />
                </div>
                <label className="flex items-center gap-2 pt-4 cursor-pointer text-xs font-bold text-servora-navy">
                  <input
                    type="checkbox"
                    checked={catIsActive}
                    onChange={(e) => setCatIsActive(e.target.checked)}
                    className="rounded border-gray-300 text-servora-core w-4 h-4"
                  />
                  <span>Active on POS</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeCategoryModal}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-servora-core text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50"
                >
                  {isSubmitting
                    ? 'Saving...'
                    : editingCategory
                      ? 'Save Changes'
                      : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {pendingDeleteCategory && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-category-title"
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 id="delete-category-title" className="text-sm font-bold text-servora-navy">
                  Delete Category?
                </h3>
                <p className="text-xs text-servora-deepTeal mt-1 leading-relaxed">
                  Are you sure you want to delete{' '}
                  <strong className="text-servora-navy">{pendingDeleteCategory.name}</strong>? Categories that still have assigned menu items cannot be deleted—deactivate them or move their items first.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setPendingDeleteCategory(null)}
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
                {isDeleting ? 'Deleting...' : 'Delete Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}