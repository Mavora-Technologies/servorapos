// apps/web/app/(dashboard)/settings/branches/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { fetchApi, ApiError } from '@/lib/api';

interface Branch {
  id: number;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  kraPin?: string | null;
  etimsBranchId?: string | null;
  etimsDeviceSerial?: string | null;
  receiptFooter?: string | null;
  isMainBranch: boolean;
  isActive: boolean;
  createdAt: string;
}

export default function BranchesSettingsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageError, setPageError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // RBAC state
  const [userPermissions, setUserPermissions] = useState<string[] | undefined>(undefined);
  const [userRole, setUserRole] = useState<string | undefined>(undefined);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [kraPin, setKraPin] = useState('');
  const [etimsBranchId, setEtimsBranchId] = useState('00');
  const [etimsDeviceSerial, setEtimsDeviceSerial] = useState('');
  const [isMainBranch, setIsMainBranch] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const cached = localStorage.getItem('servora_cached_workspace');
      if (cached) {
        const parsed = JSON.parse(cached);
        setUserPermissions(parsed?.user?.permissions);
        setUserRole(parsed?.user?.role);
      }
    } catch {
      // Ignore malformed cache
    }
  }, []);

  const canManageBranches = useMemo(() => {
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') return true;
    return Boolean(
      userPermissions?.includes('*') || userPermissions?.includes('settings.manage')
    );
  }, [userPermissions, userRole]);

  const loadBranches = useCallback(async () => {
    setIsLoading(true);
    setPageError(null);
    try {
      const res = await fetchApi('/api/v1/branches');
      if (Array.isArray(res?.data)) {
        setBranches(res.data);
        localStorage.setItem(
          'servora_cached_branches',
          JSON.stringify(res.data.filter((b: Branch) => b.isActive))
        );
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && (err.isNetworkError || err.status === 0)) {
        setPageError('Offline mode: branch changes require an active connection.');
        return;
      }
      setPageError(err instanceof Error ? err.message : 'Failed to load authorized branches.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const openModal = (b?: Branch) => {
    if (b) {
      setEditingBranch(b);
      setName(b.name);
      setCode(b.code);
      setAddress(b.address || '');
      setPhone(b.phone || '');
      setEmail(b.email || '');
      setKraPin(b.kraPin || '');
      setEtimsBranchId(b.etimsBranchId || '00');
      setEtimsDeviceSerial(b.etimsDeviceSerial || '');
      setIsMainBranch(b.isMainBranch);
      setIsActive(b.isActive);
    } else {
      setEditingBranch(null);
      setName('');
      setCode('');
      setAddress('');
      setPhone('');
      setEmail('');
      setKraPin('');
      setEtimsBranchId('00');
      setEtimsDeviceSerial('');
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
      name: name.trim(),
      code: code.trim().toUpperCase(),
      address: address.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      kraPin: kraPin.trim().toUpperCase() || null,
      etimsBranchId: etimsBranchId.trim() || '00',
      etimsDeviceSerial: etimsDeviceSerial.trim() || null,
      isMainBranch,
      isActive,
    };

    try {
      if (editingBranch) {
        await fetchApi(`/api/v1/branches/${editingBranch.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setStatusBanner(`Updated branch "${payload.name}" (${payload.code}).`);
      } else {
        await fetchApi('/api/v1/branches', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setStatusBanner(`Created branch "${payload.name}" (${payload.code}).`);
      }

      setIsModalOpen(false);
      await loadBranches();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'Failed to save branch profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (branch: Branch) => {
    setPageError(null);
    try {
      await fetchApi(`/api/v1/branches/${branch.id}/toggle-status`, { method: 'PATCH' });
      setStatusBanner(
        `Branch "${branch.name}" ${branch.isActive ? 'deactivated' : 'activated'}.`
      );
      await loadBranches();
    } catch (err: unknown) {
      setPageError(err instanceof Error ? err.message : 'Failed to toggle branch status.');
    }
  };

  const filtered = branches.filter(
    (b) =>
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.address && b.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-servora-navy">Branch &amp; Commissary Outlets</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Configure multi-outlet restaurant locations, KRA eTIMS branch identifiers, and central commissaries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManageBranches && (
            <button
              type="button"
              onClick={() => openModal()}
              className="bg-servora-core text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Plus size={15} /> Add Branch Location
            </button>
          )}
          <button
            type="button"
            onClick={loadBranches}
            disabled={isLoading}
            title="Refresh Outlets"
            className="p-2.5 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {/* Inline Feedback Banners */}
      {statusBanner && (
        <div
          role="status"
          className="flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2.5 rounded-xl text-xs font-semibold"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
            <span>{statusBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {pageError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 bg-rose-50 border border-rose-200 text-rose-900 px-4 py-2.5 rounded-xl text-xs font-semibold"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-rose-600 shrink-0" />
            <span>{pageError}</span>
          </div>
          <button
            type="button"
            onClick={() => setPageError(null)}
            className="text-rose-700 hover:text-rose-950 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between gap-3">
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
        <span className="text-xs text-servora-deepTeal font-medium shrink-0">
          {branches.length} Authorized {branches.length === 1 ? 'Outlet' : 'Outlets'}
        </span>
      </div>

      {/* Outlets Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse bg-white rounded-2xl border border-gray-100">
          Loading authorized branch profiles...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-xs text-servora-deepTeal bg-white rounded-2xl border border-gray-100">
          No branches matched your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((b) => (
            <div
              key={b.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                !b.isActive
                  ? 'opacity-60 bg-gray-50/70 border-gray-200'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
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
                  {(b.kraPin || b.etimsBranchId) && (
                    <div className="flex items-center gap-2 font-mono text-[11px] text-gray-500 pt-1">
                      <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
                      <span>
                        {b.kraPin ? `PIN: ${b.kraPin} • ` : ''}
                        eTIMS BHF: {b.etimsBranchId || '00'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {canManageBranches && (
                <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(b)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                      b.isActive
                        ? 'text-rose-600 hover:bg-rose-50'
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    <Power size={12} />
                    {b.isActive ? 'Deactivate' : 'Activate'}
                  </button>

                  <button
                    type="button"
                    onClick={() => openModal(b)}
                    className="p-1.5 text-servora-core hover:bg-servora-pale rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold cursor-pointer"
                  >
                    <Edit3 size={13} /> Edit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT BRANCH MODAL */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-servora-pale text-servora-core flex items-center justify-center">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-servora-navy">
                    {editingBranch ? `Edit Branch: ${editingBranch.name}` : 'New Branch / Commissary'}
                  </h3>
                  <p className="text-[11px] text-servora-deepTeal">
                    Outlet specifications and fiscal eTIMS identity
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-servora-navy cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              {modalError && (
                <div
                  role="alert"
                  className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2 font-semibold"
                >
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">
                  Branch Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Westlands Branch & Kitchen"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">
                    Branch Code *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    placeholder="WST-01"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:border-servora-core focus:outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">
                    KRA eTIMS Branch ID
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="00"
                    value={etimsBranchId}
                    onChange={(e) => setEtimsBranchId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:border-servora-core focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">
                  Physical Street Address
                </label>
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
                  <label className="block text-xs font-bold text-servora-navy mb-1">
                    Phone Contact
                  </label>
                  <input
                    type="tel"
                    placeholder="+254 700 000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">
                    Branch Email
                  </label>
                  <input
                    type="email"
                    placeholder="westlands@servora.app"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">
                    Outlet KRA PIN
                  </label>
                  <input
                    type="text"
                    placeholder="P051..."
                    value={kraPin}
                    onChange={(e) => setKraPin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono uppercase focus:border-servora-core focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">
                    eTIMS Device Serial
                  </label>
                  <input
                    type="text"
                    placeholder="OSCU-SDC-..."
                    value={etimsDeviceSerial}
                    onChange={(e) => setEtimsDeviceSerial(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:border-servora-core focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs font-bold text-servora-navy cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isMainBranch}
                    onChange={(e) => setIsMainBranch(e.target.checked)}
                    className="rounded text-servora-core focus:ring-0 w-4 h-4 border-gray-300"
                  />
                  <span>Central Headquarters</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-servora-core focus:ring-0 w-4 h-4 border-gray-300"
                  />
                  <span>Active Outlet</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700 shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
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