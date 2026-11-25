// apps/web/app/(dashboard)/staff/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Building2,
  Phone,
  Mail,
  ChevronRight,
  Edit2,
  Power,
  X,
  Fingerprint,
  Clock,
  AlertTriangle,
  WifiOff,
  Check,
} from 'lucide-react';
import { fetchApi, ApiError } from '@/lib/api';
import { canAccessRoute } from '@/lib/rbac';

interface StaffBranchMembership {
  branchId: number;
  branchName: string;
  branchCode: string;
  roleId: number | null;
  roleName: string | null;
  roleSlug: string | null;
}

interface StaffRecord {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  hasPin: boolean;
  isOnDuty: boolean;
  clockedInAt: string | null;
  defaultBranchId: number | null;
  branchName: string | null;
  branchCode: string | null;
  branchMemberships: StaffBranchMembership[];
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
  isMainBranch?: boolean;
}

interface StaffDataEnvelope {
  metrics: {
    totalStaff: number;
    activeStaff: number;
    inactiveStaff: number;
    onDutyNow: number;
    posPinEnrolled: number;
    multiBranchStaff: number;
    branchCoverage: number;
  };
  staff: StaffRecord[];
  roles: RoleRecord[];
  branches: BranchOption[];
}

interface FormMembershipRow {
  branchId: number;
  roleId: number | null;
}

export default function StaffDirectoryPage() {
  const [data, setData] = useState<StaffDataEnvelope | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // RBAC state from active workspace
  const [userPermissions, setUserPermissions] = useState<string[] | undefined>(undefined);
  const [userRole, setUserRole] = useState<string | undefined>(undefined);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffRecord | null>(null);
  const [pinResetStaff, setPinResetStaff] = useState<StaffRecord | null>(null);
  const [statusConfirmStaff, setStatusConfirmStaff] = useState<StaffRecord | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [newPin, setNewPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Employee Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    defaultBranchId: '',
    password: '',
    pin: '',
    branchMemberships: [] as FormMembershipRow[],
  });

  useEffect(() => {
    try {
      const cached = localStorage.getItem('servora_cached_workspace');
      if (cached) {
        const parsed = JSON.parse(cached);
        setUserPermissions(parsed?.user?.permissions);
        setUserRole(parsed?.user?.role);
        setCurrentUserId(parsed?.user?.id ?? null);
      }
    } catch {
      // Ignore malformed cache
    }
  }, []);

  const loadStaffData = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setPageError(null);
      const staffRes = await fetchApi('/api/v1/staff');
      if (staffRes?.data) {
        setData(staffRes.data);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && (err.isNetworkError || err.status === 0)) {
        setIsOnline(false);
        return;
      }
      setPageError(err instanceof Error ? err.message : 'Failed to load workforce roster.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaffData();
  }, [loadStaffData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);
    const onOnline = () => {
      setIsOnline(true);
      void loadStaffData();
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [loadStaffData]);

  const canManageStaff = useMemo(() => {
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') return true;
    return Boolean(userPermissions?.includes('*') || userPermissions?.includes('staff.manage'));
  }, [userPermissions, userRole]);

  const canManageRoles = useMemo(
    () => canAccessRoute('/staff/roles', userPermissions, userRole),
    [userPermissions, userRole]
  );

  const isSuperOrAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  const assignableRoles = useMemo(() => {
    const all = data?.roles ?? [];
    if (isSuperOrAdmin) return all;
    return all.filter((r) => r.slug !== 'ADMIN' && r.slug !== 'SUPER_ADMIN');
  }, [data?.roles, isSuperOrAdmin]);

  const branches = data?.branches ?? [];

  const toggleFormBranchMembership = (branchId: number) => {
    setFormData((prev) => {
      const exists = prev.branchMemberships.some((m) => m.branchId === branchId);
      if (exists) {
        // Keep base outlet selected
        if (String(branchId) === prev.defaultBranchId) return prev;
        return {
          ...prev,
          branchMemberships: prev.branchMemberships.filter((m) => m.branchId !== branchId),
        };
      }
      return {
        ...prev,
        branchMemberships: [...prev.branchMemberships, { branchId, roleId: null }],
      };
    });
  };

  const setMembershipRoleOverride = (branchId: number, roleIdStr: string) => {
    const roleId = roleIdStr ? parseInt(roleIdStr, 10) : null;
    setFormData((prev) => ({
      ...prev,
      branchMemberships: prev.branchMemberships.map((m) =>
        m.branchId === branchId ? { ...m, roleId } : m
      ),
    }));
  };

  const handleDefaultBranchChange = (newDefaultIdStr: string) => {
    const newId = parseInt(newDefaultIdStr, 10);
    setFormData((prev) => {
      const nextMemberships =
        !Number.isNaN(newId) && !prev.branchMemberships.some((m) => m.branchId === newId)
          ? [...prev.branchMemberships, { branchId: newId, roleId: null }]
          : prev.branchMemberships;
      return {
        ...prev,
        defaultBranchId: newDefaultIdStr,
        branchMemberships: nextMemberships,
      };
    });
  };

  const openCreateModal = () => {
    setFormError(null);
    const defaultBranch = branches[0]?.id;
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: assignableRoles[0]?.slug || '',
      defaultBranchId: defaultBranch ? String(defaultBranch) : '',
      password: '',
      pin: '',
      branchMemberships: defaultBranch ? [{ branchId: defaultBranch, roleId: null }] : [],
    });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (staff: StaffRecord) => {
    setFormError(null);
    setEditingStaff(staff);
    const initialMemberships: FormMembershipRow[] =
      staff.branchMemberships.length > 0
        ? staff.branchMemberships.map((m) => ({ branchId: m.branchId, roleId: m.roleId }))
        : staff.defaultBranchId
          ? [{ branchId: staff.defaultBranchId, roleId: null }]
          : [];

    setFormData({
      firstName: staff.firstName,
      lastName: staff.lastName,
      email: staff.email,
      phone: staff.phone || '',
      role: staff.role,
      defaultBranchId: staff.defaultBranchId ? String(staff.defaultBranchId) : '',
      password: '',
      pin: '',
      branchMemberships: initialMemberships,
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
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone.trim() || null,
          role: formData.role,
          defaultBranchId: parseInt(formData.defaultBranchId, 10),
          branchMemberships: formData.branchMemberships,
          password: formData.password,
          pin: formData.pin.trim() || null,
        }),
      });
      setIsCreateModalOpen(false);
      setStatusBanner(`Employee ${formData.firstName} ${formData.lastName} provisioned.`);
      await loadStaffData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to provision employee.');
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
      const payload: Record<string, unknown> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone.trim() || null,
        role: formData.role,
        defaultBranchId: formData.defaultBranchId ? parseInt(formData.defaultBranchId, 10) : null,
        branchMemberships: formData.branchMemberships,
      };
      if (formData.password.trim()) payload.password = formData.password.trim();
      if (formData.pin.trim()) payload.pin = formData.pin.trim();

      await fetchApi(`/api/v1/staff/${editingStaff.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setEditingStaff(null);
      setStatusBanner(`Profile updated for ${formData.firstName} ${formData.lastName}.`);
      await loadStaffData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to update employee profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmToggleStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusConfirmStaff) return;
    try {
      setIsSubmitting(true);
      setFormError(null);
      const nextActive = !statusConfirmStaff.isActive;
      await fetchApi(`/api/v1/staff/${statusConfirmStaff.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          isActive: nextActive,
          reason: statusReason.trim() || undefined,
        }),
      });
      setStatusBanner(
        `${statusConfirmStaff.firstName} ${statusConfirmStaff.lastName} ${
          nextActive ? 'reactivated' : 'suspended'
        }.`
      );
      setStatusConfirmStaff(null);
      setStatusReason('');
      await loadStaffData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to change employee status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePinResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinResetStaff) return;
    try {
      setIsSubmitting(true);
      setFormError(null);
      await fetchApi(`/api/v1/staff/${pinResetStaff.id}/pin`, {
        method: 'PATCH',
        body: JSON.stringify({ pin: newPin }),
      });
      setStatusBanner(`POS PIN updated for ${pinResetStaff.firstName} ${pinResetStaff.lastName}.`);
      setPinResetStaff(null);
      setNewPin('');
      await loadStaffData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to reset PIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const metrics = data?.metrics ?? {
    totalStaff: 0,
    activeStaff: 0,
    inactiveStaff: 0,
    onDutyNow: 0,
    posPinEnrolled: 0,
    multiBranchStaff: 0,
    branchCoverage: 0,
  };

  const filteredStaff = useMemo(() => {
    if (!data?.staff) return [];
    return data.staff.filter((s) => {
      const matchesRole = roleFilter === 'ALL' || s.role === roleFilter;
      const matchesBranch =
        branchFilter === 'ALL' ||
        String(s.defaultBranchId) === branchFilter ||
        s.branchMemberships.some((m) => String(m.branchId) === branchFilter);
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && s.isActive) ||
        (statusFilter === 'INACTIVE' && !s.isActive) ||
        (statusFilter === 'ON_DUTY' && s.isOnDuty);

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.branchName && s.branchName.toLowerCase().includes(q)) ||
        s.branchMemberships.some((m) => m.branchName.toLowerCase().includes(q));

      return matchesRole && matchesBranch && matchesStatus && matchesQuery;
    });
  }, [data?.staff, roleFilter, branchFilter, statusFilter, searchQuery]);

  const renderBranchAssignmentPanel = () => (
    <div className="border-t border-gray-100 pt-3 space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-servora-navy">
          Multi-Branch Access Clearances ({formData.branchMemberships.length} Selected)
        </label>
        <span className="text-[10px] text-gray-400">Optional per-outlet role override</span>
      </div>

      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
        {branches.map((b) => {
          const membership = formData.branchMemberships.find((m) => m.branchId === b.id);
          const isBase = String(b.id) === formData.defaultBranchId;
          const isSelected = Boolean(membership);

          return (
            <div
              key={b.id}
              className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl border text-xs ${
                isSelected
                  ? 'bg-blue-50/50 border-servora-core/30'
                  : 'bg-slate-50 border-gray-200'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleFormBranchMembership(b.id)}
                disabled={isBase}
                className="flex items-center gap-2 text-left min-w-0 flex-1 cursor-pointer disabled:cursor-default"
              >
                <span
                  className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                    isSelected
                      ? 'bg-servora-core border-servora-core text-white'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  {isSelected && <Check size={11} />}
                </span>
                <span className="truncate font-semibold text-servora-navy">
                  {b.name}{' '}
                  <span className="font-mono text-[10px] text-gray-400">({b.code})</span>
                </span>
                {isBase && (
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-servora-navy text-white shrink-0">
                    Base
                  </span>
                )}
              </button>

              {isSelected && (
                <select
                  aria-label={`Role override for ${b.name}`}
                  value={membership?.roleId ? String(membership.roleId) : ''}
                  onChange={(e) => setMembershipRoleOverride(b.id, e.target.value)}
                  className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[10.5px] font-semibold text-servora-navy focus:outline-none cursor-pointer max-w-[140px]"
                >
                  <option value="">Default Role</option>
                  {assignableRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. EXECUTIVE COMMAND HEADER */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-servora-core bg-blue-50 px-2 py-0.5 rounded-md flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-servora-core animate-pulse" />
              Human Capital &amp; Organization
            </span>
            <ChevronRight size={12} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-500">
              Multi-Branch Employee Master Roster
            </span>
            {!isOnline && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                <WifiOff size={10} /> Offline
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Workforce &amp; Employee Directory</h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Administer staff profiles, multi-outlet branch memberships, role clearances, live duty status, and POS PIN credentials.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {canManageRoles && (
            <Link
              href="/staff/roles"
              className="px-3.5 py-2 bg-slate-50 border border-gray-200 text-servora-navy rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck size={14} className="text-servora-core" />
              <span>RBAC Clearances</span>
            </Link>
          )}
          {canManageStaff && (
            <button
              type="button"
              onClick={openCreateModal}
              disabled={!isOnline}
              className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Plus size={14} /> Provision Employee
            </button>
          )}
          <button
            type="button"
            onClick={loadStaffData}
            disabled={isLoading || !isOnline}
            title="Refresh Directory"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {/* INLINE FEEDBACK & ERROR BANNERS */}
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
            aria-label="Dismiss notification"
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
            onClick={loadStaffData}
            className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[11px] font-bold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. WORKFORCE TELEMETRY METRIC TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Total Workforce
            </span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              {metrics.totalStaff}
            </p>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Users size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Active Accounts
            </span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              {metrics.activeStaff}
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              On Duty Now
            </span>
            <p className="text-xl font-bold font-mono text-servora-core mt-0.5">
              {metrics.onDutyNow}
            </p>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Clock size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              POS PIN Enrolled
            </span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">
              {metrics.posPinEnrolled}
            </p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Fingerprint size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Multi-Branch
            </span>
            <p className="text-xl font-bold font-mono text-blue-700 mt-0.5">
              {metrics.multiBranchStaff}
            </p>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Building2 size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Suspended
            </span>
            <p className="text-xl font-bold font-mono text-gray-500 mt-0.5">
              {metrics.inactiveStaff}
            </p>
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
            <span className="text-xs font-mono text-gray-400">
              ({filteredStaff.length} Records)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={14}
              />
              <input
                type="text"
                placeholder="Search name, email, phone, branch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core"
              />
            </div>

            {branches.length > 0 && (
              <select
                aria-label="Filter by outlet"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
              >
                <option value="ALL">All Outlets ({branches.length})</option>
                {branches.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            )}

            <select
              aria-label="Filter by functional role"
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

            <select
              aria-label="Filter by employment status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Accounts</option>
              <option value="ON_DUTY">Clocked In (On Duty)</option>
              <option value="INACTIVE">Suspended</option>
            </select>
          </div>
        </div>

        {/* 4. ROSTER TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50/50">
                <th className="py-2.5 px-3">Employee Details</th>
                <th className="py-2.5 px-3">Role Clearance</th>
                <th className="py-2.5 px-3">Outlet Clearances</th>
                <th className="py-2.5 px-3">POS PIN</th>
                <th className="py-2.5 px-3">Last Access</th>
                <th className="py-2.5 px-3">State / Duty</th>
                {canManageStaff && <th className="py-2.5 px-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManageStaff ? 7 : 6}
                    className="py-8 text-center text-gray-400 italic"
                  >
                    {isLoading
                      ? 'Loading workforce roster...'
                      : 'No workforce members match the selected criteria.'}
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const isSelf = currentUserId === staff.id;
                  const canEditTarget =
                    canManageStaff &&
                    (isSuperOrAdmin || (staff.role !== 'ADMIN' && staff.role !== 'SUPER_ADMIN'));

                  return (
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
                              {isSelf && (
                                <span className="ml-1.5 text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-blue-50 text-servora-core">
                                  You
                                </span>
                              )}
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
                          {staff.role.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {staff.branchMemberships.length > 0 ? (
                            staff.branchMemberships.map((m) => (
                              <span
                                key={m.branchId}
                                title={
                                  m.roleName ? `Override role: ${m.roleName}` : 'Uses primary role'
                                }
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                  m.branchId === staff.defaultBranchId
                                    ? 'bg-blue-50 text-servora-core border-blue-200'
                                    : 'bg-slate-50 text-gray-700 border-gray-200'
                                }`}
                              >
                                <Building2 size={9} />
                                {m.branchName}
                                {m.roleSlug && (
                                  <span className="font-mono text-[9px] text-purple-700">
                                    ({m.roleSlug})
                                  </span>
                                )}
                              </span>
                            ))
                          ) : (
                            <span className="inline-flex items-center gap-1 text-gray-600 text-[11px]">
                              <Building2 size={11} className="text-gray-400" />
                              {staff.branchName || 'Unassigned'}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {staff.hasPin ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <CheckCircle2 size={10} /> Enrolled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            Not Set
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-gray-500 font-mono text-[11px]">
                        {staff.lastLoginAt ? (
                          <div>
                            <span>{new Date(staff.lastLoginAt).toLocaleDateString()}</span>
                            <span className="text-[10px] block text-gray-400">
                              {new Date(staff.lastLoginAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Never</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1 items-start">
                          {staff.isActive ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-bold text-[10px] inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md font-bold text-[10px] inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Suspended
                            </span>
                          )}
                          {staff.isOnDuty && (
                            <span className="px-2 py-0.5 bg-blue-50 text-servora-core border border-blue-200 rounded-md font-bold text-[9.5px] inline-flex items-center gap-1">
                              <Clock size={9} /> On Duty
                            </span>
                          )}
                        </div>
                      </td>

                      {canManageStaff && (
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={!canEditTarget || !isOnline}
                              onClick={() => {
                                setFormError(null);
                                setPinResetStaff(staff);
                                setNewPin('');
                              }}
                              title="Reset POS Login PIN"
                              className="p-1.5 rounded-lg text-gray-500 hover:text-servora-core hover:bg-blue-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <KeyRound size={13} />
                            </button>
                            <button
                              type="button"
                              disabled={!canEditTarget || !isOnline}
                              onClick={() => openEditModal(staff)}
                              title="Edit Profile & Branch Clearances"
                              className="p-1.5 rounded-lg text-gray-500 hover:text-servora-core hover:bg-blue-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              disabled={!canEditTarget || isSelf || !isOnline}
                              onClick={() => {
                                setFormError(null);
                                setStatusReason('');
                                setStatusConfirmStaff(staff);
                              }}
                              title={
                                isSelf
                                  ? 'Cannot suspend your own account'
                                  : staff.isActive
                                    ? 'Suspend Employee'
                                    : 'Reactivate Employee'
                              }
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                                staff.isActive
                                  ? 'text-gray-400 hover:text-rose-600 hover:bg-rose-50'
                                  : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              <Power size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL: PROVISION EMPLOYEE */}
      {isCreateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">
                  Provision New Employee Account
                </h3>
                <p className="text-[11px] text-gray-400">
                  Assign role clearance, multi-branch access, and credentials
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold"
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    First Name *
                  </label>
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
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Last Name *
                  </label>
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
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="samuel@servora.co.ke"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Phone Number
                  </label>
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
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Primary Functional Role *
                  </label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    {assignableRoles.map((r) => (
                      <option key={r.id} value={r.slug}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Default Base Outlet *
                  </label>
                  <select
                    required
                    value={formData.defaultBranchId}
                    onChange={(e) => handleDefaultBranchChange(e.target.value)}
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

              {branches.length > 0 && renderBranchAssignmentPanel()}

              <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Portal Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Minimum 8 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    POS Fast-Login PIN (4–6 Digits)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="e.g. 1234"
                    value={formData.pin}
                    onChange={(e) =>
                      setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })
                    }
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
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">
                  Edit Profile: {editingStaff.firstName} {editingStaff.lastName}
                </h3>
                <p className="text-[11px] text-gray-400">
                  Modify operational role, multi-branch clearances, and credentials
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold"
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Last Name *
                  </label>
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
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Phone Number
                  </label>
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
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Primary Functional Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    {assignableRoles.map((r) => (
                      <option key={r.id} value={r.slug}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    Default Base Outlet
                  </label>
                  <select
                    value={formData.defaultBranchId}
                    onChange={(e) => handleDefaultBranchChange(e.target.value)}
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

              {branches.length > 0 && renderBranchAssignmentPanel()}

              <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    New Password (Optional)
                  </label>
                  <input
                    type="password"
                    placeholder="Leave blank to keep current"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">
                    New POS PIN (Optional)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="Leave blank to keep"
                    value={formData.pin}
                    onChange={(e) =>
                      setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })
                    }
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
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Reset POS Quick PIN</h3>
                <p className="text-[11px] text-gray-400">
                  Assign 4–6 digit terminal login code for {pinResetStaff.firstName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPinResetStaff(null)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold"
              >
                {formError}
              </div>
            )}

            <form onSubmit={handlePinResetSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1.5 text-center">
                  Enter Numeric PIN (4–6 Digits)
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

      {/* 8. MODAL: SUSPEND / REACTIVATE CONFIRMATION WITH AUDIT REASON */}
      {statusConfirmStaff && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">
                  {statusConfirmStaff.isActive ? 'Suspend Employee Account' : 'Reactivate Employee'}
                </h3>
                <p className="text-[11px] text-gray-400">
                  {statusConfirmStaff.firstName} {statusConfirmStaff.lastName} ({statusConfirmStaff.role})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStatusConfirmStaff(null)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold"
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleConfirmToggleStatus} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">
                  Audit Justification (Optional)
                </label>
                <input
                  type="text"
                  placeholder={
                    statusConfirmStaff.isActive
                      ? 'e.g. Leave of absence, contract ended...'
                      : 'e.g. Returned from leave'
                  }
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setStatusConfirmStaff(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 py-2.5 text-white font-bold rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer ${
                    statusConfirmStaff.isActive
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {isSubmitting
                    ? 'Saving...'
                    : statusConfirmStaff.isActive
                      ? 'Confirm Suspend'
                      : 'Confirm Reactivate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}