'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Users,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Check,
  ChevronRight,
  AlertTriangle,
  Edit2,
  Trash2,
  X,
  SlidersHorizontal,
  KeyRound,
  CheckSquare,
  Square,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface PermissionDefinition {
  id: string;
  label: string;
  description: string;
  domain: 'POS' | 'KITCHEN' | 'INVENTORY' | 'PROCUREMENT' | 'FINANCE' | 'STAFF' | 'SYSTEM';
  isSensitive?: boolean;
}

interface RoleRecord {
  id: number;
  tenantId: number | null;
  name: string;
  slug: string;
  description: string | null;
  permissions: string[];
  isSystemRole: boolean;
  assignedHeadcount: number;
  permissionCount: number;
  createdAt: string;
}

interface RoleDataEnvelope {
  metrics: {
    totalRoles: number;
    systemRoles: number;
    customRoles: number;
    totalPermissions: number;
  };
  roles: RoleRecord[];
  availablePermissions: PermissionDefinition[];
}

const domainLabels: Record<PermissionDefinition['domain'], string> = {
  POS: 'Point of Sale & Guest Service',
  KITCHEN: 'Kitchen Operations & Culinary',
  INVENTORY: 'Inventory, Logistics & Bins',
  PROCUREMENT: 'Purchasing & Vendor Management',
  FINANCE: 'Treasury, Settlements & Ledger',
  STAFF: 'Human Capital & Workforce Access',
  SYSTEM: 'Organization & System Settings',
};

export default function RolesClearancePage() {
  const [data, setData] = useState<RoleDataEnvelope | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleRecord | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    slug: string;
    description: string;
    permissions: string[];
  }>({
    name: '',
    slug: '',
    description: '',
    permissions: [],
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await fetchApi('/api/v1/staff/roles');
      if (res?.data) {
        setData(res.data);
        if (!selectedRole && res.data.roles.length > 0) {
          setSelectedRole(res.data.roles[0]);
        } else if (selectedRole) {
          const updated = res.data.roles.find((r: RoleRecord) => r.id === selectedRole.id);
          if (updated) setSelectedRole(updated);
        }
      }
    } catch (err: any) {
      console.error('Failed to load roles matrix:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setIsEditing(false);
    setFormError(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      permissions: ['pos.access'],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (role: RoleRecord) => {
    setIsEditing(true);
    setFormError(null);
    setFormData({
      name: role.name,
      slug: role.slug,
      description: role.description || '',
      permissions: [...role.permissions],
    });
    setIsModalOpen(true);
  };

  const togglePermissionInForm = (permId: string) => {
    setFormData((prev) => {
      const exists = prev.permissions.includes(permId);
      return {
        ...prev,
        permissions: exists ? prev.permissions.filter((p: string) => p !== permId) : [...prev.permissions, permId],
      };
    });
  };

  const toggleAllDomainPermissions = (domain: PermissionDefinition['domain']) => {
    const domainPerms =
      data?.availablePermissions
        ?.filter((p: PermissionDefinition) => p.domain === domain)
        .map((p: PermissionDefinition) => p.id) || [];

    const allSelected = domainPerms.length > 0 && domainPerms.every((id: string) => formData.permissions.includes(id));

    setFormData((prev) => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter((id: string) => !domainPerms.includes(id))
        : Array.from(new Set([...prev.permissions, ...domainPerms])),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      setIsSubmitting(true);
      if (isEditing && selectedRole) {
        await fetchApi(`/api/v1/staff/roles/${selectedRole.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: formData.name,
            description: formData.description || null,
            permissions: formData.permissions,
          }),
        });
      } else {
        await fetchApi('/api/v1/staff/roles', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save security profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (role: RoleRecord) => {
    if (role.isSystemRole) {
      alert('System standard roles are protected and cannot be deleted.');
      return;
    }
    if (role.assignedHeadcount > 0) {
      alert(`Cannot delete role: ${role.assignedHeadcount} employee(s) are actively assigned to it.`);
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete '${role.name}'?`)) return;

    try {
      await fetchApi(`/api/v1/staff/roles/${role.id}`, { method: 'DELETE' });
      setSelectedRole(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete role');
    }
  };

  // Group catalog by domain with full index signature and strict typing
  const permissionsByDomain = useMemo(() => {
    const catalog = data?.availablePermissions ?? [];
    return catalog.reduce<Record<PermissionDefinition['domain'], PermissionDefinition[]>>(
      (acc, perm: PermissionDefinition) => {
        if (!acc[perm.domain]) {
          acc[perm.domain] = [];
        }
        acc[perm.domain].push(perm);
        return acc;
      },
      {
        POS: [],
        KITCHEN: [],
        INVENTORY: [],
        PROCUREMENT: [],
        FINANCE: [],
        STAFF: [],
        SYSTEM: [],
      }
    );
  }, [data?.availablePermissions]);

  const filteredRoles = useMemo(() => {
    if (!data?.roles) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return data.roles;
    return data.roles.filter(
      (r: RoleRecord) =>
        r.name.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
    );
  }, [data?.roles, searchQuery]);

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. COMMAND HEADER */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/staff"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              Staff Directory <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Security Clearances & RBAC</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Role Clearances & Access Authority Matrix</h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Configure functional operational boundaries, cash drawer access, and override authorizations across the enterprise.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={openCreateModal}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Provision Custom Role
          </button>
          <button
            onClick={loadData}
            title="Refresh Matrix"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {/* 2. SPLIT LAYOUT: ROLES SIDEBAR + PERMISSION MATRIX INSPECTOR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Role Profiles Selector */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-servora-navy">Security Roles ({filteredRoles.length})</span>
              <span className="text-[10px] font-mono text-gray-400">
                {data?.metrics.systemRoles || 0} System / {data?.metrics.customRoles || 0} Custom
              </span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input
                type="text"
                placeholder="Search roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core"
              />
            </div>

            <div className="space-y-1 max-h-[600px] overflow-y-auto custom-scrollbar">
              {filteredRoles.map((role: RoleRecord) => {
                const isSelected = selectedRole?.id === role.id;
                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-200 shadow-xs'
                        : 'bg-white border-gray-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-servora-navy truncate">{role.name}</span>
                          {role.isSystemRole && (
                            <span className="px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded text-[9px] font-bold uppercase shrink-0">
                              System
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-gray-400 block mt-0.5">{role.slug}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-gray-200 text-servora-navy shrink-0 ml-2">
                        {role.assignedHeadcount} Staff
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-500 line-clamp-2 mt-1.5 leading-snug">
                      {role.description || 'No operational description configured.'}
                    </p>

                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-100/80 text-[10.5px]">
                      <span className="font-bold text-servora-core flex items-center gap-1">
                        <Lock size={10} /> {role.permissionCount} Authorities
                      </span>
                      {isSelected && <span className="text-[10px] font-bold text-servora-core">Active Inspection &rarr;</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Active Role Authority Matrix */}
        <div className="lg:col-span-8">
          {selectedRole ? (
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-servora-navy">{selectedRole.name}</h2>
                    {selectedRole.isSystemRole ? (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[10px] font-bold uppercase">
                        Predefined System Template
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-blue-50 text-servora-core rounded-md text-[10px] font-bold uppercase">
                        Custom Enterprise Role
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{selectedRole.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!selectedRole.isSystemRole && (
                    <>
                      <button
                        onClick={() => openEditModal(selectedRole)}
                        className="px-3 py-1.5 bg-slate-50 border border-gray-200 text-servora-navy hover:bg-gray-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit2 size={12} /> Edit Clearances
                      </button>
                      <button
                        onClick={() => handleDelete(selectedRole)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Delete Role"
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Headcount banner */}
              <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Users size={15} className="text-servora-core" />
                  <span className="font-medium text-servora-navy">
                    Currently assigned to <strong>{selectedRole.assignedHeadcount}</strong> active employee(s)
                  </span>
                </div>
                <Link
                  href={`/staff?role=${selectedRole.slug}`}
                  className="font-bold text-servora-core hover:underline text-[11px]"
                >
                  View Assigned Staff &rarr;
                </Link>
              </div>

              {/* Grouped Permission Checklist Grid */}
              <div className="space-y-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                  Configured Security Boundaries ({selectedRole.permissionCount} Authorized)
                </span>

                {(Object.keys(permissionsByDomain) as PermissionDefinition['domain'][]).map((domain) => {
                  const domainPerms = permissionsByDomain[domain] || [];
                  if (domainPerms.length === 0) return null;

                  const grantedCount = domainPerms.filter((p: PermissionDefinition) =>
                    selectedRole.permissions.includes(p.id)
                  ).length;

                  return (
                    <div key={domain} className="border border-gray-200 rounded-xl overflow-hidden text-xs">
                      <div className="bg-slate-50/70 px-4 py-2.5 border-b border-gray-200 flex justify-between items-center">
                        <span className="font-bold text-servora-navy">{domainLabels[domain]}</span>
                        <span className="text-[10px] font-mono font-bold text-gray-500">
                          {grantedCount} of {domainPerms.length} Enabled
                        </span>
                      </div>

                      <div className="divide-y divide-gray-100 bg-white">
                        {domainPerms.map((perm: PermissionDefinition) => {
                          const isGranted = selectedRole.permissions.includes(perm.id);
                          return (
                            <div
                              key={perm.id}
                              className={`p-3 flex items-start justify-between gap-3 transition-colors ${
                                isGranted ? 'bg-blue-50/10' : 'opacity-60'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-servora-navy">{perm.label}</span>
                                  {perm.isSensitive && (
                                    <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                      <ShieldAlert size={9} /> High Authority
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-gray-500">{perm.description}</p>
                                <span className="font-mono text-[9px] text-gray-400 block">{perm.id}</span>
                              </div>

                              <div className="shrink-0 pt-0.5">
                                {isGranted ? (
                                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] flex items-center gap-1">
                                    <Check size={11} /> Authorized
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-400 font-medium text-[10px]">
                                    Restricted
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-gray-400 italic bg-white rounded-2xl border border-gray-200">
              Select a role from the left pane to inspect security authorities.
            </div>
          )}
        </div>
      </div>

      {/* 3. MODAL: CREATE / EDIT ROLE SECURITY CLEARANCE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">
                  {isEditing ? `Edit Clearances: ${formData.name}` : 'Provision Custom Enterprise Role'}
                </h3>
                <p className="text-[11px] text-gray-400">Map granular permissions and operational clearances</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Role Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Floor Shift Lead"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    System Identifier Slug *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isEditing}
                    placeholder="e.g. SHIFT_SUPERVISOR"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        slug: e.target.value.toUpperCase().replace(/\s+/g, '_'),
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono uppercase font-bold focus:outline-none focus:border-servora-core disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Functional Description</label>
                <input
                  type="text"
                  placeholder="e.g. Responsible for opening floats, floor supervision, and cashier shift z-outs"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                />
              </div>

              {/* Granular Permission Toggles Grouped by Domain */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-gray-100 pb-1">
                  <span className="text-[11px] font-bold text-servora-navy">
                    Functional Permissions ({formData.permissions.length} Selected)
                  </span>
                </div>

                {(Object.keys(permissionsByDomain) as PermissionDefinition['domain'][]).map((domain) => {
                  const domainPerms = permissionsByDomain[domain] || [];
                  if (domainPerms.length === 0) return null;

                  const allSelected =
                    domainPerms.length > 0 &&
                    domainPerms.every((p: PermissionDefinition) => formData.permissions.includes(p.id));

                  return (
                    <div key={domain} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-50/80 px-3.5 py-2 border-b border-gray-200 flex items-center justify-between">
                        <span className="font-bold text-[11px] text-servora-navy">{domainLabels[domain]}</span>
                        <button
                          type="button"
                          onClick={() => toggleAllDomainPermissions(domain)}
                          className="text-[10px] font-bold text-servora-core hover:underline cursor-pointer"
                        >
                          {allSelected ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>

                      <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white">
                        {domainPerms.map((perm: PermissionDefinition) => {
                          const checked = formData.permissions.includes(perm.id);
                          return (
                            <label
                              key={perm.id}
                              className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                                checked ? 'bg-blue-50/40 border-blue-200' : 'bg-white border-gray-100 hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePermissionInForm(perm.id)}
                                className="mt-0.5 rounded border-gray-300 text-servora-core focus:ring-servora-core w-4 h-4 cursor-pointer"
                              />
                              <div className="min-w-0">
                                <span className="font-bold text-[11px] text-servora-navy block leading-tight">
                                  {perm.label}
                                </span>
                                <span className="text-[10px] text-gray-500 block leading-tight mt-0.5">
                                  {perm.description}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Save Security Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}