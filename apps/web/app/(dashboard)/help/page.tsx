'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  HelpCircle,
  LifeBuoy,
  BookOpen,
  MessageSquare,
  Search,
  Plus,
  RefreshCw,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Send,
  Download,
  ExternalLink,
  Laptop,
  Flame,
  Wallet,
  Receipt,
  FileText,
  Activity,
  Layers,
  X,
  Server,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface TelemetryData {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  criticalIncidents: number;
  resolutionRatePercent: number;
  knowledgeArticlesCount: number;
}

interface SupportTicket {
  id: number;
  ticketNumber: string;
  subject: string;
  category: 'HARDWARE' | 'BILLING' | 'POS_KDS' | 'INVENTORY' | 'AUTH_SECURITY' | 'GENERAL';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_USER' | 'RESOLVED' | 'CLOSED';
  description: string;
  branchName: string | null;
  branchCode: string | null;
  creatorName: string | null;
  assignedAgent: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TicketMessage {
  id: number;
  senderName: string;
  isStaffReply: boolean;
  message: string;
  createdAt: string;
}

interface TicketDetail extends SupportTicket {
  diagnosticsPayload: any;
  messages: TicketMessage[];
}

interface KbArticleSummary {
  id: number;
  slug: string;
  title: string;
  category: string;
  summary: string;
  readTimeMinutes: number;
  viewCount: number;
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  POS_KDS: Flame,
  HARDWARE: Laptop,
  BILLING: Wallet,
  FISCAL_ETIMS: Receipt,
  GETTING_STARTED: BookOpen,
  AUTH_SECURITY: ShieldCheck,
  GENERAL: HelpCircle,
};

export default function HelpCenterPage() {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [kbArticles, setKbArticles] = useState<KbArticleSummary[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [activeTab, setActiveTab] = useState<'GUIDES' | 'TICKETS' | 'DIAGNOSTICS'>('GUIDES');

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New Ticket Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    branchId: '',
    subject: '',
    category: 'POS_KDS' as SupportTicket['category'],
    priority: 'MEDIUM' as SupportTicket['priority'],
    description: '',
  });

  // Client Diagnostic Snapshot
  const clientDiagnostics = useMemo(() => {
    if (typeof window === 'undefined') return {};
    return {
      userAgent: window.navigator.userAgent,
      language: window.navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      onlineStatus: window.navigator.onLine ? 'ONLINE' : 'OFFLINE',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp: new Date().toISOString(),
    };
  }, []);

  const loadOverview = async () => {
    try {
      setIsLoading(true);
      const [overviewRes, branchRes, ticketRes] = await Promise.all([
        fetchApi('/api/v1/help'),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
        fetchApi('/api/v1/help/tickets').catch(() => ({ data: [] })),
      ]);

      if (overviewRes?.data) {
        setTelemetry(overviewRes.data.telemetry || null);
        setKbArticles(overviewRes.data.kbArticles || []);
      }
      if (branchRes?.data && Array.isArray(branchRes.data)) {
        setBranches(branchRes.data);
      }
      if (ticketRes?.data && Array.isArray(ticketRes.data)) {
        setTickets(ticketRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load help center overview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return kbArticles;
    const q = searchQuery.toLowerCase();
    return kbArticles.filter(
      (a) => a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
    );
  }, [kbArticles, searchQuery]);

  const filteredTickets = useMemo(() => {
    if (!searchQuery.trim()) return tickets;
    const q = searchQuery.toLowerCase();
    return tickets.filter(
      (t) => t.ticketNumber.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    );
  }, [tickets, searchQuery]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmittingTicket(true);
      const res = await fetchApi('/api/v1/help/tickets', {
        method: 'POST',
        body: JSON.stringify({
          ...ticketForm,
          branchId: ticketForm.branchId ? parseInt(ticketForm.branchId, 10) : null,
          diagnosticsPayload: clientDiagnostics,
        }),
      });

      setIsCreateModalOpen(false);
      setToastMessage({ text: res.message || 'Support incident created.', type: 'success' });
      setTicketForm({
        branchId: '',
        subject: '',
        category: 'POS_KDS',
        priority: 'MEDIUM',
        description: '',
      });
      loadOverview();
    } catch (err: any) {
      alert(err.message || 'Failed to submit incident');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const handleOpenTicketThread = async (ticketId: number) => {
    try {
      const res = await fetchApi(`/api/v1/help/tickets/${ticketId}`);
      if (res?.data) {
        setSelectedTicket(res.data);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to fetch ticket messages');
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;
    try {
      setIsSubmittingReply(true);
      await fetchApi(`/api/v1/help/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: replyMessage }),
      });
      setReplyMessage('');
      handleOpenTicketThread(selectedTicket.id);
      loadOverview();
    } catch (err: any) {
      alert(err.message || 'Failed to send reply');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleExportDiagnostics = () => {
    const payload = JSON.stringify(
      {
        telemetry,
        clientDiagnostics,
        branchesCount: branches.length,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. EXECUTIVE COMMAND HEADER & SEARCH */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/dashboard"
                className="text-xs font-semibold text-servora-deepTeal hover:text-servora-core flex items-center gap-1 transition-colors"
              >
                Enterprise Control <ChevronRight size={12} />
              </Link>
              <span className="text-xs font-bold text-servora-navy">Support Center</span>
            </div>
            <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
              <LifeBuoy className="text-servora-core" size={22} />
              Enterprise Help & Incident Resolution Hub
            </h1>
            <p className="text-xs text-servora-deepTeal mt-0.5">
              Access operational documentation, track escalation tickets with SLAs, and generate client hardware diagnostic bundles.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} /> Open Support Ticket
            </button>
            <button
              onClick={loadOverview}
              title="Refresh Help Desk"
              className="p-2 bg-slate-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-servora-navy transition-colors cursor-pointer"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
            </button>
          </div>
        </div>

        {/* Universal Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search knowledge guides, operational manuals, ticket IDs, or error codes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core"
          />
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
          <CheckCircle2 size={16} />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 2. SUPPORT SLA & HEALTH TELEMETRY RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">System Platform</span>
            <p className="text-base font-bold font-mono text-emerald-700 mt-0.5 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Operational
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Server size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Active Incidents</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              {(telemetry?.openTickets || 0) + (telemetry?.inProgressTickets || 0)}
            </p>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <MessageSquare size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Critical Alerts</span>
            <p className="text-xl font-bold font-mono text-rose-600 mt-0.5">
              {telemetry ? telemetry.criticalIncidents : 0}
            </p>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Resolution Rate</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">
              {telemetry ? `${telemetry.resolutionRatePercent}%` : '100%'}
            </p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <ShieldCheck size={18} />
          </div>
        </div>
      </div>

      {/* 3. PERSPECTIVE NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('GUIDES')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'GUIDES'
              ? 'bg-servora-navy text-white shadow-xs'
              : 'bg-white border border-gray-200 text-servora-navy hover:bg-gray-50'
          }`}
        >
          <BookOpen size={14} />
          <span>Knowledge Base & Manuals ({filteredArticles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('TICKETS')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'TICKETS'
              ? 'bg-servora-navy text-white shadow-xs'
              : 'bg-white border border-gray-200 text-servora-navy hover:bg-gray-50'
          }`}
        >
          <MessageSquare size={14} />
          <span>Support Tickets ({filteredTickets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('DIAGNOSTICS')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'DIAGNOSTICS'
              ? 'bg-servora-navy text-white shadow-xs'
              : 'bg-white border border-gray-200 text-servora-navy hover:bg-gray-50'
          }`}
        >
          <Activity size={14} />
          <span>System Environment Diagnostics</span>
        </button>
      </div>

      {/* 4. TAB 1: KNOWLEDGE BASE GUIDES */}
      {activeTab === 'GUIDES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArticles.length === 0 ? (
            <div className="col-span-full p-8 bg-white rounded-2xl border border-dashed border-gray-300 text-center text-xs text-gray-400 italic">
              No documentation articles found matching your search.
            </div>
          ) : (
            filteredArticles.map((article) => {
              const Icon = CATEGORY_ICONS[article.category] || BookOpen;
              return (
                <div
                  key={article.id}
                  className="p-5 rounded-2xl border border-gray-200 bg-white shadow-xs flex flex-col justify-between space-y-3 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => alert(`Opening manual: ${article.title}`)}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-servora-core flex items-center justify-center shrink-0">
                        <Icon size={16} />
                      </div>
                      <span className="text-[10px] font-mono text-gray-400">{article.readTimeMinutes} min read</span>
                    </div>

                    <h3 className="font-bold text-servora-navy text-sm leading-snug">{article.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{article.summary}</p>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-servora-core font-bold">
                    <span>Read Guide</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 5. TAB 2: SUPPORT TICKETS & THREAD VIEWER */}
      {activeTab === 'TICKETS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Ticket List (Left 7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
              <span className="font-bold text-xs text-servora-navy uppercase tracking-wider">
                Support Incidents
              </span>
              <span className="text-xs text-gray-400">{filteredTickets.length} Total</span>
            </div>

            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {filteredTickets.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400 italic">
                  No support incidents found. Open a new ticket if you require technical escalation.
                </div>
              ) : (
                filteredTickets.map((ticket) => {
                  const isSelected = selectedTicket?.id === ticket.id;
                  return (
                    <div
                      key={ticket.id}
                      onClick={() => handleOpenTicketThread(ticket.id)}
                      className={`p-4 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/60 border-l-4 border-servora-core' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-servora-core bg-blue-50 px-1.5 py-0.2 rounded">
                            {ticket.ticketNumber}
                          </span>
                          <span className="font-bold text-xs text-servora-navy leading-tight">{ticket.subject}</span>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase font-mono ${
                            ticket.priority === 'CRITICAL'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : ticket.priority === 'HIGH'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-gray-600'
                          }`}
                        >
                          {ticket.priority}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 line-clamp-1 mb-2">{ticket.description}</p>

                      <div className="flex items-center justify-between text-[10px] text-gray-400">
                        <span>Status: <strong className="text-servora-navy">{ticket.status}</strong></span>
                        <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Ticket Messages Thread (Right 5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
            {selectedTicket ? (
              <>
                <div className="border-b border-gray-100 pb-3 flex justify-between items-start">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-servora-core">
                      {selectedTicket.ticketNumber}
                    </span>
                    <h3 className="font-bold text-sm text-servora-navy leading-tight">{selectedTicket.subject}</h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Category: {selectedTicket.category} &bull; Priority: {selectedTicket.priority}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="text-gray-400 hover:text-black cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Messages Stream */}
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {selectedTicket.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-xl text-xs space-y-1 ${
                        msg.isStaffReply
                          ? 'bg-blue-50/80 border border-blue-200 text-servora-navy ml-4'
                          : 'bg-slate-50 border border-gray-200 text-gray-800 mr-4'
                      }`}
                    >
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-bold">
                          {msg.senderName} {msg.isStaffReply ? '(Support Specialist)' : ''}
                        </span>
                        <span className="text-gray-400 font-mono">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  ))}
                </div>

                {/* Post Reply */}
                <form onSubmit={handleSendReply} className="space-y-2 pt-2 border-t border-gray-100">
                  <textarea
                    rows={3}
                    required
                    placeholder="Type a response to support specialists..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingReply}
                      className="px-3.5 py-1.5 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Send size={12} />
                      <span>{isSubmittingReply ? 'Sending...' : 'Send Reply'}</span>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="py-16 text-center text-gray-400 space-y-2 text-xs">
                <MessageSquare size={32} className="mx-auto opacity-30 text-servora-navy" />
                <p className="font-bold text-servora-navy text-sm">No Incident Selected</p>
                <p>Click any support ticket on the left to inspect conversation history or post updates.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. TAB 3: SYSTEM DIAGNOSTICS BUNDLE */}
      {activeTab === 'DIAGNOSTICS' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
          <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-servora-navy">Client Environment Diagnostics</h3>
              <p className="text-xs text-gray-400">
                Diagnostic metadata used by engineering specialists to inspect terminal rendering and network issues.
              </p>
            </div>
            <button
              onClick={handleExportDiagnostics}
              className="px-3 py-1.5 bg-slate-50 hover:bg-gray-100 border border-gray-200 text-servora-navy rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={13} /> Export JSON Bundle
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-1">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Client User Agent</span>
              <p className="break-words text-servora-navy">{clientDiagnostics.userAgent || 'Loading...'}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-1">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Display Resolution & Viewport</span>
              <p className="text-servora-navy">
                Screen: {clientDiagnostics.screenResolution} &bull; Window: {clientDiagnostics.viewport}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-1">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">WAN Network Status</span>
              <p className="text-emerald-700 font-bold">{clientDiagnostics.onlineStatus}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-gray-200 space-y-1">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">System Timezone</span>
              <p className="text-servora-navy">{clientDiagnostics.timezone}</p>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: OPEN SUPPORT TICKET */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Open Enterprise Support Ticket</h3>
                <p className="text-[11px] text-gray-400">Escalate incidents directly to the technical operations team</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Issue Category *</label>
                  <select
                    value={ticketForm.category}
                    onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="POS_KDS">POS & Kitchen Display System</option>
                    <option value="HARDWARE">Hardware & Thermal Printers</option>
                    <option value="BILLING">Billing & License Seats</option>
                    <option value="AUTH_SECURITY">Authentication & Security</option>
                    <option value="INVENTORY">Inventory & Catalog Discrepancies</option>
                    <option value="GENERAL">General Operational Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Severity / Priority *</label>
                  <select
                    value={ticketForm.priority}
                    onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="LOW">Low (General Query)</option>
                    <option value="MEDIUM">Medium (Minor Issue)</option>
                    <option value="HIGH">High (Impacts Service)</option>
                    <option value="CRITICAL">Critical (POS/Kitchen Down)</option>
                  </select>
                </div>
              </div>

              {branches.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Affected Location</label>
                  <select
                    value={ticketForm.branchId}
                    onChange={(e) => setTicketForm({ ...ticketForm, branchId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core cursor-pointer"
                  >
                    <option value="">Global / Workspace Wide</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="Summary of incident"
                  value={ticketForm.subject}
                  onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Detailed Description *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe what occurred, steps to reproduce, and any observable error notices..."
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core text-xs"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTicket}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingTicket ? 'Submitting...' : 'Dispatch Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}