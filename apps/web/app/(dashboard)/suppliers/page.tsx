'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  ContactRound, 
  Plus, 
  Search, 
  Edit3, 
  Power, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  Clock, 
  Building2, 
  Boxes, 
  X, 
  AlertCircle,
  FileText,
  Smartphone
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface SupplierRecord {
  id: number;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  kraPin: string | null;
  physicalAddress: string | null;
  city: string;
  paymentTerms: 'COD' | 'NET_7' | 'NET_14' | 'NET_30' | 'PREPAID';
  leadTimeDays: number;
  bankName: string | null;
  bankAccountNumber: string | null;
  mpesaPaybillNumber: string | null;
  notes: string | null;
  isActive: boolean;
  linkedItemsCount: number;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierRecord | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [kraPin, setKraPin] = useState('');
  const [physicalAddress, setPhysicalAddress] = useState('');
  const [city, setCity] = useState('Nairobi');
  const [paymentTerms, setPaymentTerms] = useState<SupplierRecord['paymentTerms']>('NET_30');
  const [leadTimeDays, setLeadTimeDays] = useState('2');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [mpesaPaybillNumber, setMpesaPaybillNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadSuppliers = async () => {
    setIsLoading(true);
    try {
      const res = await fetchApi('/api/v1/suppliers');
      if (res?.data) {
        setSuppliers(res.data);
      }
    } catch (err) {
      console.error('Failed to load suppliers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const openModal = (s?: SupplierRecord) => {
    if (s) {
      setEditingSupplier(s);
      setName(s.name);
      setContactPerson(s.contactPerson || '');
      setPhone(s.phone || '');
      setEmail(s.email || '');
      setKraPin(s.kraPin || '');
      setPhysicalAddress(s.physicalAddress || '');
      setCity(s.city || 'Nairobi');
      setPaymentTerms(s.paymentTerms);
      setLeadTimeDays(String(s.leadTimeDays));
      setBankName(s.bankName || '');
      setBankAccountNumber(s.bankAccountNumber || '');
      setMpesaPaybillNumber(s.mpesaPaybillNumber || '');
      setNotes(s.notes || '');
      setIsActive(s.isActive);
    } else {
      setEditingSupplier(null);
      setName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setKraPin('');
      setPhysicalAddress('');
      setCity('Nairobi');
      setPaymentTerms('NET_30');
      setLeadTimeDays('2');
      setBankName('');
      setBankAccountNumber('');
      setMpesaPaybillNumber('');
      setNotes('');
      setIsActive(true);
    }
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError(null);

    const payload = {
      name,
      contactPerson: contactPerson || undefined,
      phone: phone || undefined,
      email: email || undefined,
      kraPin: kraPin ? kraPin.toUpperCase() : undefined,
      physicalAddress: physicalAddress || undefined,
      city,
      paymentTerms,
      leadTimeDays: parseInt(leadTimeDays, 10) || 0,
      bankName: bankName || undefined,
      bankAccountNumber: bankAccountNumber || undefined,
      mpesaPaybillNumber: mpesaPaybillNumber || undefined,
      notes: notes || undefined,
      isActive,
    };

    try {
      if (editingSupplier) {
        await fetchApi(`/api/v1/suppliers/${editingSupplier.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/api/v1/suppliers', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsModalOpen(false);
      loadSuppliers();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save supplier profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await fetchApi(`/api/v1/suppliers/${id}/toggle-status`, { method: 'PATCH' });
      loadSuppliers();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle supplier status');
    }
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.phone && s.phone.includes(searchTerm)) ||
        (s.kraPin && s.kraPin.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchesStatus = true;
      if (statusFilter === 'ACTIVE') matchesStatus = s.isActive;
      if (statusFilter === 'INACTIVE') matchesStatus = !s.isActive;

      return matchesSearch && matchesStatus;
    });
  }, [suppliers, searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-servora-navy">Approved Suppliers & Vendor Registry</h1>
          <p className="text-xs sm:text-sm text-servora-deepTeal mt-0.5">
            Configure wholesale purveyors, lead times, credit payment terms, KRA fiscal PINs, and M-Pesa B2B channels.
          </p>
        </div>

        <button
          onClick={() => openModal()}
          className="bg-servora-core text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={15} /> Add Vendor Profile
        </button>
      </div>

      {/* Query Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
          <input
            type="text"
            placeholder="Search vendor name, contact person, phone, or KRA PIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:border-servora-core focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-gray-50 border border-gray-100 rounded-xl">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === 'ALL' ? 'bg-white shadow-xs text-servora-navy' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            All ({suppliers.length})
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === 'ACTIVE' ? 'bg-white shadow-xs text-emerald-700' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter('INACTIVE')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === 'INACTIVE' ? 'bg-white shadow-xs text-gray-700' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Disabled
          </button>
        </div>
      </div>

      {/* Suppliers Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs font-medium text-servora-deepTeal animate-pulse bg-white rounded-2xl border border-gray-100">
          Loading vendor profiles and linked item catalogs...
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="p-12 text-center text-xs text-servora-deepTeal bg-white rounded-2xl border border-gray-100">
          No supplier profiles found matching your search criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredSuppliers.map((s) => (
            <div
              key={s.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                !s.isActive ? 'opacity-60 bg-gray-50/70 border-gray-200' : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-servora-pale text-servora-core">
                    {s.paymentTerms.replace('_', ' ')}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      s.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-rose-50 text-rose-700 border border-rose-100'
                    }`}
                  >
                    {s.isActive ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-servora-navy mt-1">{s.name}</h3>
                {s.contactPerson && (
                  <p className="text-xs text-gray-500 font-medium mt-0.5">Contact: {s.contactPerson}</p>
                )}

                <div className="space-y-1.5 mt-3 text-xs text-gray-500 border-t border-gray-100 pt-3">
                  {s.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-gray-400 shrink-0" />
                      <span className="font-mono">{s.phone}</span>
                    </div>
                  )}
                  {s.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={13} className="text-gray-400 shrink-0" />
                      <span className="truncate">{s.email}</span>
                    </div>
                  )}
                  {s.kraPin && (
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <FileText size={13} className="text-gray-400 shrink-0" />
                      <span>PIN: <strong>{s.kraPin}</strong></span>
                    </div>
                  )}
                  {s.mpesaPaybillNumber && (
                    <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-700">
                      <Smartphone size={13} className="shrink-0" />
                      <span>Paybill / Till: {s.mpesaPaybillNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 font-semibold text-servora-navy">
                    <Boxes size={13} className="text-servora-core" />
                    {s.linkedItemsCount} SKUs
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="text-gray-500">{s.leadTimeDays}d lead</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(s.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      s.isActive ? 'text-gray-400 hover:text-rose-600' : 'text-gray-400 hover:text-emerald-700'
                    }`}
                    title={s.isActive ? 'Deactivate' : 'Activate'}
                  >
                    <Power size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openModal(s)}
                    className="p-1.5 text-servora-core hover:bg-servora-pale rounded-lg transition-colors inline-flex items-center gap-1 font-semibold"
                  >
                    <Edit3 size={13} /> Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-servora-pale text-servora-core flex items-center justify-center">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-servora-navy">
                    {editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'New Supplier Profile'}
                  </h3>
                  <p className="text-[11px] text-servora-deepTeal">Wholesale vendor details and payment credentials</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Supplier Business Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Farmers Choice Quality Meats Ltd"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Contact Representative</label>
                  <input
                    type="text"
                    placeholder="e.g. Jane Kariuki"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">KRA Tax PIN</label>
                  <input
                    type="text"
                    maxLength={11}
                    placeholder="P051234567Z"
                    value={kraPin}
                    onChange={(e) => setKraPin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+254 700 000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Orders Email</label>
                  <input
                    type="email"
                    placeholder="orders@vendor.co.ke"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Payment Terms *</label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none bg-white font-medium"
                  >
                    <option value="NET_30">Net 30 Days Credit</option>
                    <option value="NET_14">Net 14 Days Credit</option>
                    <option value="NET_7">Net 7 Days Credit</option>
                    <option value="COD">Cash On Delivery (COD)</option>
                    <option value="PREPAID">Prepaid in Advance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-servora-navy mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    min={0}
                    value={leadTimeDays}
                    onChange={(e) => setLeadTimeDays(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none font-bold"
                  />
                </div>
              </div>

              {/* Settlement / Banking section */}
              <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-xl space-y-2.5">
                <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider block">
                  Disbursement Credentials (B2B & Banking)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">M-Pesa Paybill / Till</label>
                    <input
                      type="text"
                      placeholder="e.g. 522522"
                      value={mpesaPaybillNumber}
                      onChange={(e) => setMpesaPaybillNumber(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Bank Name & Branch</label>
                    <input
                      type="text"
                      placeholder="e.g. KCB Bank Kipande"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">Bank Account Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 1100223344"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-servora-navy mb-1">Physical Warehouse / Depot</label>
                <input
                  type="text"
                  placeholder="e.g. Enterprise Road, Industrial Area, Nairobi"
                  value={physicalAddress}
                  onChange={(e) => setPhysicalAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-servora-core focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-servora-core focus:ring-0 w-4 h-4 border-gray-300"
                />
                <label htmlFor="isActive" className="text-xs font-bold text-servora-navy cursor-pointer">
                  Active Purveyor (Available for PO requisitions)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold bg-servora-core text-white rounded-xl hover:bg-blue-700 shadow-xs disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Saving...' : editingSupplier ? 'Update Vendor' : 'Create Vendor Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}