// apps/web/app/(dashboard)/menu/combos/page.tsx
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  ShoppingBasket,
  Trash2,
  Edit3,
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  ChevronRight,
  RefreshCw,
  Tag,
  Calendar,
  TrendingDown,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import MenuItemImageUploader from '@/components/menu/MenuItemImageUploader';
import { getOptimizedMenuImageUrl, cleanupOrphanedUpload } from '@/lib/cloudinary';

type AvailabilityFilter = 'ALL' | 'ACTIVE' | 'HIDDEN' | 'ISSUES';
type SortOption = 'UPDATED' | 'NAME' | 'PRICE_ASC' | 'PRICE_DESC' | 'SAVINGS_DESC';

interface ComboItemRecord {
  id: number;
  comboId: number;
  menuItemId: number;
  quantity: number;
  additionalPrice: string;
  itemName: string | null;
  itemPrice: string | null;
  itemIsAvailable: boolean | null;
}

interface ComboBundle {
  id: number;
  name: string;
  description: string | null;
  sku: string | null;
  basePrice: string;
  isAvailable: boolean;
  validFrom: string | null;
  validUntil: string | null;
  imageUrl: string | null;
  imageCardUrl?: string | null;
  imagePublicId?: string | null;
  imageOriginalFilename?: string | null;
  imageMimeType?: string | null;
  imageFileSize?: number | null;
  standaloneTotal: number;
  savingsAmount: number;
  savingsPercent: number;
  pricingMode: 'DISCOUNTED' | 'EXACT' | 'PREMIUM';
  unavailableComponents: string[];
  isWithinSchedule: boolean;
  effectiveAvailable: boolean;
  updatedAt: string;
  items: ComboItemRecord[];
}

interface MenuItemOption {
  id: number;
  name: string;
  price: number;
  isAvailable: boolean;
}

interface ComboFormLine {
  menuItemId: string;
  quantity: string;
  additionalPrice: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function CombosPage() {
  const [combos, setCombos] = useState<ComboBundle[]>([]);
  const [menuItemsList, setMenuItemsList] = useState<MenuItemOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Page Feedback States
  const [loadError, setLoadError] = useState<string | null>(null);
  const [referenceWarning, setReferenceWarning] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('UPDATED');

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<ComboBundle | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [pendingDeleteCombo, setPendingDeleteCombo] = useState<ComboBundle | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [items, setItems] = useState<ComboFormLine[]>([
    { menuItemId: '', quantity: '1', additionalPrice: '0' },
  ]);

  // Cloudinary Image State
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePublicId, setImagePublicId] = useState<string | null>(null);
  const [imageOriginalFilename, setImageOriginalFilename] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [imageFileSize, setImageFileSize] = useState<number | null>(null);
  const [unsavedUploadedPublicIds, setUnsavedUploadedPublicIds] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setReferenceWarning(null);

    const [comboResult, itemsResult] = await Promise.allSettled([
      fetchApi('/api/v1/menu/combos'),
      fetchApi('/api/v1/menu/catalog'),
    ]);

    if (comboResult.status === 'fulfilled') {
      const payload = comboResult.value?.data;
      if (Array.isArray(payload)) {
        setCombos(payload);
      } else {
        setCombos([]);
        setLoadError('Unexpected response structure received from combos API.');
      }
    } else {
      setCombos([]);
      setLoadError(getErrorMessage(comboResult.reason, 'Failed to load combo bundles.'));
    }

    if (itemsResult.status === 'fulfilled') {
      const payload = itemsResult.value?.data;
      const rawItems = Array.isArray(payload) ? payload : payload?.items;
      if (Array.isArray(rawItems)) {
        const normalized: MenuItemOption[] = rawItems.map(
          (item: {
            id: number;
            name?: string;
            price?: number | string;
            isAvailable?: boolean;
          }) => ({
            id: Number(item.id),
            name: item.name || `Item #${item.id}`,
            price: Number(item.price ?? 0),
            isAvailable: item.isAvailable !== false,
          })
        );
        setMenuItemsList(normalized);
      } else {
        setMenuItemsList([]);
      }
    } else {
      setMenuItemsList([]);
      setReferenceWarning(
        'Menu catalog items could not be loaded. Creating or editing bundles may be unavailable.'
      );
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Overview KPI Stats (derived strictly from live DB records)
  const kpis = useMemo(() => {
    const total = combos.length;
    const active = combos.filter((c) => c.effectiveAvailable).length;
    const issues = combos.filter(
      (c) => c.unavailableComponents.length > 0 || !c.isWithinSchedule
    ).length;
    const discounted = combos.filter((c) => c.savingsPercent > 0);
    const avgSavingsPct =
      discounted.length > 0
        ? (
            discounted.reduce((acc, c) => acc + c.savingsPercent, 0) / discounted.length
          ).toFixed(1)
        : null;
    return { total, active, issues, avgSavingsPct };
  }, [combos]);

  const selectableMenuItems = useMemo(() => {
    const byId = new Map<number, MenuItemOption>(menuItemsList.map((m) => [m.id, m]));
    if (editingCombo) {
      for (const line of editingCombo.items) {
        if (!byId.has(line.menuItemId)) {
          byId.set(line.menuItemId, {
            id: line.menuItemId,
            name: line.itemName || `Item #${line.menuItemId}`,
            price: parseFloat(line.itemPrice || '0') || 0,
            isAvailable: line.itemIsAvailable !== false,
          });
        }
      }
    }
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [menuItemsList, editingCombo]);

  const filteredCombos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = combos.filter((combo) => {
      const matchesSearch =
        !q ||
        combo.name.toLowerCase().includes(q) ||
        (combo.sku && combo.sku.toLowerCase().includes(q)) ||
        (combo.description && combo.description.toLowerCase().includes(q)) ||
        combo.items.some((i) => i.itemName?.toLowerCase().includes(q));

      const hasIssue =
        combo.unavailableComponents.length > 0 || !combo.isWithinSchedule;

      const matchesAvail =
        availabilityFilter === 'ALL' ||
        (availabilityFilter === 'ACTIVE' && combo.effectiveAvailable) ||
        (availabilityFilter === 'HIDDEN' && !combo.isAvailable) ||
        (availabilityFilter === 'ISSUES' && hasIssue);

      return matchesSearch && matchesAvail;
    });

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'NAME':
          return a.name.localeCompare(b.name);
        case 'PRICE_ASC':
          return parseFloat(a.basePrice) - parseFloat(b.basePrice);
        case 'PRICE_DESC':
          return parseFloat(b.basePrice) - parseFloat(a.basePrice);
        case 'SAVINGS_DESC':
          return b.savingsAmount - a.savingsAmount;
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
  }, [combos, searchQuery, availabilityFilter, sortBy]);

  const modalStandaloneTotal = useMemo(() => {
    return items.reduce((sum, row) => {
      const itemId = parseInt(row.menuItemId, 10);
      if (Number.isNaN(itemId)) return sum;
      const match = selectableMenuItems.find((m) => m.id === itemId);
      if (!match) return sum;
      const qty = Math.max(0, parseInt(row.quantity, 10) || 0);
      const addPrice = Math.max(0, parseFloat(row.additionalPrice) || 0);
      return sum + (match.price + addPrice) * qty;
    }, 0);
  }, [items, selectableMenuItems]);

  const hasDuplicateComponentsInForm = useMemo(() => {
    const ids = items.map((i) => i.menuItemId).filter(Boolean);
    return new Set(ids).size !== ids.length;
  }, [items]);

  const openModal = (combo?: ComboBundle) => {
    setModalError(null);
    setUnsavedUploadedPublicIds([]);

    if (combo) {
      setEditingCombo(combo);
      setName(combo.name);
      setDescription(combo.description || '');
      setSku(combo.sku || '');
      setBasePrice((parseFloat(combo.basePrice) || 0).toFixed(2));
      setIsAvailable(combo.isAvailable);
      setValidFrom(toDateInputValue(combo.validFrom));
      setValidUntil(toDateInputValue(combo.validUntil));
      setImageUrl(combo.imageUrl ?? null);
      setImagePublicId(combo.imagePublicId ?? null);
      setImageOriginalFilename(combo.imageOriginalFilename ?? null);
      setImageMimeType(combo.imageMimeType ?? null);
      setImageFileSize(combo.imageFileSize ?? null);
      setItems(
        combo.items.length > 0
          ? combo.items.map((line) => ({
              menuItemId: String(line.menuItemId),
              quantity: String(line.quantity),
              additionalPrice: String(parseFloat(line.additionalPrice || '0')),
            }))
          : [{ menuItemId: '', quantity: '1', additionalPrice: '0' }]
      );
    } else {
      setEditingCombo(null);
      setName('');
      setDescription('');
      setSku('');
      setBasePrice('');
      setIsAvailable(true);
      setValidFrom('');
      setValidUntil('');
      setImageUrl(null);
      setImagePublicId(null);
      setImageOriginalFilename(null);
      setImageMimeType(null);
      setImageFileSize(null);
      setItems([{ menuItemId: '', quantity: '1', additionalPrice: '0' }]);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    unsavedUploadedPublicIds.forEach((pid) => void cleanupOrphanedUpload(pid));
    setUnsavedUploadedPublicIds([]);
    setIsModalOpen(false);
    setEditingCombo(null);
    setModalError(null);
  };

  const handleAddItemRow = () => {
    setItems((prev) => [...prev, { menuItemId: '', quantity: '1', additionalPrice: '0' }]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, patch: Partial<ComboFormLine>) => {
    setItems((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setModalError(null);

    if (name.trim().length < 2) {
      setModalError('Combo bundle name must be at least 2 characters.');
      return;
    }

    const parsedBasePrice = parseFloat(basePrice);
    if (Number.isNaN(parsedBasePrice) || parsedBasePrice < 0) {
      setModalError('Bundle price must be zero or greater.');
      return;
    }

    const validItems = items
      .map((row) => ({
        menuItemId: parseInt(row.menuItemId, 10),
        quantity: parseInt(row.quantity, 10),
        additionalPrice: parseFloat(row.additionalPrice || '0') || 0,
      }))
      .filter(
        (row) =>
          !Number.isNaN(row.menuItemId) &&
          row.menuItemId > 0 &&
          !Number.isNaN(row.quantity) &&
          row.quantity >= 1
      );

    if (validItems.length === 0) {
      setModalError('Please select at least one valid menu item for the bundle.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        sku: sku.trim() || null,
        basePrice: parsedBasePrice,
        isAvailable,
        validFrom: validFrom ? `${validFrom}T00:00:00.000Z` : null,
        validUntil: validUntil ? `${validUntil}T23:59:59.999Z` : null,
        imageUrl,
        imagePublicId,
        imageOriginalFilename,
        imageMimeType,
        imageFileSize,
        items: validItems,
      };

      if (editingCombo) {
        await fetchApi(`/api/v1/menu/combos/${editingCombo.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setStatusBanner(`Updated combo bundle "${name.trim()}".`);
      } else {
        await fetchApi('/api/v1/menu/combos', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setStatusBanner(`Created combo bundle "${name.trim()}".`);
      }

      unsavedUploadedPublicIds
        .filter((pid) => pid !== imagePublicId)
        .forEach((pid) => void cleanupOrphanedUpload(pid));
      setUnsavedUploadedPublicIds([]);

      setIsModalOpen(false);
      setEditingCombo(null);
      await loadData();
    } catch (err: unknown) {
      setModalError(getErrorMessage(err, 'Failed to save combo bundle.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAvailability = async (combo: ComboBundle) => {
    setActionError(null);
    try {
      await fetchApi(`/api/v1/menu/combos/${combo.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isAvailable: !combo.isAvailable }),
      });
      setStatusBanner(
        `"${combo.name}" is now ${!combo.isAvailable ? 'Active on POS' : 'Hidden from POS'}.`
      );
      await loadData();
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, 'Failed to update bundle availability.'));
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteCombo || isDeleting) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await fetchApi(`/api/v1/menu/combos/${pendingDeleteCombo.id}`, {
        method: 'DELETE',
      });
      const deletedName = pendingDeleteCombo.name;
      setPendingDeleteCombo(null);
      setStatusBanner(`Deleted combo bundle "${deletedName}".`);
      await loadData();
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, 'Failed to delete combo bundle.'));
      setPendingDeleteCombo(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const parsedModalPrice = parseFloat(basePrice) || 0;
  const modalSavings =
    modalStandaloneTotal > 0 && basePrice !== ''
      ? modalStandaloneTotal - parsedModalPrice
      : 0;
  const modalSavingsPct =
    modalStandaloneTotal > 0 ? (modalSavings / modalStandaloneTotal) * 100 : 0;

  return (
    <div className="space-y-6 pb-10">
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

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/menu"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core inline-flex items-center gap-1 transition-colors"
            >
              Menu Catalog <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Combos &amp; Meal Bundles</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Combos &amp; Meal Bundles</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-1">
            Package existing menu items into unified POS bundles with cover photography, KDS component routing, and automatic BOM deduction.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="px-3 py-2 text-xs font-semibold text-servora-deepTeal bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200 inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => openModal()}
            disabled={menuItemsList.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-servora-core text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Plus size={16} />
            Create Combo Bundle
          </button>
        </div>
      </div>

      {/* Overview KPI Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Total Bundles
            </span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">{kpis.total}</p>
          </div>
          <div className="p-2.5 bg-servora-pale text-servora-core rounded-xl">
            <ShoppingBasket size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Sellable on POS
            </span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">{kpis.active}</p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Avg Bundle Savings
            </span>
            <p className="text-xl font-bold font-mono text-servora-core mt-0.5">
              {kpis.avgSavingsPct ? `${kpis.avgSavingsPct}%` : '—'}
            </p>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <TrendingDown size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Component Alerts
            </span>
            <p className="text-xl font-bold font-mono text-amber-700 mt-0.5">{kpis.issues}</p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle size={18} />
          </div>
        </div>
      </div>

      {/* Search, Filter & Sort Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            aria-label="Search combo bundles by name, SKU, or included item"
            placeholder="Search bundles by name, SKU, or included item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-gray-50 border border-gray-100 rounded-xl">
            {(['ALL', 'ACTIVE', 'HIDDEN', 'ISSUES'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setAvailabilityFilter(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  availabilityFilter === tab
                    ? 'bg-white shadow-xs text-servora-navy font-bold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab === 'ALL'
                  ? `All (${combos.length})`
                  : tab === 'ACTIVE'
                    ? 'Active'
                    : tab === 'HIDDEN'
                      ? 'Hidden'
                      : `Alerts (${kpis.issues})`}
              </button>
            ))}
          </div>

          <select
            aria-label="Sort bundles"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="UPDATED">Sort: Recently Updated</option>
            <option value="NAME">Sort: Name (A–Z)</option>
            <option value="PRICE_ASC">Sort: Price (Low–High)</option>
            <option value="PRICE_DESC">Sort: Price (High–Low)</option>
            <option value="SAVINGS_DESC">Sort: Highest Savings</option>
          </select>
        </div>
      </div>

      {/* Grid of Combos */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-gray-100">
          <p className="text-xs font-medium text-servora-deepTeal animate-pulse">
            Loading combo bundles...
          </p>
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
            onClick={loadData}
            className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700"
          >
            Retry Request
          </button>
        </div>
      ) : combos.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-100 text-center">
          <div className="w-12 h-12 rounded-2xl bg-servora-pale text-servora-core flex items-center justify-center mb-3">
            <ShoppingBasket size={24} />
          </div>
          <h3 className="text-sm font-bold text-servora-navy">No combo bundles created</h3>
          <p className="text-xs text-servora-deepTeal mt-1 max-w-sm">
            Group existing menu dishes, drinks, and sides into single SKU meals with combined pricing.
          </p>
          {menuItemsList.length > 0 ? (
            <button
              type="button"
              onClick={() => openModal()}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700 cursor-pointer"
            >
              <Plus size={14} /> Create First Combo Bundle
            </button>
          ) : (
            <Link
              href="/menu"
              className="mt-4 text-xs font-bold text-servora-core hover:underline"
            >
              Add menu items first &rarr;
            </Link>
          )}
        </div>
      ) : filteredCombos.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-gray-100 text-center text-xs text-servora-deepTeal">
          No combo bundles matched your search or status filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredCombos.map((combo) => {
            const bundlePrice = parseFloat(combo.basePrice) || 0;
            const cardImg = getOptimizedMenuImageUrl(combo.imageCardUrl || combo.imageUrl, 'card');

            return (
              <div
                key={combo.id}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs flex flex-col justify-between"
              >
                <div>
                  {/* Cover Image Header */}
                  <div className="relative h-36 w-full bg-servora-pale overflow-hidden border-b border-gray-100">
                    {cardImg ? (
                      <img
                        src={cardImg}
                        alt={combo.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-servora-deepTeal/25">
                        <ShoppingBasket size={32} />
                      </div>
                    )}

                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="text-[10px] font-bold tracking-wider uppercase text-servora-navy bg-white/95 px-2 py-0.5 rounded-md font-mono shadow-xs">
                        {combo.sku || 'COMBO'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleAvailability(combo)}
                      title="Toggle POS availability"
                      className={`absolute top-2.5 right-2.5 inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-xs cursor-pointer ${
                        combo.effectiveAvailable
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : combo.isAvailable
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-white/95 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {combo.effectiveAvailable ? (
                        <>
                          <CheckCircle2 size={10} /> Active
                        </>
                      ) : combo.isAvailable ? (
                        <>
                          <AlertTriangle size={10} /> Blocked
                        </>
                      ) : (
                        <>
                          <XCircle size={10} /> Hidden
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="text-sm font-bold text-servora-navy truncate">{combo.name}</h3>
                      {combo.description && (
                        <p className="text-xs text-servora-deepTeal mt-0.5 line-clamp-2">
                          {combo.description}
                        </p>
                      )}
                    </div>

                    {/* Component / Schedule Availability Warnings */}
                    {combo.unavailableComponents.length > 0 && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-medium flex items-start gap-1.5">
                        <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          Hidden component(s):{' '}
                          <strong>{combo.unavailableComponents.join(', ')}</strong>. Bundle is
                          paused on POS until restored.
                        </span>
                      </div>
                    )}

                    {!combo.isWithinSchedule && (
                      <div className="p-2 bg-gray-100 border border-gray-200 rounded-xl text-[11px] text-gray-700 font-medium flex items-center gap-1.5">
                        <Calendar size={12} className="shrink-0" />
                        <span>Outside configured promotional window.</span>
                      </div>
                    )}

                    {/* Pricing & Savings Breakdown */}
                    <div className="py-2.5 px-3 bg-servora-pale rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-servora-deepTeal">
                          Bundle Price:
                        </span>
                        <span className="text-sm font-mono font-bold text-servora-core">
                          KES {bundlePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      {combo.standaloneTotal > 0 && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-500">
                            Standalone: KES{' '}
                            {combo.standaloneTotal.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                          {combo.pricingMode === 'DISCOUNTED' ? (
                            <span className="font-bold text-emerald-700">
                              Save KES {combo.savingsAmount.toLocaleString()} (
                              {combo.savingsPercent}%)
                            </span>
                          ) : combo.pricingMode === 'PREMIUM' ? (
                            <span className="font-bold text-purple-700">
                              Premium (+KES {Math.abs(combo.savingsAmount).toLocaleString()})
                            </span>
                          ) : (
                            <span className="font-semibold text-gray-500">Standard Value</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Included Items */}
                    <div className="space-y-1.5 border-t border-gray-100 pt-3">
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                        Includes Items ({combo.items.length}):
                      </p>
                      {combo.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs py-0.5"
                        >
                          <span className="text-servora-navy font-medium flex items-center gap-1.5 min-w-0">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                item.itemIsAvailable === false ? 'bg-rose-500' : 'bg-servora-core'
                              }`}
                            />
                            <span className="truncate">
                              {item.quantity}x {item.itemName || `Item #${item.menuItemId}`}
                            </span>
                          </span>
                          {parseFloat(item.additionalPrice) > 0 && (
                            <span className="text-[11px] font-mono font-semibold text-gray-500 shrink-0 ml-2">
                              +KES {parseFloat(item.additionalPrice).toFixed(2)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-t border-gray-100 bg-slate-50/40">
                  <button
                    type="button"
                    onClick={() => openModal(combo)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-servora-core bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl transition-colors cursor-pointer"
                  >
                    <Edit3 size={13} /> Edit Bundle
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteCombo(combo)}
                    aria-label={`Delete ${combo.name}`}
                    title="Delete Bundle"
                    className="p-2 text-gray-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors cursor-pointer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT COMBO MODAL */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="combo-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 id="combo-modal-title" className="text-sm font-bold text-servora-navy">
                  {editingCombo
                    ? `Edit Combo Bundle: ${editingCombo.name}`
                    : 'Create Combo Bundle'}
                </h2>
                <p className="text-[11px] text-servora-deepTeal">
                  Configure cover photo, bundle pricing, promotional window, and included menu items
                </p>
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

            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
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
                <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="cb-name">
                  Bundle Name *
                </label>
                <input
                  id="cb-name"
                  type="text"
                  required
                  placeholder="e.g. Nyama Choma Family Platter, Burger & Drink Deal"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none font-semibold"
                />
              </div>

              {/* Bundle Cover Image (Reuses Menu Catalog Cloudinary Signed Upload) */}
              <MenuItemImageUploader
                imageUrl={imageUrl}
                imagePublicId={imagePublicId}
                imageOriginalFilename={imageOriginalFilename}
                disabled={isSubmitting}
                onUploaded={(meta) => {
                  setImageUrl(meta.imageUrl);
                  setImagePublicId(meta.imagePublicId);
                  setImageOriginalFilename(meta.imageOriginalFilename);
                  setImageMimeType(meta.imageMimeType);
                  setImageFileSize(meta.imageFileSize);
                  setUnsavedUploadedPublicIds((prev) => [...prev, meta.imagePublicId]);
                }}
                onRemoved={() => {
                  setImageUrl(null);
                  setImagePublicId(null);
                  setImageOriginalFilename(null);
                  setImageMimeType(null);
                  setImageFileSize(null);
                }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="cb-price">
                    Bundle Selling Price (KES) *
                  </label>
                  <input
                    id="cb-price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="1500.00"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="cb-sku">
                    SKU / Bundle Code (Optional)
                  </label>
                  <input
                    id="cb-sku"
                    type="text"
                    placeholder="BNDL-001"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="cb-from">
                    Promo Start Date (Optional)
                  </label>
                  <input
                    id="cb-from"
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="cb-until">
                    Promo End Date (Optional)
                  </label>
                  <input
                    id="cb-until"
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="cb-desc">
                  Description (Optional)
                </label>
                <input
                  id="cb-desc"
                  type="text"
                  placeholder="Details of what's included for kitchen and cashier"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                />
              </div>

              {/* Included Menu Items */}
              <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-servora-navy">
                    Included Menu Items *
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs font-bold text-servora-core hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} /> Add Dish / Drink
                  </button>
                </div>

                {hasDuplicateComponentsInForm && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg font-medium">
                    Duplicate menu items selected will be automatically consolidated into combined quantities on save.
                  </p>
                )}

                <div className="grid grid-cols-12 gap-2 px-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <span className="col-span-6">Menu Item</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-3">Upcharge (+KES)</span>
                  <span className="col-span-1" />
                </div>

                <div className="space-y-2">
                  {items.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <select
                          aria-label="Menu item"
                          value={row.menuItemId}
                          onChange={(e) =>
                            handleItemChange(idx, { menuItemId: e.target.value })
                          }
                          className="w-full px-2.5 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none bg-white"
                        >
                          <option value="">Select a menu item...</option>
                          {selectableMenuItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} (KES {item.price.toLocaleString()})
                              {!item.isAvailable ? ' [Hidden]' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          aria-label="Quantity"
                          value={row.quantity}
                          onChange={(e) => handleItemChange(idx, { quantity: e.target.value })}
                          className="w-full px-2 py-2 text-xs font-mono border border-gray-200 rounded-xl bg-white focus:border-servora-core focus:outline-none text-center"
                        />
                      </div>

                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          aria-label="Additional upcharge (KES)"
                          value={row.additionalPrice}
                          onChange={(e) =>
                            handleItemChange(idx, { additionalPrice: e.target.value })
                          }
                          className="w-full px-2 py-2 text-xs font-mono border border-gray-200 rounded-xl bg-white focus:border-servora-core focus:outline-none"
                        />
                      </div>

                      <div className="col-span-1 text-right">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            aria-label="Remove item row"
                            className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {modalStandaloneTotal > 0 && (
                  <div className="pt-2 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="text-gray-600 font-medium">
                      Standalone Value:{' '}
                      <strong className="font-mono text-servora-navy">
                        KES{' '}
                        {modalStandaloneTotal.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </strong>
                    </span>
                    {modalSavings > 0.005 ? (
                      <span className="font-bold text-emerald-700 inline-flex items-center gap-1">
                        <Tag size={11} /> Save KES {modalSavings.toFixed(2)} (
                        {modalSavingsPct.toFixed(1)}%)
                      </span>
                    ) : modalSavings < -0.005 ? (
                      <span className="font-bold text-purple-700">
                        Premium Bundle (+KES {Math.abs(modalSavings).toFixed(2)})
                      </span>
                    ) : (
                      <span className="font-semibold text-gray-500">Exact Standalone Value</span>
                    )}
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-servora-navy">
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                  className="rounded border-gray-300 text-servora-core w-4 h-4"
                />
                <span>Available on Active POS Terminal</span>
              </label>

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
                  className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSubmitting
                    ? 'Saving...'
                    : editingCombo
                      ? 'Save Changes'
                      : 'Create Combo Bundle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {pendingDeleteCombo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-combo-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 id="delete-combo-title" className="text-sm font-bold text-servora-navy">
                  Delete Combo Bundle?
                </h3>
                <p className="text-xs text-servora-deepTeal mt-1 leading-relaxed">
                  Are you sure you want to delete{' '}
                  <strong className="text-servora-navy">{pendingDeleteCombo.name}</strong>? This
                  removes the bundle configuration without deleting the underlying menu items or
                  historical POS orders.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setPendingDeleteCombo(null)}
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
                {isDeleting ? 'Deleting...' : 'Delete Bundle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}