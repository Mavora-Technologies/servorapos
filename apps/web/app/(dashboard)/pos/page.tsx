'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  Utensils,
  Printer,
  CheckCircle,
  X,
  Layers,
  ShoppingCart,
  Smartphone,
  Wallet,
  Unlock,
  Percent,
  RefreshCw,
  Wine,
  Truck,
  Car,
  QrCode,
  Split,
  Users,
  AlertTriangle,
  Building2,
  Award,
  Tag,
  UserCheck,
  Gift,
  Lock,
  ChefHat,
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
  isMainBranch?: boolean;
}

interface CashDrawerOption {
  id: number;
  drawerCode: string;
  name: string;
  status: string;
  currentBalance: number;
}

interface ActiveCashierShift {
  id: number;
  branchId: number | null;
  openingFloat: number;
  expectedCash: number;
  status: string;
  openedAt: string;
}

interface CustodianGuardrails {
  id: number;
  cashDrawerId: number;
  shiftType: string;
  allocatedFloat: number;
  maxCashLimit: number;
  allowRefunds: boolean;
  allowDrawerPop: boolean;
  allowManualDiscount: boolean;
  maxDiscountPercent: number;
}

interface LoyaltyCustomerMatch {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  kraPin: string | null;
  companyName: string | null;
  customerType: string;
  totalSpent: number;
  ordersCount: number;
  currentPoints: number;
  tierId: number | null;
  tierName: string;
  earningMultiplier: number;
}

interface LoyaltyRewardOption {
  id: number;
  name: string;
  pointsCost: number;
  rewardType: string;
  rewardValue: number;
  minTierId: number | null;
}

interface ItemAvailabilityFlag {
  menuItemId: number;
  is86ed: boolean;
  remainingCount: number | null;
}

interface KitchenStationOption {
  id: number;
  branchId: number;
  name: string;
  code: string;
  stationType: string;
  colorHex: string;
  targetPrepTimeMinutes: number;
  assignedCategories: string[];
  backupStationId: number | null;
  isActive: boolean;
}

interface ItemStationMapping {
  stationName: string;
  stationCode: string | null;
  isFailover: boolean;
  originalStationName: string;
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
  targetStation?: string;
  modifiers?: string[];
  notes?: string;
}

interface RestaurantTable {
  id: number;
  tableLabel: string;
  areaId: number;
  status: string;
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
  showKitchenNotes?: boolean;
  showTaxSummary: boolean;
  showEtimsQrCode: boolean;
  showFiscalDeviceSerial: boolean;
  showPaymentBreakdown: boolean;
  showChangeDue: boolean;
  showLoyaltyPoints: boolean;
  footerMessage: string | null;
  returnPolicy: string | null;
  wifiDetails: string | null;
}

type PaymentMethod = 'Cash' | 'M-Pesa' | 'Card' | 'Split';
type MobileTab = 'menu' | 'cart';

const SERVICE_MODEL_ICONS: Record<string, any> = {
  DINE_IN: Utensils,
  QUICK_SERVICE: ShoppingBag,
  BAR_TAB: Wine,
  TAKEAWAY: ShoppingBag,
  DELIVERY: Truck,
  DRIVE_THRU: Car,
};

export default function POSPage() {
  const searchParams = useSearchParams();
  const preselectedTableId = searchParams.get('tableId');
  const receiptPrintRef = useRef<HTMLDivElement>(null);

  // Dynamic Workspace, Branch & Auth User States
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [branches, setBranches] = useState<BranchProfile[]>([]);
  const [activeBranch, setActiveBranch] = useState<BranchProfile | null>(null);

  // Cash Drawers, Active Shift & Custodian Guardrails
  const [drawers, setDrawers] = useState<CashDrawerOption[]>([]);
  const [selectedDrawerId, setSelectedDrawerId] = useState<string>('');
  const [activeShift, setActiveShift] = useState<ActiveCashierShift | null>(null);
  const [custodianGuardrails, setCustodianGuardrails] = useState<CustodianGuardrails | null>(null);

  // Catalog, Availability & Prep Station Routing Matrix
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStationFilter, setSelectedStationFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [availabilityMap, setAvailabilityMap] = useState<Record<number, ItemAvailabilityFlag>>({});
  const [kitchenStations, setKitchenStations] = useState<KitchenStationOption[]>([]);
  const [itemStationMap, setItemStationMap] = useState<Record<number, ItemStationMapping>>({});
  const [orderTargetStation, setOrderTargetStation] = useState<string>('AUTO');

  // CRM Customer & Loyalty Engine States
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerMatches, setCustomerMatches] = useState<LoyaltyCustomerMatch[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<LoyaltyCustomerMatch | null>(null);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [loyaltyRewards, setLoyaltyRewards] = useState<LoyaltyRewardOption[]>([]);
  const [selectedReward, setSelectedReward] = useState<LoyaltyRewardOption | null>(null);

  // Promotional Code States
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{
    id: number;
    code: string;
    calculatedDiscountKes: number;
  } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

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

  const loadInitialData = useCallback(
    async (overrideBranchId?: number) => {
      try {
        setIsLoading(true);
        const savedBranchId =
          overrideBranchId ||
          (typeof window !== 'undefined'
            ? Number(localStorage.getItem('servora_active_branch_id')) || undefined
            : undefined);

        const branchParam = savedBranchId ? `?branchId=${savedBranchId}` : '';

        const [
          authRes,
          posContextRes,
          menuRes,
          tablesRes,
          serviceModelsRes,
          finRes,
          receiptRes,
        ] = await Promise.all([
          fetchApi('/api/v1/auth/me').catch(() => null),
          fetchApi(`/api/v1/pos/context${branchParam}`).catch(() => null),
          fetchApi(`/api/v1/menu/active${branchParam}`).catch(() => ({
            data: { items: [], categories: [] },
          })),
          fetchApi(`/api/v1/restaurant/tables${branchParam}`).catch(() => ({ data: [] })),
          fetchApi('/api/v1/settings/service-models').catch(() => ({ data: [] })),
          fetchApi('/api/v1/settings/financial').catch(() => ({ data: null })),
          fetchApi('/api/v1/settings/receipts').catch(() => ({ data: [] })),
        ]);

        if (authRes?.data) {
          setBusiness(authRes.data.business);
          if (authRes.data.user) setCurrentUser(authRes.data.user);
        }

        if (posContextRes?.data) {
          const ctx = posContextRes.data;
          setBranches(ctx.branches || []);
          setActiveBranch(ctx.activeBranch || authRes?.data?.branch || null);
          if (ctx.activeBranch && typeof window !== 'undefined') {
            localStorage.setItem('servora_active_branch_id', String(ctx.activeBranch.id));
          }

          setDrawers(ctx.drawers || []);
          setActiveShift(ctx.activeShift || null);
          setCustodianGuardrails(ctx.custodianGuardrails || null);
          setLoyaltyRewards(ctx.loyaltyRewards || []);
          setKitchenStations(ctx.kitchenStations || []);
          setItemStationMap(ctx.itemStationMap || {});

          // Auto-select assigned drawer or first open drawer
          if (ctx.custodianGuardrails?.cashDrawerId) {
            setSelectedDrawerId(String(ctx.custodianGuardrails.cashDrawerId));
          } else if (ctx.drawers?.length > 0 && !selectedDrawerId) {
            const openDrawer = ctx.drawers.find((d: CashDrawerOption) => d.status === 'OPEN');
            setSelectedDrawerId(String((openDrawer || ctx.drawers[0]).id));
          }

          // Build 86'd / low-stock lookup map
          const availLookup: Record<number, ItemAvailabilityFlag> = {};
          for (const flag of ctx.itemAvailability || []) {
            availLookup[flag.menuItemId] = flag;
          }
          setAvailabilityMap(availLookup);
        } else if (authRes?.data?.branch) {
          setActiveBranch(authRes.data.branch);
        }

        if (menuRes?.data?.items?.length > 0) {
          setMenuItems(menuRes.data.items);
          setCategories(['All', ...(menuRes.data.categories || [])]);
        } else {
          // Fallback to /api/v1/menu/items if /active route wasn't matched
          const fallbackRes = await fetchApi(`/api/v1/menu/items${branchParam}`).catch(() => null);
          const rawItems = fallbackRes?.data?.items || fallbackRes?.data || [];
          if (Array.isArray(rawItems) && rawItems.length > 0) {
            const normalized = rawItems.map((i: any) => ({
              id: String(i.id),
              name: i.name,
              category: i.categoryName || i.category?.name || i.category || 'Menu',
              price: Number(i.price || 0),
              isAvailable: i.isAvailable !== false,
              sku: i.sku,
              image: i.imageUrl || i.image,
            }));
            const uniqueCats = Array.from(new Set(normalized.map((i: any) => i.category))) as string[];
            setMenuItems(normalized);
            setCategories(['All', ...uniqueCats]);
          }
        }

        if (tablesRes?.data) {
          setTables(tablesRes.data);
        }

        if (serviceModelsRes?.data && Array.isArray(serviceModelsRes.data)) {
          const activeOnly = serviceModelsRes.data.filter((m: ServiceModel) => m.isActive);
          setServiceModels(activeOnly);
          const defaultModel =
            activeOnly.find((m: ServiceModel) => m.type === 'DINE_IN') || activeOnly[0];
          if (defaultModel) setActiveServiceModel(defaultModel);
        }

        if (finRes?.data?.settings) {
          setFinancialSettings(finRes.data.settings);
        }

        if (receiptRes?.data && Array.isArray(receiptRes.data)) {
          const defaultTpl =
            receiptRes.data.find((t: ReceiptTemplate) => (t as any).isDefault) || receiptRes.data[0];
          if (defaultTpl) setReceiptTemplate(defaultTpl);
        }
      } catch (error) {
        console.warn('POS: Initializing terminal state.', error);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedDrawerId]
  );

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Debounced CRM & Loyalty Member Search
  useEffect(() => {
    if (!customerSearchQuery.trim() || customerSearchQuery.trim().length < 2) {
      setCustomerMatches([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingCustomers(true);
        const res = await fetchApi(
          `/api/v1/pos/customers?search=${encodeURIComponent(customerSearchQuery.trim())}`
        );
        setCustomerMatches(res?.data || []);
      } catch {
        setCustomerMatches([]);
      } finally {
        setIsSearchingCustomers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerSearchQuery]);

  const handleBranchSwitch = (newBranchId: string) => {
    const idNum = parseInt(newBranchId, 10);
    if (!idNum) return;
    setSelectedTableId('');
    setSelectedDrawerId('');
    setSelectedStationFilter('ALL');
    setOrderTargetStation('AUTO');
    loadInitialData(idNum);
  };

  const handleSelectLoyaltyCustomer = (cust: LoyaltyCustomerMatch) => {
    setSelectedCustomer(cust);
    setCustomerName(cust.name);
    setCustomerPhone(cust.phone);
    if (cust.kraPin) setBuyerKraPin(cust.kraPin);
    setCustomerSearchQuery('');
    setCustomerMatches([]);
    setSelectedReward(null);
  };

  const handleClearLoyaltyCustomer = () => {
    setSelectedCustomer(null);
    setSelectedReward(null);
    setCustomerName('');
    setCustomerPhone('');
    setBuyerKraPin('');
  };

  const handleApplyPromoCode = async () => {
    if (!promoCodeInput.trim()) return;
    try {
      setIsValidatingPromo(true);
      setPromoError(null);
      const rawSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const res = await fetchApi('/api/v1/pos/validate-promo', {
        method: 'POST',
        body: JSON.stringify({
          code: promoCodeInput.trim(),
          subtotalKes: rawSubtotal,
        }),
      });
      if (res?.data) {
        setAppliedPromo(res.data);
        setPromoCodeInput('');
      }
    } catch (err: any) {
      setPromoError(err.message || 'Invalid promo code');
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const currencySymbol = business?.currency || financialSettings?.baseCurrency || 'KES';

  // Unique station names available for catalog filtering
  const availableStationNames = useMemo(() => {
    const names = new Set<string>();
    kitchenStations.forEach((st) => {
      if (st.isActive) names.add(st.name);
    });
    Object.values(itemStationMap).forEach((m) => {
      if (m?.stationName) names.add(m.stationName);
    });
    return Array.from(names).sort();
  }, [kitchenStations, itemStationMap]);

  // Resolve effective KDS target station for any catalog or cart item
  const getEffectiveItemStation = useCallback(
    (item: { id: string; targetStation?: string }) => {
      if (orderTargetStation !== 'AUTO') {
        return {
          stationName: orderTargetStation,
          isRedirected: true,
          isFailover: false,
        };
      }
      if (item.targetStation) {
        return {
          stationName: item.targetStation,
          isRedirected: true,
          isFailover: false,
        };
      }
      const mapped = itemStationMap[Number(item.id)];
      return {
        stationName: mapped?.stationName || 'Main Kitchen',
        isRedirected: false,
        isFailover: mapped?.isFailover || false,
      };
    },
    [orderTargetStation, itemStationMap]
  );

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const itemStation = itemStationMap[Number(item.id)]?.stationName || 'Main Kitchen';
      const matchesStation =
        selectedStationFilter === 'ALL' || itemStation === selectedStationFilter;
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesStation && matchesSearch && item.isAvailable;
    });
  }, [menuItems, selectedCategory, selectedStationFilter, itemStationMap, searchQuery]);

  const addToCart = (item: MenuItem) => {
    const flag = availabilityMap[Number(item.id)];
    if (flag?.is86ed) return;

    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id && !c.notes && !c.targetStation);
      if (existing) {
        if (flag?.remainingCount !== null && flag?.remainingCount !== undefined) {
          if (existing.quantity >= flag.remainingCount) return prev;
        }
        return prev.map((c) =>
          c.cartItemId === existing.cartItemId ? { ...c, quantity: c.quantity + 1 } : c
        );
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
      handleClearLoyaltyCustomer();
      setOrderDiscountPercent(0);
      setOrderTargetStation('AUTO');
      setAppliedPromo(null);
      setPromoError(null);
      setGuestCount(1);
    }
  };

  // Group active cart items by resolved KDS station for checkout preview
  const stationRoutingPreview = useMemo(() => {
    const grouped: Record<
      string,
      { stationName: string; unitsCount: number; isRedirected: boolean; isFailover: boolean }
    > = {};

    for (const item of cart) {
      const resolved = getEffectiveItemStation(item);
      if (!grouped[resolved.stationName]) {
        grouped[resolved.stationName] = {
          stationName: resolved.stationName,
          unitsCount: 0,
          isRedirected: resolved.isRedirected,
          isFailover: resolved.isFailover,
        };
      }
      grouped[resolved.stationName].unitsCount += item.quantity;
      if (resolved.isRedirected) grouped[resolved.stationName].isRedirected = true;
      if (resolved.isFailover) grouped[resolved.stationName].isFailover = true;
    }

    return Object.values(grouped);
  }, [cart, getEffectiveItemStation]);

  // Real-Time Enterprise Financial & Loyalty Calculations
  const calculations = useMemo(() => {
    const rawSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const manualDiscountKes = rawSubtotal * (orderDiscountPercent / 100);
    const promoDiscountKes = appliedPromo ? appliedPromo.calculatedDiscountKes : 0;

    // Loyalty Reward Discount (if FIXED or PERCENTAGE reward redeemed)
    let rewardDiscountKes = 0;
    if (selectedReward) {
      if (selectedReward.rewardType === 'DISCOUNT_FIXED') {
        rewardDiscountKes = selectedReward.rewardValue;
      } else if (selectedReward.rewardType === 'PERCENTAGE_OFF') {
        rewardDiscountKes = rawSubtotal * (selectedReward.rewardValue / 100);
      }
    }

    const totalDiscountAmount = Math.min(
      rawSubtotal,
      manualDiscountKes + promoDiscountKes + rewardDiscountKes
    );
    const discountedGross = Math.max(0, rawSubtotal - totalDiscountAmount);

    const isVatInclusive = financialSettings ? financialSettings.isVatInclusive : true;
    const vatRate = financialSettings ? parseFloat(financialSettings.vatRate) / 100 : 0.16;
    const isCateringLevyEnabled = financialSettings
      ? financialSettings.isCateringLevyEnabled
      : true;
    const levyRate =
      isCateringLevyEnabled && financialSettings
        ? parseFloat(financialSettings.cateringLevyRate) / 100
        : 0.02;

    const modelServiceChargePercent = activeServiceModel?.autoApplyServiceCharge
      ? parseFloat(activeServiceModel.serviceChargePercent) / 100
      : financialSettings?.isServiceChargeEnabled
        ? parseFloat(financialSettings.serviceChargeRate) / 100
        : 0;

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

    // Loyalty Points Earned Preview (1 point per 100 KES * Tier Multiplier)
    const basePoints = Math.floor(grandTotal / 100);
    const multiplier = selectedCustomer?.earningMultiplier || 1;
    const estimatedPointsEarned = selectedCustomer ? Math.round(basePoints * multiplier) : 0;

    return {
      rawSubtotal,
      discountAmount: totalDiscountAmount,
      netAmount,
      vatAmount,
      levyAmount,
      serviceChargeAmount,
      packingChargeAmount,
      grandTotal,
      estimatedPointsEarned,
    };
  }, [
    cart,
    orderDiscountPercent,
    appliedPromo,
    selectedReward,
    financialSettings,
    activeServiceModel,
    selectedCustomer,
  ]);

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const selectedDrawerObj = useMemo(
    () => drawers.find((d) => String(d.id) === selectedDrawerId) || null,
    [drawers, selectedDrawerId]
  );

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
    if (!financialSettings?.enableSafeDropAlerts) return false;
    const currentBalance =
      activeShift?.expectedCash ?? selectedDrawerObj?.currentBalance ?? 0;
    const threshold =
      custodianGuardrails?.maxCashLimit ||
      parseFloat(financialSettings.maxDrawerCashThreshold) ||
      50000;
    return currentBalance >= threshold * 0.9;
  }, [financialSettings, activeShift, selectedDrawerObj, custodianGuardrails]);

  // Max discount ceiling allowed for this cashier assignment
  const maxAllowedDiscount = useMemo(() => {
    if (!custodianGuardrails) return 20;
    if (!custodianGuardrails.allowManualDiscount) return 0;
    return custodianGuardrails.maxDiscountPercent;
  }, [custodianGuardrails]);

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

      // 1. If Loyalty Reward was redeemed, execute redemption deduction first
      if (selectedCustomer && selectedReward) {
        await fetchApi('/api/v1/loyalty/rewards/redeem', {
          method: 'POST',
          body: JSON.stringify({
            customerId: selectedCustomer.id,
            rewardId: selectedReward.id,
            notes: `Redeemed at POS Terminal (${activeBranch?.name || 'Outlet'})`,
          }),
        });
      }

      // 2. Post Order, Tender Settlement & Station Routing Manifest
      const result = await fetchApi('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify({
          branchId: activeBranch?.id,
          cashDrawerId: selectedDrawerId ? parseInt(selectedDrawerId, 10) : undefined,
          cashierShiftId: activeShift?.id,
          customerId: selectedCustomer?.id,
          orderType: activeServiceModel?.name || 'Dine-In',
          serviceModelId: activeServiceModel?.id,
          tableId: selectedTableId ? parseInt(selectedTableId, 10) : undefined,
          tableName: tableObj ? tableObj.tableLabel : activeServiceModel?.name,
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          buyerKraPin: buyerKraPin.trim() || undefined,
          guestCount: activeServiceModel?.promptGuestCount ? guestCount : undefined,
          promoCode: appliedPromo?.code,
          targetStation: orderTargetStation !== 'AUTO' ? orderTargetStation : undefined,
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
            targetStation:
              orderTargetStation !== 'AUTO' ? orderTargetStation : i.targetStation,
            notes: i.notes,
          })),
        }),
      });

      if (activeServiceModel?.requiresTable && selectedTableId) {
        setTables((prev) =>
          prev.map((t) => (String(t.id) === selectedTableId ? { ...t, status: 'Occupied' } : t))
        );
      }

      // 3. Trigger M-Pesa STK Push if M-Pesa was selected or split
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

      const dispatchedStations = Array.from(
        new Set(stationRoutingPreview.map((s) => s.stationName))
      );

      const generatedReceipt = {
        ...(result?.data || {}),
        orderNumber:
          result?.data?.orderNumber ||
          `INV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
        items: cart.map((item) => ({
          ...item,
          resolvedStation: getEffectiveItemStation(item).stationName,
        })),
        dispatchedStations,
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
        loyaltyTier: selectedCustomer?.tierName || null,
        loyaltyPointsBalance: selectedCustomer
          ? selectedCustomer.currentPoints -
            (selectedReward?.pointsCost || 0) +
            calculations.estimatedPointsEarned
          : null,
        servedBy: currentUser?.fullName || currentUser?.firstName || 'POS Cashier',
        drawerName: selectedDrawerObj?.name || 'Main Till',
        timestamp: new Date().toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }),
        businessName: receiptTemplate?.headerTitle || business?.name || 'Restaurant Workspace',
        headerSubtitle: receiptTemplate?.headerSubtitle || '',
        branchName: activeBranch?.name || '',
        branchAddress: activeBranch?.address || '',
        branchPhone: activeBranch?.phone || business?.phone || '',
        kraPin: financialSettings?.taxPin || activeBranch?.kraPin || business?.kraPin || '',
        etimsDeviceSerial:
          activeBranch?.etimsDeviceSerial ||
          (financialSettings as any)?.etimsDeviceSerial ||
          'OSCU-SCU-2026-NBO',
        footerMessage: receiptTemplate?.footerMessage || 'Thank you for your business. Karibu tena!',
        returnPolicy: receiptTemplate?.returnPolicy || 'Consumables cannot be returned.',
        wifiDetails: receiptTemplate?.wifiDetails || null,
      };

      setCompletedOrder(generatedReceipt);
      setCart([]);
      setOrderTargetStation('AUTO');
      setAppliedPromo(null);
      setSelectedReward(null);
      setOrderDiscountPercent(0);
      setIsPaymentModalOpen(false);
      setMobileTab('menu');
      loadInitialData(activeBranch?.id);
    } catch (error: any) {
      alert(error.message || 'POS Checkout transaction encountered an error.');
    } finally {
      setIsCheckingOut(false);
    }
  };

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
            @page { size: ${paperWidth} auto; margin: 0mm !important; }
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
      {/* 1. ENTERPRISE TERMINAL HEADER: BRANCH, DRAWER & SHIFT TELEMETRY */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-2.5 bg-white px-4 py-2.5 rounded-2xl border border-gray-200 shadow-xs shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          {/* Branch Outlet Switcher */}
          <div className="flex items-center gap-2 bg-slate-50 border border-gray-200 px-3 py-1.5 rounded-xl">
            <Building2 size={15} className="text-servora-core shrink-0" />
            <div>
              <span className="text-[9px] font-bold uppercase text-gray-400 block leading-none">
                Active Outlet
              </span>
              {branches.length > 1 ? (
                <select
                  value={activeBranch?.id || ''}
                  onChange={(e) => handleBranchSwitch(e.target.value)}
                  className="bg-transparent text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-bold text-servora-navy">
                  {activeBranch?.name || 'Main Outlet'}
                </span>
              )}
            </div>
          </div>

          {/* Physical Cash Drawer Register Selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-gray-200 px-3 py-1.5 rounded-xl">
            <Wallet size={15} className="text-servora-core shrink-0" />
            <div>
              <span className="text-[9px] font-bold uppercase text-gray-400 block leading-none">
                Cash Drawer Register
              </span>
              {drawers.length > 0 ? (
                <select
                  value={selectedDrawerId}
                  onChange={(e) => setSelectedDrawerId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
                >
                  {drawers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} [{d.drawerCode}] &bull; {d.status}
                    </option>
                  ))}
                </select>
              ) : (
                <Link
                  href="/cash-management/drawers"
                  className="text-xs font-bold text-amber-700 hover:underline"
                >
                  No Drawers Configured &rarr;
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Shift Status, Safe Drop Alert & Sync */}
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-between xl:justify-end">
          {isSafeDropWarning && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold animate-pulse">
              <AlertTriangle size={13} className="text-amber-600" />
              <span>Safe Drop Threshold Reached</span>
            </div>
          )}

          {!activeShift ? (
            <Link
              href="/cash-management/shifts"
              className="bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors flex items-center gap-1.5"
            >
              <Clock size={13} /> No Active Shift &bull; Open Till Float &rarr;
            </Link>
          ) : (
            <Link
              href="/cash-management/shifts"
              className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
              title="Blind Custody Active — Manage Shift"
            >
              <Unlock size={13} className="text-emerald-600" />
              <span>Shift #{activeShift.id} &bull; Active</span>
            </Link>
          )}

          <button
            onClick={() => loadInitialData(activeBranch?.id)}
            title="Sync Workspace, Drawers & Catalog"
            className="p-2 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
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
            mobileTab === 'menu'
              ? 'bg-servora-navy text-white shadow-xs'
              : 'text-gray-500 hover:text-servora-navy'
          }`}
        >
          <Layers size={15} /> Catalog ({filteredItems.length})
        </button>
        <button
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all relative ${
            mobileTab === 'cart'
              ? 'bg-servora-navy text-white shadow-xs'
              : 'text-gray-500 hover:text-servora-navy'
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
        {/* LEFT COLUMN: ITEM CATALOG & STATION LOOKUP */}
        <div
          className={`flex-1 flex-col min-h-0 bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden ${
            mobileTab === 'menu' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="p-3 border-b border-gray-200 space-y-2.5 shrink-0 bg-white">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={15}
                />
                <input
                  type="text"
                  placeholder="Scan SKU or search dishes, beverages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core transition-all"
                />
              </div>

              {/* Station Filter Dropdown */}
              {availableStationNames.length > 0 && (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 px-2.5 py-1.5 rounded-xl">
                  <ChefHat size={13} className="text-servora-core" />
                  <select
                    value={selectedStationFilter}
                    onChange={(e) => setSelectedStationFilter(e.target.value)}
                    className="bg-transparent text-xs font-bold text-servora-navy focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All Stations</option>
                    {availableStationNames.map((stName) => (
                      <option key={stName} value={stName}>
                        {stName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                          {t.tableLabel} ({t.status}){' '}
                          {isOccupied && !isCurrentlySelected ? '— In Use' : ''}
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

          {/* Product Cards Grid with 86'd, Low-Stock & Station Routing Telemetry */}
          <div className="flex-1 overflow-y-auto p-3.5 bg-slate-50/50">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-servora-deepTeal animate-pulse">
                Synchronizing product catalog...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                <Utensils size={40} className="mb-2 opacity-25" />
                <p className="text-sm font-bold text-servora-navy">No products available</p>
                <p className="text-xs text-gray-400">
                  Refine search criteria or check menu configuration.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {filteredItems.map((item) => {
                  const flag = availabilityMap[Number(item.id)];
                  const is86ed = flag?.is86ed === true;
                  const lowCount = flag?.remainingCount;
                  const mappedStation = itemStationMap[Number(item.id)];

                  return (
                    <button
                      key={item.id}
                      onClick={() => addToCart(item)}
                      disabled={is86ed}
                      className={`flex flex-col text-left p-3 rounded-xl border shadow-xs transition-all h-32 justify-between group ${
                        is86ed
                          ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                          : 'bg-white border-gray-200 hover:border-servora-core/40 hover:shadow-md active:scale-97 cursor-pointer'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-servora-deepTeal bg-slate-100 px-1.5 py-0.5 rounded-md truncate">
                            {item.category}
                          </span>
                          {is86ed ? (
                            <span className="text-[9px] font-bold uppercase bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-md">
                              86&apos;d
                            </span>
                          ) : lowCount !== null && lowCount !== undefined && lowCount <= 5 ? (
                            <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md">
                              {lowCount} left
                            </span>
                          ) : null}
                        </div>
                        <span className="text-xs font-bold text-servora-navy line-clamp-2 leading-tight group-hover:text-servora-core transition-colors">
                          {item.name}
                        </span>
                      </div>

                      <div className="space-y-1 pt-1 border-t border-gray-50">
                        <div className="flex items-center gap-1 text-[9.5px] font-mono text-gray-500 truncate">
                          <ChefHat size={10} className="text-servora-core shrink-0" />
                          <span className="truncate">
                            {mappedStation?.stationName || 'Main Kitchen'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-mono font-bold text-servora-core">
                            {currencySymbol} {item.price.toLocaleString()}
                          </span>
                          <div className="w-5 h-5 rounded-lg bg-slate-50 border border-gray-200 flex items-center justify-center text-gray-400 group-hover:bg-servora-core group-hover:text-white transition-colors">
                            <Plus size={11} />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE CHECK, STATION ROUTING, CRM LOYALTY & FISCAL LEDGER */}
        <div
          className={`w-full lg:w-[450px] flex-col bg-white rounded-2xl shadow-xs border border-gray-200 shrink-0 overflow-hidden h-full ${
            mobileTab === 'cart' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Dynamic Service Model Revenue Center Selectors */}
          <div className="flex p-1.5 bg-slate-50 border-b border-gray-200 shrink-0 gap-1 overflow-x-auto scrollbar-hide">
            {serviceModels.length > 0 ? (
              serviceModels.map((model) => {
                const Icon = SERVICE_MODEL_ICONS[model.type] || ShoppingBag;
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

          {/* Order-Wide KDS Prep Station Routing Bar */}
          {kitchenStations.length > 0 && (
            <div className="px-3 py-2 bg-blue-50/40 border-b border-gray-200 flex items-center justify-between gap-2 text-xs shrink-0">
              <span className="font-bold text-servora-navy flex items-center gap-1.5">
                <ChefHat size={13} className="text-servora-core" /> KDS Routing:
              </span>
              <select
                value={orderTargetStation}
                onChange={(e) => setOrderTargetStation(e.target.value)}
                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[11px] font-bold text-servora-navy focus:outline-none focus:border-servora-core cursor-pointer"
              >
                <option value="AUTO">Auto-Route by Item / Category</option>
                {kitchenStations
                  .filter((s) => s.isActive)
                  .map((st) => (
                    <option key={st.id} value={st.name}>
                      Redirect All &rarr; {st.name} ({st.code})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* CRM Member Lookup & Guest Identity Section */}
          <div className="p-3 border-b border-gray-200 bg-white space-y-2 shrink-0 text-xs">
            {activeServiceModel?.requiresTable && (
              <div className="p-2 bg-blue-50/70 border border-blue-200 rounded-xl font-bold text-servora-core flex justify-between items-center text-xs">
                <span className="flex items-center gap-1.5">
                  <Utensils size={13} /> Seating Assignment:
                </span>
                <span>
                  {tables.find((t) => String(t.id) === selectedTableId)?.tableLabel ||
                    '⚠️ Table Required'}
                </span>
              </div>
            )}

            {/* CRM & Loyalty Directory Search Bar */}
            {!selectedCustomer ? (
              <div className="relative">
                <Award
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-500"
                  size={14}
                />
                <input
                  type="text"
                  placeholder="Lookup CRM / Loyalty Member by phone, name, or PIN..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-amber-50/40 border border-amber-200/80 rounded-xl focus:outline-none focus:border-amber-400 text-xs"
                />
                {customerMatches.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto divide-y divide-gray-100">
                    {customerMatches.map((cust) => (
                      <button
                        key={cust.id}
                        type="button"
                        onClick={() => handleSelectLoyaltyCustomer(cust)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50/60 flex justify-between items-center cursor-pointer"
                      >
                        <div>
                          <span className="font-bold text-servora-navy block">{cust.name}</span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            {cust.phone} {cust.kraPin ? `• PIN: ${cust.kraPin}` : ''}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold block">
                            {cust.tierName}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-servora-core">
                            {cust.currentPoints.toLocaleString()} pts
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Active Loyalty Member Profile Card */
              <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <UserCheck size={15} className="text-amber-700 shrink-0" />
                    <div>
                      <span className="font-bold text-servora-navy block leading-tight">
                        {selectedCustomer.name}
                      </span>
                      <span className="text-[10px] font-mono text-gray-600">
                        {selectedCustomer.tierName} ({selectedCustomer.earningMultiplier}x) &bull;{' '}
                        <strong>{selectedCustomer.currentPoints.toLocaleString()} pts</strong>
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearLoyaltyCustomer}
                    className="text-gray-400 hover:text-rose-600 cursor-pointer"
                    title="Detach Member"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Eligible Rewards Redemption Dropdown */}
                {loyaltyRewards.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Gift size={13} className="text-amber-700 shrink-0" />
                    <select
                      value={selectedReward?.id || ''}
                      onChange={(e) => {
                        const rId = parseInt(e.target.value, 10);
                        setSelectedReward(loyaltyRewards.find((r) => r.id === rId) || null);
                      }}
                      className="flex-1 bg-white border border-amber-200 rounded-lg px-2 py-1 text-[11px] font-bold text-servora-navy focus:outline-none cursor-pointer"
                    >
                      <option value="">Redeem Member Reward (Optional)</option>
                      {loyaltyRewards.map((r) => (
                        <option
                          key={r.id}
                          value={r.id}
                          disabled={selectedCustomer.currentPoints < r.pointsCost}
                        >
                          {r.name} (-{r.pointsCost.toLocaleString()} pts)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Walk-in / Manual Guest Fields */}
            {!selectedCustomer && (
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
            )}

            {/* Buyer KRA PIN, Guest Covers & Custodian-Guarded Discount */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Buyer KRA PIN (eTIMS)"
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

              <div
                className="flex items-center gap-1 bg-slate-50 border border-gray-200 rounded-xl px-2"
                title={`Custodian Max Discount: ${maxAllowedDiscount}%`}
              >
                {maxAllowedDiscount === 0 ? (
                  <Lock size={11} className="text-gray-400" />
                ) : (
                  <Percent size={11} className="text-gray-400" />
                )}
                <select
                  value={orderDiscountPercent}
                  disabled={maxAllowedDiscount === 0}
                  onChange={(e) => setOrderDiscountPercent(Number(e.target.value))}
                  className="bg-transparent text-xs font-bold text-servora-navy focus:outline-none cursor-pointer disabled:opacity-50"
                >
                  <option value="0">0%</option>
                  {maxAllowedDiscount >= 5 && <option value="5">5%</option>}
                  {maxAllowedDiscount >= 10 && <option value="10">10%</option>}
                  {maxAllowedDiscount >= 15 && <option value="15">15%</option>}
                  {maxAllowedDiscount >= 20 && <option value="20">20%</option>}
                </select>
              </div>
            </div>

            {/* Dynamic Promotional Code Input */}
            <div className="flex gap-1.5 items-center">
              {!appliedPromo ? (
                <>
                  <div className="relative flex-1">
                    <Tag
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                      size={12}
                    />
                    <input
                      type="text"
                      placeholder="Promo Code (e.g. BRUNCH20)"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                      className="w-full pl-7 pr-2.5 py-1 bg-slate-50 border border-gray-200 rounded-lg font-mono uppercase text-[11px] focus:outline-none focus:border-servora-core"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyPromoCode}
                    disabled={!promoCodeInput.trim() || cart.length === 0 || isValidatingPromo}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-servora-navy font-bold rounded-lg text-[11px] disabled:opacity-40 cursor-pointer"
                  >
                    {isValidatingPromo ? '...' : 'Apply'}
                  </button>
                </>
              ) : (
                <div className="flex-1 flex justify-between items-center px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-800 font-bold">
                  <span className="flex items-center gap-1 font-mono">
                    <Tag size={11} /> {appliedPromo.code} (-{currencySymbol}{' '}
                    {appliedPromo.calculatedDiscountKes.toLocaleString()})
                  </span>
                  <button
                    type="button"
                    onClick={() => setAppliedPromo(null)}
                    className="text-emerald-700 hover:text-rose-600 cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
            </div>
            {promoError && <p className="text-[10px] text-rose-600 font-bold">{promoError}</p>}
          </div>

          {/* Cart Itemized List with Per-Item Station Override & Prep Note */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <ShoppingBag size={36} className="mb-2 opacity-25" />
                <p className="text-xs font-bold text-servora-navy">Ticket is empty</p>
                <p className="text-[11px] text-gray-400">Select dishes or beverages from catalog</p>
              </div>
            ) : (
              cart.map((item) => {
                const defaultSt =
                  itemStationMap[Number(item.id)]?.stationName || 'Main Kitchen';
                const resolvedSt = getEffectiveItemStation(item);

                return (
                  <div
                    key={item.cartItemId}
                    className="bg-slate-50/70 border border-gray-200 p-2.5 rounded-xl shadow-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 pr-2">
                        <h4 className="text-xs font-bold text-servora-navy line-clamp-1">
                          {item.name}
                        </h4>
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

                    {/* Per-Item KDS Station Redirect & Kitchen Note */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
                      <select
                        value={
                          orderTargetStation !== 'AUTO'
                            ? orderTargetStation
                            : item.targetStation || ''
                        }
                        disabled={orderTargetStation !== 'AUTO'}
                        onChange={(e) => {
                          const val = e.target.value || undefined;
                          setCart((prev) =>
                            prev.map((c) =>
                              c.cartItemId === item.cartItemId ? { ...c, targetStation: val } : c
                            )
                          );
                        }}
                        title="Redirect this item to a specific kitchen/bar station"
                        className={`border rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold focus:outline-none cursor-pointer max-w-[165px] truncate ${
                          resolvedSt.isRedirected
                            ? 'bg-amber-50 border-amber-300 text-amber-800'
                            : 'bg-white border-gray-200 text-servora-navy'
                        }`}
                      >
                        <option value="">Default ({defaultSt})</option>
                        {kitchenStations
                          .filter((s) => s.isActive)
                          .map((st) => (
                            <option key={st.id} value={st.name}>
                              &rarr; {st.name}
                            </option>
                          ))}
                      </select>

                      <input
                        type="text"
                        placeholder="+ Prep note..."
                        value={item.notes || ''}
                        onChange={(e) =>
                          setCart((prev) =>
                            prev.map((c) =>
                              c.cartItemId === item.cartItemId
                                ? { ...c, notes: e.target.value }
                                : c
                            )
                          )
                        }
                        className="flex-1 min-w-[80px] bg-white border border-gray-200 rounded-md px-2 py-0.5 text-[10px] text-gray-700 focus:outline-none focus:border-servora-core"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Dynamic Financial Summary & Action Buttons */}
          <div className="p-3.5 bg-slate-50 border-t border-gray-200 shrink-0 space-y-2">
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

              {calculations.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Total Discounts &amp; Rewards</span>
                  <span className="font-mono">
                    -{currencySymbol}{' '}
                    {calculations.discountAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}

              {selectedCustomer && calculations.estimatedPointsEarned > 0 && (
                <div className="flex justify-between text-amber-700 font-bold text-[11px]">
                  <span>Loyalty Points Earned</span>
                  <span className="font-mono">+{calculations.estimatedPointsEarned} pts</span>
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

      {/* TENDER SETTLEMENT & STATION ROUTING MODAL */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-servora-navy">
                  Tender Settlement &amp; KDS Routing
                </h3>
                <p className="text-[11px] text-gray-500">
                  {activeBranch?.name || 'Outlet'} &bull;{' '}
                  {selectedDrawerObj?.name || 'Register'} &bull;{' '}
                  {selectedTableId
                    ? `Table ${tables.find((t) => String(t.id) === selectedTableId)?.tableLabel}`
                    : activeServiceModel?.name || 'Counter'}
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

            {/* KDS Prep Station Dispatch Preview */}
            {stationRoutingPreview.length > 0 && (
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-1.5 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-servora-navy flex items-center gap-1">
                  <ChefHat size={12} className="text-servora-core" /> KDS Prep Station Dispatch
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {stationRoutingPreview.map((st) => (
                    <span
                      key={st.stationName}
                      className={`px-2 py-0.5 rounded-lg text-[10.5px] font-mono font-bold border inline-flex items-center gap-1 ${
                        st.isRedirected || st.isFailover
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-white text-servora-navy border-gray-200'
                      }`}
                    >
                      <ArrowRight size={10} className="text-servora-core" />
                      {st.stationName}: {st.unitsCount} item(s)
                      {st.isRedirected ? ' (Redirected)' : st.isFailover ? ' (Failover)' : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

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
                    <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                      Cash Portioned
                    </label>
                    <input
                      type="number"
                      value={splitCashAmount}
                      onChange={(e) => setSplitCashAmount(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-0.5">
                      M-Pesa Portioned
                    </label>
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
                  Authorize Transaction &amp; Route to KDS
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
            <div ref={receiptPrintRef} className="space-y-1 w-full text-black">
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
                    {completedOrder.branchName}{' '}
                    {completedOrder.branchAddress && `• ${completedOrder.branchAddress}`}
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
                {completedOrder.dispatchedStations?.length > 0 && (
                  <p className="text-[9.5px] font-bold">
                    KDS Stations: {completedOrder.dispatchedStations.join(', ')}
                  </p>
                )}
              </div>

              <div className="dashed-divider"></div>

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
                {completedOrder.drawerName && (
                  <div className="flex-between">
                    <span>Register:</span>
                    <span>{completedOrder.drawerName}</span>
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

              <div className="space-y-1">
                {completedOrder.items.map((i: any) => (
                  <div key={i.cartItemId} className="space-y-0.5">
                    <div className="flex-between text-[11px]">
                      <span className="font-bold max-w-[70%] break-words">
                        {i.quantity}x {i.name}
                      </span>
                      <span className="font-bold whitespace-nowrap">
                        {(i.price * i.quantity).toLocaleString()}
                      </span>
                    </div>
                    {receiptTemplate?.showKitchenNotes && i.notes && (
                      <p className="text-[9.5px] italic pl-2">* {i.notes}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="dashed-divider"></div>

              <div className="space-y-1 text-[11px]">
                <div className="flex-between">
                  <span>Net Food &amp; Beverage:</span>
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
                    <span>
                      {currencySymbol} {completedOrder.packingChargeAmount.toLocaleString()}
                    </span>
                  </div>
                )}
                {completedOrder.discountAmount > 0 && (
                  <div className="flex-between font-bold">
                    <span>Savings / Discount:</span>
                    <span>
                      -{currencySymbol}{' '}
                      {completedOrder.discountAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
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

              <div className="space-y-0.5 text-[11px]">
                <div className="flex-between font-bold">
                  <span>Tender:</span>
                  <span className="uppercase">{completedOrder.paymentMethod}</span>
                </div>
                {completedOrder.cashChangeDue > 0 && (
                  <div className="flex-between font-bold">
                    <span>Change Returned:</span>
                    <span>
                      {currencySymbol} {completedOrder.cashChangeDue.toLocaleString()}
                    </span>
                  </div>
                )}
                {receiptTemplate?.showLoyaltyPoints !== false &&
                  completedOrder.loyaltyTier && (
                    <div className="pt-1 border-t border-dashed border-gray-400 space-y-0.5">
                      <div className="flex-between">
                        <span>Loyalty Tier:</span>
                        <span className="font-bold">{completedOrder.loyaltyTier}</span>
                      </div>
                      <div className="flex-between">
                        <span>Points Earned:</span>
                        <span className="font-bold">+{completedOrder.estimatedPointsEarned} pts</span>
                      </div>
                      <div className="flex-between">
                        <span>New Balance:</span>
                        <span className="font-bold">
                          {completedOrder.loyaltyPointsBalance?.toLocaleString()} pts
                        </span>
                      </div>
                    </div>
                  )}
              </div>

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