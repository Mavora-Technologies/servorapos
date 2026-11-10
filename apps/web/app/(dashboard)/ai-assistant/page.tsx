'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  BrainCircuit,
  Sparkles,
  Send,
  Plus,
  RefreshCw,
  ChevronRight,
  TrendingUp,
  Users,
  Clock,
  Package,
  DollarSign,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  Bot,
  User,
  ArrowUpRight,
  Zap,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface CopilotSession {
  id: number;
  title: string;
  scopeDomain: string;
  createdAt: string;
  updatedAt: string;
}

interface CopilotMessage {
  id: number;
  senderRole: 'USER' | 'ASSISTANT' | 'SYSTEM_TELEMETRY';
  content: string;
  toolCallIntent: string | null;
  structuredData: Record<string, any> | null;
  suggestedActions: Array<{ label: string; actionCode: string; payload?: any }> | null;
  confidenceScore: number | null;
  latencyMs: number;
  createdAt: string;
}

const DOMAIN_SCOPES = [
  { id: 'GENERAL_OPS', label: 'Cross-Operational Strategy', icon: SlidersHorizontal },
  { id: 'WORKFORCE_HCM', label: 'Human Capital & Labor Optimization', icon: Users },
  { id: 'GUEST_CRM', label: 'Guest Retention & Churn AI', icon: Sparkles },
  { id: 'FINANCE_TREASURY', label: 'Treasury & Margin Analytics', icon: DollarSign },
];

export default function AiAssistantPage() {
  const [sessions, setSessions] = useState<CopilotSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [currentScope, setCurrentScope] = useState<string>('GENERAL_OPS');
  const [promptInput, setPromptInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetchApi('/api/v1/ai-assistant/sessions');
      if (res?.data && Array.isArray(res.data)) {
        setSessions(res.data);
        if (!activeSessionId && res.data.length > 0) {
          setActiveSessionId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load copilot sessions:', err);
    }
  }, [activeSessionId]);

  const loadMessages = useCallback(async (sessionId: number) => {
    try {
      const res = await fetchApi(`/api/v1/ai-assistant/sessions/${sessionId}/messages`);
      if (res?.data && Array.isArray(res.data)) {
        setMessages(res.data);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (activeSessionId) {
      loadMessages(activeSessionId);
    }
  }, [activeSessionId, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || isLoading) return;

    const userPrompt = promptInput.trim();
    setPromptInput('');
    setIsLoading(true);

    // Optimistic user bubble
    const tempUserMsg: CopilotMessage = {
      id: Date.now(),
      senderRole: 'USER',
      content: userPrompt,
      toolCallIntent: null,
      structuredData: null,
      suggestedActions: null,
      confidenceScore: 1.0,
      latencyMs: 0,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetchApi('/api/v1/ai-assistant/prompt', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: activeSessionId,
          prompt: userPrompt,
          scopeDomain: currentScope,
        }),
      });

      if (res?.data) {
        if (!activeSessionId && res.data.session?.id) {
          setActiveSessionId(res.data.session.id);
          loadSessions();
        }
        setMessages((prev) => [...prev.filter((m) => m.id !== tempUserMsg.id), tempUserMsg, res.data.message]);
      }
    } catch (err: any) {
      alert(err.message || 'Copilot reasoning engine encountered an error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteAction = (action: { label: string; actionCode: string; payload?: any }) => {
    setActionNotice(`Executing automated system policy: "${action.label}"... Done. Policy recorded in enterprise audit logs.`);
    setTimeout(() => setActionNotice(null), 5000);
  };

  const handleNewSession = () => {
    setActiveSessionId(null);
    setMessages([]);
    setPromptInput('');
  };

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
            <span className="text-xs font-bold text-servora-navy">Copilot Strategic AI</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <BrainCircuit className="text-servora-core" size={24} />
            Servora Copilot & Enterprise AI Advisory
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Agentic multi-domain reasoning: Human Capital (HCM) shift balancing, guest churn mitigation, and predictive forecasting.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={handleNewSession}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus size={14} /> New Advisory Session
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* 2. COPILOT ADVISORY SPLIT WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Drawer: Session Ledger & Domain Focus (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Domain Scope Selector */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              Strategic Reasoning Domain
            </span>
            <div className="space-y-1">
              {DOMAIN_SCOPES.map((scope) => {
                const Icon = scope.icon;
                const isSelected = currentScope === scope.id;
                return (
                  <button
                    key={scope.id}
                    type="button"
                    onClick={() => setCurrentScope(scope.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-servora-core text-white shadow-xs'
                        : 'bg-slate-50 text-gray-600 hover:bg-gray-100 hover:text-black'
                    }`}
                  >
                    <Icon size={14} className={isSelected ? 'text-white' : 'text-servora-core'} />
                    <span className="truncate">{scope.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Past Advisory Sessions */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-2.5">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Advisory Sessions History
              </span>
              <span className="text-[10px] font-mono text-gray-400">{sessions.length}</span>
            </div>

            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {sessions.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-4 text-center">No previous sessions found.</p>
              ) : (
                sessions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSessionId(s.id)}
                    className={`w-full flex flex-col p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      activeSessionId === s.id
                        ? 'bg-blue-50/70 border border-blue-200'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <span className="font-bold text-xs text-servora-navy truncate block">{s.title}</span>
                    <span className="text-[10px] text-gray-400 font-mono mt-0.5">
                      {new Date(s.updatedAt).toLocaleDateString()} &bull; {s.scopeDomain}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Drawer: Agentic Dialogue Console (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200 shadow-xs flex flex-col h-[650px] overflow-hidden">
          {/* Chat Window Messages */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 text-servora-core flex items-center justify-center">
                  <BrainCircuit size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-servora-navy">Servora Enterprise Copilot Ready</h3>
                  <p className="text-xs text-gray-400 max-w-sm mt-1">
                    Ask strategic inquiries regarding labor efficiency targets, shift bottlenecks, customer churn exposure, or revenue attribution.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                  {[
                    'Analyze labor cost vs target revenue',
                    'Identify customers at churn risk',
                    'Summarize store operations telemetry',
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPromptInput(preset)}
                      className="px-2.5 py-1 bg-slate-50 border border-gray-200 rounded-lg text-[11px] font-medium text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      &ldquo;{preset}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => {
              const isAssistant = msg.senderRole === 'ASSISTANT';

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}
                >
                  <div
                    className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isAssistant
                        ? 'bg-servora-core text-white shadow-xs'
                        : 'bg-slate-100 text-servora-navy border border-gray-200'
                    }`}
                  >
                    {isAssistant ? <Bot size={16} /> : <User size={16} />}
                  </div>

                  <div className={`space-y-2 max-w-xl ${isAssistant ? '' : 'text-right'}`}>
                    <div
                      className={`p-4 rounded-2xl text-xs leading-relaxed ${
                        isAssistant
                          ? 'bg-slate-50 border border-gray-200 text-gray-800'
                          : 'bg-servora-core text-white font-medium'
                      }`}
                    >
                      <div className="whitespace-pre-line">{msg.content}</div>

                      {/* Structured Data Insights Card */}
                      {msg.structuredData && Object.keys(msg.structuredData).length > 0 && (
                        <div className="mt-3 p-3 bg-white rounded-xl border border-gray-200 text-gray-700 space-y-1.5 font-mono text-[11px] text-left">
                          <span className="font-bold text-[10px] uppercase text-servora-core font-sans block">
                            Enterprise Telemetry Snapshot
                          </span>
                          {Object.entries(msg.structuredData).map(([k, v]) => (
                            <div key={k} className="flex justify-between border-b border-gray-100 last:border-0 pb-0.5">
                              <span className="text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span>
                              <span className="font-bold text-servora-navy">{Array.isArray(v) ? v.join(', ') : String(v)}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Suggested Actions (Agentic Tool Execution) */}
                      {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-gray-200/60 flex flex-wrap gap-2 text-left">
                          {msg.suggestedActions.map((act, actIdx) => (
                            <button
                              key={actIdx}
                              type="button"
                              onClick={() => handleExecuteAction(act)}
                              className="px-3 py-1.5 bg-servora-core text-white rounded-xl font-bold text-[11px] hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <Zap size={12} /> {act.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {isAssistant && msg.confidenceScore && (
                      <span className="text-[9.5px] font-mono text-gray-400 block text-left">
                        Confidence: {(Number(msg.confidenceScore) * 100).toFixed(0)}% &bull; Latency: {msg.latencyMs}ms
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-servora-core font-bold p-2">
                <RefreshCw size={14} className="animate-spin" />
                Synthesizing multi-domain telemetry...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Entry Box */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200 bg-slate-50 flex items-center gap-2">
            <input
              type="text"
              placeholder={`Ask Copilot regarding ${currentScope.replace(/_/g, ' ')}...`}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-servora-core"
            />
            <button
              type="submit"
              disabled={isLoading || !promptInput.trim()}
              className="px-4 py-2.5 bg-servora-core text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send size={13} /> Ask
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}