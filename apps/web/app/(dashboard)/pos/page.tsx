'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  CreditCard,
  Clock,
  Coffee,
  Utensils,
  Printer,
  CheckCircle,
  X,
  Layers,
  ShoppingCart,
  Smartphone,
  AlertCircle,
  Wallet,
  Unlock,
  Percent,
  RefreshCw,
  Wine,
  Truck,
  Car,
  QrCode,
  ShieldCheck,
  Split,
  Wifi,
  Receipt,
  Users,
  AlertTriangle,
  ArrowRight,
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
  sku?: string;
  image?: string;
}

interface CartItem extends MenuItem {
  cartItemId: string;
  quantity: number;
  modifiers?: string[];
  notes?: string;
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

interface ServiceModel {
  id: number;
  name: string;
  type: 'DINE_IN' | 'QUICK_SERVICE' | 'BAR_TAB' | 'TAKEAWAY' | 'DELIVERY' | 'DRIVE_THRU';
  description: string | null;
  requiresTable: boolean;
  payBeforeOrder: boolean;
  promptGuestCount: boolean;
  allowSplitChecks: boolean;
  allowTableTransfers: boolean;
  autoSendToKitchen: boolean;
  enableCoursePacing: boolean;
  autoApplyServiceCharge: boolean;
  serviceChargePercent: string;
  packingChargeAmount: string;
  maxTabCreditLimit: string;
  isActive: boolean;
}

interface FinancialSettings {
  baseCurrency: string;
  isVatInclusive: boolean;
  vatRate: string;
  isCateringLevyEnabled: boolean;
  cateringLevyRate: string;
  isServiceChargeEnabled: boolean;
  serviceChargeRate: string;
  maxDrawerCashThreshold: string;
  enableSafeDropAlerts: boolean;
  taxPin: string | null;
  etimsEnvironment: string;
}

interface ReceiptTemplate {
  id: number;
  name: string;
  paperWidth: '80MM' | '58MM' | 'A4_INVOICE';
  headerTitle: string;
  headerSubtitle: string | null;
  showLogo: boolean;
  showBranchAddress: boolean;
  showTaxPin: boolean;
  showContactPhone: boolean;
  showCashierName: boolean;
  showServerName: boolean;
  showTableNumber: boolean;
  showCustomerDetails: boolean;
  showOrderType: boolean;
  showItemSku: boolean;
  showItemModifiers: boolean;
  showTaxSummary: boolean;
  showEtimsQrCode: boolean;
  showFiscalDeviceSerial: boolean;
  showPaymentBreakdown: boolean;
  showChangeDue: boolean;
  footerMessage: string | null;
  returnPolicy: string | null;
  wifiDetails: string | null;
}

type PaymentMethod = 'Cash' | 'M-Pesa' | 'Card' | 'Split';
type MobileTab = 'menu' | 'cart';

const SERVICE_MODEL_ICONS: Record<string, any> = {
  DINE_IN: Utensils,
  QUICK_SERVICE: Store,
  BAR_TAB: Wine,
  TAKEAWAY: ShoppingBag,
  DELIVERY: Truck,
  DRIVE_THRU: Car,
};

function Store(props: any) {
  return <ShoppingBag {...props} />;
}

export default function POSPage() {
  const searchParams = useSearchParams();
  const preselectedTableId = searchParams.get('tableId');
  const receiptPrintRef = useRef<HTMLDivElement>(null);

  // Dynamic Workspace & Auth User States
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [branch, setBranch] = useState<BranchProfile | null>(null);

  // Catalog & Product Matrix
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart & Order Attributes
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>(preselectedTableId || '');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [buyerKraPin, setBuyerKraPin] = useState('');
  const [guestCount, setGuestCount] = useState<number>(1);
  const [orderDiscountPercent, setOrderDiscountPercent] = useState<number>(0);

  // Dynamic Engine Configurations
  const [serviceModels, setServiceModels] = useState<ServiceModel[]>([]);
  const [activeServiceModel, setActiveServiceModel] = useState<ServiceModel | null>(null);
  const [financialSettings, setFinancialSettings] = useState<FinancialSettings | null>(null);
  const [receiptTemplate, setReceiptTemplate] = useState<ReceiptTemplate | null>(null);
  const [activeSession, setActiveSession] = useState<CashDrawerSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mobile layout state
  const [mobileTab, setMobileTab] = useState<MobileTab>('menu');

  // Tender & Checkout States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [splitCashAmount, setSplitCashAmount] = useState<string>('');
  const [splitMpesaAmount, setSplitMpesaAmount] = useState<string>('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Completed Receipt State
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [
        authRes,
        menuRes,
        tablesRes,
        sessionRes,
        serviceModelsRes,
        finRes,
        receiptRes,
      ] = await Promise.all([
        fetchApi('/api/v1/auth/me').catch(() => null),
        fetchApi('/api/v1/menu/active').catch(() => ({ data: { items: [], categories: [] } })),
        fetchApi('/api/v1/restaurant/tables').catch(() => ({ data: [] })),
        fetchApi('/api/v1/cash-management/drawers').catch(() => ({ data: { activeSessions: [] } })),
        fetchApi('/api/v1/settings/service-models').catch(() => ({ data: [] })),
        fetchApi('/api/v1/settings/financial').catch(() => ({ data: null })),
        fetchApi('/api/v1/settings/receipts').catch(() => ({ data: [] })),
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

      // Configure Active Service Models
      if (serviceModelsRes?.data && Array.isArray(serviceModelsRes.data)) {
        const activeOnly = serviceModelsRes.data.filter((m: ServiceModel) => m.isActive);
        setServiceModels(activeOnly);
        const defaultModel =
          activeOnly.find((m: ServiceModel) => m.type === 'DINE_IN') || activeOnly[0];
        if (defaultModel) {
          setActiveServiceModel(defaultModel);
        }
      }

      // Financial & Tax Settings
      if (finRes?.data?.settings) {
        setFinancialSettings(finRes.data.settings);
      }

      // Thermal Receipt Template
      if (receiptRes?.data && Array.isArray(receiptRes.data)) {
        const defaultTpl =
          receiptRes.data.find((t: ReceiptTemplate) => (t as any).isDefault) || receiptRes.data[0];
        if (defaultTpl) {
          setReceiptTemplate(defaultTpl);
        }
      }
    } catch (error) {
      console.warn('POS: Initializing terminal state.', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const currencySymbol = business?.currency || financialSettings?.baseCurrency || 'KES';

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch && item.isAvailable;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) => (c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [
        ...prev,
        {
          ...item,
          cartItemId: crypto.randomUUID(),
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.cartItemId === cartItemId) {
            const newQuantity = Math.max(0, item.quantity + delta);
            return { ...item, quantity: newQuantity };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => {
    if (window.confirm('Clear active terminal ticket? All unposted line items will be removed.')) {
      setCart([]);
      setSelectedTableId('');
      setCustomerName('');
      setCustomerPhone('');
      setBuyerKraPin('');
      setOrderDiscountPercent(0);
      setGuestCount(1);
    }
  };

  // Real-Time Enterprise Financial Calculations
  const calculations = useMemo(() => {
    const rawSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountAmount = rawSubtotal * (orderDiscountPercent / 100);
    const discountedGross = Math.max(0, rawSubtotal - discountAmount);

    const isVatInclusive = financialSettings ? financialSettings.isVatInclusive : true;
    const vatRate = financialSettings ? parseFloat(financialSettings.vatRate) / 100 : 0.16;
    const isCateringLevyEnabled = financialSettings
      ? financialSettings.isCateringLevyEnabled
      : true;
    const levyRate = isCateringLevyEnabled && financialSettings
      ? parseFloat(financialSettings.cateringLevyRate) / 100
      : 0.02;

    // Service Charge from Model or Financial Settings
    const modelServiceChargePercent = activeServiceModel?.autoApplyServiceCharge
      ? parseFloat(activeServiceModel.serviceChargePercent) / 100
      : financialSettings?.isServiceChargeEnabled
      ? parseFloat(financialSettings.serviceChargeRate) / 100
      : 0;

    // Packaging Charge from Active Service Model
    const packingChargeAmount = activeServiceModel
      ? parseFloat(activeServiceModel.packingChargeAmount) || 0
      : 0;

    let netAmount = 0;
    let vatAmount = 0;
    let levyAmount = 0;
    let serviceChargeAmount = 0;
    let grandTotal = 0;

    if (isVatInclusive) {
      const combinedDivisor = 1 + vatRate + levyRate + modelServiceChargePercent;
      netAmount = discountedGross / combinedDivisor;
      vatAmount = netAmount * vatRate;
      levyAmount = netAmount * levyRate;
      serviceChargeAmount = netAmount * modelServiceChargePercent;
      grandTotal = discountedGross + packingChargeAmount;
    } else {
      netAmount = discountedGross;
      vatAmount = netAmount * vatRate;
      levyAmount = netAmount * levyRate;
      serviceChargeAmount = netAmount * modelServiceChargePercent;
      grandTotal = netAmount + vatAmount + levyAmount + serviceChargeAmount + packingChargeAmount;
    }

    return {
      rawSubtotal,
      discountAmount,
      netAmount,
      vatAmount,
      levyAmount,
      serviceChargeAmount,
      packingChargeAmount,
      grandTotal,
    };
  }, [cart, orderDiscountPercent, financialSettings, activeServiceModel]);

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Cash Change Calculation
  const cashChangeDue = useMemo(() => {
    if (paymentMethod === 'Cash') {
      const tendered = parseFloat(cashTendered) || 0;
      return Math.max(0, tendered - calculations.grandTotal);
    }
    if (paymentMethod === 'Split') {
      const c = parseFloat(splitCashAmount) || 0;
      const m = parseFloat(splitMpesaAmount) || 0;
      return Math.max(0, c + m - calculations.grandTotal);
    }
    return 0;
  }, [paymentMethod, cashTendered, splitCashAmount, splitMpesaAmount, calculations.grandTotal]);

  // Safe Drop Alert Telemetry Check
  const isSafeDropWarning = useMemo(() => {
    if (!financialSettings?.enableSafeDropAlerts || !activeSession) return false;
    const currentBalance = parseFloat(activeSession.expectedClosingBalance) || 0;
    const threshold = parseFloat(financialSettings.maxDrawerCashThreshold) || 50000;
    return currentBalance >= threshold * 0.9;
  }, [financialSettings, activeSession]);

  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    if (activeServiceModel?.requiresTable && !selectedTableId) {
      alert('This service model requires assigning a dining table before settlement.');
      return;
    }
    setCashTendered(calculations.grandTotal.toFixed(2));
    setMpesaPhone(customerPhone || '');
    setSplitCashAmount((calculations.grandTotal / 2).toFixed(2));
    setSplitMpesaAmount((calculations.grandTotal / 2).toFixed(2));
    setIsPaymentModalOpen(true);
  };

  const handleCompleteCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const tableObj = tables.find((t) => String(t.id) === selectedTableId);

      const result = await fetchApi('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify({
          orderType: activeServiceModel?.name || 'Dine-In',
          serviceModelId: activeServiceModel?.id,
          tableId: selectedTableId ? parseInt(selectedTableId, 10) : undefined,
          tableName: tableObj ? tableObj.tableLabel : activeServiceModel?.name,
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          buyerKraPin: buyerKraPin.trim() || undefined,
          guestCount: activeServiceModel?.promptGuestCount ? guestCount : undefined,
          subtotal: calculations.netAmount,
          tax: calculations.vatAmount,
          cateringLevy: calculations.levyAmount,
          serviceCharge: calculations.serviceChargeAmount,
          packingCharge: calculations.packingChargeAmount,
          discountTotal: calculations.discountAmount,
          total: calculations.grandTotal,
          paymentMethod,
          cashTendered:
            paymentMethod === 'Cash'
              ? parseFloat(cashTendered)
              : paymentMethod === 'Split'
              ? parseFloat(splitCashAmount)
              : calculations.grandTotal,
          changeReturned: cashChangeDue,
          items: cart.map((i) => ({
            menuItemId: parseInt(i.id, 10) || 1,
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.price,
            totalPrice: i.price * i.quantity,
            sku: i.sku,
          })),
        }),
      });

      if (activeServiceModel?.requiresTable && selectedTableId) {
        setTables((prev) =>
          prev.map((t) => (String(t.id) === selectedTableId ? { ...t, status: 'Occupied' } : t))
        );
      }

      // Trigger M-Pesa STK Push if M-Pesa was selected or split
      if (
        (paymentMethod === 'M-Pesa' || paymentMethod === 'Split') &&
        (customerPhone || mpesaPhone)
      ) {
        const amountToPrompt =
          paymentMethod === 'Split'
            ? parseFloat(splitMpesaAmount)
            : calculations.grandTotal;

        await fetchApi('/api/v1/payments/mpesa/stk-push', {
          method: 'POST',
          body: JSON.stringify({
            phoneNumber: mpesaPhone || customerPhone,
            amount: amountToPrompt,
            accountReference:
              result?.data?.orderNumber || `POS-${Date.now().toString().slice(-4)}`,
            notes: `POS Tender for ${customerName || 'Guest'}`,
          }),
        }).catch(() => {});
      }

      const generatedReceipt = {
        ...(result?.data || {}),
        orderNumber:
          result?.data?.orderNumber ||
          `INV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
        items: [...cart],
        ...calculations,
        paymentMethod,
        cashTendered:
          paymentMethod === 'Cash'
            ? parseFloat(cashTendered)
            : paymentMethod === 'Split'
            ? parseFloat(splitCashAmount)
            : calculations.grandTotal,
        cashChangeDue,
        tableName: tableObj ? tableObj.tableLabel : activeServiceModel?.name || 'Walk-in',
        customerName: customerName || 'Walk-in Guest',
        customerPhone: customerPhone || null,
        buyerKraPin: buyerKraPin || null,
        servedBy: currentUser?.fullName || currentUser?.firstName || 'POS Cashier',
        drawerName: activeSession?.drawerName || 'Main Till',
        timestamp: new Date().toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }),
        businessName: receiptTemplate?.headerTitle || business?.name || 'Restaurant Workspace',
        headerSubtitle: receiptTemplate?.headerSubtitle || '',
        branchName: branch?.name || '',
        branchAddress: branch?.address || '',
        branchPhone: branch?.phone || business?.phone || '',
        kraPin: financialSettings?.taxPin || branch?.kraPin || business?.kraPin || '',
        etimsDeviceSerial:
          branch?.etimsDeviceSerial || (financialSettings as any)?.etimsDeviceSerial || 'OSCU-SCU-2026-NBO',
        footerMessage: receiptTemplate?.footerMessage || 'Thank you for your business. Karibu tena!',
        returnPolicy: receiptTemplate?.returnPolicy || 'Consumables cannot be returned.',
        wifiDetails: receiptTemplate?.wifiDetails || null,
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

  // Thermal Print Engine dynamically adapting to the loaded template configuration
  const handlePrintReceipt = () => {
    const receiptElement = receiptPrintRef.current;
    if (!receiptElement) {
      window.print();
      return;
    }

    const is80mm = receiptTemplate?.paperWidth !== '58MM';
    const paperWidth = is80mm ? '80mm' : '58mm';
    const printableWidth = is80mm ? '72mm' : '48mm';

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.top = '-9999px';
    printFrame.style.left = '-9999px';
    printFrame.style.width = printableWidth;
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
          <meta charset="utf-8" />
          <title>Receipt - ${completedOrder?.orderNumber || 'Slip'}</title>
          <style>
            @page {
              size: ${paperWidth} auto;
              margin: 0mm !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: ${printableWidth} !important;
              background: #ffffff !important;
              -webkit-print-color-adjust: exact !important;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              font-size: ${is80mm ? '12px' : '10px'};
              line-height: 1.35;
              font-weight: 700;
              color: #000000 !important;
              padding: 2mm 1mm 4mm 1mm !important;
              box-sizing: border-box;
            }
            .header-title {
              font-size: ${is80mm ? '15px' : '13px'};
              font-weight: 900;
              text-align: center;
              text-transform: uppercase;
            }
            .text-center { text-align: center; }
            .font-bold { font-weight: 800; }
            .font-black { font-weight: 900; }
            .mono { font-family: Consolas, "Courier New", monospace !important; }
            .flex-between {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              width: 100%;
            }
            .dashed-divider {
              border: none;
              border-bottom: 1.5px dashed #000000;
              margin: 4px 0;
            }
            .solid-divider {
              border: none;
              border-bottom: 2px solid #000000;
              margin: 5px 0;
            }
            * { color: #000000 !important; box-sizing: border-box; }
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
      {/* 1. TOP CONTROL TELEMETRY BAR & SAFE DROP ALERTS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 bg-white px-4 py-2.5 rounded-2xl border border-gray-200 shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-servora-core flex items-center justify-center shrink-0">
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
                  (Till: {currencySymbol} {parseFloat(activeSession.openingFloat).toLocaleString()})
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {isSafeDropWarning && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold animate-pulse">
              <AlertTriangle size={13} className="text-amber-600" />
              <span>Safe Drop Recommended</span>
            </div>
          )}

          {!activeSession ? (
            <Link
              href="/cash-management/drawers"
              className="bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors flex items-center gap-1.5"
            >
              <AlertCircle size={13} /> Open Shift Float &rarr;
            </Link>
          ) : (
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-xl text-xs font-bold">
              <Unlock size={12} /> Expected:{' '}
              {currencySymbol} {parseFloat(activeSession.expectedClosingBalance).toLocaleString()}
            </div>
          )}

          <button
            onClick={loadInitialData}
            title="Sync Workspace & Catalog"
            className="p-1.5 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
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
        <div
          className={`flex-1 flex-col min-h-0 bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden ${
            mobileTab === 'menu' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="p-3 border-b border-gray-200 space-y-2.5 shrink-0 bg-white">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  type="text"
                  placeholder="Scan SKU or search dishes, beverages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core transition-all"
                />
              </div>

              {/* Table assignment selector for Dine-in orders */}
              {activeServiceModel?.requiresTable && (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 px-2.5 py-1.5 rounded-xl">
                  <Utensils size={13} className="text-servora-core" />
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="bg-transparent text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
                  >
                    <option value="">Assign Table *</option>
                    {tables.map((t) => {
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
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="flex flex-col text-left bg-white p-3 rounded-xl border border-gray-200 shadow-xs hover:border-servora-core/40 hover:shadow-md transition-all active:scale-97 h-28 justify-between group cursor-pointer"
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
        <div
          className={`w-full lg:w-[420px] flex-col bg-white rounded-2xl shadow-xs border border-gray-200 shrink-0 overflow-hidden h-full ${
            mobileTab === 'cart' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Dynamic Service Model Revenue Center Selectors */}
          <div className="flex p-1.5 bg-slate-50 border-b border-gray-200 shrink-0 gap-1 overflow-x-auto scrollbar-hide">
            {serviceModels.length > 0 ? (
              serviceModels.map((model) => {
                const Icon = SERVICE_MODEL_ICONS[model.type] || Store;
                const isSelected = activeServiceModel?.id === model.id;
                return (
                  <button
                    key={model.id}
                    onClick={() => setActiveServiceModel(model)}
                    className={`flex-1 min-w-[90px] py-1.5 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-white text-servora-navy shadow-xs border border-gray-200'
                        : 'text-gray-500 hover:text-servora-navy'
                    }`}
                  >
                    <Icon size={13} className={isSelected ? 'text-servora-core' : ''} />
                    <span className="truncate">{model.name}</span>
                  </button>
                );
              })
            ) : (
              <div className="py-1 px-2 text-xs font-bold text-servora-navy">Standard Dining</div>
            )}
          </div>

          {/* Order Header Metadata */}
          <div className="p-3 border-b border-gray-200 bg-white space-y-2 shrink-0 text-xs">
            {activeServiceModel?.requiresTable && (
              <div className="p-2 bg-blue-50/70 border border-blue-200 rounded-xl font-bold text-servora-core flex justify-between items-center text-xs">
                <span className="flex items-center gap-1.5">
                  <Utensils size={13} /> Seating Assignment:
                </span>
                <span>
                  {tables.find((t) => String(t.id) === selectedTableId)?.tableLabel || '⚠️ Table Required'}
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
                placeholder="Buyer KRA PIN (Optional eTIMS)"
                value={buyerKraPin}
                onChange={(e) => setBuyerKraPin(e.target.value.toUpperCase())}
                className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-mono uppercase focus:outline-none focus:border-servora-core text-xs"
              />

              {activeServiceModel?.promptGuestCount && (
                <div className="flex items-center gap-1 bg-slate-50 border border-gray-200 rounded-xl px-2">
                  <Users size={12} className="text-gray-400" />
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={guestCount}
                    onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-8 bg-transparent text-xs font-bold text-servora-navy focus:outline-none font-mono text-center"
                    title="Guest Cover Count"
                  />
                </div>
              )}

              <div className="flex items-center gap-1 bg-slate-50 border border-gray-200 rounded-xl px-2">
                <Percent size={11} className="text-gray-400" />
                <select
                  value={orderDiscountPercent}
                  onChange={(e) => setOrderDiscountPercent(Number(e.target.value))}
                  className="bg-transparent text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
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
              cart.map((item) => (
                <div
                  key={item.cartItemId}
                  className="flex items-center justify-between bg-slate-50/60 border border-gray-200 p-2.5 rounded-xl shadow-xs"
                >
                  <div className="flex-1 pr-2">
                    <h4 className="text-xs font-bold text-servora-navy line-clamp-1">{item.name}</h4>
                    <p className="text-[11px] font-mono font-bold text-servora-core">
                      {currencySymbol} {(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 bg-white rounded-xl p-1 border border-gray-200 shadow-xs">
                    <button
                      onClick={() => updateQuantity(item.cartItemId, -1)}
                      className="p-1 text-gray-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                    >
                      {item.quantity === 1 ? <Trash2 size={12} /> : <Minus size={12} />}
                    </button>
                    <span className="text-xs font-bold text-servora-navy w-5 text-center font-mono">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.cartItemId, 1)}
                      className="p-1 text-gray-500 hover:text-servora-core rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Dynamic Financial Summary & Action Buttons */}
          <div className="p-3.5 bg-slate-50 border-t border-gray-200 shrink-0 space-y-2.5">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>Taxable Net Base</span>
                <span className="font-mono">
                  {currencySymbol}{' '}
                  {calculations.netAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>KRA VAT ({financialSettings?.vatRate || '16'}%)</span>
                <span className="font-mono">
                  {currencySymbol}{' '}
                  {calculations.vatAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              {calculations.levyAmount > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Tourism Levy ({financialSettings?.cateringLevyRate || '2'}%)</span>
                  <span className="font-mono">
                    {currencySymbol}{' '}
                    {calculations.levyAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}

              {calculations.serviceChargeAmount > 0 && (
                <div className="flex justify-between text-purple-700 font-medium">
                  <span>Service Charge</span>
                  <span className="font-mono">
                    +{currencySymbol}{' '}
                    {calculations.serviceChargeAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}

              {calculations.packingChargeAmount > 0 && (
                <div className="flex justify-between text-gray-600 font-medium">
                  <span>Packaging Surcharge</span>
                  <span className="font-mono">
                    +{currencySymbol} {calculations.packingChargeAmount.toLocaleString()}
                  </span>
                </div>
              )}

              {orderDiscountPercent > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Discount ({orderDiscountPercent}%)</span>
                  <span className="font-mono">
                    -{currencySymbol}{' '}
                    {calculations.discountAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-sm font-bold text-servora-navy pt-1.5 border-t border-gray-200">
                <span>Total Due</span>
                <span className="font-mono text-base text-servora-core">
                  {currencySymbol}{' '}
                  {calculations.grandTotal.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={clearCart}
                disabled={cart.length === 0}
                className="py-2.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 hover:text-rose-600 transition-colors disabled:opacity-40 cursor-pointer"
              >
                Clear Ticket
              </button>
              <button
                onClick={handleOpenPayment}
                disabled={cart.length === 0}
                className="py-2.5 text-xs font-bold text-white bg-servora-core rounded-xl shadow-xs hover:bg-blue-700 active:scale-97 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                <CreditCard size={14} />
                Charge {currencySymbol} {Math.round(calculations.grandTotal).toLocaleString()}
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
                <h3 className="text-sm font-bold text-servora-navy">Tender Settlement & Routing</h3>
                <p className="text-[11px] text-gray-500">
                  {activeServiceModel?.name || 'Order'} &bull;{' '}
                  {selectedTableId
                    ? `Table ${tables.find((t) => String(t.id) === selectedTableId)?.tableLabel}`
                    : 'Counter'}
                </p>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-gray-400 hover:text-servora-navy cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-xl flex justify-between items-center">
              <span className="text-xs font-bold text-servora-navy uppercase tracking-wider">
                Total Settlement Due
              </span>
              <span className="font-mono font-bold text-lg text-servora-core">
                {currencySymbol}{' '}
                {calculations.grandTotal.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {(['Cash', 'M-Pesa', 'Card', 'Split'] as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                    paymentMethod === method
                      ? 'border-servora-core bg-blue-50 text-servora-core shadow-xs'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>

            {paymentMethod === 'Cash' && (
              <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl space-y-2 text-xs">
                <label className="block text-[11px] font-bold text-servora-navy">
                  Cash Tendered ({currencySymbol}) *
                </label>
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
                    {currencySymbol}{' '}
                    {cashChangeDue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            )}

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

            {paymentMethod === 'Split' && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-2.5 text-xs">
                <span className="font-bold text-purple-900 flex items-center gap-1.5">
                  <Split size={13} /> Omnichannel Split Tender
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Cash Portioned</label>
                    <input
                      type="number"
                      value={splitCashAmount}
                      onChange={(e) => setSplitCashAmount(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-0.5">M-Pesa Portioned</label>
                    <input
                      type="number"
                      value={splitMpesaAmount}
                      onChange={(e) => setSplitMpesaAmount(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="M-Pesa Mobile Number"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-purple-300 rounded-lg font-mono text-xs focus:outline-none"
                />
              </div>
            )}

            <button
              onClick={handleCompleteCheckout}
              disabled={
                isCheckingOut ||
                (paymentMethod === 'Cash' && parseFloat(cashTendered) < calculations.grandTotal)
              }
              className="w-full py-3 bg-servora-core hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-all flex justify-center items-center gap-2 text-xs disabled:opacity-40 cursor-pointer"
            >
              {isCheckingOut ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <CheckCircle size={15} />
                  Authorize Transaction & Generate Thermal Slip
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* DYNAMIC FISCAL THERMAL RECEIPT MODAL */}
      {completedOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <div
            id="thermal-receipt-printable"
            className={`bg-white rounded-2xl w-full p-5 shadow-2xl border border-gray-200 space-y-3 font-mono text-xs text-black transition-all ${
              receiptTemplate?.paperWidth === '58MM' ? 'max-w-[280px]' : 'max-w-[340px]'
            }`}
          >
            {/* Printable Content Node */}
            <div ref={receiptPrintRef} className="space-y-1 w-full text-black">
              {/* Dynamic Corporate Tax Header */}
              <div className="text-center space-y-0.5">
                {receiptTemplate?.showLogo !== false && (
                  <div className="inline-block p-1 bg-black text-white font-bold text-[10px] rounded mb-0.5 tracking-widest">
                    SERVORA
                  </div>
                )}
                <h2 className="header-title">{completedOrder.businessName}</h2>
                {completedOrder.headerSubtitle && (
                  <p className="text-[10px] text-gray-700">{completedOrder.headerSubtitle}</p>
                )}
                {receiptTemplate?.showBranchAddress !== false && (
                  <p className="text-[10px]">
                    {completedOrder.branchName} {completedOrder.branchAddress && `• ${completedOrder.branchAddress}`}
                  </p>
                )}
                {receiptTemplate?.showContactPhone !== false && completedOrder.branchPhone && (
                  <p className="text-[10px]">Tel: {completedOrder.branchPhone}</p>
                )}
                {receiptTemplate?.showTaxPin !== false && completedOrder.kraPin && (
                  <p className="text-[10px] font-bold">KRA PIN: {completedOrder.kraPin}</p>
                )}
                <div className="pt-1 font-black text-sm">{completedOrder.orderNumber}</div>
                <p className="text-[10px]">
                  {completedOrder.timestamp} &bull; {completedOrder.tableName}
                </p>
              </div>

              <div className="dashed-divider"></div>

              {/* Staff & Guest Identity Attributes */}
              <div className="text-[11px] space-y-0.5">
                {receiptTemplate?.showCustomerDetails !== false && (
                  <div className="flex-between">
                    <span>Guest:</span>
                    <span className="font-bold">{completedOrder.customerName}</span>
                  </div>
                )}
                {receiptTemplate?.showServerName !== false && (
                  <div className="flex-between">
                    <span>Server:</span>
                    <span className="font-bold">{completedOrder.servedBy}</span>
                  </div>
                )}
                {completedOrder.buyerKraPin && (
                  <div className="flex-between font-bold">
                    <span>Buyer PIN:</span>
                    <span>{completedOrder.buyerKraPin}</span>
                  </div>
                )}
              </div>

              <div className="dashed-divider"></div>

              {/* Itemized Lines */}
              <div className="space-y-1">
                {completedOrder.items.map((i: any) => (
                  <div key={i.cartItemId} className="flex-between text-[11px]">
                    <span className="font-bold max-w-[70%] break-words">
                      {i.quantity}x {i.name}
                    </span>
                    <span className="font-bold whitespace-nowrap">
                      {(i.price * i.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <div className="dashed-divider"></div>

              {/* Statutory Tax Breakdown */}
              <div className="space-y-1 text-[11px]">
                <div className="flex-between">
                  <span>Net Food & Beverage:</span>
                  <span>
                    {currencySymbol}{' '}
                    {completedOrder.netAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                {receiptTemplate?.showTaxSummary !== false && (
                  <>
                    <div className="flex-between">
                      <span>KRA VAT:</span>
                      <span>
                        {currencySymbol}{' '}
                        {completedOrder.vatAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    {completedOrder.levyAmount > 0 && (
                      <div className="flex-between">
                        <span>Catering Levy:</span>
                        <span>
                          {currencySymbol}{' '}
                          {completedOrder.levyAmount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    )}
                  </>
                )}
                {completedOrder.serviceChargeAmount > 0 && (
                  <div className="flex-between">
                    <span>Service Charge:</span>
                    <span>
                      {currencySymbol}{' '}
                      {completedOrder.serviceChargeAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}
                {completedOrder.packingChargeAmount > 0 && (
                  <div className="flex-between">
                    <span>Packaging:</span>
                    <span>{currencySymbol} {completedOrder.packingChargeAmount.toLocaleString()}</span>
                  </div>
                )}

                <div className="solid-divider"></div>

                <div className="flex-between font-black text-sm pt-0.5">
                  <span>TOTAL DUE:</span>
                  <span className="text-base">
                    {currencySymbol}{' '}
                    {completedOrder.grandTotal.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              <div className="dashed-divider"></div>

              {/* Tender Attribution */}
              <div className="space-y-0.5 text-[11px]">
                <div className="flex-between font-bold">
                  <span>Tender:</span>
                  <span className="uppercase">{completedOrder.paymentMethod}</span>
                </div>
                {completedOrder.cashChangeDue > 0 && (
                  <div className="flex-between font-bold">
                    <span>Change Returned:</span>
                    <span>{currencySymbol} {completedOrder.cashChangeDue.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* eTIMS QR & Fiscal Sign-off */}
              {receiptTemplate?.showEtimsQrCode !== false && (
                <div className="text-center pt-2 space-y-1">
                  <div className="w-16 h-16 mx-auto bg-gray-100 border border-gray-300 rounded flex items-center justify-center">
                    <QrCode size={48} className="text-black" />
                  </div>
                  <p className="text-[9px] font-bold">KRA eTIMS FISCAL INVOICE</p>
                  {completedOrder.etimsDeviceSerial && (
                    <p className="text-[8px] text-gray-700">SCU: {completedOrder.etimsDeviceSerial}</p>
                  )}
                </div>
              )}

              {/* Dynamic Footer, Wi-Fi & Policy */}
              <div className="text-center pt-2 space-y-0.5 text-[10px]">
                <p className="font-bold">{completedOrder.footerMessage}</p>
                {completedOrder.wifiDetails && (
                  <p className="text-[9px] font-medium">{completedOrder.wifiDetails}</p>
                )}
                {completedOrder.returnPolicy && (
                  <p className="italic text-[8px] text-gray-600">{completedOrder.returnPolicy}</p>
                )}
              </div>
            </div>

            {/* Action Bar (Excluded from Printing) */}
            <div className="flex gap-2 pt-2 font-sans print:hidden">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="flex-1 py-2.5 bg-servora-navy text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer size={14} /> Print Receipt
              </button>
              <button
                type="button"
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