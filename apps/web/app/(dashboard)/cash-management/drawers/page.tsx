'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Wallet,
  Plus,
  DollarSign,
  X,
  ChevronRight,
  Calculator,
  Lock,
  Unlock,
  UserCheck,
  TrendingUp,
  RefreshCw,
  ArrowDownLeft,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface DrawerSession {
  id: number;
  drawerId: number;
  drawerName: string;
  drawerCode: string;
  status: string;
  openingFloat: string;
  liveCashSales: string;
  cashDropsTotal: string;
  payoutsTotal: string;
  expectedClosingBalance: string;
  cashierId: number | null;
  cashierName: string | null;
  cashierEmail: string | null;
  cashierRole: string | null;
  openedAt: string;
}

interface ScheduledCustodian {
  id: number;
  userId: number;
  custodianName: string;
  custodianRole: string;
  shiftType: string;
  allocatedFloat: number;
  maxCashLimit: number;
}

interface CashDrawer {
  id: number;
  branchId: number | null;
  branchName: string | null;
  drawerCode: string;
  name: string;
  status: 'OPEN' | 'CLOSED';
  currentBalance: string;
  activeSession: DrawerSession | null;
  scheduledCustodian: ScheduledCustodian | null;
}

interface StaffOption {
  id: number;
  fullName: string;
  role: string;
}

interface DrawerSummary {
  totalDrawersCount: number;
  activeSessionsCount: number;
  totalFloatLiquidity: number;
  totalLiveSalesVolume: number;
}

export default function CashDrawersPage() {
  const [drawers, setDrawers] = useState<CashDrawer[]>([]);
  const [activeSessions, setActiveSessions] = useState<DrawerSession[]>([]);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [summary, setSummary] = useState<DrawerSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Register Terminal Modal State
  const [isRegisterDrawerModalOpen, setIsRegisterDrawerModalOpen] = useState(false);
  const [registerDrawerCode, setRegisterDrawerCode] = useState('');
  const [registerDrawerName, setRegisterDrawerName] = useState('');
  const [isRegisteringDrawer, setIsRegisteringDrawer] = useState(false);

  // Open Drawer Modal State
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [selectedDrawerId, setSelectedDrawerId] = useState('');
  const [selectedCashierId, setSelectedCashierId] = useState('');
  const [openingFloat, setOpeningFloat] = useState('10000');
  const [openNotes, setOpenNotes] = useState('');
  const [isOpening, setIsOpening] = useState(false);

  // Close & Reconcile Modal State (Denominational Calculator)
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closingSession, setClosingSession] = useState<DrawerSession | null>(null);
  const [denoms, setDenoms] = useState<Record<string, number>>({
    '1000': 0,
    '500': 0,
    '200': 0,
    '100': 0,
    '50': 0,
    coins: 0,
  });
  const [closeNotes, setCloseNotes] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  // Cash Drop Modal State
  const [isDropModalOpen, setIsDropModalOpen] = useState(false);
  const [dropSessionId, setDropSessionId] = useState<number | null>(null);
  const [dropAmount, setDropAmount] = useState('');
  const [dropReason, setDropReason] = useState('Mid-shift safe transfer');
  const [isDropping, setIsDropping] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const activeBranchId =
        typeof window !== 'undefined' ? localStorage.getItem('servora_active_branch_id') : null;
      const query = activeBranchId ? `?branchId=${activeBranchId}` : '';

      const res = await fetchApi(`/api/v1/cash-management/drawers${query}`);
      if (res?.data) {
        setDrawers(res.data.drawers || []);
        setActiveSessions(res.data.activeSessions || []);
        setSummary(res.data.summary || null);
        setStaffList(res.data.staff || []);
      }
    } catch (err) {
      console.error('Failed to load cash drawers:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRegisterDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegisteringDrawer(true);
    try {
      const activeBranchId =
        typeof window !== 'undefined' ? localStorage.getItem('servora_active_branch_id') : null;

      await fetchApi('/api/v1/cash-management/drawers', {
        method: 'POST',
        body: JSON.stringify({
          drawerCode: registerDrawerCode.trim(),
          name: registerDrawerName.trim(),
          branchId: activeBranchId ? Number(activeBranchId) : undefined,
        }),
      });

      setIsRegisterDrawerModalOpen(false);
      setRegisterDrawerCode('');
      setRegisterDrawerName('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to register POS terminal');
    } finally {
      setIsRegisteringDrawer(false);
    }
  };

  const openShiftForDrawer = (drawer: CashDrawer) => {
    setSelectedDrawerId(String(drawer.id));
    if (drawer.scheduledCustodian) {
      setSelectedCashierId(String(drawer.scheduledCustodian.userId));
      setOpeningFloat(String(drawer.scheduledCustodian.allocatedFloat || 10000));
    } else {
      setSelectedCashierId('');
      setOpeningFloat('10000');
    }
    setOpenNotes('');
    setIsOpenModalOpen(true);
  };

  const handleOpenDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrawerId) return;

    setIsOpening(true);
    try {
      await fetchApi('/api/v1/cash-management/drawers/sessions/open', {
        method: 'POST',
        body: JSON.stringify({
          drawerId: parseInt(selectedDrawerId, 10),
          cashierId: selectedCashierId ? parseInt(selectedCashierId, 10) : undefined,
          openingFloat: parseFloat(openingFloat),
          notes: openNotes || undefined,
        }),
      });

      setIsOpenModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to open drawer session');
    } finally {
      setIsOpening(false);
    }
  };

  const handleCashDrop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dropSessionId) return;

    setIsDropping(true);
    try {
      await fetchApi('/api/v1/cash-management/drawers/sessions/drop', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: dropSessionId,
          amount: parseFloat(dropAmount),
          reason: dropReason,
        }),
      });

      setIsDropModalOpen(false);
      setDropAmount('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to record cash drop');
    } finally {
      setIsDropping(false);
    }
  };

  const calculatedPhysicalTotal = useMemo(() => {
    return (
      (denoms['1000'] || 0) * 1000 +
      (denoms['500'] || 0) * 500 +
      (denoms['200'] || 0) * 200 +
      (denoms['100'] || 0) * 100 +
      (denoms['50'] || 0) * 50 +
      (denoms['coins'] || 0)
    );
  }, [denoms]);

  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingSession) return;

    setIsClosing(true);
    try {
      await fetchApi(`/api/v1/cash-management/drawers/sessions/${closingSession.id}/close`, {
        method: 'POST',
        body: JSON.stringify({
          actualClosingBalance: calculatedPhysicalTotal,
          denominations: denoms,
          notes: closeNotes || undefined,
        }),
      });

      setIsCloseModalOpen(false);
      setClosingSession(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to reconcile and close session');
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-gray-400">Cash Management & Treasury</span>
            <ChevronRight size={12} className="text-gray-400" />
            <span className="text-xs font-bold text-servora-navy">POS Cash Drawers</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">POS Cash Drawers & Live Register Custody</h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Real-time register liquidity tracking starting floats, live POS cash sales, safe drops, and assigned custodians.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setRegisterDrawerCode(`POS-TERM-${String(drawers.length + 1).padStart(2, '0')}`);
              setRegisterDrawerName('');
              setIsRegisterDrawerModalOpen(true);
            }}
            className="bg-slate-100 text-servora-navy hover:bg-gray-200 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Register Terminal
          </button>
          <button
            onClick={() => {
              const firstClosed = drawers.find((d) => d.status === 'CLOSED');
              if (firstClosed) openShiftForDrawer(firstClosed);
            }}
            disabled={!drawers.some((d) => d.status === 'CLOSED')}
            className="bg-servora-core text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-40 cursor-pointer"
          >
            <Unlock size={14} /> Open New Shift Float
          </button>
          <button
            onClick={loadData}
            title="Refresh Registers"
            className="p-2.5 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {/* Telemetry Metrics */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Total Terminals</span>
              <h3 className="text-lg font-bold text-servora-navy mt-1">
                {summary.totalDrawersCount} Drawers
              </h3>
              <span className="text-[11px] text-servora-deepTeal font-medium">Registered POS stations</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center">
              <Wallet size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Active Sessions</span>
              <h3 className="text-lg font-bold text-emerald-700 mt-1">
                {summary.activeSessionsCount} Open
              </h3>
              <span className="text-[11px] text-emerald-600 font-medium">Terminals currently trading</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Unlock size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Live POS Cash Sales</span>
              <h3 className="text-lg font-bold font-mono text-servora-core mt-1">
                KES {summary.totalLiveSalesVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-[11px] text-gray-500 font-medium">Collected across active shifts</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider">Total Drawer Liquidity</span>
              <h3 className="text-lg font-bold font-mono text-servora-navy mt-1">
                KES {summary.totalFloatLiquidity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <span className="text-[11px] text-servora-deepTeal font-medium">Float + Sales - Drops</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </div>
        </div>
      )}

      {/* POS Terminals Grid */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-bold text-servora-navy uppercase tracking-wider">
            Registered POS Cash Terminals & Live Balances
          </h2>
          <Link
            href="/staff/cashier-assignments"
            className="text-xs font-bold text-servora-core hover:underline"
          >
            Manage HR Custodian Assignments &rarr;
          </Link>
        </div>

        {drawers.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center text-xs text-gray-400">
            No POS cash terminals registered yet. Click <strong>Register Terminal</strong> above to initialize stations.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drawers.map((d) => {
              const isOpen = d.status === 'OPEN';
              const session = d.activeSession;
              const custodian = d.scheduledCustodian;

              return (
                <div key={d.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-gray-400 block">
                          {d.drawerCode} {d.branchName ? `• ${d.branchName}` : ''}
                        </span>
                        <h3 className="text-sm font-bold text-servora-navy">{d.name}</h3>
                      </div>
                      {isOpen ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Unlock size={10} /> Active Shift
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">
                          <Lock size={10} /> Closed
                        </span>
                      )}
                    </div>

                    {/* Assigned Custodian Banner */}
                    <div className="p-2.5 rounded-xl border bg-blue-50/40 border-blue-100 flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium flex items-center gap-1.5">
                        <UserCheck size={13} className="text-servora-core" />
                        {isOpen ? 'Active Custodian:' : 'Assigned Custodian:'}
                      </span>
                      {session ? (
                        <span className="font-bold text-servora-navy truncate max-w-[160px]">
                          {session.cashierName || session.cashierEmail || 'Staff'}
                          {session.cashierRole ? ` (${session.cashierRole})` : ''}
                        </span>
                      ) : custodian ? (
                        <span className="font-bold text-servora-core truncate max-w-[160px]">
                          {custodian.custodianName} ({custodian.shiftType})
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </div>

                    {/* Live Float + Sales Breakdown */}
                    <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl text-xs space-y-1.5">
                      {session ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Starting Cash Float:</span>
                            <span className="font-mono font-medium text-gray-700">
                              KES {parseFloat(session.openingFloat).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">POS Sales Done So Far:</span>
                            <span className="font-mono font-bold text-emerald-700">
                              +KES {parseFloat(session.liveCashSales).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          {parseFloat(session.cashDropsTotal) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Safe Drops Recorded:</span>
                              <span className="font-mono font-medium text-amber-700">
                                -KES {parseFloat(session.cashDropsTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between pt-1.5 border-t border-gray-200">
                            <span className="font-bold text-servora-navy">Total Expected in Drawer:</span>
                            <span className="font-mono font-bold text-servora-core text-sm">
                              KES {parseFloat(session.expectedClosingBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Current Drawer Balance:</span>
                          <span className="font-mono font-bold text-servora-navy">
                            KES {parseFloat(d.currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    {isOpen && session ? (
                      <>
                        <button
                          onClick={() => {
                            setDropSessionId(session.id);
                            setDropAmount('');
                            setIsDropModalOpen(true);
                          }}
                          className="flex-1 py-2 px-2 bg-slate-100 hover:bg-gray-200 text-servora-navy rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <ArrowDownLeft size={13} /> Safe Drop
                        </button>
                        <button
                          onClick={() => {
                            setClosingSession(session);
                            setDenoms({ '1000': 0, '500': 0, '200': 0, '100': 0, '50': 0, coins: 0 });
                            setCloseNotes('');
                            setIsCloseModalOpen(true);
                          }}
                          className="flex-1 py-2 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          Reconcile & Close
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => openShiftForDrawer(d)}
                        className="w-full py-2 px-2 bg-servora-core hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Open Shift Float
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* REGISTER POS TERMINAL MODAL */}
      {isRegisterDrawerModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Register POS Cash Terminal</h3>
                <p className="text-[11px] text-servora-deepTeal">Add new physical terminal to treasury master</p>
              </div>
              <button onClick={() => setIsRegisterDrawerModalOpen(false)} className="text-gray-400 hover:text-servora-navy cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRegisterDrawer} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Terminal Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. POS-TERM-04"
                  value={registerDrawerCode}
                  onChange={(e) => setRegisterDrawerCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono font-bold focus:border-servora-core focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Terminal Label / Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Terrace VIP Bar Register"
                  value={registerDrawerName}
                  onChange={(e) => setRegisterDrawerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsRegisterDrawerModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegisteringDrawer}
                  className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isRegisteringDrawer ? 'Registering...' : 'Save Terminal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OPEN SHIFT MODAL WITH CUSTODIAN ASSIGNMENT */}
      {isOpenModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Initialize Drawer Shift Float</h3>
                <p className="text-[11px] text-servora-deepTeal">Assign cashier custodian & starting float</p>
              </div>
              <button onClick={() => setIsOpenModalOpen(false)} className="text-gray-400 hover:text-servora-navy cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleOpenDrawer} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Target POS Terminal *</label>
                <select
                  value={selectedDrawerId}
                  onChange={(e) => setSelectedDrawerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white font-medium"
                >
                  {drawers
                    .filter((d) => d.status === 'CLOSED')
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.drawerCode})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">
                  Assigned Cashier Custodian
                </label>
                <select
                  value={selectedCashierId}
                  onChange={(e) => setSelectedCashierId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-white font-medium"
                >
                  <option value="">Myself (Current Authenticated Session)</option>
                  {staffList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Opening Cash Float (KES) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold font-mono focus:border-servora-core focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Shift Notes / Supervisor Sign-off</label>
                <input
                  type="text"
                  placeholder="e.g. Morning shift float verified"
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsOpenModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isOpening}
                  className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isOpening ? 'Opening...' : 'Open Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CASH DROP MODAL */}
      {isDropModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Record Cash Drop to Safe</h3>
                <p className="text-[11px] text-servora-deepTeal">Reduce drawer liquidity</p>
              </div>
              <button onClick={() => setIsDropModalOpen(false)} className="text-gray-400 hover:text-servora-navy cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCashDrop} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Drop Amount (KES) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="e.g. 15000.00"
                  value={dropAmount}
                  onChange={(e) => setDropAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold font-mono focus:border-servora-core focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Drop Reason *</label>
                <input
                  type="text"
                  required
                  value={dropReason}
                  onChange={(e) => setDropReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsDropModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDropping}
                  className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isDropping ? 'Recording...' : 'Commit Cash Drop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECONCILE & CLOSE SESSION MODAL */}
      {isCloseModalOpen && closingSession && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Shift Reconciliation & Closure</h3>
                <p className="text-[11px] text-servora-deepTeal">
                  Terminal: <strong>{closingSession.drawerName}</strong> &bull; Expected: KES{' '}
                  {parseFloat(closingSession.expectedClosingBalance).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setIsCloseModalOpen(false)} className="text-gray-400 hover:text-servora-navy cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCloseSession} className="space-y-4">
              <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl space-y-2">
                <span className="text-[11px] font-bold uppercase text-servora-navy tracking-wider block">
                  Physical Currency Denominations
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { key: '1000', label: 'KES 1,000 Notes' },
                    { key: '500', label: 'KES 500 Notes' },
                    { key: '200', label: 'KES 200 Notes' },
                    { key: '100', label: 'KES 100 Notes' },
                    { key: '50', label: 'KES 50 Notes' },
                    { key: 'coins', label: 'Total Coins Value' },
                  ].map((d) => (
                    <div key={d.key} className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200">
                      <span className="font-medium text-gray-700">{d.label}</span>
                      <input
                        type="number"
                        min="0"
                        value={denoms[d.key] || ''}
                        onChange={(e) => setDenoms({ ...denoms, [d.key]: parseInt(e.target.value, 10) || 0 })}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-right font-mono font-bold"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Variance Calculation Box */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Starting Float + Live Sales - Drops:</span>
                  <span className="font-mono font-bold">
                    KES {parseFloat(closingSession.expectedClosingBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Actual Counted Total:</span>
                  <span className="font-mono font-bold text-servora-core">
                    KES {calculatedPhysicalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between border-t border-blue-200 pt-1 font-bold">
                  <span>Shift Variance:</span>
                  <span
                    className={
                      calculatedPhysicalTotal - parseFloat(closingSession.expectedClosingBalance) >= 0
                        ? 'text-emerald-700'
                        : 'text-rose-600'
                    }
                  >
                    KES {(calculatedPhysicalTotal - parseFloat(closingSession.expectedClosingBalance)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Supervisor Sign-off Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Shortage explained by loose change rounding"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCloseModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isClosing}
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Calculator size={14} />
                  {isClosing ? 'Reconciling...' : 'Confirm Reconciliation & Close'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}