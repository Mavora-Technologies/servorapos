'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  KeyRound,
  Store,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Building2,
  Lock,
  Phone,
  Mail,
  ChevronRight,
  MoreVertical,
  Edit2,
  Power,
  X,
  Fingerprint,
  Calendar,
  Clock,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface StaffRecord {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  hasPin: boolean;
  defaultBranchId: number | null;
  branchName: string | null;
  branchCode: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

interface RoleRecord {
  id: number;
  name: string;
  slug: string;
  permissions: string[];
  isSystemRole: boolean;
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

interface StaffDataEnvelope {
  metrics: {
    totalStaff: number;
    activeStaff: number;
    inactiveStaff: number;
    posPinEnrolled: number;
    branchCoverage: number;
  };
  staff: StaffRecord[];
  roles: RoleRecord[];
}

export default function StaffDirectoryPage() {
  const [data, setData] = useState<StaffDataEnvelope | null>(null);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffRecord | null>(null);
  const [pinResetStaff, setPinResetStaff] = useState<StaffRecord | null>(null);
  const [newPin, setNewPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'WAITER',
    defaultBranchId: '',
    password: '',
    pin: '',
  });

  const loadStaffData = async () => {
    try {
      setIsLoading(true);
      const [staffRes, branchRes] = await Promise.all([
        fetchApi('/api/v1/staff'),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
      ]);

      if (staffRes?.data) {
        setData(staffRes.data);
      }
      if (branchRes?.data && Array.isArray(branchRes.data)) {
        setBranches(branchRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load workforce roster:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStaffData();
  }, []);

  const openCreateModal = () => {
    setFormError(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: data?.roles?.[0]?.slug || 'WAITER',
      defaultBranchId: branches[0]?.id ? String(branches[0].id) : '',
      password: '',
      pin: '',
    });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (staff: StaffRecord) => {
    setFormError(null);
    setEditingStaff(staff);
    setFormData({
      firstName: staff.firstName,
      lastName: staff.lastName,
      email: staff.email,
      phone: staff.phone || '',
      role: staff.role,
      defaultBranchId: staff.defaultBranchId ? String(staff.defaultBranchId) : '',
      password: '', // Leave blank unless updating
      pin: '', // Leave blank unless updating
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      setIsSubmitting(true);
      await fetchApi('/api/v1/staff', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          defaultBranchId: parseInt(formData.defaultBranchId, 10),
          pin: formData.pin.trim() ? formData.pin.trim() : undefined,
        }),
      });
      setIsCreateModalOpen(false);
      loadStaffData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to provision employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setFormError(null);
    try {
      setIsSubmitting(true);
      const payload: Record<string, any> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || null,
        role: formData.role,
        defaultBranchId: formData.defaultBranchId ? parseInt(formData.defaultBranchId, 10) : null,
      };
      if (formData.password.trim()) {
        payload.password = formData.password.trim();
      }
      if (formData.pin.trim()) {
        payload.pin = formData.pin.trim();
      }

      await fetchApi(`/api/v1/staff/${editingStaff.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setEditingStaff(null);
      loadStaffData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update employee profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (staff: StaffRecord) => {
    const action = staff.isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} ${staff.firstName} ${staff.lastName}?`)) return;

    try {
      await fetchApi(`/api/v1/staff/${staff.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !staff.isActive }),
      });
      loadStaffData();
    } catch (err: any) {
      alert(err.message || `Failed to ${action} employee account`);
    }
  };

  const handlePinResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinResetStaff) return;
    try {
      setIsSubmitting(true);
      await fetchApi(`/api/v1/staff/${pinResetStaff.id}/pin`, {
        method: 'PATCH',
        body: JSON.stringify({ pin: newPin }),
      });
      alert(`POS PIN for ${pinResetStaff.firstName} successfully updated.`);
      setPinResetStaff(null);
      setNewPin('');
      loadStaffData();
    } catch (err: any) {
      alert(err.message || 'Failed to reset PIN');
    } finally {
      setIsSubmitting(false);
    }
  };

  const metrics = useMemo(() => {
    return {
      totalStaff: data?.metrics?.totalStaff ?? 0,
      activeStaff: data?.metrics?.activeStaff ?? 0,
      inactiveStaff: data?.metrics?.inactiveStaff ?? 0,
      posPinEnrolled: data?.metrics?.posPinEnrolled ?? 0,
      branchCoverage: data?.metrics?.branchCoverage ?? 0,
    };
  }, [data]);

  const filteredStaff = useMemo(() => {
    if (!data?.staff) return [];
    return data.staff.filter((s) => {
      const matchesRole = roleFilter === 'ALL' || s.role === roleFilter;
      const matchesBranch = branchFilter === 'ALL' || String(s.defaultBranchId) === branchFilter;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && s.isActive) ||
        (statusFilter === 'INACTIVE' && !s.isActive);

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.branchName && s.branchName.toLowerCase().includes(q));

      return matchesRole && matchesBranch && matchesStatus && matchesQuery;
    });
  }, [data?.staff, roleFilter, branchFilter, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. EXECUTIVE COMMAND HEADER */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-servora-core bg-blue-50 px-2 py-0.5 rounded-md flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-servora-core animate-pulse" />
              Human Capital & Organization
            </span>
            <ChevronRight size={12} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-500">Employee Master Roster & Access Controls</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Workforce & Employee Directory</h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Administer staff profiles, branch assignments, role-based security clearances, and POS fast-login PIN credentials.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <Link
            href="/staff/roles"
            className="px-3.5 py-2 bg-slate-50 border border-gray-200 text-servora-navy rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1.5"
          >
            <ShieldCheck size={14} className="text-servora-core" />
            <span>RBAC Clearances</span>
          </Link>
          <button
            onClick={openCreateModal}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Provision Employee
          </button>
          <button
            onClick={loadStaffData}
            title="Refresh Directory"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {/* 2. WORKFORCE TELEMETRY METRIC TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Workforce</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">{metrics.totalStaff}</p>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Users size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Active Duty</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">{metrics.activeStaff}</p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">POS PIN Enrolled</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">{metrics.posPinEnrolled}</p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Fingerprint size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Operating Outlets</span>
            <p className="text-xl font-bold font-mono text-blue-700 mt-0.5">{metrics.branchCoverage}</p>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Building2 size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between col-span-2 lg:col-span-1">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Deactivated</span>
            <p className="text-xl font-bold font-mono text-gray-500 mt-0.5">{metrics.inactiveStaff}</p>
          </div>
          <div className="p-2.5 bg-gray-100 text-gray-500 rounded-xl">
            <UserX size={18} />
          </div>
        </div>
      </div>

      {/* 3. SEARCH & ENTERPRISE ROSTER FILTERS */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-servora-navy">Master Employee Ledger</h2>
            <span className="text-xs font-mono text-gray-400">({filteredStaff.length} Records)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core"
              />
            </div>

            {/* Branch Filter */}
            {branches.length > 0 && (
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
              >
                <option value="ALL">All Outlets</option>
                {branches.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
            >
              <option value="ALL">All Functional Roles</option>
              {data?.roles?.map((r) => (
                <option key={r.id} value={r.slug}>
                  {r.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Duty</option>
              <option value="INACTIVE">Deactivated</option>
            </select>
          </div>
        </div>

        {/* 4. ROSTER TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                <th className="py-2.5 px-3">Employee Details</th>
                <th className="py-2.5 px-3">Role & Security Clearance</th>
                <th className="py-2.5 px-3">Base Outlet</th>
                <th className="py-2.5 px-3">POS Fast-Login</th>
                <th className="py-2.5 px-3">Last System Access</th>
                <th className="py-2.5 px-3">Employment State</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400 italic">
                    No workforce members match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-servora-core/10 text-servora-core font-bold flex items-center justify-center shrink-0">
                          {staff.firstName[0]}
                          {staff.lastName[0]}
                        </div>
                        <div>
                          <span className="font-bold text-servora-navy block">
                            {staff.firstName} {staff.lastName}
                          </span>
                          <span className="text-[11px] text-gray-500 flex items-center gap-1">
                            <Mail size={10} className="text-gray-400" />
                            {staff.email}
                          </span>
                          {staff.phone && (
                            <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                              <Phone size={9} />
                              {staff.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md font-bold text-[10.5px] uppercase tracking-wider bg-slate-100 text-servora-navy border border-gray-200">
                        {staff.role.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-medium text-gray-700">
                      <div className="flex items-center gap-1.5">
                        <Building2 size={12} className="text-gray-400 shrink-0" />
                        <span>{staff.branchName || 'Central Hub'}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      {staff.hasPin ? (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 size={10} /> PIN Configured
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          Not Enrolled
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-gray-500 font-mono text-[11px]">
                      {staff.lastLoginAt ? (
                        <div>
                          <span>{new Date(staff.lastLoginAt).toLocaleDateString()}</span>
                          <span className="text-[10px] block text-gray-400">
                            {new Date(staff.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Never Logged In</span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      {staff.isActive ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-bold text-[10px] inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md font-bold text-[10px] inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Suspended
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setPinResetStaff(staff);
                            setNewPin('');
                          }}
                          title="Reset POS Login PIN"
                          className="p-1.5 rounded-lg text-gray-500 hover:text-servora-core hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <KeyRound size={13} />
                        </button>
                        <button
                          onClick={() => openEditModal(staff)}
                          title="Edit Profile & Permissions"
                          className="p-1.5 rounded-lg text-gray-500 hover:text-servora-core hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(staff)}
                          title={staff.isActive ? 'Suspend Employee' : 'Reactivate Employee'}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            staff.isActive
                              ? 'text-gray-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          <Power size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL: PROVISION EMPLOYEE */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Provision New Employee Account</h3>
                <p className="text-[11px] text-gray-400">Assign role clearance, default branch, and credentials</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Samuel"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ochieng"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Work Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="samuel@servora.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="2547XXXXXXXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none focus:border-servora-core"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Functional Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    {data?.roles?.map((r) => (
                      <option key={r.id} value={r.slug}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Default Base Outlet *</label>
                  <select
                    required
                    value={formData.defaultBranchId}
                    onChange={(e) => setFormData({ ...formData, defaultBranchId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="">Select branch...</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Portal Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Minimum 8 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">POS Fast-Login PIN (4 Digits)</label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="e.g. 1234"
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-center tracking-widest focus:outline-none focus:border-servora-core"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Provisioning...' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: EDIT EMPLOYEE PROFILE */}
      {editingStaff && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">
                  Edit Profile: {editingStaff.firstName} {editingStaff.lastName}
                </h3>
                <p className="text-[11px] text-gray-400">Modify operational assignments and clearance</p>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Work Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none focus:border-servora-core"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Functional Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    {data?.roles?.map((r) => (
                      <option key={r.id} value={r.slug}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Base Outlet</label>
                  <select
                    value={formData.defaultBranchId}
                    onChange={(e) => setFormData({ ...formData, defaultBranchId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">New Password (Optional)</label>
                  <input
                    type="password"
                    placeholder="Leave blank to keep current"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">New POS PIN (Optional)</label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="Leave blank to keep"
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono text-center tracking-widest focus:outline-none focus:border-servora-core"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: FAST POS PIN RESET */}
      {pinResetStaff && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Reset POS Quick PIN</h3>
                <p className="text-[11px] text-gray-400">
                  Assign 4-digit terminal login code for {pinResetStaff.firstName}
                </p>
              </div>
              <button
                onClick={() => setPinResetStaff(null)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePinResetSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1.5 text-center">
                  Enter 4-Digit Numeric PIN
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  maxLength={6}
                  placeholder="••••"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl font-mono text-center text-xl tracking-[0.3em] font-bold focus:outline-none focus:border-servora-core"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPinResetStaff(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || newPin.length < 4}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Updating...' : 'Update PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}