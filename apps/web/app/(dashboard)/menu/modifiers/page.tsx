// apps/web/app/(dashboard)/menu/modifiers/page.tsx
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  SlidersHorizontal,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  Search,
  ChevronRight,
  RefreshCw,
  Package,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

type RequirementFilter = 'ALL' | 'REQUIRED' | 'OPTIONAL';

interface ModifierOptionRecord {
  id: number;
  modifierGroupId: number;
  name: string;
  priceAdjustment: string;
  linkedInventoryItemId: number | null;
  linkedQuantity: string;
  linkedUnit: string | null;
  linkedInventoryItemName: string | null;
  linkedInventoryItemSku: string | null;
  linkedInventoryUnitCost: string | null;
  isDefault: boolean;
  isAvailable: boolean;
}

interface ModifierGroupRecord {
  id: number;
  name: string;
  description: string | null;
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  options: ModifierOptionRecord[];
}

interface InventoryMaterialOption {
  id: number;
  name: string;
  sku: string | null;
  category: string;
  unit: string;
  costPrice: string;
  isActive: boolean;
}

interface ModifierOptionFormLine {
  name: string;
  priceAdjustment: string;
  linkedInventoryItemId: string;
  linkedQuantity: string;
  linkedUnit: string;
  isDefault: boolean;
  isAvailable: boolean;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

const createEmptyOptionLine = (): ModifierOptionFormLine => ({
  name: '',
  priceAdjustment: '0',
  linkedInventoryItemId: '',
  linkedQuantity: '0',
  linkedUnit: '',
  isDefault: false,
  isAvailable: true,
});

export default function ModifiersPage() {
  const [groups, setGroups] = useState<ModifierGroupRecord[]>([]);
  const [inventoryMaterials, setInventoryMaterials] = useState<InventoryMaterialOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Page Feedback States
  const [loadError, setLoadError] = useState<string | null>(null);
  const [referenceWarning, setReferenceWarning] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [requirementFilter, setRequirementFilter] = useState<RequirementFilter>('ALL');

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ModifierGroupRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [pendingDeleteGroup, setPendingDeleteGroup] = useState<ModifierGroupRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [minSelections, setMinSelections] = useState('0');
  const [maxSelections, setMaxSelections] = useState('1');
  const [isRequired, setIsRequired] = useState(false);
  const [options, setOptions] = useState<ModifierOptionFormLine[]>([createEmptyOptionLine()]);

  const loadModifiers = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setReferenceWarning(null);

    const [modResult, invResult] = await Promise.allSettled([
      fetchApi('/api/v1/menu/modifiers'),
      fetchApi('/api/v1/inventory/items'),
    ]);

    if (modResult.status === 'fulfilled') {
      if (Array.isArray(modResult.value?.data)) {
        setGroups(modResult.value.data);
      } else {
        setGroups([]);
        setLoadError('Unexpected response structure received from modifiers API.');
      }
    } else {
      setGroups([]);
      setLoadError(getErrorMessage(modResult.reason, 'Failed to load modifier groups.'));
    }

    if (invResult.status === 'fulfilled') {
      const payload = invResult.value?.data;
      const rawInv = Array.isArray(payload) ? payload : payload?.items;
      if (Array.isArray(rawInv)) {
        setInventoryMaterials(
          rawInv
            .filter((i: InventoryMaterialOption) => i.isActive !== false)
            .sort((a: InventoryMaterialOption, b: InventoryMaterialOption) =>
              a.name.localeCompare(b.name)
            )
        );
      } else {
        setInventoryMaterials([]);
      }
    } else {
      setInventoryMaterials([]);
      setReferenceWarning(
        'Raw materials catalog could not be loaded. Options can still be saved as prep instructions.'
      );
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadModifiers();
  }, [loadModifiers]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return groups.filter((group) => {
      const matchesSearch =
        !q ||
        group.name.toLowerCase().includes(q) ||
        (group.description && group.description.toLowerCase().includes(q)) ||
        group.options.some(
          (opt) =>
            opt.name.toLowerCase().includes(q) ||
            (opt.linkedInventoryItemName &&
              opt.linkedInventoryItemName.toLowerCase().includes(q))
        );

      const matchesReq =
        requirementFilter === 'ALL' ||
        (requirementFilter === 'REQUIRED' && group.isRequired) ||
        (requirementFilter === 'OPTIONAL' && !group.isRequired);

      return matchesSearch && matchesReq;
    });
  }, [groups, searchQuery, requirementFilter]);

  const openModal = (group?: ModifierGroupRecord) => {
    setModalError(null);
    if (group) {
      setEditingGroup(group);
      setName(group.name);
      setDescription(group.description || '');
      setMinSelections(String(group.minSelections));
      setMaxSelections(String(group.maxSelections));
      setIsRequired(group.isRequired);
      setOptions(
        group.options.length > 0
          ? group.options.map((opt) => ({
              name: opt.name,
              priceAdjustment: String(parseFloat(opt.priceAdjustment || '0')),
              linkedInventoryItemId: opt.linkedInventoryItemId
                ? String(opt.linkedInventoryItemId)
                : '',
              linkedQuantity: String(parseFloat(opt.linkedQuantity || '0')),
              linkedUnit: opt.linkedUnit || '',
              isDefault: opt.isDefault,
              isAvailable: opt.isAvailable,
            }))
          : [createEmptyOptionLine()]
      );
    } else {
      setEditingGroup(null);
      setName('');
      setDescription('');
      setMinSelections('0');
      setMaxSelections('1');
      setIsRequired(false);
      setOptions([createEmptyOptionLine()]);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingGroup(null);
    setModalError(null);
  };

  const handleAddOptionField = () => {
    setOptions((prev) => [...prev, createEmptyOptionLine()]);
  };

  const handleRemoveOptionField = (index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, patch: Partial<ModifierOptionFormLine>) => {
    setOptions((prev) => prev.map((opt, i) => (i === index ? { ...opt, ...patch } : opt)));
  };

  const handleMaterialLinkChange = (index: number, invIdStr: string) => {
    setOptions((prev) =>
      prev.map((opt, i) => {
        if (i !== index) return opt;
        if (!invIdStr) {
          return {
            ...opt,
            linkedInventoryItemId: '',
            linkedQuantity: '0',
            linkedUnit: '',
          };
        }
        const material = inventoryMaterials.find((m) => String(m.id) === invIdStr);
        if (!material) return { ...opt, linkedInventoryItemId: invIdStr };

        const currentQty = parseFloat(opt.linkedQuantity) || 0;
        return {
          ...opt,
          linkedInventoryItemId: invIdStr,
          // Auto-populate customer-facing name from raw material if blank
          name: opt.name.trim() === '' ? material.name : opt.name,
          linkedUnit: material.unit,
          linkedQuantity: currentQty > 0 ? opt.linkedQuantity : '1',
        };
      })
    );
  };

  const handleRequiredToggle = (checked: boolean) => {
    setIsRequired(checked);
    const minNum = parseInt(minSelections, 10) || 0;
    if (checked && minNum < 1) {
      setMinSelections('1');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setModalError(null);

    if (name.trim().length < 2) {
      setModalError('Modifier group name must be at least 2 characters.');
      return;
    }

    const parsedMin = parseInt(minSelections, 10);
    const parsedMax = parseInt(maxSelections, 10);

    if (Number.isNaN(parsedMin) || parsedMin < 0 || Number.isNaN(parsedMax) || parsedMax < 1) {
      setModalError('Selection limits must be valid numbers (max at least 1).');
      return;
    }
    if (parsedMin > parsedMax) {
      setModalError('Minimum choices cannot exceed maximum choices.');
      return;
    }
    if (isRequired && parsedMin < 1) {
      setModalError('Required modifier groups must have a minimum of at least 1 choice.');
      return;
    }

    const validOptions = options
      .map((opt) => {
        const linkedId = opt.linkedInventoryItemId
          ? parseInt(opt.linkedInventoryItemId, 10)
          : null;
        return {
          name: opt.name.trim(),
          priceAdjustment: parseFloat(opt.priceAdjustment || '0') || 0,
          linkedInventoryItemId: linkedId && !Number.isNaN(linkedId) ? linkedId : null,
          linkedQuantity: linkedId ? parseFloat(opt.linkedQuantity || '0') || 0 : 0,
          linkedUnit: linkedId ? opt.linkedUnit.trim() || null : null,
          isDefault: opt.isDefault,
          isAvailable: opt.isAvailable,
        };
      })
      .filter((opt) => opt.name.length > 0);

    if (validOptions.length === 0) {
      setModalError('Please provide at least one modifier option.');
      return;
    }

    const invalidLinked = validOptions.find(
      (opt) => opt.linkedInventoryItemId !== null && opt.linkedQuantity <= 0
    );
    if (invalidLinked) {
      setModalError(
        `Option "${invalidLinked.name}" is linked to a raw material and requires a deduction quantity greater than zero.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        minSelections: parsedMin,
        maxSelections: parsedMax,
        isRequired,
        options: validOptions,
      };

      if (editingGroup) {
        await fetchApi(`/api/v1/menu/modifiers/${editingGroup.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setStatusBanner(`Updated modifier group "${name.trim()}".`);
      } else {
        await fetchApi('/api/v1/menu/modifiers', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setStatusBanner(`Created modifier group "${name.trim()}".`);
      }

      setIsModalOpen(false);
      setEditingGroup(null);
      await loadModifiers();
    } catch (err: unknown) {
      setModalError(getErrorMessage(err, 'Failed to save modifier group.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteGroup || isDeleting) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await fetchApi(`/api/v1/menu/modifiers/${pendingDeleteGroup.id}`, {
        method: 'DELETE',
      });
      const deletedName = pendingDeleteGroup.name;
      setPendingDeleteGroup(null);
      setStatusBanner(`Deleted modifier group "${deletedName}".`);
      await loadModifiers();
    } catch (err: unknown) {
      setActionError(getErrorMessage(err, 'Failed to delete modifier group.'));
      setPendingDeleteGroup(null);
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
            <span className="text-xs font-bold text-servora-navy">Modifiers &amp; Add-ons</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Modifiers &amp; Add-ons</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-1">
            Link raw materials from inventory for automatic stock deduction and COGS tracking, or define non-stock prep instructions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadModifiers}
            disabled={isLoading}
            className="px-3 py-2 text-xs font-semibold text-servora-deepTeal bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200 inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => openModal()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-servora-core text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
          >
            <Plus size={16} />
            Create Modifier Group
          </button>
        </div>
      </div>

      {/* Search & Requirement Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            aria-label="Search modifier groups, options, or linked materials"
            placeholder="Search groups, options, or linked raw materials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-gray-50 border border-gray-100 rounded-xl">
          {(['ALL', 'REQUIRED', 'OPTIONAL'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setRequirementFilter(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                requirementFilter === tab
                  ? 'bg-white shadow-xs text-servora-navy font-bold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {tab === 'ALL'
                ? `All (${groups.length})`
                : tab === 'REQUIRED'
                  ? 'Required'
                  : 'Optional'}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-gray-100">
          <p className="text-xs font-medium text-servora-deepTeal animate-pulse">
            Loading modifier groups...
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
            onClick={loadModifiers}
            className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700"
          >
            Retry Request
          </button>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-100 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-servora-pale text-servora-core flex items-center justify-center">
            <SlidersHorizontal size={24} />
          </div>
          <h3 className="text-sm font-bold text-servora-navy">No modifier groups yet</h3>
          <p className="text-xs text-servora-deepTeal max-w-sm">
            Create ingredient-linked add-ons (like milk choices or extra toppings) or prep instructions (like cooking temperature).
          </p>
          <button
            type="button"
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700"
          >
            <Plus size={14} /> Create First Modifier Group
          </button>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-gray-100 text-center text-xs text-servora-deepTeal">
          No modifier groups matched your search or filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredGroups.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs flex flex-col justify-between gap-4"
            >
              <div>
                <div className="mb-2">
                  <h3 className="text-sm font-bold text-servora-navy">{group.name}</h3>
                  {group.description && (
                    <p className="text-xs text-servora-deepTeal mt-0.5">{group.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-2 mb-4">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      group.isRequired
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {group.isRequired ? 'Required' : 'Optional'}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    Select {group.minSelections} to {group.maxSelections}
                  </span>
                </div>

                {/* Option list */}
                <div className="divide-y divide-gray-50 border-t border-gray-100 pt-2 space-y-2">
                  {group.options.map((opt) => (
                    <div key={opt.id} className="pt-1.5 text-xs space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`font-medium truncate ${
                              opt.isAvailable ? 'text-servora-navy' : 'text-gray-400 line-through'
                            }`}
                          >
                            {opt.name}
                          </span>
                          {opt.isDefault && (
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-servora-core shrink-0">
                              Default
                            </span>
                          )}
                        </div>
                        <span className="text-servora-core font-mono font-semibold shrink-0">
                          {parseFloat(opt.priceAdjustment) > 0
                            ? `+KES ${parseFloat(opt.priceAdjustment).toFixed(2)}`
                            : 'Free'}
                        </span>
                      </div>

                      {opt.linkedInventoryItemId && (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                          <Package size={10} className="shrink-0" />
                          <span className="truncate">
                            {opt.linkedInventoryItemName || `Item #${opt.linkedInventoryItemId}`} (
                            {parseFloat(opt.linkedQuantity)} {opt.linkedUnit || ''})
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => openModal(group)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-servora-core bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-xl transition-colors cursor-pointer"
                >
                  <Edit3 size={13} /> Edit Group
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDeleteGroup(group)}
                  aria-label={`Delete ${group.name}`}
                  title="Delete Modifier Group"
                  className="p-2 text-gray-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors cursor-pointer"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODIFIER GROUP MODAL */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modifier-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 id="modifier-modal-title" className="text-sm font-bold text-servora-navy">
                  {editingGroup
                    ? `Edit Modifier Group: ${editingGroup.name}`
                    : 'New Modifier Group'}
                </h2>
                <p className="text-[11px] text-servora-deepTeal">
                  Pick raw materials from inventory for automatic stock deduction, or enter custom prep directives
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mg-name">
                    Group Name *
                  </label>
                  <input
                    id="mg-name"
                    type="text"
                    required
                    placeholder="e.g. Milk Preference, Extra Toppings, Meat Temp"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mg-desc">
                    Description (Optional)
                  </label>
                  <input
                    id="mg-desc"
                    type="text"
                    placeholder="Short note explaining this choice"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-center">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mg-min">
                    Min Choices
                  </label>
                  <input
                    id="mg-min"
                    type="number"
                    min="0"
                    value={minSelections}
                    onChange={(e) => setMinSelections(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1" htmlFor="mg-max">
                    Max Choices
                  </label>
                  <input
                    id="mg-max"
                    type="number"
                    min="1"
                    value={maxSelections}
                    onChange={(e) => setMaxSelections(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                  />
                </div>
                <label className="col-span-2 sm:col-span-1 flex items-center gap-2 pt-4 cursor-pointer text-xs font-semibold text-servora-navy">
                  <input
                    type="checkbox"
                    checked={isRequired}
                    onChange={(e) => handleRequiredToggle(e.target.checked)}
                    className="rounded border-gray-300 text-servora-core w-4 h-4"
                  />
                  <span>Required choice</span>
                </label>
              </div>

              {/* Hybrid Options List (Inventory-Linked OR Prep Directive) */}
              <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-servora-navy">
                    Modifier Options * ({options.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddOptionField}
                    className="text-xs font-bold text-servora-core hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} /> Add Option
                  </button>
                </div>

                <div className="space-y-2.5">
                  {options.map((opt, i) => {
                    const matchedMat = opt.linkedInventoryItemId
                      ? inventoryMaterials.find((m) => String(m.id) === opt.linkedInventoryItemId)
                      : null;
                    const estCogs =
                      matchedMat && parseFloat(opt.linkedQuantity) > 0
                        ? (parseFloat(matchedMat.costPrice) || 0) * parseFloat(opt.linkedQuantity)
                        : null;

                    return (
                      <div
                        key={i}
                        className="p-3 bg-white border border-gray-200 rounded-xl space-y-2"
                      >
                        {/* Row 1: Raw Material Source + Deduction Qty */}
                        <div className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-7">
                            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">
                              Raw Material Link (Optional)
                            </label>
                            <select
                              aria-label="Link raw material from inventory"
                              value={opt.linkedInventoryItemId}
                              onChange={(e) => handleMaterialLinkChange(i, e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-gray-200 rounded-lg focus:border-servora-core focus:outline-none"
                            >
                              <option value="">
                                Prep Instruction Only (No Inventory Deduction)
                              </option>
                              {inventoryMaterials.map((mat) => (
                                <option key={mat.id} value={mat.id}>
                                  {mat.name} ({mat.unit}) — KES{' '}
                                  {parseFloat(mat.costPrice).toFixed(2)}/{mat.unit}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="col-span-3">
                            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">
                              Deduct Qty {opt.linkedUnit ? `(${opt.linkedUnit})` : ''}
                            </label>
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              disabled={!opt.linkedInventoryItemId}
                              aria-label="Deduction quantity"
                              placeholder="0.25"
                              value={opt.linkedQuantity}
                              onChange={(e) =>
                                handleOptionChange(i, { linkedQuantity: e.target.value })
                              }
                              className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-gray-200 rounded-lg focus:border-servora-core focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                            />
                          </div>

                          <div className="col-span-2 flex justify-end pt-4">
                            {options.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOptionField(i)}
                                aria-label="Remove option"
                                className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Row 2: POS Display Label, Price Adjustment, Default & Active */}
                        <div className="grid grid-cols-12 gap-2 items-center pt-1 border-t border-gray-100">
                          <div className="col-span-6">
                            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">
                              POS Display Label *
                            </label>
                            <input
                              type="text"
                              aria-label="Option display label"
                              placeholder="e.g. Fresh Dairy Milk or Well Done"
                              value={opt.name}
                              onChange={(e) => handleOptionChange(i, { name: e.target.value })}
                              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:border-servora-core focus:outline-none font-medium"
                            />
                          </div>
                          <div className="col-span-3">
                            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-0.5">
                              Price (+KES)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              aria-label="Price adjustment (KES)"
                              placeholder="0.00"
                              value={opt.priceAdjustment}
                              onChange={(e) =>
                                handleOptionChange(i, { priceAdjustment: e.target.value })
                              }
                              className="w-full px-2.5 py-1.5 text-xs font-mono border border-gray-200 rounded-lg focus:border-servora-core focus:outline-none"
                            />
                          </div>
                          <div className="col-span-3 flex items-center justify-end gap-3 pt-4 text-[11px] font-semibold text-gray-600">
                            <label className="inline-flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={opt.isDefault}
                                onChange={(e) =>
                                  handleOptionChange(i, { isDefault: e.target.checked })
                                }
                                className="rounded border-gray-300 text-servora-core w-3.5 h-3.5"
                              />
                              Def
                            </label>
                            <label className="inline-flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={opt.isAvailable}
                                onChange={(e) =>
                                  handleOptionChange(i, { isAvailable: e.target.checked })
                                }
                                className="rounded border-gray-300 text-emerald-600 w-3.5 h-3.5"
                              />
                              On
                            </label>
                          </div>
                        </div>

                        {estCogs !== null && (
                          <div className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-2 py-1 inline-flex items-center gap-1.5">
                            <Package size={10} />
                            <span>
                              Est. Ingredient Cost: KES {estCogs.toFixed(2)} ({opt.linkedQuantity}{' '}
                              {opt.linkedUnit})
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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
                  className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSubmitting
                    ? 'Saving...'
                    : editingGroup
                      ? 'Save Changes'
                      : 'Save Modifier Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {pendingDeleteGroup && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modifier-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 id="delete-modifier-title" className="text-sm font-bold text-servora-navy">
                  Delete Modifier Group?
                </h3>
                <p className="text-xs text-servora-deepTeal mt-1 leading-relaxed">
                  Are you sure you want to delete{' '}
                  <strong className="text-servora-navy">{pendingDeleteGroup.name}</strong> and all{' '}
                  {pendingDeleteGroup.options.length} of its options?
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setPendingDeleteGroup(null)}
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
                {isDeleting ? 'Deleting...' : 'Delete Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}