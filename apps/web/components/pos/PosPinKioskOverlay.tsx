// apps/web/components/pos/PosPinKioskOverlay.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Lock, Delete, X, UserCheck, AlertTriangle, ShieldCheck } from 'lucide-react';
import { fetchApi } from '@/lib/api';

export interface KioskOperatorOption {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
}

export interface SwitchedOperatorSession {
  token: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    role: string;
    defaultBranchId: number;
    permissions: string[];
  };
}

interface PosPinKioskOverlayProps {
  isOpen: boolean;
  isLocked: boolean; // When true, user cannot dismiss without entering a valid PIN
  branchId: number | null;
  branchName: string;
  currentOperatorName?: string;
  operators: KioskOperatorOption[];
  onClose: () => void;
  onSwitched: (session: SwitchedOperatorSession) => void;
}

export default function PosPinKioskOverlay({
  isOpen,
  isLocked,
  branchId,
  branchName,
  currentOperatorName,
  operators,
  onClose,
  onSwitched,
}: PosPinKioskOverlayProps) {
  const [pin, setPin] = useState('');
  const [selectedOperatorId, setSelectedOperatorId] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
    }
  }, [isOpen]);

  const handleDigit = useCallback((digit: string) => {
    setError(null);
    setPin((prev) => (prev.length < 6 ? prev + digit : prev));
  }, []);

  const handleBackspace = useCallback(() => {
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!branchId || pin.length < 4 || isVerifying) return;
    setIsVerifying(true);
    setError(null);
    try {
      const res = await fetchApi('/api/v1/pos/pin-switch', {
        method: 'POST',
        body: JSON.stringify({
          branchId,
          pin,
          userId: selectedOperatorId ?? undefined,
        }),
      });

      if (res?.data?.token && res?.data?.user) {
        setPin('');
        setSelectedOperatorId(null);
        onSwitched(res.data);
      } else {
        setError('Server did not return a valid operator session.');
      }
    } catch (err: unknown) {
      setPin('');
      setError(err instanceof Error ? err.message : 'Invalid POS PIN.');
    } finally {
      setIsVerifying(false);
    }
  }, [branchId, pin, selectedOperatorId, isVerifying, onSwitched]);

  // Physical keyboard support (numpad, backspace, enter)
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter' && pin.length >= 4) {
        void handleSubmit();
      } else if (e.key === 'Escape' && !isLocked) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isLocked, pin.length, handleDigit, handleBackspace, handleSubmit, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pos-pin-kiosk-title"
      className="fixed inset-0 z-[70] bg-servora-navy/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-servora-pale text-servora-core flex items-center justify-center shrink-0">
              <Lock size={20} />
            </div>
            <div>
              <h2 id="pos-pin-kiosk-title" className="text-base font-bold text-servora-navy">
                {isLocked ? 'POS Terminal Locked' : 'Switch POS Operator'}
              </h2>
              <p className="text-[11px] text-servora-deepTeal">
                {branchName}
                {currentOperatorName ? ` • Active: ${currentOperatorName}` : ''}
              </p>
            </div>
          </div>
          {!isLocked && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cancel operator switch"
              className="p-1.5 rounded-xl text-gray-400 hover:text-servora-navy hover:bg-gray-100 cursor-pointer"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Optional Branch Staff Quick-Select Chips */}
        {operators.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              Tap Your Name (Optional) or Enter PIN Directly
            </span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              <button
                type="button"
                onClick={() => setSelectedOperatorId(null)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap border cursor-pointer ${
                  selectedOperatorId === null
                    ? 'bg-servora-navy text-white border-servora-navy'
                    : 'bg-slate-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
              >
                Any PIN
              </button>
              {operators.map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => {
                    setSelectedOperatorId(op.id);
                    setError(null);
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap border inline-flex items-center gap-1 cursor-pointer ${
                    selectedOperatorId === op.id
                      ? 'bg-servora-core text-white border-servora-core'
                      : 'bg-slate-50 text-servora-navy border-gray-200 hover:bg-servora-pale'
                  }`}
                >
                  <UserCheck size={11} />
                  <span>{op.firstName}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Masked PIN Dots */}
        <div className="bg-servora-pale border border-servora-core/15 rounded-2xl py-4 px-4 flex flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-3">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all ${
                  idx < pin.length
                    ? 'bg-servora-core scale-110'
                    : idx < 4
                      ? 'bg-gray-300'
                      : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] font-semibold text-servora-deepTeal">
            Enter 4–6 digit staff POS PIN
          </span>
        </div>

        {error && (
          <div
            role="alert"
            className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2"
          >
            <AlertTriangle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Touchscreen Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isVerifying}
              onClick={() => handleDigit(digit)}
              className="h-14 rounded-2xl bg-slate-50 hover:bg-servora-pale active:scale-95 border border-gray-200 text-lg font-mono font-bold text-servora-navy transition-all cursor-pointer"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            disabled={isVerifying}
            onClick={() => {
              setPin('');
              setError(null);
            }}
            className="h-14 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 text-xs font-bold text-gray-600 transition-all cursor-pointer"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={isVerifying}
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-slate-50 hover:bg-servora-pale active:scale-95 border border-gray-200 text-lg font-mono font-bold text-servora-navy transition-all cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            disabled={isVerifying}
            onClick={handleBackspace}
            aria-label="Backspace"
            className="h-14 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 flex items-center justify-center text-gray-700 transition-all cursor-pointer"
          >
            <Delete size={20} />
          </button>
        </div>

        {/* Unlock / Switch Submit Button */}
        <button
          type="button"
          disabled={pin.length < 4 || isVerifying || !branchId}
          onClick={handleSubmit}
          className="w-full py-3.5 rounded-2xl bg-servora-core hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
        >
          <ShieldCheck size={16} />
          <span>{isVerifying ? 'Verifying Operator PIN...' : 'Unlock & Switch Operator'}</span>
        </button>
      </div>
    </div>
  );
}