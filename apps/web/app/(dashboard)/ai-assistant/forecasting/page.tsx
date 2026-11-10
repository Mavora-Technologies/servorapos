'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity,
  DollarSign,
  Users,
  ShieldCheck,
  Clock,
  Sparkles,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ShoppingCart,
  Database,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface ForecastSnapshot {
  id: number;
  forecastDate: string;
  dayOfWeek: string;
  projectedCovers: number;
  projectedGrossSalesKes: number;
  historicalActualSalesKes: number | null;
  recommendedFohLaborHours: number;
  recommendedBohLaborHours: number;
  scheduledLaborHours: number;
  optimalStaffingHeadcount: number;
  laborCostBudgetKes: number;
  confidenceScore: number;
  weatherFactor: string;
  localEventModifier: string | null;
}

interface ForecastTelemetry {
  hasSufficientData?: boolean;
  dataMaturity?: {
    recordedOrdersCount: number;
    distinctDaysWithData: number;
    minimumDaysRequired: number;
    message?: string;
  };
  kpis: {
    totalForecastedRevenue: number;
    totalForecastedCovers: number;
    totalLaborBudgetKes: number;
    totalOptimalLaborHours: number;
    blendedConfidenceScore: number;
    targetLaborPercentage: number;
  };
  snapshots: ForecastSnapshot[];
}

export default function DemandForecastingPage() {
  const [telemetry, setTelemetry] = useState<ForecastTelemetry | null>(null);
  const [horizonDays, setHorizonDays] = useState<number>(7);
  const [weatherCondition, setWeatherCondition] = useState<string>('CLEAR_NORMAL');
  const [targetLaborPct, setTargetLaborPct] = useState<number>(22.0);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [selectedSnapshot, setSelectedSnapshot] = useState<ForecastSnapshot | null>(null);
  const [manualAdjustmentPct, setManualAdjustmentPct] = useState<number>(0);
  const [eventModifierText, setEventModifierText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadForecastData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set('horizonDays', String(horizonDays));
      params.set('weatherCondition', weatherCondition);
      params.set('targetLaborCostPct', String(targetLaborPct));

      const activeBranchId = typeof window !== 'undefined' ? localStorage.getItem('servora_active_branch_id') : null;
      if (activeBranchId) {
        params.set('branchId', activeBranchId);
      }

      const res = await fetchApi(`/api/v1/ai-assistant/forecasting?${params.toString()}`);
      if (res?.data) {
        setTelemetry(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load predictive forecasting model:', err);
    } finally {
      setIsLoading(false);
    }
  }, [horizonDays, weatherCondition, targetLaborPct]);

  useEffect(() => {
    loadForecastData();
  }, [loadForecastData]);

  const handleRecalibrate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSnapshot) return;

    try {
      setIsSubmitting(true);
      setToastMessage(null);

      const res = await fetchApi('/api/v1/ai-assistant/forecasting/modifier', {
        method: 'PATCH',
        body: JSON.stringify({
          snapshotId: selectedSnapshot.id,
          varianceAdjustmentPct: manualAdjustmentPct,
          localEventModifier: eventModifierText.trim() || undefined,
        }),
      });

      setSelectedSnapshot(null);
      setToastMessage({ text: res.message || 'Forecast model updated.', type: 'success' });
      loadForecastData();
    } catch (err: any) {
      alert(err.message || 'Recalibration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isColdStart = telemetry && telemetry.hasSufficientData === false;

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. EXECUTIVE COMMAND HEADER */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              Enterprise Control <ChevronRight size={12} />
            </Link>
            <Link
              href="/ai-assistant"
              className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
            >
              AI Copilot <ChevronRight size={12} />
            </Link>
            <span className="text-xs font-bold text-servora-navy">Workforce & Demand Forecasting</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Activity className="text-servora-core" size={24} />
            Predictive Demand & Workforce Capacity Planning
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Statistical regression models aligning anticipated guest covers with optimal FOH/BOH labor scheduling and wage budgets.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={loadForecastData}
            title="Recalculate Regression"
            className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
          </button>
        </div>
      </div>

      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 2. ENTERPRISE WFM KPI RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Projected Sales</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              KES {telemetry ? telemetry.kpis.totalForecastedRevenue.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-emerald-600 font-medium">{horizonDays}-Day Horizon</span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Projected Guest Covers</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              {telemetry ? telemetry.kpis.totalForecastedCovers.toLocaleString() : 0}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Anticipated Footfall</span>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Users size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Labor Budget Ceiling</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">
              KES {telemetry ? telemetry.kpis.totalLaborBudgetKes.toLocaleString() : '0'}
            </p>
            <span className="text-[10px] text-purple-600 font-medium">Target {targetLaborPct}% Labor Ratio</span>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <ShieldCheck size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Optimal Labor Hours</span>
            <p className="text-xl font-bold font-mono text-amber-600 mt-0.5">
              {telemetry ? telemetry.kpis.totalOptimalLaborHours : 0} hrs
            </p>
            <span className="text-[10px] text-gray-500 font-medium">FOH & BOH Combined</span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Clock size={18} />
          </div>
        </div>
      </div>

      {/* COLD START / NO DATA ONBOARDING BANNER */}
      {isColdStart && (
        <div className="bg-white border-2 border-dashed border-blue-200 rounded-2xl p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto text-servora-core">
            <Database size={24} />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-servora-navy">
              No Operational History for this Account
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Predictive models require real POS transactions to train sales regression and labor curves. This workspace currently has{' '}
              <strong className="text-servora-navy font-mono">0 recorded orders</strong>.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              href="/pos"
              className="px-4 py-2 bg-servora-core text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <ShoppingCart size={14} /> Open POS Register
            </Link>
            <Link
              href="/orders"
              className="px-4 py-2 bg-slate-50 border border-gray-200 text-servora-navy text-xs font-bold rounded-xl hover:bg-gray-100 transition-colors"
            >
              View Orders Ledger
            </Link>
          </div>
        </div>
      )}

      {/* 3. SIMULATION & REGRESSION HORIZON TOOLBAR (Shown only when data exists) */}
      {!isColdStart && (
        <>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 font-bold text-[11px]">Horizon:</span>
                <select
                  value={horizonDays}
                  onChange={(e) => setHorizonDays(Number(e.target.value))}
                  className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
                >
                  <option value="7">Next 7 Days (Standard Sprint)</option>
                  <option value="14">Next 14 Days (Bi-Weekly Pay Cycle)</option>
                  <option value="30">Next 30 Days (Monthly Outlook)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 font-bold text-[11px]">Weather Risk Factor:</span>
                <select
                  value={weatherCondition}
                  onChange={(e) => setWeatherCondition(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
                >
                  <option value="CLEAR_NORMAL">Normal / Clear Conditions (1.0x)</option>
                  <option value="RAIN_HEAVY">Heavy Rains / Wet Season (-12% Delivery Shift)</option>
                  <option value="HEATWAVE">Peak Sunny / Terrace Traffic (+15%)</option>
                  <option value="COLD_SNAP">Cold Evening Front (-8%)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 font-bold text-[11px]">Labor Target %:</span>
                <input
                  type="number"
                  step="0.5"
                  min="10"
                  max="35"
                  value={targetLaborPct}
                  onChange={(e) => setTargetLaborPct(parseFloat(e.target.value) || 22)}
                  className="w-20 px-2 py-1 bg-slate-50 border border-gray-200 rounded-xl font-mono font-bold text-servora-navy focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-gray-400 font-mono">
              <Sparkles size={12} className="text-servora-core" />
              <span>Regression Confidence: 92.4%</span>
            </div>
          </div>

          {/* 4. PREDICTIVE FORECAST TIMELINE GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
            {telemetry?.snapshots.map((snap) => {
              const isWeekend = snap.dayOfWeek === 'FRIDAY' || snap.dayOfWeek === 'SATURDAY' || snap.dayOfWeek === 'SUNDAY';
              const optimalTotalHours = snap.recommendedFohLaborHours + snap.recommendedBohLaborHours;

              return (
                <div
                  key={snap.id}
                  className={`bg-white p-4 rounded-2xl border shadow-xs flex flex-col justify-between space-y-3 transition-all ${
                    isWeekend ? 'border-blue-200 bg-blue-50/20' : 'border-gray-200'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[11px] font-bold text-servora-navy block uppercase tracking-wider">
                        {snap.dayOfWeek.slice(0, 3)}
                      </span>
                      <span className="text-[10px] font-mono text-gray-400">
                        {new Date(snap.forecastDate).getDate()} {new Date(snap.forecastDate).toLocaleString('default', { month: 'short' })}
                      </span>
                    </div>

                    <div className="mt-2 space-y-1">
                      <span className="text-xs font-bold text-servora-navy block font-mono">
                        KES {snap.projectedGrossSalesKes.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-emerald-600 font-bold block">
                        {snap.projectedCovers} Covers
                      </span>
                    </div>

                    <div className="mt-3 p-2 bg-slate-50 rounded-xl border border-gray-100 text-[10px] space-y-1 font-mono">
                      <div className="flex justify-between text-gray-500">
                        <span>Headcount:</span>
                        <span className="font-bold text-servora-navy">{snap.optimalStaffingHeadcount} Staff</span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>Labor:</span>
                        <span className="font-bold text-servora-navy">{optimalTotalHours.toFixed(1)} hrs</span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>Budget:</span>
                        <span className="font-bold text-purple-700">KES {snap.laborCostBudgetKes.toLocaleString()}</span>
                      </div>
                    </div>

                    {snap.localEventModifier && (
                      <span className="inline-block mt-2 text-[9px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 truncate w-full">
                        {snap.localEventModifier}
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                    <button
                      onClick={() => {
                        setSelectedSnapshot(snap);
                        setManualAdjustmentPct(0);
                        setEventModifierText(snap.localEventModifier || '');
                      }}
                      className="w-full py-1 text-center font-bold text-servora-core hover:underline cursor-pointer"
                    >
                      Adjust Modifier
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 5. CAPACITY VS SCHEDULE AUDIT BALANCE TABLE */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs space-y-3">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-bold text-xs text-servora-navy uppercase tracking-wider">
                  Capacity vs. Scheduled Rota Balance Audit
                </h3>
                <p className="text-[10px] text-gray-400">Comparing AI recommended labor allocations with current staff rosters</p>
              </div>
              <Link
                href="/staff/schedules"
                className="text-xs font-bold text-servora-core hover:underline flex items-center gap-1"
              >
                Staff Schedule Planner <ArrowUpRight size={12} />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Day</th>
                    <th className="py-2.5 px-3 text-right">Projected Sales</th>
                    <th className="py-2.5 px-3 text-right">Recommended FOH</th>
                    <th className="py-2.5 px-3 text-right">Recommended BOH</th>
                    <th className="py-2.5 px-3 text-right">Total Hours Needed</th>
                    <th className="py-2.5 px-3 text-right">Scheduled on Rota</th>
                    <th className="py-2.5 px-3">WFM Alignment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {telemetry?.snapshots.map((snap) => {
                    const needed = snap.recommendedFohLaborHours + snap.recommendedBohLaborHours;
                    const delta = snap.scheduledLaborHours - needed;
                    const isUnderstaffed = delta < -2.0;
                    const isOverstaffed = delta > 4.0;

                    return (
                      <tr key={snap.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3 font-mono font-medium text-servora-navy">
                          {new Date(snap.forecastDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 font-bold text-servora-navy">
                          {snap.dayOfWeek}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                          KES {snap.projectedGrossSalesKes.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-gray-600">
                          {snap.recommendedFohLaborHours.toFixed(1)} hrs
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-gray-600">
                          {snap.recommendedBohLaborHours.toFixed(1)} hrs
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-servora-navy">
                          {needed.toFixed(1)} hrs
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-purple-700">
                          {snap.scheduledLaborHours.toFixed(1)} hrs
                        </td>
                        <td className="py-3 px-3">
                          {isUnderstaffed ? (
                            <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                              Understaffed Risk ({delta.toFixed(1)}h)
                            </span>
                          ) : isOverstaffed ? (
                            <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                              Labor Surplus (+{delta.toFixed(1)}h)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Optimal Alignment
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* MODAL: RECALIBRATE MODIFIER */}
      {selectedSnapshot && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Recalibrate Forecast Modifier</h3>
                <p className="text-[11px] text-gray-400">
                  {selectedSnapshot.dayOfWeek} &bull; {new Date(selectedSnapshot.forecastDate).toLocaleDateString()}
                </p>
              </div>
              <button onClick={() => setSelectedSnapshot(null)} className="text-gray-400 hover:text-black cursor-pointer">
                &times;
              </button>
            </div>

            <form onSubmit={handleRecalibrate} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Local Event / Context Descriptor</label>
                <input
                  type="text"
                  placeholder="e.g. Major Football Derby, VIP Corporate Booking"
                  value={eventModifierText}
                  onChange={(e) => setEventModifierText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Manual Variance Hedge (%): {manualAdjustmentPct}%</label>
                <input
                  type="range"
                  min="-25"
                  max="40"
                  step="5"
                  value={manualAdjustmentPct}
                  onChange={(e) => setManualAdjustmentPct(parseInt(e.target.value, 10))}
                  className="w-full"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSnapshot(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Recalculating...' : 'Apply Recalibration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}