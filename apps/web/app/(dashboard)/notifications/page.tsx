'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  ShieldAlert, 
  Check, 
  RefreshCw, 
  ExternalLink, 
  Filter, 
  Layers,
  ChevronRight,
  Clock
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface NotificationRecord {
  id: number;
  title: string;
  detail: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
  module: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
}

type SeverityFilter = 'ALL' | 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityFilter>('ALL');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const res = await fetchApi('/api/v1/notifications');
      if (res?.data?.notifications) {
        setNotifications(res.data.notifications);
      }
    } catch (err) {
      console.error('Failed to load notifications stream:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await fetchApi(`/api/v1/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err: any) {
      alert(err.message || 'Failed to acknowledge alert');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetchApi('/api/v1/notifications/read-all', { method: 'PATCH' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err: any) {
      alert(err.message || 'Failed to batch acknowledge alerts');
    }
  };

  const metrics = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter(n => !n.isRead).length;
    const critical = notifications.filter(n => n.severity === 'CRITICAL' && !n.isRead).length;
    const warnings = notifications.filter(n => n.severity === 'WARNING' && !n.isRead).length;
    return { total, unread, critical, warnings };
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      const matchesSeverity = selectedSeverity === 'ALL' || n.severity === selectedSeverity;
      const matchesRead = !showUnreadOnly || !n.isRead;
      return matchesSeverity && matchesRead;
    });
  }, [notifications, selectedSeverity, showUnreadOnly]);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md font-bold text-[10px] uppercase flex items-center gap-1"><ShieldAlert size={11} /> Critical</span>;
      case 'WARNING':
        return <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md font-bold text-[10px] uppercase flex items-center gap-1"><AlertTriangle size={11} /> Warning</span>;
      case 'SUCCESS':
        return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-bold text-[10px] uppercase flex items-center gap-1"><CheckCircle2 size={11} /> Success</span>;
      default:
        return <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-bold text-[10px] uppercase flex items-center gap-1"><Info size={11} /> Info</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner Navigation */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-gray-400">Enterprise Event Bus & Escalation</span>
            <ChevronRight size={12} className="text-gray-400" />
            <span className="text-xs font-bold text-servora-navy">System Alert Center</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Bell className="text-servora-core" size={22} /> System Notifications & Audit Feed
          </h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Monitor real-time operational alerts, inventory threshold breaches, and KDS queue bottlenecks.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={handleMarkAllAsRead}
            disabled={metrics.unread === 0}
            className="bg-servora-navy text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-40 flex items-center gap-1.5"
          >
            <Check size={14} /> Acknowledge All ({metrics.unread})
          </button>
          <button
            onClick={fetchNotifications}
            className="p-2.5 bg-white border border-gray-200 text-servora-navy rounded-xl hover:bg-gray-50 transition-colors shadow-xs"
            title="Refresh Feed"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Telemetry Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Unread Alerts</span>
            <h3 className="text-base font-bold text-servora-navy mt-0.5">{metrics.unread} Pending</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center">
            <Bell size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Critical Escalations</span>
            <h3 className="text-base font-bold text-rose-600 mt-0.5">{metrics.critical} Urgent</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ShieldAlert size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Warnings</span>
            <h3 className="text-base font-bold text-amber-600 mt-0.5">{metrics.warnings} Active</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Total Stream Log</span>
            <h3 className="text-base font-bold text-servora-navy mt-0.5">{metrics.total} Recorded</h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-gray-700 flex items-center justify-center">
            <Layers size={18} />
          </div>
        </div>
      </div>

      {/* Control Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-gray-50 border border-gray-200 rounded-xl w-full sm:w-auto overflow-x-auto">
          {(['ALL', 'CRITICAL', 'WARNING', 'INFO', 'SUCCESS'] as SeverityFilter[]).map(sev => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                selectedSeverity === sev 
                  ? 'bg-white shadow-xs text-servora-navy border border-gray-200' 
                  : 'text-gray-500 hover:text-servora-navy'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs font-bold text-servora-navy cursor-pointer">
          <input 
            type="checkbox" 
            checked={showUnreadOnly} 
            onChange={(e) => setShowUnreadOnly(e.target.checked)}
            className="rounded border-gray-300 text-servora-core focus:ring-servora-core w-4 h-4"
          />
          Show Unread Only
        </label>
      </div>

      {/* Notification Stream Feed */}
      <div className="space-y-3">
        {isLoading && notifications.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center text-xs text-servora-deepTeal animate-pulse">
            Loading notification event bus...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-400 space-y-2">
            <Bell size={42} className="mx-auto opacity-20 text-servora-navy" />
            <p className="text-sm font-bold text-servora-navy">No notification alerts found</p>
            <p className="text-xs text-gray-500">System event logs matching your filter criteria will appear here.</p>
          </div>
        ) : (
          filteredNotifications.map(n => (
            <div 
              key={n.id} 
              className={`bg-white rounded-2xl border p-5 transition-all shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                !n.isRead ? 'border-servora-core/40 bg-blue-50/20 ring-1 ring-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {getSeverityBadge(n.severity)}
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-100 text-gray-600 px-2 py-0.5 rounded-md">
                    Module: {n.module}
                  </span>
                  <span className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                    <Clock size={11} /> {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-servora-navy">{n.title}</h3>
                <p className="text-xs text-gray-600 leading-relaxed">{n.detail}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                {n.actionUrl && (
                  <Link 
                    href={n.actionUrl}
                    className="px-3 py-2 bg-slate-50 border border-gray-200 text-servora-navy text-xs font-bold rounded-xl hover:bg-gray-100 transition-colors flex items-center gap-1.5"
                  >
                    <span>Inspect</span>
                    <ExternalLink size={12} />
                  </Link>
                )}
                {!n.isRead ? (
                  <button
                    onClick={() => handleMarkAsRead(n.id)}
                    className="px-3.5 py-2 bg-servora-core text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <Check size={13} /> Acknowledge
                  </button>
                ) : (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
                    <CheckCircle2 size={13} /> Acknowledged
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}