'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search, Plus, Minus, Trash2, ShoppingBag, CreditCard, Clock, Coffee, Utensils, Printer,
  CheckCircle, X, Layers, ShoppingCart, Smartphone, AlertCircle,
  Wallet, Unlock, Percent, RefreshCw
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface UserProfile {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: string;
}

interface BusinessProfile {
  id: number;
  name: string;
  legalName?: string;
  kraPin?: string;
  currency: string;
  phone?: string;
  email?: string;
}

interface BranchProfile {
  id: number;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  kraPin?: string;
  etimsBranchId?: string;
  etimsDeviceSerial?: string;
  receiptFooter?: string;
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  isAvailable: boolean;
  image?: string;
  taxRate?: number;
}

interface CartItem extends MenuItem {
  cartItemId: string;
  quantity: number;
  discountPercent?: number;
}

interface RestaurantTable {
  id: number;
  tableLabel: string;
  areaId: number;
  status: string;
}

interface CashDrawerSession {
  id: number;
  drawerId: number;
  drawerName: string;
  openingFloat: string;
  expectedClosingBalance: string;
}

type OrderType = 'Dine-In' | 'Takeaway' | 'Delivery';
type PaymentMethod = 'Cash' | 'M-Pesa' | 'Card' | 'Split';
type MobileTab = 'menu' | 'cart';

export default function POSPage() {
  const searchParams = useSearchParams();
  const preselectedTableId = searchParams.get('tableId');
  const receiptPrintRef = useRef<HTMLDivElement>(null);

  // Dynamic Workspace & Auth User States
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [branch, setBranch] = useState<BranchProfile | null>(null);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('Dine-In');
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>(preselectedTableId || '');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [buyerKraPin, setBuyerKraPin] = useState('');

  // Discount & Add-ons
  const [orderDiscountPercent, setOrderDiscountPercent] = useState<number>(0);

  const [activeSession, setActiveSession] = useState<CashDrawerSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mobile layout state ('menu' or 'cart')
  const [mobileTab, setMobileTab] = useState<MobileTab>('menu');

  // Tender & Settlement States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Completed Order Receipt State
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [authRes, menuRes, tablesRes, sessionRes] = await Promise.all([
        fetchApi('/api/v1/auth/me').catch(() => null),
        fetchApi('/api/v1/menu/active').catch(() => ({ data: { items: [], categories: [] } })),
        fetchApi('/api/v1/restaurant/tables').catch(() => ({ data: [] })),
        fetchApi('/api/v1/cash-management/drawers').catch(() => ({ data: { activeSessions: [] } })),
      ]);

      if (authRes?.data) {
        setBusiness(authRes.data.business);
        setBranch(authRes.data.branch);
        if (authRes.data.user) {
          setCurrentUser(authRes.data.user);
        }
      }
      if (menuRes?.data) {
        setMenuItems(menuRes.data.items || []);
        setCategories(['All', ...(menuRes.data.categories || [])]);
      }
      if (tablesRes?.data) {
        setTables(tablesRes.data);
      }
      if (sessionRes?.data?.activeSessions?.[0]) {
        setActiveSession(sessionRes.data.activeSessions[0]);
      }
    } catch (error) {
      console.warn('POS: Awaiting live configuration payload.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const currencySymbol = business?.currency || 'KES';

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch && item.isAvailable;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { ...item, cartItemId: crypto.randomUUID(), quantity: 1, discountPercent: 0 }];
    });
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.cartItemId === cartItemId) {
        const newQuantity = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const clearCart = () => {
    if (window.confirm('Clear active terminal ticket? All unposted line items will be removed.')) {
      setCart([]);
      setSelectedTableId('');
      setCustomerName('');
      setCustomerPhone('');
      setBuyerKraPin('');
      setOrderDiscountPercent(0);
    }
  };

  // Enterprise Calculation Engine (16% VAT + 2% Catering Levy)
  const rawSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return (rawSubtotal * (orderDiscountPercent / 100));
  }, [rawSubtotal, orderDiscountPercent]);

  const discountedGross = Math.max(0, rawSubtotal - discountAmount);

  const vatRate = 0.16;
  const levyRate = 0.02;
  const totalTaxFactor = 1 + vatRate + levyRate;

  const netAmount = discountedGross / totalTaxFactor;
  const vatAmount = netAmount * vatRate;
  const levyAmount = netAmount * levyRate;
  const grandTotal = discountedGross;

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const cashChangeDue = useMemo(() => {
    const tendered = parseFloat(cashTendered) || 0;
    return Math.max(0, tendered - grandTotal);
  }, [cashTendered, grandTotal]);

  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    if (orderType === 'Dine-In' && !selectedTableId) {
      alert('Please assign a dining table for Dine-In service.');
      return;
    }
    setCashTendered(grandTotal.toFixed(2));
    setMpesaPhone(customerPhone || '');
    setIsPaymentModalOpen(true);
  };

  const handleCompleteCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const tableObj = tables.find(t => String(t.id) === selectedTableId);

      const result = await fetchApi('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify({
          orderType,
          tableId: selectedTableId ? parseInt(selectedTableId, 10) : undefined,
          tableName: tableObj ? tableObj.tableLabel : orderType,
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          buyerKraPin: buyerKraPin.trim() || undefined,
          subtotal: netAmount,
          tax: vatAmount,
          cateringLevy: levyAmount,
          discountTotal: discountAmount,
          total: grandTotal,
          paymentMethod,
          cashTendered: paymentMethod === 'Cash' ? parseFloat(cashTendered) : grandTotal,
          changeReturned: paymentMethod === 'Cash' ? cashChangeDue : 0,
          items: cart.map(i => ({
            menuItemId: parseInt(i.id, 10) || 1,
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.price,
            totalPrice: i.price * i.quantity
          }))
        })
      });

      // Synchronize table to 'Occupied' locally
      if (orderType === 'Dine-In' && selectedTableId) {
        setTables(prev => prev.map(t => String(t.id) === selectedTableId ? { ...t, status: 'Occupied' } : t));
      }

      // STK Push if M-Pesa tender selected
      if (paymentMethod === 'M-Pesa' && (customerPhone || mpesaPhone)) {
        await fetchApi('/api/v1/payments/mpesa/stk-push', {
          method: 'POST',
          body: JSON.stringify({
            phoneNumber: mpesaPhone || customerPhone,
            amount: grandTotal,
            accountReference: result?.data?.orderNumber || `POS-${Date.now().toString().slice(-4)}`,
            notes: `POS Settlement for ${customerName || 'Guest'}`,
          })
        }).catch(() => {});
      }

      const generatedReceipt = {
        ...(result?.data || {}),
        orderNumber: result?.data?.orderNumber || `SRV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
        items: [...cart],
        netAmount,
        vatAmount,
        levyAmount,
        discountAmount,
        grandTotal,
        paymentMethod,
        cashTendered: parseFloat(cashTendered) || grandTotal,
        cashChangeDue,
        tableName: tableObj ? tableObj.tableLabel : orderType,
        customerName: customerName || 'Walk-in Guest',
        customerPhone: customerPhone || null,
        buyerKraPin: buyerKraPin || null,
        servedBy: currentUser?.fullName || currentUser?.firstName || 'POS Cashier',
        drawerName: activeSession?.drawerName || 'Main Register',
        timestamp: new Date().toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }),
        businessName: business?.name || 'Restaurant Workspace',
        legalName: business?.legalName || business?.name || '',
        branchName: branch?.name || '',
        branchAddress: branch?.address || '',
        branchPhone: branch?.phone || business?.phone || '',
        kraPin: branch?.kraPin || business?.kraPin || '',
        etimsDeviceSerial: branch?.etimsDeviceSerial || null,
        receiptFooter: branch?.receiptFooter || 'Thank you for your business. Karibu tena!',
        internalAuditHash: `SHA256:${crypto.randomUUID().slice(0, 16).toUpperCase()}`
      };

      setCompletedOrder(generatedReceipt);
      setCart([]);
      setIsPaymentModalOpen(false);
      setMobileTab('menu');
    } catch (error: any) {
      alert(error.message || 'POS Checkout transaction encountered an error.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Dedicated Thermal Printer Engine: Isolated Hidden Iframe with single-page height constraints
  const handlePrintReceipt = () => {
    const receiptElement = receiptPrintRef.current;
    if (!receiptElement) {
      window.print();
      return;
    }

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.top = '-9999px';
    printFrame.style.left = '-9999px';
    printFrame.style.width = '80mm';
    printFrame.style.height = 'auto';
    printFrame.style.border = 'none';

    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document;
    if (!frameDoc) return;

    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${completedOrder?.orderNumber || 'Slip'}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #fff;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              color: #000;
              width: 72mm;
              margin: 3mm auto;
              padding: 0;
              line-height: 1.3;
              page-break-inside: avoid;
            }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .border-b-dashed { border-bottom: 1px dashed #000; }
            .pb-2 { padding-bottom: 5px; }
            .pt-2 { padding-top: 5px; }
            .my-2 { margin-top: 5px; margin-bottom: 5px; }
            .flex-between { display: flex; justify-content: space-between; align-items: flex-start; }
            .text-xs { font-size: 10px; }
            .text-sm { font-size: 13px; }
            .uppercase { text-transform: uppercase; }
            .leading-tight { line-height: 1.15; }
            .space-y-1 > * + * { margin-top: 3px; }
            .space-y-2 > * + * { margin-top: 6px; }
            .space-y-3 > * + * { margin-top: 10px; }
            * { page-break-inside: avoid; }
          </style>
        </head>
        <body>
          ${receiptElement.innerHTML}
        </body>
      </html>
    `);
    frameDoc.close();

    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(printFrame);
      }, 1000);
    }, 250);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] lg:h-[calc(100vh-8rem)] gap-3 font-sans">
      
      {/* Print Fallback Styles */}
      <style jsx global>{`
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
            background: #fff !important;
          }
          body * {
            visibility: hidden !important;
          }
          #thermal-receipt-printable,
          #thermal-receipt-printable * {
            visibility: visible !important;
          }
          #thermal-receipt-printable {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 72mm !important;
            max-width: 80mm !important;
            margin: 0 auto !important;
            padding: 3mm !important;
            box-shadow: none !important;
            border: none !important;
            background: #fff !important;
            page-break-inside: avoid !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

      {/* TOP CONTROL TELEMETRY BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 bg-white px-4 py-2.5 rounded-2xl border border-gray-200 shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center">
            <Wallet size={16} />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
              {branch?.name || 'Store'} &bull; Terminal Station
            </div>
            <div className="text-xs font-bold text-servora-navy flex items-center gap-2">
              <span>{activeSession ? activeSession.drawerName : 'Unassigned Register'}</span>
              {activeSession && (
                <span className="font-mono text-gray-500 font-medium">
                  (Float: {currencySymbol} {parseFloat(activeSession.openingFloat).toLocaleString()})
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {!activeSession ? (
            <Link 
              href="/cash-management/drawers" 
              className="bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors flex items-center gap-1.5"
            >
              <AlertCircle size={13} /> Open Shift Float &rarr;
            </Link>
          ) : (
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-xl text-xs font-bold">
              <Unlock size={12} /> Active &bull; Expected: {currencySymbol} {parseFloat(activeSession.expectedClosingBalance).toLocaleString()}
            </div>
          )}

          <button 
            onClick={loadInitialData}
            title="Sync Workspace & Catalog"
            className="p-1.5 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* MOBILE SCREEN NAVIGATION DOCK */}
      <div className="flex lg:hidden bg-white p-1 rounded-xl border border-gray-200 shadow-xs shrink-0">
        <button
          onClick={() => setMobileTab('menu')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
            mobileTab === 'menu' ? 'bg-servora-navy text-white shadow-xs' : 'text-gray-500 hover:text-servora-navy'
          }`}
        >
          <Layers size={15} /> Catalog ({filteredItems.length})
        </button>
        <button
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all relative ${
            mobileTab === 'cart' ? 'bg-servora-navy text-white shadow-xs' : 'text-gray-500 hover:text-servora-navy'
          }`}
        >
          <ShoppingCart size={15} /> Current Order
          {totalItemsCount > 0 && (
            <span className="bg-servora-core text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {totalItemsCount}
            </span>
          )}
        </button>
      </div>

      {/* MAIN SPLIT-VIEW VIEWPORT */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 overflow-hidden">

        {/* LEFT COLUMN: ITEM CATALOG & LOOKUP */}
        <div className={`flex-1 flex-col min-h-0 bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden ${
          mobileTab === 'menu' ? 'flex' : 'hidden lg:flex'
        }`}>
          <div className="p-3 border-b border-gray-200 space-y-2.5 shrink-0 bg-white">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  type="text"
                  placeholder="Scan SKU or search dishes, drinks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core transition-all"
                />
              </div>

              {/* Table assignment selector for Dine-in orders */}
              {orderType === 'Dine-In' && (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 px-2.5 py-1.5 rounded-xl">
                  <Utensils size={13} className="text-servora-core" />
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="bg-transparent text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
                  >
                    <option value="">Assign Table *</option>
                    {tables.map(t => {
                      const isCurrentlySelected = String(t.id) === selectedTableId;
                      const isOccupied = t.status === 'Occupied';
                      return (
                        <option
                          key={t.id}
                          value={t.id}
                          disabled={isOccupied && !isCurrentlySelected}
                        >
                          {t.tableLabel} ({t.status}) {isOccupied && !isCurrentlySelected ? '— In Use' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>

            {/* Category Ribbon */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedCategory === cat
                      ? 'bg-servora-navy text-white shadow-xs'
                      : 'bg-gray-100/80 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="flex-1 overflow-y-auto p-3.5 bg-slate-50/50">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-servora-deepTeal animate-pulse">
                Synchronizing product catalog...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                <Utensils size={40} className="mb-2 opacity-25" />
                <p className="text-sm font-bold text-servora-navy">No products available</p>
                <p className="text-xs text-gray-400">Refine search criteria or check menu configuration.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {filteredItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="flex flex-col text-left bg-white p-3 rounded-xl border border-gray-200 shadow-xs hover:border-servora-core/40 hover:shadow-md transition-all active:scale-97 h-28 justify-between group"
                  >
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-servora-deepTeal bg-slate-100 px-1.5 py-0.5 rounded-md inline-block mb-1">
                        {item.category}
                      </span>
                      <span className="text-xs font-bold text-servora-navy line-clamp-2 leading-tight group-hover:text-servora-core transition-colors">
                        {item.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-gray-50">
                      <span className="text-xs font-mono font-bold text-servora-core">
                        {currencySymbol} {item.price.toLocaleString()}
                      </span>
                      <div className="w-5 h-5 rounded-lg bg-slate-50 border border-gray-200 flex items-center justify-center text-gray-400 group-hover:bg-servora-core group-hover:text-white transition-colors">
                        <Plus size={11} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE CHECK & FISCAL LEDGER */}
        <div className={`w-full lg:w-[420px] flex-col bg-white rounded-2xl shadow-xs border border-gray-200 shrink-0 overflow-hidden h-full ${
          mobileTab === 'cart' ? 'flex' : 'hidden lg:flex'
        }`}>

          {/* Fulfillment Mode Selectors */}
          <div className="flex p-1.5 bg-slate-50 border-b border-gray-200 shrink-0 gap-1">
            {(['Dine-In', 'Takeaway', 'Delivery'] as OrderType[]).map(type => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  orderType === type
                    ? 'bg-white text-servora-navy shadow-xs border border-gray-200'
                    : 'text-gray-500 hover:text-servora-navy'
                }`}
              >
                {type === 'Dine-In' && <Coffee size={13} />}
                {type === 'Takeaway' && <ShoppingBag size={13} />}
                {type === 'Delivery' && <Clock size={13} />}
                {type}
              </button>
            ))}
          </div>

          {/* Order Header Metadata */}
          <div className="p-3 border-b border-gray-200 bg-white space-y-2 shrink-0 text-xs">
            {orderType === 'Dine-In' && (
              <div className="p-2 bg-blue-50/70 border border-blue-200 rounded-xl font-bold text-servora-core flex justify-between items-center text-xs">
                <span className="flex items-center gap-1.5"><Utensils size={13} /> Seating Assignment:</span>
                <span>
                  {tables.find(t => String(t.id) === selectedTableId)?.tableLabel || '⚠️ Table Required'}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Guest Name (Optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core text-xs"
              />
              <input
                type="text"
                placeholder="Phone (07... M-Pesa)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none focus:border-servora-core text-xs"
              />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Buyer KRA PIN (Optional eTIMS Tax Invoice)"
                value={buyerKraPin}
                onChange={(e) => setBuyerKraPin(e.target.value.toUpperCase())}
                className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-mono uppercase focus:outline-none focus:border-servora-core text-xs"
              />
              <div className="flex items-center gap-1 bg-slate-50 border border-gray-200 rounded-xl px-2">
                <Percent size={11} className="text-gray-400" />
                <select
                  value={orderDiscountPercent}
                  onChange={(e) => setOrderDiscountPercent(Number(e.target.value))}
                  className="bg-transparent text-xs font-bold text-servora-navy focus:outline-none"
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="10">10%</option>
                  <option value="15">15%</option>
                  <option value="20">20%</option>
                </select>
              </div>
            </div>
          </div>

          {/* Cart Itemized List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <ShoppingBag size={36} className="mb-2 opacity-25" />
                <p className="text-xs font-bold text-servora-navy">Ticket is empty</p>
                <p className="text-[11px] text-gray-400">Select dishes or beverages from catalog</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.cartItemId} className="flex items-center justify-between bg-slate-50/60 border border-gray-200 p-2.5 rounded-xl shadow-xs">
                  <div className="flex-1 pr-2">
                    <h4 className="text-xs font-bold text-servora-navy line-clamp-1">{item.name}</h4>
                    <p className="text-[11px] font-mono font-bold text-servora-core">
                      {currencySymbol} {(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 bg-white rounded-xl p-1 border border-gray-200 shadow-xs">
                    <button 
                      onClick={() => updateQuantity(item.cartItemId, -1)} 
                      className="p-1 text-gray-500 hover:text-rose-600 rounded-lg transition-colors"
                    >
                      {item.quantity === 1 ? <Trash2 size={12} /> : <Minus size={12} />}
                    </button>
                    <span className="text-xs font-bold text-servora-navy w-5 text-center font-mono">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.cartItemId, 1)} 
                      className="p-1 text-gray-500 hover:text-servora-core rounded-lg transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Enterprise Fiscal Summary & Action Buttons */}
          <div className="p-3.5 bg-slate-50 border-t border-gray-200 shrink-0 space-y-2.5">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>Taxable Base (Net)</span>
                <span className="font-mono">{currencySymbol} {netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>KRA VAT (16%)</span>
                <span className="font-mono">{currencySymbol} {vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Tourism Catering Levy (2%)</span>
                <span className="font-mono">{currencySymbol} {levyAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {orderDiscountPercent > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Discount ({orderDiscountPercent}%)</span>
                  <span className="font-mono">-{currencySymbol} {discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-servora-navy pt-1.5 border-t border-gray-200">
                <span>Grand Total Due</span>
                <span className="font-mono text-base text-servora-core">
                  {currencySymbol} {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={clearCart}
                disabled={cart.length === 0}
                className="py-2.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 hover:text-rose-600 transition-colors disabled:opacity-40"
              >
                Clear Ticket
              </button>
              <button
                onClick={handleOpenPayment}
                disabled={cart.length === 0}
                className="py-2.5 text-xs font-bold text-white bg-servora-core rounded-xl shadow-xs hover:bg-blue-700 active:scale-97 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <CreditCard size={14} />
                Charge {currencySymbol} {grandTotal.toLocaleString()}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* TENDER SETTLEMENT MODAL */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">Tender Settlement & Payment Routing</h3>
                <p className="text-[11px] text-gray-500">Order #{selectedTableId ? `Table ${tables.find(t => String(t.id) === selectedTableId)?.tableLabel}` : orderType}</p>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-gray-400 hover:text-servora-navy">
                <X size={18} />
              </button>
            </div>

            {/* Total Display */}
            <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-xl flex justify-between items-center">
              <span className="text-xs font-bold text-servora-navy uppercase tracking-wider">Total Settlement Due</span>
              <span className="font-mono font-bold text-lg text-servora-core">
                {currencySymbol} {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Tender Method Selector */}
            <div className="grid grid-cols-2 gap-2">
              {(['Cash', 'M-Pesa', 'Card', 'Split'] as PaymentMethod[]).map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                    paymentMethod === method
                      ? 'border-servora-core bg-blue-50 text-servora-core shadow-xs'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {method === 'M-Pesa' ? 'M-Pesa STK Push' : method}
                </button>
              ))}
            </div>

            {/* Cash Tendered Calculator with Change Calculation */}
            {paymentMethod === 'Cash' && (
              <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl space-y-2 text-xs">
                <label className="block text-[11px] font-bold text-servora-navy">Cash Tendered ({currencySymbol}) *</label>
                <input
                  type="number"
                  step="any"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono font-bold text-sm focus:border-servora-core focus:outline-none"
                />
                <div className="flex justify-between items-center pt-2 border-t border-gray-200 font-bold">
                  <span className="text-gray-500">Change Due to Guest:</span>
                  <span className="font-mono text-emerald-700 text-sm">
                    {currencySymbol} {cashChangeDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            {/* M-Pesa STK Push Details */}
            {paymentMethod === 'M-Pesa' && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs">
                <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <Smartphone size={13} /> Instant Daraja STK Push Validation
                </span>
                <input
                  type="text"
                  placeholder="2547XXXXXXXX or 07XXXXXXXX"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-xs focus:outline-none"
                />
              </div>
            )}

            <button
              onClick={handleCompleteCheckout}
              disabled={isCheckingOut || (paymentMethod === 'Cash' && parseFloat(cashTendered) < grandTotal)}
              className="w-full py-3 bg-servora-core hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-all flex justify-center items-center gap-2 text-xs disabled:opacity-40"
            >
              {isCheckingOut ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <CheckCircle size={15} />
                  Authorize Transaction & Generate Slip
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STANDARD 80MM / 58MM FISCAL THERMAL RECEIPT MODAL */}
      {completedOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          
          <div 
            id="thermal-receipt-printable"
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 space-y-3 font-mono text-xs text-black"
          >
            {/* Printable Content Node */}
            <div ref={receiptPrintRef} className="space-y-3">
              
              {/* Dynamic Corporate Tax Header */}
              <div className="text-center border-b-dashed pb-2 space-y-0.5">
                <h2 className="text-sm font-bold tracking-wider uppercase">{completedOrder.businessName}</h2>
                {completedOrder.legalName && completedOrder.legalName !== completedOrder.businessName && (
                  <p className="text-xs text-gray">{completedOrder.legalName}</p>
                )}
                <p className="text-xs text-gray">
                  {completedOrder.branchName} {completedOrder.branchAddress && `• ${completedOrder.branchAddress}`}
                </p>
                {completedOrder.kraPin && (
                  <p className="text-xs text-gray font-mono">VAT PIN: {completedOrder.kraPin}</p>
                )}
                {completedOrder.etimsDeviceSerial && (
                  <p className="text-xs text-gray font-mono">eTIMS CU Serial: {completedOrder.etimsDeviceSerial}</p>
                )}
                <div className="pt-2 font-bold text-xs font-mono">
                  {completedOrder.orderNumber}
                </div>
                <p className="text-xs text-gray">{completedOrder.timestamp} &bull; {completedOrder.tableName}</p>
              </div>

              {/* Customer, Server & Taxpayer Attributes */}
              <div className="border-b-dashed pb-2 text-xs space-y-0.5">
                <div className="flex-between">
                  <span>Guest:</span>
                  <span className="font-bold">{completedOrder.customerName || 'Walk-in Guest'}</span>
                </div>
                <div className="flex-between">
                  <span>Served by:</span>
                  <span className="font-bold">{completedOrder.servedBy}</span>
                </div>
                {completedOrder.buyerKraPin && (
                  <div className="flex-between">
                    <span>Buyer PIN:</span>
                    <span className="font-bold">{completedOrder.buyerKraPin}</span>
                  </div>
                )}
              </div>

              {/* Itemized Line Ledger */}
              <div className="space-y-1.5 border-b-dashed pb-2">
                {completedOrder.items.map((i: any) => (
                  <div key={i.cartItemId} className="flex-between">
                    <span style={{ maxWidth: '70%' }}>{i.quantity}x {i.name}</span>
                    <span className="font-bold">{(i.price * i.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Fiscal Tax Matrix Breakdown (16% VAT + 2% Levy) */}
              <div className="space-y-1 text-xs border-b-dashed pb-2">
                <div className="flex-between">
                  <span className="text-gray">Taxable Base Net:</span>
                  <span>{currencySymbol} {completedOrder.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex-between">
                  <span className="text-gray">KRA VAT (16%):</span>
                  <span>{currencySymbol} {completedOrder.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex-between">
                  <span className="text-gray">Catering Levy (2%):</span>
                  <span>{currencySymbol} {completedOrder.levyAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {completedOrder.discountAmount > 0 && (
                  <div className="flex-between font-bold">
                    <span>Total Discount:</span>
                    <span>-{currencySymbol} {completedOrder.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex-between font-bold text-sm pt-2" style={{ borderTop: '1px solid #000' }}>
                  <span>TOTAL PAID:</span>
                  <span>{currencySymbol} {completedOrder.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Tender & Settlement Attribution */}
              <div className="space-y-0.5 text-xs border-b-dashed pb-2 text-gray">
                <div className="flex-between font-bold" style={{ color: '#000' }}>
                  <span>Tender Type:</span>
                  <span className="uppercase">{completedOrder.paymentMethod}</span>
                </div>
                {completedOrder.paymentMethod === 'Cash' && (
                  <>
                    <div className="flex-between">
                      <span>Cash Tendered:</span>
                      <span>{currencySymbol} {completedOrder.cashTendered.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex-between font-bold" style={{ color: '#000' }}>
                      <span>Change Returned:</span>
                      <span>{currencySymbol} {completedOrder.cashChangeDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Customer Review & Non-Fiscal Audit Footer */}
              <div className="text-center pt-1 space-y-2 text-xs">
                <div className="space-y-1">
                  <p className="font-bold">Thank you for your business. Karibu tena!</p>
                  <p className="text-gray">Review Us: How Did We Serve You?</p>
                  <div className="text-gray font-mono tracking-widest text-[11px] leading-tight select-none">
                    .................................................................<br />
                    ................................................................<br />
                    ..............................................................
                  </div>
                </div>

                <div className="pt-2 border-b-dashed space-y-1 pb-2">
                  <p className="font-bold text-[11px]">NON-FISCAL RECEIPT</p>
                  <p className="text-[10px] text-gray uppercase">FINAL FISCAL RECEIPT</p>
                  <p className="text-[10px] text-gray uppercase">PROVIDED UPON CHECK-OUT</p>
                  <p className="text-[9px] font-mono tracking-tight mt-1 text-gray">
                    ......*****END OF NON-TAX INVOICE****.......
                  </p>
                </div>
              </div>

            </div>

            {/* Action Bar (Strictly excluded from printing) */}
            <div className="flex gap-2 pt-2 font-sans print:hidden">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 py-2.5 bg-servora-navy text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer size={14} /> Print Receipt
              </button>
              <button
                onClick={() => setCompletedOrder(null)}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition-all cursor-pointer"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}