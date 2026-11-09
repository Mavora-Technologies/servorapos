'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  DollarSign,
  ShoppingBag,
  Award,
  Phone,
  Mail,
  Building,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Edit3,
  X,
  Star,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface CustomerRecord {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  kraPin: string | null;
  companyName: string | null;
  customerType: 'RETAIL' | 'CORPORATE' | 'VIP' | 'WHOLESALE';
  loyaltyPoints: number;
  totalSpent: number;
  ordersCount: number;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
}

interface CustomerSummary {
  totalCustomers: number;
  totalRevenue: number;
  totalOrders: number;
  vipCount: number;
}

const TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  VIP: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  CORPORATE: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  WHOLESALE: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  RETAIL: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'CREATED_AT' | 'NAME' | 'TOTAL_SPENT' | 'ORDERS_COUNT'>('CREATED_AT');

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    kraPin: '',
    companyName: '',
    customerType: 'RETAIL' as 'RETAIL' | 'CORPORATE' | 'VIP' | 'WHOLESALE',
    address: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== 'ALL') params.set('customerType', typeFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      params.set('sortBy', sortBy);

      const res = await fetchApi(`/api/v1/customers?${params.toString()}`);
      if (res?.data) {
        setCustomers(res.data);
        setSummary(res.summary || null);
      }
    } catch (err: any) {
      console.error('Failed to load customers:', err);
    } finally {
      setIsLoading(false);
    }
  }, [typeFilter, searchQuery, sortBy]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setCustomerForm({
      name: '',
      phone: '',
      email: '',
      kraPin: '',
      companyName: '',
      customerType: 'RETAIL',
      address: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer: CustomerRecord) => {
    setEditingCustomer(customer);
    setCustomerForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      kraPin: customer.kraPin || '',
      companyName: customer.companyName || '',
      customerType: customer.customerType,
      address: customer.address || '',
      notes: customer.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setToastMessage(null);

      const url = editingCustomer ? `/api/v1/customers/${editingCustomer.id}` : '/api/v1/customers';
      const method = editingCustomer ? 'PATCH' : 'POST';

      const res = await fetchApi(url, {
        method,
        body: JSON.stringify(customerForm),
      });

      setIsModalOpen(false);
      setToastMessage({ text: res.message || 'Customer saved successfully.', type: 'success' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (customer: CustomerRecord) => {
    if (!confirm(`Remove customer "${customer.name}" from directory?`)) return;
    try {
      const res = await fetchApi(`/api/v1/customers/${customer.id}`, { method: 'DELETE' });
      setToastMessage({ text: res.message || 'Customer removed.', type: 'success' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete customer');
    }
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
            <span className="text-xs font-bold text-servora-navy">CRM & Directory</span>
          </div>
          <h1 className="text-xl font-bold text-servora-navy flex items-center gap-2">
            <Users className="text-servora-core" size={22} />
            Customer Relationship Management (CRM)
          </h1>
          <p className="text-xs text-servora-deepTeal mt-0.5">
            Manage retail patrons, corporate accounts, loyalty balances, KRA PIN compliance, and lifetime spend analytics.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={handleOpenCreate}
            className="px-3.5 py-2 bg-servora-core text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <UserPlus size={14} /> Register Customer
          </button>
          <button
            onClick={loadData}
            title="Refresh Directory"
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

      {/* 2. CRM EXECUTIVE METRICS RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Patrons</span>
            <p className="text-xl font-bold font-mono text-servora-navy mt-0.5">
              {summary ? summary.totalCustomers.toLocaleString() : 0}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Active Database</span>
          </div>
          <div className="p-2.5 bg-blue-50 text-servora-core rounded-xl">
            <Users size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cumulative Spend</span>
            <p className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              KES {summary ? summary.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
            </p>
            <span className="text-[10px] text-emerald-600 font-medium">Lifetime Revenue</span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Orders</span>
            <p className="text-xl font-bold font-mono text-purple-700 mt-0.5">
              {summary ? summary.totalOrders.toLocaleString() : 0}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">Checkouts Completed</span>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <ShoppingBag size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">VIP / Corporate</span>
            <p className="text-xl font-bold font-mono text-amber-700 mt-0.5">
              {summary ? summary.vipCount : 0}
            </p>
            <span className="text-[10px] text-gray-500 font-medium">High-Value Accounts</span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Award size={18} />
          </div>
        </div>
      </div>

      {/* 3. SEARCH & FILTER TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Customer Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Segments (Retail, VIP, Corporate)</option>
            <option value="RETAIL">Retail Patrons</option>
            <option value="VIP">VIP Members</option>
            <option value="CORPORATE">Corporate Accounts</option>
            <option value="WHOLESALE">Wholesale Partners</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-bold text-servora-navy focus:outline-none cursor-pointer"
          >
            <option value="CREATED_AT">Newest Registered</option>
            <option value="NAME">Customer Name (A-Z)</option>
            <option value="TOTAL_SPENT">Highest Lifetime Spend</option>
            <option value="ORDERS_COUNT">Most Frequent Orders</option>
          </select>
        </div>

        {/* Quick Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
          <input
            type="text"
            placeholder="Search by name, phone, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 pr-3 py-1.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-servora-core w-44 sm:w-64"
          />
        </div>
      </div>

      {/* 4. CUSTOMER DIRECTORY TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-slate-50">
                <th className="py-2.5 px-3">Customer Profile</th>
                <th className="py-2.5 px-3">Contact Details</th>
                <th className="py-2.5 px-3">Segment Tier</th>
                <th className="py-2.5 px-3 text-right">Orders</th>
                <th className="py-2.5 px-3 text-right">Lifetime Spend</th>
                <th className="py-2.5 px-3 text-center">Loyalty Points</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400 italic">
                    {isLoading ? 'Loading customer directory...' : 'No customers found matching criteria.'}
                  </td>
                </tr>
              ) : (
                customers.map((cust) => {
                  const style = TIER_STYLES[cust.customerType] || TIER_STYLES.RETAIL;
                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-bold text-servora-navy block">{cust.name}</span>
                        {cust.companyName && (
                          <span className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <Building size={11} /> {cust.companyName} {cust.kraPin ? `(PIN: ${cust.kraPin})` : ''}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Phone size={11} className="text-gray-400 shrink-0" />
                          <span className="font-mono">{cust.phone}</span>
                        </div>
                        {cust.email && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Mail size={11} className="text-gray-400 shrink-0" />
                            <span className="truncate max-w-[180px]">{cust.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-mono uppercase font-bold border ${style.bg} ${style.text} ${style.border}`}>
                          {cust.customerType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-gray-700">
                        {cust.ordersCount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-servora-core">
                        KES {cust.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-amber-600">
                        {cust.loyaltyPoints.toLocaleString()} pts
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(cust)}
                            className="p-1.5 text-gray-400 hover:text-servora-core transition-colors cursor-pointer rounded-lg hover:bg-slate-100"
                            title="Edit Customer"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(cust)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 transition-colors cursor-pointer rounded-lg hover:bg-slate-100"
                            title="Delete Customer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL: REGISTER OR EDIT CUSTOMER */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">
                  {editingCustomer ? `Edit Customer: ${editingCustomer.name}` : 'Register New Customer'}
                </h3>
                <p className="text-[11px] text-gray-400">Capture patron contact details and tax compliance info</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Mwangi"
                    value={customerForm.name}
                    onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none focus:border-servora-core"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+254 712 345678"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none focus:border-servora-core"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="sarah@company.com"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Segment Tier</label>
                  <select
                    value={customerForm.customerType}
                    onChange={(e) => setCustomerForm({ ...customerForm, customerType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="RETAIL">Retail Patron</option>
                    <option value="VIP">VIP Member</option>
                    <option value="CORPORATE">Corporate Account</option>
                    <option value="WHOLESALE">Wholesale Partner</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">Company Name</label>
                  <input
                    type="text"
                    placeholder="Acme Holdings Ltd"
                    value={customerForm.companyName}
                    onChange={(e) => setCustomerForm({ ...customerForm, companyName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-servora-navy mb-1">KRA PIN (B2B Tax Invoicing)</label>
                  <input
                    type="text"
                    placeholder="P051234567X"
                    value={customerForm.kraPin}
                    onChange={(e) => setCustomerForm({ ...customerForm, kraPin: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none focus:border-servora-core"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">Physical Address</label>
                <input
                  type="text"
                  placeholder="Westlands, Nairobi"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-servora-navy mb-1">CRM Notes & Preferences</label>
                <textarea
                  rows={2}
                  placeholder="Dietary preferences, seating requests, invoicing terms..."
                  value={customerForm.notes}
                  onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none text-xs"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-servora-core text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Register Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}