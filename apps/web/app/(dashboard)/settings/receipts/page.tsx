'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Receipt,
  Printer,
  ChevronRight,
  Plus,
  RefreshCw,
  Save,
  CheckCircle2,
  SlidersHorizontal,
  Building2,
  QrCode,
  Wifi,
  Eye,
  Star,
  Trash2,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface ReceiptTemplate {
  id: number;
  branchId: number | null;
  branchName: string | null;
  branchCode: string | null;
  name: string;
  isDefault: boolean;
  paperWidth: '80MM' | '58MM' | 'A4_INVOICE';
  fontScale: 'COMPACT' | 'NORMAL' | 'LARGE';
  headerTitle: string;
  headerSubtitle: string | null;
  showLogo: boolean;
  showBranchAddress: boolean;
  showTaxPin: boolean;
  showContactPhone: boolean;
  showContactEmail: boolean;
  showCashierName: boolean;
  showServerName: boolean;
  showTableNumber: boolean;
  showCustomerDetails: boolean;
  showOrderType: boolean;
  showItemSku: boolean;
  showItemModifiers: boolean;
  showKitchenNotes: boolean;
  showTaxSummary: boolean;
  showEtimsQrCode: boolean;
  showFiscalDeviceSerial: boolean;
  showPaymentBreakdown: boolean;
  showChangeDue: boolean;
  showTipPromptLine: boolean;
  showLoyaltyPoints: boolean;
  footerMessage: string | null;
  returnPolicy: string | null;
  wifiDetails: string | null;
}

interface BranchOption {
  id: number;
  name: string;
  code: string;
}

interface TenantContext {
  businessName: string;
  legalName?: string;
  kraPin?: string;
  phone?: string;
  currency: string;
}

export default function ReceiptSettingsPage() {
  const [templates, setTemplates] = useState<ReceiptTemplate[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [tenantContext, setTenantContext] = useState<TenantContext | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    branchId: '',
    isDefault: false,
    paperWidth: '80MM' as ReceiptTemplate['paperWidth'],
    fontScale: 'NORMAL' as ReceiptTemplate['fontScale'],
    headerTitle: '',
    headerSubtitle: '',
    showLogo: true,
    showBranchAddress: true,
    showTaxPin: true,
    showContactPhone: true,
    showContactEmail: false,
    showCashierName: true,
    showServerName: true,
    showTableNumber: true,
    showCustomerDetails: true,
    showOrderType: true,
    showItemSku: false,
    showItemModifiers: true,
    showKitchenNotes: false,
    showTaxSummary: true,
    showEtimsQrCode: true,
    showFiscalDeviceSerial: true,
    showPaymentBreakdown: true,
    showChangeDue: true,
    showTipPromptLine: false,
    showLoyaltyPoints: true,
    footerMessage: '',
    returnPolicy: '',
    wifiDetails: '',
  });

  const selectTemplate = (tpl: ReceiptTemplate) => {
    setActiveTemplateId(tpl.id);
    setFormData({
      name: tpl.name,
      branchId: tpl.branchId ? String(tpl.branchId) : '',
      isDefault: tpl.isDefault,
      paperWidth: tpl.paperWidth,
      fontScale: tpl.fontScale,
      headerTitle: tpl.headerTitle,
      headerSubtitle: tpl.headerSubtitle || '',
      showLogo: tpl.showLogo,
      showBranchAddress: tpl.showBranchAddress,
      showTaxPin: tpl.showTaxPin,
      showContactPhone: tpl.showContactPhone,
      showContactEmail: tpl.showContactEmail,
      showCashierName: tpl.showCashierName,
      showServerName: tpl.showServerName,
      showTableNumber: tpl.showTableNumber,
      showCustomerDetails: tpl.showCustomerDetails,
      showOrderType: tpl.showOrderType,
      showItemSku: tpl.showItemSku,
      showItemModifiers: tpl.showItemModifiers,
      showKitchenNotes: tpl.showKitchenNotes,
      showTaxSummary: tpl.showTaxSummary,
      showEtimsQrCode: tpl.showEtimsQrCode,
      showFiscalDeviceSerial: tpl.showFiscalDeviceSerial,
      showPaymentBreakdown: tpl.showPaymentBreakdown,
      showChangeDue: tpl.showChangeDue,
      showTipPromptLine: tpl.showTipPromptLine,
      showLoyaltyPoints: tpl.showLoyaltyPoints,
      footerMessage: tpl.footerMessage || '',
      returnPolicy: tpl.returnPolicy || '',
      wifiDetails: tpl.wifiDetails || '',
    });
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [templateRes, branchRes, authRes, finRes] = await Promise.all([
        fetchApi('/api/v1/settings/receipts'),
        fetchApi('/api/v1/branches').catch(() => ({ data: [] })),
        fetchApi('/api/v1/auth/me').catch(() => null),
        fetchApi('/api/v1/settings/financial').catch(() => null),
      ]);

      if (authRes?.data?.business) {
        setTenantContext({
          businessName: authRes.data.business.name || 'Workspace',
          legalName: authRes.data.business.legalName,
          kraPin: finRes?.data?.settings?.taxPin || authRes.data.business.kraPin,
          phone: authRes.data.business.phone,
          currency: authRes.data.business.currency || 'KES',
        });
      }

      if (templateRes?.data && Array.isArray(templateRes.data)) {
        setTemplates(templateRes.data);
        if (templateRes.data.length > 0) {
          const current =
            templateRes.data.find((t: ReceiptTemplate) => t.id === activeTemplateId) ||
            templateRes.data.find((t: ReceiptTemplate) => t.isDefault) ||
            templateRes.data[0];
          selectTemplate(current);
        } else {
          setActiveTemplateId(null);
        }
      }

      if (branchRes?.data && Array.isArray(branchRes.data)) {
        setBranches(branchRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load receipt templates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeTemplateId) return;
    setToastMessage(null);
    try {
      setIsSaving(true);
      const payload = {
        ...formData,
        branchId: formData.branchId ? parseInt(formData.branchId, 10) : null,
      };

      await fetchApi(`/api/v1/settings/receipts/${activeTemplateId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setToastMessage({ text: 'Receipt template saved and synced.', type: 'success' });
      loadData();
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Failed to save template', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await fetchApi('/api/v1/settings/receipts/set-default', {
        method: 'POST',
        body: JSON.stringify({ templateId: id }),
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to set primary template');
    }
  };

  const handleCreateNew = async () => {
    const templateName = prompt('Enter a title for the new layout:', 'Main Dining 80mm');
    if (!templateName) return;

    try {
      const res = await fetchApi('/api/v1/settings/receipts', {
        method: 'POST',
        body: JSON.stringify({
          name: templateName,
          headerTitle: tenantContext?.businessName || 'Business Workspace',
          paperWidth: '80MM',
          isDefault: templates.length === 0,
        }),
      });
      if (res?.data) {
        await loadData();
        selectTemplate(res.data);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create new template');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this receipt layout?')) return;
    try {
      await fetchApi(`/api/v1/settings/receipts/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete template');
    }
  };

  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.id === activeTemplateId) || null;
  }, [templates, activeTemplateId]);

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
            <span className="text-xs font-bold text-servora-navy">Hardware & Output Customization</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy">Receipt & Fiscal Invoice Customizer</h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Design dynamic thermal check formatting, eTIMS fiscal QR compliance, company branding, and guest check footers.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            type="button"
            onClick={handleCreateNew}
            className="px-3.5 py-2 bg-slate-50 border border-gray-200 text-servora-navy rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> New Format
          </button>
          {activeTemplate && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save size={14} />
              <span>{isSaving ? 'Saving...' : 'Save Layout'}</span>
            </button>
          )}
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

      {/* 2. TEMPLATE SELECTOR */}
      {templates.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {templates.map((tpl) => {
            const selected = tpl.id === activeTemplateId;
            return (
              <button
                key={tpl.id}
                onClick={() => selectTemplate(tpl)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  selected
                    ? 'bg-servora-navy text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-servora-navy hover:bg-gray-50'
                }`}
              >
                <Printer size={13} className={selected ? 'text-servora-teal' : 'text-gray-400'} />
                <span>{tpl.name}</span>
                {tpl.isDefault && (
                  <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[9px] uppercase font-bold">
                    Primary
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 3. MAIN WORKSPACE */}
      {templates.length === 0 ? (
        <div className="p-8 bg-white rounded-2xl border border-dashed border-gray-300 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-servora-core flex items-center justify-center mx-auto">
            <Receipt size={24} />
          </div>
          <div>
            <h3 className="font-bold text-sm text-servora-navy">No Receipt Templates Configured</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
              Create your organization&apos;s first receipt layout (e.g., 80mm Guest Dining Bill, 58mm Express Slip, or A4 Tax Invoice).
            </p>
          </div>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Design First Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Form (7 cols) */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5 text-xs">
            <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
              <span className="font-bold text-servora-navy text-sm flex items-center gap-2">
                <SlidersHorizontal size={15} className="text-servora-core" /> Layout Specification
              </span>
              <div className="flex items-center gap-3">
                {activeTemplate && !activeTemplate.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(activeTemplate.id)}
                    className="text-xs font-bold text-servora-core hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Star size={12} /> Set Primary
                  </button>
                )}
                {activeTemplate && (
                  <button
                    type="button"
                    onClick={() => handleDelete(activeTemplate.id)}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                )}
              </div>
            </div>

            {/* Core Identification */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Layout Title *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Paper Roll Width</label>
                <select
                  value={formData.paperWidth}
                  onChange={(e) => setFormData({ ...formData, paperWidth: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold font-mono focus:outline-none focus:border-servora-core cursor-pointer"
                >
                  <option value="80MM">80mm (Standard)</option>
                  <option value="58MM">58mm (Compact)</option>
                  <option value="A4_INVOICE">A4 Tax Invoice</option>
                </select>
              </div>
            </div>

            {/* Header Branding */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-3">
              <span className="font-bold text-servora-navy block text-xs">Header Identity & Branding</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Business Header Title *</label>
                  <input
                    type="text"
                    value={formData.headerTitle}
                    onChange={(e) => setFormData({ ...formData, headerTitle: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-1">Header Subtitle</label>
                  <input
                    type="text"
                    placeholder="e.g. Fine Dining & Lounge"
                    value={formData.headerSubtitle}
                    onChange={(e) => setFormData({ ...formData, headerSubtitle: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showLogo}
                    onChange={(e) => setFormData({ ...formData, showLogo: e.target.checked })}
                    className="rounded"
                  />
                  <span>Print Logo Graphic</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showTaxPin}
                    onChange={(e) => setFormData({ ...formData, showTaxPin: e.target.checked })}
                    className="rounded"
                  />
                  <span>Print KRA PIN Code</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showBranchAddress}
                    onChange={(e) => setFormData({ ...formData, showBranchAddress: e.target.checked })}
                    className="rounded"
                  />
                  <span>Print Branch Physical Address</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showContactPhone}
                    onChange={(e) => setFormData({ ...formData, showContactPhone: e.target.checked })}
                    className="rounded"
                  />
                  <span>Print Telephone</span>
                </label>
              </div>
            </div>

            {/* Metadata Toggles */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
              <span className="font-bold text-servora-navy block text-xs">Transaction & Staff Metadata</span>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showCashierName}
                    onChange={(e) => setFormData({ ...formData, showCashierName: e.target.checked })}
                    className="rounded"
                  />
                  <span>Print Cashier / Custodian</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showServerName}
                    onChange={(e) => setFormData({ ...formData, showServerName: e.target.checked })}
                    className="rounded"
                  />
                  <span>Print Server / Waiter</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showTableNumber}
                    onChange={(e) => setFormData({ ...formData, showTableNumber: e.target.checked })}
                    className="rounded"
                  />
                  <span>Print Table Identifier</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showCustomerDetails}
                    onChange={(e) => setFormData({ ...formData, showCustomerDetails: e.target.checked })}
                    className="rounded"
                  />
                  <span>Print Guest Info</span>
                </label>
              </div>
            </div>

            {/* Fiscal & Line Item Controls */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
              <span className="font-bold text-servora-navy block text-xs">Statutory Fiscalization & Line Items</span>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showTaxSummary}
                    onChange={(e) => setFormData({ ...formData, showTaxSummary: e.target.checked })}
                    className="rounded"
                  />
                  <span>Print Tax Schedule (VAT + Levy)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showEtimsQrCode}
                    onChange={(e) => setFormData({ ...formData, showEtimsQrCode: e.target.checked })}
                    className="rounded"
                  />
                  <span>Print eTIMS Verification QR</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showItemModifiers}
                    onChange={(e) => setFormData({ ...formData, showItemModifiers: e.target.checked })}
                    className="rounded"
                  />
                  <span>Print Modifiers & Add-ons</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showPaymentBreakdown}
                    onChange={(e) => setFormData({ ...formData, showPaymentBreakdown: e.target.checked })}
                    className="rounded"
                  />
                  <span>Print Payment Tender Detail</span>
                </label>
              </div>
            </div>

            {/* Footer Messaging */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Customer Thank-You Message</label>
                <input
                  type="text"
                  placeholder="e.g. Thank you for your business!"
                  value={formData.footerMessage}
                  onChange={(e) => setFormData({ ...formData, footerMessage: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Guest Wi-Fi Broadcast</label>
                  <input
                    type="text"
                    placeholder="e.g. Wi-Fi: Servora | Pass: 12345678"
                    value={formData.wifiDetails}
                    onChange={(e) => setFormData({ ...formData, wifiDetails: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Return / Policy Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Retain receipt for inquiries"
                    value={formData.returnPolicy}
                    onChange={(e) => setFormData({ ...formData, returnPolicy: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: WYSIWYG Live Preview (5 cols) */}
          <div className="lg:col-span-5 sticky top-6 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-servora-navy flex items-center gap-1.5">
                <Eye size={14} className="text-servora-core" /> Dynamic Print Preview
              </span>
              <span className="text-[10px] font-mono text-gray-400">{formData.paperWidth} Simulation</span>
            </div>

            <div
              className={`mx-auto bg-white rounded-lg shadow-xl border border-gray-300 p-6 font-mono text-black transition-all ${
                formData.paperWidth === '58MM' ? 'max-w-[280px] text-[10px]' : 'max-w-[340px] text-[11px]'
              }`}
            >
              {/* Header */}
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-gray-400">
                {formData.showLogo && (
                  <div className="inline-block p-1 bg-black text-white font-bold text-[10px] rounded mb-1 tracking-widest">
                    LOGO
                  </div>
                )}
                <h4 className="font-bold uppercase text-sm leading-tight">
                  {formData.headerTitle || tenantContext?.businessName || 'BUSINESS WORKSPACE'}
                </h4>
                {formData.headerSubtitle && <p className="text-[10px] text-gray-700">{formData.headerSubtitle}</p>}
                {formData.showBranchAddress && <p className="text-[10px]">Headquarters Branch</p>}
                {formData.showContactPhone && tenantContext?.phone && (
                  <p className="text-[10px]">Tel: {tenantContext.phone}</p>
                )}
                {formData.showTaxPin && tenantContext?.kraPin && (
                  <p className="text-[10px] font-bold">KRA PIN: {tenantContext.kraPin}</p>
                )}
              </div>

              {/* Order Metadata */}
              <div className="py-2.5 border-b border-dashed border-gray-400 text-[10px] space-y-0.5">
                <div className="flex justify-between">
                  <span>RECEIPT: #INV-001</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>TIME: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {formData.showOrderType && <span className="font-bold text-black uppercase">DINE-IN</span>}
                </div>
                {formData.showTableNumber && (
                  <div className="flex justify-between">
                    <span>TABLE: Table 01</span>
                    <span>COVERS: 2</span>
                  </div>
                )}
                {formData.showServerName && (
                  <div className="flex justify-between">
                    <span>SERVER: Staff Member</span>
                    {formData.showCashierName && <span>CASHIER: Active Till</span>}
                  </div>
                )}
              </div>

              {/* Item Lines */}
              <div className="py-3 border-b border-dashed border-gray-400 space-y-1.5">
                <div className="flex justify-between font-bold border-b border-gray-300 pb-1">
                  <span>QTY ITEM</span>
                  <span>AMOUNT</span>
                </div>
                <div>
                  <div className="flex justify-between">
                    <span>1x Sample Entree</span>
                    <span>{tenantContext?.currency || 'KES'} 1,200.00</span>
                  </div>
                  {formData.showItemModifiers && <p className="text-[9px] text-gray-600 pl-3">&gt; Standard Preparation</p>}
                </div>
              </div>

              {/* Totals */}
              <div className="py-2.5 border-b border-dashed border-gray-400 space-y-1">
                <div className="flex justify-between">
                  <span>SUBTOTAL (NET)</span>
                  <span>{tenantContext?.currency || 'KES'} 1,016.95</span>
                </div>
                {formData.showTaxSummary && (
                  <>
                    <div className="flex justify-between text-[10px]">
                      <span>VAT (16.0%)</span>
                      <span>{tenantContext?.currency || 'KES'} 162.71</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span>CATERING LEVY (2.0%)</span>
                      <span>{tenantContext?.currency || 'KES'} 20.34</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-300">
                  <span>TOTAL DUE</span>
                  <span>{tenantContext?.currency || 'KES'} 1,200.00</span>
                </div>
              </div>

              {/* eTIMS QR */}
              {formData.showEtimsQrCode && (
                <div className="py-3 text-center space-y-1 border-b border-dashed border-gray-400">
                  <div className="w-16 h-16 mx-auto bg-gray-100 border border-gray-300 rounded flex items-center justify-center">
                    <QrCode size={48} className="text-black" />
                  </div>
                  <p className="text-[9px] font-bold">KRA eTIMS VERIFIED INVOICE</p>
                </div>
              )}

              {/* Footer */}
              <div className="pt-3 text-center space-y-1 text-[9px] text-gray-700">
                {formData.footerMessage && <p className="font-bold">{formData.footerMessage}</p>}
                {formData.wifiDetails && (
                  <p className="flex items-center justify-center gap-1">
                    <Wifi size={10} />
                    <span>{formData.wifiDetails}</span>
                  </p>
                )}
                {formData.returnPolicy && <p className="italic">{formData.returnPolicy}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}