'use client';

import { useEffect, useState } from 'react';
import { Plus, SlidersHorizontal, Trash2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface ModifierOption {
  id?: number;
  name: string;
  priceAdjustment: number;
  isDefault?: boolean;
}

interface ModifierGroup {
  id: number;
  name: string;
  description?: string;
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  options: ModifierOption[];
}

export default function ModifiersPage() {
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [minSelections, setMinSelections] = useState(0);
  const [maxSelections, setMaxSelections] = useState(1);
  const [isRequired, setIsRequired] = useState(false);
  const [options, setOptions] = useState<ModifierOption[]>([
    { name: '', priceAdjustment: 0 },
  ]);

  const loadModifiers = async () => {
    setIsLoading(true);
    try {
      const res = await fetchApi('/api/v1/menu/modifiers');
      if (res?.data) setGroups(res.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadModifiers();
  }, []);

  const handleAddOptionField = () => {
    setOptions([...options, { name: '', priceAdjustment: 0 }]);
  };

  const handleRemoveOptionField = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, field: keyof ModifierOption, val: any) => {
    const updated = [...options];
    updated[index] = { ...updated[index], [field]: val };
    setOptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const validOptions = options.filter((opt) => opt.name.trim().length > 0);
    if (validOptions.length === 0) {
      setError('Please provide at least one modifier option.');
      setIsSubmitting(false);
      return;
    }

    try {
      await fetchApi('/api/v1/menu/modifiers', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description,
          minSelections: Number(minSelections),
          maxSelections: Number(maxSelections),
          isRequired,
          options: validOptions,
        }),
      });

      setIsModalOpen(false);
      setName('');
      setDescription('');
      setOptions([{ name: '', priceAdjustment: 0 }]);
      loadModifiers();
    } catch (err: any) {
      setError(err.message || 'Failed to save modifier group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this modifier group?')) return;
    try {
      await fetchApi(`/api/v1/menu/modifiers/${id}`, { method: 'DELETE' });
      setGroups((prev) => prev.filter((g) => g.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-servora-navy">Modifiers & Add-ons</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-1">
            Create customisable modifier groups like sizes, meat temperature, sides, and extra toppings.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-servora-core text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={16} />
          Create Modifier Group
        </button>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-gray-100">
          <p className="text-xs font-medium text-servora-deepTeal animate-pulse">Loading modifiers...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-100 text-center">
          <div className="w-12 h-12 rounded-2xl bg-servora-pale text-servora-core flex items-center justify-center mb-3">
            <SlidersHorizontal size={24} />
          </div>
          <h3 className="text-sm font-bold text-servora-navy">No modifier groups yet</h3>
          <p className="text-xs text-servora-deepTeal mt-1 max-w-sm">
            Modifiers allow customers to customise their orders by picking toppings, cooking options, or sides.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-servora-navy">{group.name}</h3>
                    {group.description && (
                      <p className="text-xs text-servora-deepTeal mt-0.5">{group.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(group.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
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
                  <span className="text-[10px] text-gray-500">
                    Select {group.minSelections} to {group.maxSelections}
                  </span>
                </div>

                {/* Option list */}
                <div className="divide-y divide-gray-50 border-t border-gray-100 pt-2 space-y-1.5">
                  {group.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-servora-navy font-medium">{opt.name}</span>
                      <span className="text-servora-core font-semibold">
                        {Number(opt.priceAdjustment) > 0 ? `+KES ${Number(opt.priceAdjustment).toFixed(2)}` : 'Free'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-sm font-bold text-servora-navy">New Modifier Group</h2>
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
                <label className="block text-xs font-bold text-servora-navy mb-1">Group Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Choose Crust, Meat Temperature, Extra Toppings"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Short note explaining this choice to staff or customers"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Min Choices</label>
                  <input
                    type="number"
                    min="0"
                    value={minSelections}
                    onChange={(e) => setMinSelections(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Max Choices</label>
                  <input
                    type="number"
                    min="1"
                    value={maxSelections}
                    onChange={(e) => setMaxSelections(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isRequired"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="rounded text-servora-core focus:ring-servora-core"
                />
                <label htmlFor="isRequired" className="text-xs font-medium text-servora-navy cursor-pointer">
                  Customer must make a selection (Required)
                </label>
              </div>

              {/* Dynamic Options List */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-servora-navy">Options</span>
                  <button
                    type="button"
                    onClick={handleAddOptionField}
                    className="text-xs font-semibold text-servora-core hover:underline flex items-center gap-1"
                  >
                    <Plus size={13} /> Add Option
                  </button>
                </div>

                <div className="space-y-2">
                  {options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Extra Cheese"
                        value={opt.name}
                        onChange={(e) => handleOptionChange(i, 'name', e.target.value)}
                        className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Price (+KES)"
                        value={opt.priceAdjustment}
                        onChange={(e) => handleOptionChange(i, 'priceAdjustment', Number(e.target.value))}
                        className="w-24 px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
                      />
                      {options.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOptionField(i)}
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
                  {isSubmitting ? 'Saving...' : 'Save Modifier Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}