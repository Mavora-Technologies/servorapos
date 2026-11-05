'use client';

import { useEffect, useState } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit3, 
  MapPin, 
  Phone, 
  Mail, 
  Star,
  Power,
  X,
  AlertCircle
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface Branch {
  id: number;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  isMainBranch: boolean;
  isActive: boolean;
  createdAt: string;
}

export default function BranchesSettingsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isMainBranch, setIsMainBranch] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadBranches = async () => {
    setIsLoading(true);
    try {
      const res = await fetchApi('/api/v1/branches');
      if (res?.data) {
        setBranches(res.data);
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const openModal = (b?: Branch) => {
    if (b) {
      setEditingBranch(b);
      setName(b.name);
      setCode(b.code);
      setAddress(b.address || '');
      setPhone(b.phone || '');
      setEmail(b.email || '');
      setIsMainBranch(b.isMainBranch);
      setIsActive(b.isActive);
    } else {
      setEditingBranch(null);
      setName('');
      setCode('');
      setAddress('');
      setPhone('');
      setEmail('');
      setIsMainBranch(false);
      setIsActive(true);
    }
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError(null);

    const payload = {
      name,
      code: code.trim().toUpperCase(),
      address: address || undefined,
      phone: phone || undefined,
      email: email || undefined,
      isMainBranch,
      isActive,
    };

    try {
      if (editingBranch) {
        await fetchApi(`/api/v1/branches/${editingBranch.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/api/v1/branches', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      loadBranches();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save branch profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await fetchApi(`/api/v1/branches/${id}/toggle-status`, { method: 'PATCH' });
      loadBranches();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const filtered = branches.filter((b) =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.address && b.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-servora-navy">Branch & Commissary Outlets</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Configure multi-outlet restaurant physical locations, central commissaries, and inventory delivery routes.
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-servora-core text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={15} /> Add Branch Location
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Search branch name, code, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
          />
        </div>
        <span className="text-xs text-servora-deepTeal font-medium">
          {branches.length} Registered Outlets
        </span>
      </div>

      {/* Outlets Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse bg-white rounded-2xl border border-gray-100">
          Loading branch profiles...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-xs text-servora-deepTeal bg-white rounded-2xl border border-gray-100">
          No branches registered yet. Click &quot;Add Branch Location&quot; above to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((b) => (
            <div
              key={b.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                !b.isActive ? 'opacity-60 bg-gray-50/70 border-gray-200' : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-servora-pale text-servora-core">
                      {b.code}
                    </span>
                    {b.isMainBranch && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        <Star size={11} className="fill-amber-500 text-amber-500" /> Headquarters
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      b.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-rose-50 text-rose-700 border border-rose-100'
                    }`}
                  >
                    {b.isActive ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-servora-navy mt-1">{b.name}</h3>

                <div className="space-y-1.5 mt-3 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-gray-400 shrink-0" />
                    <span className="truncate">{b.address || 'No physical address provided'}</span>
                  </div>
                  {b.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-gray-400 shrink-0" />
                      <span>{b.phone}</span>
                    </div>
                  )}
                  {b.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={13} className="text-gray-400 shrink-0" />
                      <span>{b.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(b.id)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                    b.isActive ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <Power size={12} />
                  {b.isActive ? 'Deactivate' : 'Activate'}
                </button>

                <button
                  type="button"
                  onClick={() => openModal(b)}
                  className="p-1.5 text-servora-core hover:bg-servora-pale rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                >
                  <Edit3 size={13} /> Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT BRANCH MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-servora-pale text-servora-core flex items-center justify-center">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-servora-navy">
                    {editingBranch ? `Edit Branch: ${editingBranch.name}` : 'New Branch / Commissary'}
                  </h3>
                  <p className="text-[11px] text-servora-deepTeal">Outlet specifications and logistics identity</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Branch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Westlands Branch & Kitchen"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Branch Code *</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder="WST-01"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:border-servora-core focus:outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Physical Street Address</label>
                <input
                  type="text"
                  placeholder="e.g. Ring Road Parklands, Block B, Nairobi"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Phone Contact</label>
                  <input
                    type="tel"
                    placeholder="+254 700 000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Branch Email</label>
                  <input
                    type="email"
                    placeholder="westlands@servora.app"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isMainBranch"
                    checked={isMainBranch}
                    onChange={(e) => setIsMainBranch(e.target.checked)}
                    className="rounded text-servora-core focus:ring-0 w-4 h-4 border-gray-300"
                  />
                  <label htmlFor="isMainBranch" className="text-xs font-bold text-servora-navy cursor-pointer">
                    Central Commissary / Headquarters
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-servora-core focus:ring-0 w-4 h-4 border-gray-300"
                  />
                  <label htmlFor="isActive" className="text-xs font-medium text-gray-700 cursor-pointer">
                    Active Outlet
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
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
                  className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700 shadow-xs disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Saving...' : editingBranch ? 'Update Branch' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}