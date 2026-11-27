// apps/web/app/(dashboard)/pos/page.tsx
'use client';

import { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ShoppingBasket,
  CreditCard,
  Clock,
  Utensils,
  Printer,
  CheckCircle,
  CheckCircle2,
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
  SlidersHorizontal,
  Wifi,
  WifiOff,
  UploadCloud,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { isKioskOnlySession } from '@/lib/rbac';
import { getOptimizedMenuImageUrl } from '@/lib/cloudinary';
import { syncPosMenuImagesCache } from '@/lib/pos-image-cache';
import {
  cacheOfflinePolicy,
  cachePosSnapshot,
  getCachedPosSnapshot,
  enqueueOfflineOrder,
  getQueuedOfflineOrders,
  syncQueuedTransactions,
  isOfflineOrNetworkError,
  type CachedPosSnapshot,
} from '@/lib/offline-engine';
import PosPinKioskOverlay, {
  type KioskOperatorOption,
  type SwitchedOperatorSession,
} from '@/components/pos/PosPinKioskOverlay';

interface UserProfile {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: string;
  permissions?: string[];
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
  activeSessionId?: number | null;
  hasOpenSession?: boolean;
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

interface StockRequirementLine {
  inventoryItemId: number;
  inventoryItemName: string;
  requiredPerPortion: number;
  unit: string;
  currentStock: number;
  allowNegativeStock: boolean;
}

interface ItemAvailabilityFlag {
  menuItemId: number;
  is86ed: boolean;
  remainingCount: number | null;
  maxAvailable?: number | null;
  stockTrackingType?: string;
  limitingIngredientName?: string | null;
  requirements?: StockRequirementLine[];
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

interface PosModifierOption {
  id: number;
  name: string;
  priceAdjustment: number;
  linkedInventoryItemId: number | null;
  linkedQuantity: number;
  linkedUnit: string | null;
  isDefault: boolean;
}

interface PosModifierGroup {
  id: number;
  name: string;
  description: string | null;
  minSelections: number;
  maxSelections: number;
  isRequired: boolean;
  options: PosModifierOption[];
}

interface SelectedCartModifier {
  modifierId: number;
  groupName: string;
  name: string;
  price: number;
  linkedInventoryItemId?: number | null;
  linkedQuantity?: number;
}

interface ComboComponentItem {
  menuItemId: number;
  quantity: number;
  additionalPrice: number;
  itemName: string;
  itemPrice: number;
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  activePricingRule?: {
    id: number;
    ruleName: string;
    ruleType: string;
  } | null;
  isAvailable: boolean;
  sku?: string;
  image?: string | null;
  imageUrl?: string | null;
  imageCardUrl?: string | null;
  imagePublicId?: string | null;
  isCombo?: boolean;
  comboId?: number;
  comboItems?: ComboComponentItem[];
}

interface CartItem extends MenuItem {
  cartItemId: string;
  basePrice?: number;
  quantity: number;
  targetStation?: string;
  selectedModifiers?: SelectedCartModifier[];
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
  etimsDeviceSerial?: string | null;
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

interface ReadyFoodNotification {
  id: number;
  title: string;
  detail: string;
  createdAt: string;
}

type PaymentMethod = 'Cash' | 'M-Pesa' | 'Card' | 'Split';
type MobileTab = 'menu' | 'cart';

const COMBOS_CATEGORY_LABEL = 'Combos & Bundles';

const SERVICE_MODEL_ICONS: Record<string, typeof Utensils> = {
  DINE_IN: Utensils,
  QUICK_SERVICE: ShoppingBag,
  BAR_TAB: Wine,
  TAKEAWAY: ShoppingBag,
  DELIVERY: Truck,
  DRIVE_THRU: Car,
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function getModifierSignature(mods?: SelectedCartModifier[]): string {
  if (!mods || mods.length === 0) return '';
  return mods
    .map((m) => m.modifierId)
    .sort((a, b) => a - b)
    .join(',');
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isValidKenyanPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-+]/g, '');
  return /^(?:254|0)[17]\d{8}$/.test(cleaned);
}

/**
 * Memoized POS Product Card with fixed 4:3 Cloudinary image, zero layout shift,
 * lazy loading, graceful fallback, pricing rule strikethrough, and stock badges.
 */
const PosCatalogCard = memo(function PosCatalogCard({
  item,
  currencySymbol,
  remaining,
  stationName,
  hasModifiers,
  cartQty,
  onAdd,
}: {
  item: MenuItem;
  currencySymbol: string;
  remaining: number | null;
  stationName: string;
  hasModifiers: boolean;
  cartQty: number;
  onAdd: (item: MenuItem) => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const rawImg = item.imageCardUrl || item.imageUrl || item.image || null;
  const imgSrc = !imgFailed ? getOptimizedMenuImageUrl(rawImg, 'card') : null;
  const isOutOfStock = remaining !== null && remaining <= 0;

  return (
    <button
      type="button"
      onClick={() => onAdd(item)}
      disabled={isOutOfStock}
      className={`flex flex-col text-left rounded-2xl border overflow-hidden shadow-xs transition-all justify-between group min-w-0 ${
        isOutOfStock
          ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
          : cartQty > 0
            ? 'bg-blue-50/40 border-servora-core ring-1 ring-servora-core/20 hover:shadow-md active:scale-[0.98] cursor-pointer'
            : item.isCombo
              ? 'bg-blue-50/20 border-blue-200 hover:border-servora-core hover:shadow-md active:scale-[0.98] cursor-pointer'
              : 'bg-white border-gray-200 hover:border-servora-core/50 hover:shadow-md active:scale-[0.98] cursor-pointer'
      }`}
    >
      {/* Fixed 4:3 Image Container */}
      <div className="relative w-full aspect-[4/3] bg-servora-pale overflow-hidden shrink-0">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={item.name}
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-servora-deepTeal/25">
            {item.isCombo ? <ShoppingBasket size={26} /> : <Utensils size={24} />}
          </div>
        )}

        {/* Top-Left Category / Combo Pill */}
        <span
          className={`absolute top-1.5 left-1.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md max-w-[56%] truncate inline-flex items-center gap-0.5 shadow-xs ${
            item.isCombo
              ? 'bg-servora-core text-white'
              : 'bg-white/90 text-servora-navy backdrop-blur-xs'
          }`}
        >
          {item.isCombo ? (
            <>
              <ShoppingBasket size={9} className="shrink-0" /> Combo
            </>
          ) : (
            item.category
          )}
        </span>

        {/* Top-Right Stock / 86ed / Modifier Badge */}
        <div className="absolute top-1.5 right-1.5 flex flex-col items-end gap-1">
          {isOutOfStock ? (
            <span className="text-[8.5px] font-bold uppercase bg-rose-600 text-white px-1.5 py-0.5 rounded-md shadow-xs">
              Out
            </span>
          ) : remaining !== null && remaining <= 5 ? (
            <span className="text-[8.5px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-md shadow-xs">
              {remaining} left
            </span>
          ) : remaining !== null ? (
            <span className="text-[8.5px] font-mono font-bold bg-emerald-600/90 text-white px-1.5 py-0.5 rounded-md shadow-xs">
              {remaining}
            </span>
          ) : null}

          {hasModifiers && !isOutOfStock && (
            <span
              title="Customizable options"
              className="inline-flex items-center gap-0.5 text-[8.5px] font-bold text-white bg-servora-navy/85 px-1.5 py-0.5 rounded-md backdrop-blur-xs"
            >
              <SlidersHorizontal size={8} /> Opts
            </span>
          )}
        </div>

        {/* Bottom-Right In-Cart Quantity Indicator */}
        {cartQty > 0 && (
          <span className="absolute bottom-1.5 right-1.5 min-w-[22px] h-[22px] px-1.5 rounded-full bg-servora-core text-white text-[10px] font-mono font-bold flex items-center justify-center shadow-md ring-2 ring-white">
            {cartQty}
          </span>
        )}
      </div>

      {/* Card Body */}
      <div className="p-2 sm:p-2.5 flex-1 flex flex-col justify-between gap-1.5 w-full min-w-0">
        <div className="min-w-0">
          <span className="text-[11.5px] sm:text-xs font-bold text-servora-navy line-clamp-2 leading-tight group-hover:text-servora-core transition-colors">
            {item.name}
          </span>
          <div className="flex items-center gap-1 text-[9.5px] font-mono text-gray-500 mt-0.5 truncate">
            {item.isCombo && item.comboItems ? (
              <span className="truncate text-servora-deepTeal font-sans">
                {item.comboItems.map((c) => `${c.quantity}x ${c.itemName}`).join(' + ')}
              </span>
            ) : (
              <>
                <ChefHat size={10} className="text-servora-core shrink-0" />
                <span className="truncate">{stationName}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center gap-1 pt-1 border-t border-gray-100 min-w-0">
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="text-[11.5px] sm:text-xs font-mono font-bold text-servora-core truncate">
              {currencySymbol} {item.price.toLocaleString()}
            </span>
            {item.activePricingRule &&
              item.originalPrice !== undefined &&
              item.originalPrice !== item.price && (
                <span
                  title={item.activePricingRule.ruleName}
                  className="text-[9.5px] font-mono text-gray-400 line-through truncate"
                >
                  {item.originalPrice.toLocaleString()}
                </span>
              )}
          </div>
          <div className="w-6 h-6 rounded-lg bg-servora-pale border border-servora-core/20 flex items-center justify-center text-servora-core group-hover:bg-servora-core group-hover:text-white transition-colors shrink-0">
            <Plus size={12} />
          </div>
        </div>
      </div>
    </button>
  );
});

export default function POSPage() {
  const searchParams = useSearchParams();
  const preselectedTableId = searchParams.get('tableId');
  const receiptPrintRef = useRef<HTMLDivElement>(null);
  const loadRequestIdRef = useRef(0);

  // Responsive UI Collapsible Toggles
  const [isTerminalControlsOpen, setIsTerminalControlsOpen] = useState(false);
  const [isOrderMetaExpanded, setIsOrderMetaExpanded] = useState(false);

  // Dynamic Workspace, Branch & Auth User States
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [branches, setBranches] = useState<BranchProfile[]>([]);
  const [activeBranch, setActiveBranch] = useState<BranchProfile | null>(null);

  // Shared Kiosk PIN Operator Switching & Dual-Token Lockout States
  const [kioskOperators, setKioskOperators] = useState<KioskOperatorOption[]>([]);
  const [isPinKioskOpen, setIsPinKioskOpen] = useState(false);
  const [isTerminalLocked, setIsTerminalLocked] = useState(false);
  const [autoLockAfterSale, setAutoLockAfterSale] = useState(false);
  const [isDedicatedKiosk, setIsDedicatedKiosk] = useState(false);

  // Live KDS "Food Ready at Pass" Alerts for Active Waiter/Cashier
  const [readyFoodAlerts, setReadyFoodAlerts] = useState<ReadyFoodNotification[]>([]);

  // Cash Drawers, Active Shift & Custodian Guardrails
  const [drawers, setDrawers] = useState<CashDrawerOption[]>([]);
  const [selectedDrawerId, setSelectedDrawerId] = useState<string>('');
  const [activeShift, setActiveShift] = useState<ActiveCashierShift | null>(null);
  const [custodianGuardrails, setCustodianGuardrails] = useState<CustodianGuardrails | null>(null);

  // Catalog, Availability, Modifiers & Prep Station Routing Matrix
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStationFilter, setSelectedStationFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [availabilityMap, setAvailabilityMap] = useState<Record<number, ItemAvailabilityFlag>>({});
  const [kitchenStations, setKitchenStations] = useState<KitchenStationOption[]>([]);
  const [itemStationMap, setItemStationMap] = useState<Record<number, ItemStationMapping>>({});
  const [itemModifierGroupsMap, setItemModifierGroupsMap] = useState<
    Record<number, PosModifierGroup[]>
  >({});
  const [orderTargetStation, setOrderTargetStation] = useState<string>('AUTO');

  // Modifier Customization Modal State
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [draftSelections, setDraftSelections] = useState<Record<number, number[]>>({});
  const [modifierModalError, setModifierModalError] = useState<string | null>(null);

  // Offline Survivability & Queue States
  const [isOnline, setIsOnline] = useState(true);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);
  const [offlineSyncBanner, setOfflineSyncBanner] = useState<string | null>(null);
  const [offlineMpesaRef, setOfflineMpesaRef] = useState('');

  // Inline Stock, Clear Confirmation & Checkout Alert Banners
  const [stockAlert, setStockAlert] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [confirmClearArmed, setConfirmClearArmed] = useState(false);

  // CRM Customer & Loyalty Engine States
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerMatches, setCustomerMatches] = useState<LoyaltyCustomerMatch[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<LoyaltyCustomerMatch | null>(null);
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

  // Tender, Idempotency & Checkout States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [checkoutIdempotencyKey, setCheckoutIdempotencyKey] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [splitCashAmount, setSplitCashAmount] = useState<string>('');
  const [splitMpesaAmount, setSplitMpesaAmount] = useState<string>('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Completed Receipt State
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);

  // Detect dedicated kiosk mode flag on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const kioskFlag = localStorage.getItem('servora_kiosk_mode') === 'true';
      setIsDedicatedKiosk(kioskFlag);
      if (kioskFlag) {
        setAutoLockAfterSale(true);
      }
    }
  }, []);

  const hydrateFromSnapshot = useCallback((cached: CachedPosSnapshot) => {
    setBusiness((cached.business as BusinessProfile | null) ?? null);
    setCurrentUser((cached.currentUser as UserProfile | null) ?? null);
    setBranches((cached.branches as BranchProfile[]) || []);
    setActiveBranch((cached.activeBranch as BranchProfile | null) ?? null);
    setDrawers((cached.drawers as CashDrawerOption[]) || []);
    setActiveShift((cached.activeShift as ActiveCashierShift | null) ?? null);
    setCustodianGuardrails((cached.custodianGuardrails as CustodianGuardrails | null) ?? null);
    setLoyaltyRewards((cached.loyaltyRewards as LoyaltyRewardOption[]) || []);
    setKitchenStations((cached.kitchenStations as KitchenStationOption[]) || []);
    setItemStationMap((cached.itemStationMap as Record<number, ItemStationMapping>) || {});
    setItemModifierGroupsMap(
      (cached.itemModifierGroupsMap as Record<number, PosModifierGroup[]>) || {}
    );
    setAvailabilityMap((cached.availabilityMap as Record<number, ItemAvailabilityFlag>) || {});
    setMenuItems((cached.menuItems as MenuItem[]) || []);
    setCategories(cached.categories?.length ? cached.categories : ['All']);
    setTables((cached.tables as RestaurantTable[]) || []);

    const cachedModels = (cached.serviceModels as ServiceModel[]) || [];
    setServiceModels(cachedModels);
    const defaultModel =
      cachedModels.find((m) => m.type === 'DINE_IN') || cachedModels[0] || null;
    if (defaultModel) setActiveServiceModel((prev) => prev ?? defaultModel);

    setFinancialSettings((cached.financialSettings as FinancialSettings | null) ?? null);
    setReceiptTemplate((cached.receiptTemplate as ReceiptTemplate | null) ?? null);
  }, []);

  const loadInitialData = useCallback(
    async (overrideBranchId?: number) => {
      const requestId = ++loadRequestIdRef.current;

      try {
        setIsLoading(true);
        const queued = await getQueuedOfflineOrders();
        if (requestId !== loadRequestIdRef.current) return;
        setPendingOfflineCount(queued.length);

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          setIsOnline(false);
          const cached = await getCachedPosSnapshot();
          if (cached && requestId === loadRequestIdRef.current) {
            hydrateFromSnapshot(cached);
          }
          setIsLoading(false);
          return;
        }

        const savedBranchId =
          overrideBranchId ||
          (typeof window !== 'undefined'
            ? Number(localStorage.getItem('servora_active_branch_id')) || undefined
            : undefined);

        const branchParam = savedBranchId ? `?branchId=${savedBranchId}` : '';
        const comboQuery = `?activeOnly=true${savedBranchId ? `&branchId=${savedBranchId}` : ''}`;

        const [
          authRes,
          posContextRes,
          menuRes,
          combosRes,
          tablesRes,
          serviceModelsRes,
          finRes,
          receiptRes,
          offlineSettingsRes,
        ] = await Promise.all([
          fetchApi('/api/v1/auth/me').catch(() => null),
          fetchApi(`/api/v1/pos/context${branchParam}`).catch(() => null),
          fetchApi(`/api/v1/menu/active${branchParam}`).catch(() => ({
            data: { items: [], categories: [] },
          })),
          fetchApi(`/api/v1/menu/combos${comboQuery}`).catch(() => ({ data: [] })),
          fetchApi(`/api/v1/restaurant/tables${branchParam}`).catch(() => ({ data: [] })),
          fetchApi('/api/v1/settings/service-models').catch(() => ({ data: [] })),
          fetchApi('/api/v1/settings/financial').catch(() => ({ data: null })),
          fetchApi('/api/v1/settings/receipts').catch(() => ({ data: [] })),
          fetchApi('/api/v1/settings/offline').catch(() => null),
        ]);

        if (requestId !== loadRequestIdRef.current) return;

        if (!authRes && !posContextRes && !(menuRes?.data?.items?.length > 0)) {
          const cached = await getCachedPosSnapshot();
          if (cached) {
            hydrateFromSnapshot(cached);
            setIsLoading(false);
            return;
          }
        }

        if (offlineSettingsRes?.data?.settings) {
          const s = offlineSettingsRes.data.settings;
          void cacheOfflinePolicy({
            allowOfflineSales: s.allowOfflineSales,
            maxOfflineHours: s.maxOfflineHours,
            maxOfflineTicketTotal: parseFloat(s.maxOfflineTicketTotal) || 0,
            maxOfflineCumulativeBalance: parseFloat(s.maxOfflineCumulativeBalance) || 0,
            autoSyncOnReconnect: s.autoSyncOnReconnect,
            syncBatchSize: s.syncBatchSize,
            syncIntervalSeconds: s.syncIntervalSeconds,
            allowOfflineCash: s.allowOfflineCash,
            allowOfflineCard: s.allowOfflineCard,
            allowOfflineMpesaReference: s.allowOfflineMpesaReference,
            allowOfflineGiftCards: s.allowOfflineGiftCards,
            allowOfflineCreditTabs: s.allowOfflineCreditTabs,
          }).catch(() => {});
        }

        let resolvedBusiness: BusinessProfile | null = null;
        let resolvedUser: UserProfile | null = null;
        let resolvedBranches: BranchProfile[] = [];
        let resolvedActiveBranch: BranchProfile | null = null;
        let resolvedDrawers: CashDrawerOption[] = [];
        let resolvedActiveShift: ActiveCashierShift | null = null;
        let resolvedGuardrails: CustodianGuardrails | null = null;
        let resolvedRewards: LoyaltyRewardOption[] = [];
        let resolvedStations: KitchenStationOption[] = [];
        let resolvedStationMap: Record<number, ItemStationMapping> = {};
        let resolvedModifierMap: Record<number, PosModifierGroup[]> = {};
        const availLookup: Record<number, ItemAvailabilityFlag> = {};

        if (authRes?.data) {
          resolvedBusiness = authRes.data.business ?? null;
          resolvedUser = authRes.data.user ?? null;
          setBusiness(resolvedBusiness);
          if (resolvedUser) {
            setCurrentUser(resolvedUser);

            // Auto-lock shared kiosk station whenever sitting on the idle station account (`pos.kiosk`)
            if (isKioskOnlySession(resolvedUser.permissions, resolvedUser.role)) {
              setIsDedicatedKiosk(true);
              setAutoLockAfterSale(true);
              setIsTerminalLocked(true);
              setIsPinKioskOpen(true);
            }
          }
        }

        if (posContextRes?.data) {
          const ctx = posContextRes.data;
          resolvedBranches = ctx.branches || [];
          resolvedActiveBranch = ctx.activeBranch || authRes?.data?.branch || null;
          resolvedDrawers = ctx.drawers || [];
          resolvedActiveShift = ctx.activeShift || null;
          resolvedGuardrails = ctx.custodianGuardrails || null;
          resolvedRewards = ctx.loyaltyRewards || [];
          resolvedStations = ctx.kitchenStations || [];
          resolvedStationMap = ctx.itemStationMap || {};
          resolvedModifierMap = ctx.itemModifierGroupsMap || {};

          setBranches(resolvedBranches);
          setActiveBranch(resolvedActiveBranch);
          if (resolvedActiveBranch && typeof window !== 'undefined') {
            localStorage.setItem('servora_active_branch_id', String(resolvedActiveBranch.id));
          }

          setDrawers(resolvedDrawers);
          setActiveShift(resolvedActiveShift);
          setCustodianGuardrails(resolvedGuardrails);
          setLoyaltyRewards(resolvedRewards);
          setKitchenStations(resolvedStations);
          setItemStationMap(resolvedStationMap);
          setItemModifierGroupsMap(resolvedModifierMap);

          if (resolvedGuardrails?.cashDrawerId) {
            setSelectedDrawerId(String(resolvedGuardrails.cashDrawerId));
          } else if (resolvedDrawers.length > 0) {
            setSelectedDrawerId((prev) => {
              if (prev && resolvedDrawers.some((d) => String(d.id) === prev)) return prev;
              const openDrawer = resolvedDrawers.find(
                (d) => d.status === 'OPEN' || d.hasOpenSession
              );
              return String((openDrawer || resolvedDrawers[0]).id);
            });
          } else {
            setSelectedDrawerId('');
          }

          for (const flag of ctx.itemAvailability || []) {
            availLookup[flag.menuItemId] = flag;
          }
          setAvailabilityMap(availLookup);
        } else if (authRes?.data?.branch) {
          resolvedActiveBranch = authRes.data.branch;
          setActiveBranch(resolvedActiveBranch);
        }

        if (resolvedActiveBranch) {
          fetchApi(`/api/v1/pos/kiosk-operators?branchId=${resolvedActiveBranch.id}`)
            .then((res) => {
              if (requestId === loadRequestIdRef.current && Array.isArray(res?.data)) {
                setKioskOperators(res.data);
              }
            })
            .catch(() => {});
        } else {
          setKioskOperators([]);
        }

        let baseItems: MenuItem[] = [];
        let baseCategories: string[] = [];

        if (menuRes?.data?.items?.length > 0) {
          baseItems = menuRes.data.items;
          baseCategories = menuRes.data.categories || [];
        } else {
          const fallbackRes = await fetchApi(`/api/v1/menu/catalog${branchParam}`).catch(() => null);
          const rawItems = fallbackRes?.data?.items || [];
          if (Array.isArray(rawItems) && rawItems.length > 0) {
            baseItems = rawItems.map(
              (i: {
                id: number | string;
                name: string;
                category?: string;
                price?: number | string;
                isAvailable?: boolean;
                sku?: string;
                imageUrl?: string | null;
                imagePublicId?: string | null;
              }) => ({
                id: String(i.id),
                name: i.name,
                category: i.category || 'Menu',
                price: Number(i.price || 0),
                isAvailable: i.isAvailable !== false,
                sku: i.sku,
                image: i.imageUrl ?? null,
                imageUrl: i.imageUrl ?? null,
                imagePublicId: i.imagePublicId ?? null,
              })
            );
            baseCategories = Array.from(new Set(baseItems.map((i) => i.category)));
          }
        }

        const rawCombos = Array.isArray(combosRes?.data) ? combosRes.data : [];
        const comboMenuItems: MenuItem[] = rawCombos
          .filter(
            (c: { effectiveAvailable?: boolean; isAvailable?: boolean; items?: unknown[] }) =>
              c.effectiveAvailable !== false &&
              c.isAvailable !== false &&
              Array.isArray(c.items) &&
              c.items.length > 0
          )
          .map(
            (c: {
              id: number;
              name: string;
              sku?: string | null;
              basePrice: string | number;
              isAvailable: boolean;
              imageUrl?: string | null;
              imageCardUrl?: string | null;
              imagePublicId?: string | null;
              items: Array<{
                menuItemId: number;
                quantity: number;
                additionalPrice?: string | number;
                itemName?: string | null;
                itemPrice?: string | number | null;
              }>;
            }) => ({
              id: `combo-${c.id}`,
              comboId: c.id,
              isCombo: true,
              name: c.name,
              category: COMBOS_CATEGORY_LABEL,
              price: Number(c.basePrice || 0),
              isAvailable: c.isAvailable !== false,
              sku: c.sku || undefined,
              image: c.imageCardUrl || c.imageUrl || null,
              imageUrl: c.imageUrl || null,
              imageCardUrl: c.imageCardUrl || null,
              imagePublicId: c.imagePublicId || null,
              comboItems: c.items.map((line) => ({
                menuItemId: Number(line.menuItemId),
                quantity: Number(line.quantity) || 1,
                additionalPrice: Number(line.additionalPrice || 0),
                itemName: line.itemName || `Item #${line.menuItemId}`,
                itemPrice: Number(line.itemPrice || 0),
              })),
            })
          );

        const mergedItems = [...comboMenuItems, ...baseItems];
        const mergedCategories = Array.from(
          new Set([
            'All',
            ...(comboMenuItems.length > 0 ? [COMBOS_CATEGORY_LABEL] : []),
            ...baseCategories,
          ])
        );

        setMenuItems(mergedItems);
        setCategories(mergedCategories);

        void syncPosMenuImagesCache(
          mergedItems.map((m) => m.imageCardUrl || m.imageUrl || m.image)
        );

        const resolvedTables: RestaurantTable[] = Array.isArray(tablesRes?.data)
          ? tablesRes.data
          : [];
        setTables(resolvedTables);

        const resolvedModels: ServiceModel[] = Array.isArray(serviceModelsRes?.data)
          ? serviceModelsRes.data.filter((m: ServiceModel) => m.isActive)
          : [];
        setServiceModels(resolvedModels);
        const defaultModel =
          resolvedModels.find((m) => m.type === 'DINE_IN') || resolvedModels[0] || null;
        if (defaultModel) {
          setActiveServiceModel((prev) =>
            prev && resolvedModels.some((m) => m.id === prev.id) ? prev : defaultModel
          );
        }

        const resolvedFinancial: FinancialSettings | null = finRes?.data?.settings ?? null;
        if (resolvedFinancial) {
          setFinancialSettings(resolvedFinancial);
        }

        let resolvedTemplate: ReceiptTemplate | null = null;
        if (receiptRes?.data && Array.isArray(receiptRes.data)) {
          resolvedTemplate =
            receiptRes.data.find((t: ReceiptTemplate & { isDefault?: boolean }) => t.isDefault) ||
            receiptRes.data[0] ||
            null;
          if (resolvedTemplate) setReceiptTemplate(resolvedTemplate);
        }

        if (mergedItems.length > 0) {
          void cachePosSnapshot({
            branchId: resolvedActiveBranch?.id,
            business: resolvedBusiness,
            currentUser: resolvedUser,
            branches: resolvedBranches,
            activeBranch: resolvedActiveBranch,
            drawers: resolvedDrawers,
            activeShift: resolvedActiveShift,
            custodianGuardrails: resolvedGuardrails,
            loyaltyRewards: resolvedRewards,
            kitchenStations: resolvedStations,
            itemStationMap: resolvedStationMap,
            itemModifierGroupsMap: resolvedModifierMap,
            availabilityMap: availLookup,
            menuItems: mergedItems,
            categories: mergedCategories,
            tables: resolvedTables,
            serviceModels: resolvedModels,
            financialSettings: resolvedFinancial,
            receiptTemplate: resolvedTemplate,
            cachedAt: new Date().toISOString(),
          }).catch(() => {});
        }
      } catch (error) {
        console.warn('POS: Initializing terminal state from cache if available.', error);
        const cached = await getCachedPosSnapshot();
        if (cached && requestId === loadRequestIdRef.current) {
          hydrateFromSnapshot(cached);
        }
      } finally {
        if (requestId === loadRequestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [hydrateFromSnapshot]
  );

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Live 15s Poller for KDS "Food Ready at Pass" Notifications
  useEffect(() => {
    if (!isOnline || !activeBranch?.id || !currentUser?.id || isTerminalLocked) {
      return;
    }

    let cancelled = false;

    const pollKdsFoodReady = async () => {
      try {
        const res = await fetchApi(
          `/api/v1/notifications?module=KDS&isRead=FALSE&branchId=${activeBranch.id}&limit=5`
        );
        if (!cancelled && Array.isArray(res?.data?.notifications)) {
          setReadyFoodAlerts(res.data.notifications);
        }
      } catch {
        // Silent fallback on degraded network
      }
    };

    void pollKdsFoodReady();
    const timer = setInterval(pollKdsFoodReady, 15000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isOnline, activeBranch?.id, currentUser?.id, isTerminalLocked]);

  const handleAcknowledgeFoodReady = useCallback(async (notifId: number) => {
    setReadyFoodAlerts((prev) => prev.filter((a) => a.id !== notifId));
    try {
      await fetchApi(`/api/v1/notifications/${notifId}/read`, { method: 'PATCH' });
    } catch {
      // Non-blocking acknowledgement
    }
  }, []);

  // Dual-Token Lock: Reverts active Bearer token back to the powerless Kiosk Station JWT
  const lockTerminalToKioskPin = useCallback(() => {
    if (typeof window !== 'undefined') {
      const stationToken = localStorage.getItem('servora_kiosk_station_token');
      if (stationToken) {
        localStorage.setItem('servora_token', stationToken);
        localStorage.removeItem('token');
      }
    }
    setCart([]);
    setReadyFoodAlerts([]);
    setOrderDiscountPercent(0);
    setAppliedPromo(null);
    setSelectedReward(null);
    setIsPaymentModalOpen(false);
    setIsTerminalLocked(true);
    setIsPinKioskOpen(true);
  }, []);

  // Authoritative PIN Kiosk Operator Session Swap
  const handleOperatorSwitched = useCallback(
    async (session: SwitchedOperatorSession) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('servora_token', session.token);

        try {
          const cached = localStorage.getItem('servora_cached_workspace');
          const parsed = cached ? JSON.parse(cached) : {};
          localStorage.setItem(
            'servora_cached_workspace',
            JSON.stringify({ ...parsed, user: session.user })
          );
        } catch {
          // Ignore malformed workspace cache
        }

        window.dispatchEvent(
          new CustomEvent('servora:operator-switched', { detail: session.user })
        );
      }

      setCurrentUser(session.user);
      setReadyFoodAlerts([]);
      setOrderDiscountPercent(0);
      setIsPinKioskOpen(false);
      setIsTerminalLocked(false);
      setOfflineSyncBanner(
        `Active POS operator switched to ${session.user.fullName} (${session.user.role}).`
      );
      await loadInitialData(activeBranch?.id);
    },
    [loadInitialData, activeBranch?.id]
  );

  // Manual & Automatic Reconnect Reconciliation for Offline Queued Orders
  const handleSyncOfflineQueue = useCallback(async () => {
    if (isSyncingOffline) return;
    try {
      setIsSyncingOffline(true);
      const res = await syncQueuedTransactions();
      setPendingOfflineCount(res.remainingCount);
      if (res.syncedCount > 0 || res.conflictCount > 0) {
        setOfflineSyncBanner(res.message);
        await loadInitialData(activeBranch?.id);
      }
    } catch (err: unknown) {
      setStockAlert(getErrorMessage(err, 'Failed to sync queued offline transactions.'));
    } finally {
      setIsSyncingOffline(false);
    }
  }, [isSyncingOffline, loadInitialData, activeBranch?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);

    const onOnline = async () => {
      setIsOnline(true);
      const queued = await getQueuedOfflineOrders();
      setPendingOfflineCount(queued.length);
      if (queued.length > 0) {
        await handleSyncOfflineQueue();
      } else {
        await loadInitialData(activeBranch?.id);
      }
    };

    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [handleSyncOfflineQueue, loadInitialData, activeBranch?.id]);

  // Debounced CRM & Loyalty Member Search
  useEffect(() => {
    if (!isOnline || !customerSearchQuery.trim() || customerSearchQuery.trim().length < 2) {
      setCustomerMatches([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetchApi(
          `/api/v1/pos/customers?search=${encodeURIComponent(customerSearchQuery.trim())}`
        );
        setCustomerMatches(res?.data || []);
      } catch {
        setCustomerMatches([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerSearchQuery, isOnline]);

  // Aggregate direct cart counts by catalog card id (for visual card badges)
  const cartQtyByCardId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const line of cart) {
      map[line.id] = (map[line.id] ?? 0) + line.quantity;
    }
    return map;
  }, [cart]);

  // Aggregate total units of each menuItemId currently in cart
  const cartMenuItemQuantities = useMemo(() => {
    const qtyMap: Record<number, number> = {};
    for (const cartLine of cart) {
      if (cartLine.isCombo && cartLine.comboItems?.length) {
        for (const comp of cartLine.comboItems) {
          qtyMap[comp.menuItemId] =
            (qtyMap[comp.menuItemId] ?? 0) + comp.quantity * cartLine.quantity;
        }
      } else {
        const idNum = Number(cartLine.id);
        if (!Number.isNaN(idNum)) {
          qtyMap[idNum] = (qtyMap[idNum] ?? 0) + cartLine.quantity;
        }
      }
    }
    return qtyMap;
  }, [cart]);

  // Compute total raw-material consumption reserved by active cart
  const cartIngredientConsumption = useMemo(() => {
    const usedByInvId: Record<number, number> = {};

    for (const [menuIdStr, totalQty] of Object.entries(cartMenuItemQuantities)) {
      const flag = availabilityMap[Number(menuIdStr)];
      if (!flag?.requirements?.length) continue;
      for (const req of flag.requirements) {
        usedByInvId[req.inventoryItemId] =
          (usedByInvId[req.inventoryItemId] ?? 0) + req.requiredPerPortion * totalQty;
      }
    }

    for (const cartLine of cart) {
      if (!cartLine.selectedModifiers?.length) continue;
      for (const mod of cartLine.selectedModifiers) {
        if (mod.linkedInventoryItemId && mod.linkedQuantity && mod.linkedQuantity > 0) {
          usedByInvId[mod.linkedInventoryItemId] =
            (usedByInvId[mod.linkedInventoryItemId] ?? 0) +
            mod.linkedQuantity * cartLine.quantity;
        }
      }
    }

    return usedByInvId;
  }, [cartMenuItemQuantities, availabilityMap, cart]);

  const getSingleItemRemainingSellable = useCallback(
    (menuItemId: number): { remaining: number | null; limitingName: string | null } => {
      const flag = availabilityMap[menuItemId];
      if (!flag) return { remaining: null, limitingName: null };
      if (flag.is86ed) return { remaining: 0, limitingName: flag.limitingIngredientName ?? null };

      const qtyInCart = cartMenuItemQuantities[menuItemId] ?? 0;

      let remaining: number | null = null;
      let limitingName: string | null = flag.limitingIngredientName ?? null;

      if (flag.requirements && flag.requirements.length > 0) {
        for (const req of flag.requirements) {
          if (req.allowNegativeStock || req.requiredPerPortion <= 0) continue;
          const alreadyUsed = cartIngredientConsumption[req.inventoryItemId] ?? 0;
          const remainingStock = Math.max(0, req.currentStock - alreadyUsed);
          const canAdd = Math.floor((remainingStock + 0.00001) / req.requiredPerPortion);

          if (remaining === null || canAdd < remaining) {
            remaining = canAdd;
            limitingName = req.inventoryItemName;
          }
        }
      }

      const cap = flag.maxAvailable ?? flag.remainingCount;
      if (cap !== null && cap !== undefined) {
        const capRemaining = Math.max(0, cap - qtyInCart);
        if (remaining === null || capRemaining < remaining) {
          remaining = capRemaining;
        }
      }

      return { remaining, limitingName };
    },
    [availabilityMap, cartMenuItemQuantities, cartIngredientConsumption]
  );

  const getItemRemainingSellable = useCallback(
    (item: MenuItem): { remaining: number | null; limitingName: string | null } => {
      if (!item.isCombo || !item.comboItems?.length) {
        return getSingleItemRemainingSellable(Number(item.id));
      }

      let comboLimit: number | null = null;
      let limitingName: string | null = null;

      const bundleInvDemand: Record<
        number,
        { neededPerBundle: number; currentStock: number; name: string }
      > = {};

      for (const comp of item.comboItems) {
        const flag = availabilityMap[comp.menuItemId];
        if (!flag) continue;

        if (flag.is86ed) {
          return { remaining: 0, limitingName: comp.itemName };
        }

        const cap = flag.maxAvailable ?? flag.remainingCount;
        if (cap !== null && cap !== undefined) {
          const alreadyInCart = cartMenuItemQuantities[comp.menuItemId] ?? 0;
          const compRemaining = Math.max(0, cap - alreadyInCart);
          const bundlesFromCap = Math.floor(compRemaining / comp.quantity);
          if (comboLimit === null || bundlesFromCap < comboLimit) {
            comboLimit = bundlesFromCap;
            limitingName = comp.itemName;
          }
        }

        if (flag.requirements?.length) {
          for (const req of flag.requirements) {
            if (req.allowNegativeStock || req.requiredPerPortion <= 0) continue;
            if (!bundleInvDemand[req.inventoryItemId]) {
              bundleInvDemand[req.inventoryItemId] = {
                neededPerBundle: 0,
                currentStock: req.currentStock,
                name: req.inventoryItemName,
              };
            }
            bundleInvDemand[req.inventoryItemId].neededPerBundle +=
              req.requiredPerPortion * comp.quantity;
          }
        }
      }

      for (const [invIdStr, demand] of Object.entries(bundleInvDemand)) {
        const alreadyUsed = cartIngredientConsumption[Number(invIdStr)] ?? 0;
        const remainingStock = Math.max(0, demand.currentStock - alreadyUsed);
        const bundlesPossible = Math.floor(
          (remainingStock + 0.00001) / demand.neededPerBundle
        );
        if (comboLimit === null || bundlesPossible < comboLimit) {
          comboLimit = bundlesPossible;
          limitingName = demand.name;
        }
      }

      return { remaining: comboLimit, limitingName };
    },
    [
      availabilityMap,
      cartIngredientConsumption,
      cartMenuItemQuantities,
      getSingleItemRemainingSellable,
    ]
  );

  const handleBranchSwitch = (newBranchId: string) => {
    const idNum = parseInt(newBranchId, 10);
    if (!idNum) return;
    setSelectedTableId('');
    setSelectedDrawerId('');
    setSelectedStationFilter('ALL');
    setOrderTargetStation('AUTO');
    setReadyFoodAlerts([]);
    setStockAlert(null);
    setCart([]);
    setConfirmClearArmed(false);
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
    if (!isOnline) {
      setPromoError('Promo code validation requires an active network connection.');
      return;
    }
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
        setOrderDiscountPercent(0);
        setPromoCodeInput('');
      }
    } catch (err: unknown) {
      setPromoError(getErrorMessage(err, 'Invalid promo code'));
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const currencySymbol = business?.currency || financialSettings?.baseCurrency || 'KES';

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

  const getEffectiveItemStation = useCallback(
    (item: {
      id: string;
      targetStation?: string;
      isCombo?: boolean;
      comboItems?: ComboComponentItem[];
    }) => {
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
      if (item.isCombo && item.comboItems?.length) {
        const stationNames = Array.from(
          new Set(
            item.comboItems.map(
              (c) => itemStationMap[c.menuItemId]?.stationName || 'Main Kitchen'
            )
          )
        );
        return {
          stationName: stationNames.length === 1 ? stationNames[0] : 'Multi-Station Bundle',
          isRedirected: false,
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

      let matchesStation = true;
      if (selectedStationFilter !== 'ALL') {
        if (item.isCombo && item.comboItems?.length) {
          matchesStation = item.comboItems.some(
            (c) =>
              (itemStationMap[c.menuItemId]?.stationName || 'Main Kitchen') ===
              selectedStationFilter
          );
        } else {
          const itemStation = itemStationMap[Number(item.id)]?.stationName || 'Main Kitchen';
          matchesStation = itemStation === selectedStationFilter;
        }
      }

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.isCombo &&
          item.comboItems?.some((c) => c.itemName.toLowerCase().includes(q)));

      return matchesCategory && matchesStation && matchesSearch && item.isAvailable;
    });
  }, [menuItems, selectedCategory, selectedStationFilter, itemStationMap, searchQuery]);

  const openModifierPicker = useCallback((item: MenuItem, groups: PosModifierGroup[]) => {
    const initial: Record<number, number[]> = {};
    for (const g of groups) {
      const defaults = g.options
        .filter((o) => o.isDefault)
        .slice(0, g.maxSelections)
        .map((o) => o.id);
      initial[g.id] = defaults;
    }
    setDraftSelections(initial);
    setModifierModalError(null);
    setCustomizingItem(item);
  }, []);

  const addToCart = useCallback(
    (item: MenuItem) => {
      const { remaining, limitingName } = getItemRemainingSellable(item);
      if (remaining !== null && remaining <= 0) {
        setStockAlert(
          limitingName
            ? `Cannot add "${item.name}": available stock for ${limitingName} is exhausted.`
            : `Cannot add "${item.name}": no available stock remaining.`
        );
        return;
      }

      const attachedGroups = !item.isCombo ? itemModifierGroupsMap[Number(item.id)] : undefined;
      if (attachedGroups && attachedGroups.length > 0) {
        setStockAlert(null);
        openModifierPicker(item, attachedGroups);
        return;
      }

      setStockAlert(null);
      setConfirmClearArmed(false);
      setCart((prev) => {
        const existing = prev.find(
          (c) =>
            c.id === item.id &&
            !c.notes &&
            !c.targetStation &&
            (!c.selectedModifiers || c.selectedModifiers.length === 0)
        );
        if (existing) {
          return prev.map((c) =>
            c.cartItemId === existing.cartItemId ? { ...c, quantity: c.quantity + 1 } : c
          );
        }
        return [
          ...prev,
          {
            ...item,
            basePrice: item.price,
            cartItemId: crypto.randomUUID(),
            quantity: 1,
          },
        ];
      });
    },
    [getItemRemainingSellable, itemModifierGroupsMap, openModifierPicker]
  );

  const draftCustomizedUnitPrice = useMemo(() => {
    if (!customizingItem) return 0;
    const groups = itemModifierGroupsMap[Number(customizingItem.id)] || [];
    let delta = 0;
    for (const g of groups) {
      const picked = draftSelections[g.id] || [];
      for (const optId of picked) {
        const opt = g.options.find((o) => o.id === optId);
        if (opt) delta += opt.priceAdjustment;
      }
    }
    return roundMoney(customizingItem.price + delta);
  }, [customizingItem, itemModifierGroupsMap, draftSelections]);

  const handleConfirmModifiers = () => {
    if (!customizingItem) return;
    const groups = itemModifierGroupsMap[Number(customizingItem.id)] || [];

    const chosen: SelectedCartModifier[] = [];
    for (const g of groups) {
      const pickedIds = draftSelections[g.id] || [];
      const requiredMin = g.isRequired ? Math.max(1, g.minSelections) : g.minSelections;
      if (pickedIds.length < requiredMin) {
        setModifierModalError(`"${g.name}" requires at least ${requiredMin} selection(s).`);
        return;
      }
      if (pickedIds.length > g.maxSelections) {
        setModifierModalError(`"${g.name}" allows at most ${g.maxSelections} selection(s).`);
        return;
      }
      for (const optId of pickedIds) {
        const opt = g.options.find((o) => o.id === optId);
        if (opt) {
          chosen.push({
            modifierId: opt.id,
            groupName: g.name,
            name: opt.name,
            price: opt.priceAdjustment,
            linkedInventoryItemId: opt.linkedInventoryItemId,
            linkedQuantity: opt.linkedQuantity,
          });
        }
      }
    }

    const modDelta = chosen.reduce((sum, m) => sum + m.price, 0);
    const unitPriceWithMods = roundMoney(customizingItem.price + modDelta);
    const newSig = getModifierSignature(chosen);

    setConfirmClearArmed(false);
    setCart((prev) => {
      const existing = prev.find(
        (c) =>
          c.id === customizingItem.id &&
          !c.notes &&
          !c.targetStation &&
          getModifierSignature(c.selectedModifiers) === newSig
      );
      if (existing) {
        return prev.map((c) =>
          c.cartItemId === existing.cartItemId ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          ...customizingItem,
          basePrice: customizingItem.price,
          price: unitPriceWithMods,
          selectedModifiers: chosen,
          cartItemId: crypto.randomUUID(),
          quantity: 1,
        },
      ];
    });

    setCustomizingItem(null);
    setModifierModalError(null);
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    const targetLine = cart.find((c) => c.cartItemId === cartItemId);
    if (!targetLine) return;

    if (delta > 0) {
      const { remaining, limitingName } = getItemRemainingSellable(targetLine);
      if (remaining !== null && delta > remaining) {
        setStockAlert(
          limitingName
            ? `Stock limit reached for "${targetLine.name}" (limited by ${limitingName}).`
            : `Stock limit reached for "${targetLine.name}".`
        );
        return;
      }
    }

    setStockAlert(null);
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

  const handleClearTicket = () => {
    if (!confirmClearArmed) {
      setConfirmClearArmed(true);
      setTimeout(() => setConfirmClearArmed(false), 4000);
      return;
    }
    setCart([]);
    setSelectedTableId('');
    handleClearLoyaltyCustomer();
    setOrderDiscountPercent(0);
    setOrderTargetStation('AUTO');
    setAppliedPromo(null);
    setPromoError(null);
    setStockAlert(null);
    setGuestCount(1);
    setConfirmClearArmed(false);
  };

  const expandCartForOrderApi = useCallback(
    (cartLines: CartItem[]) => {
      const expanded: Array<{
        menuItemId: number;
        name: string;
        quantity: number;
        unitPrice: number;
        modifiersPrice?: number;
        totalPrice: number;
        sku?: string;
        targetStation?: string;
        selectedModifiers?: Array<{ modifierId: number; name: string; price: number }>;
        notes?: string;
      }> = [];

      for (const line of cartLines) {
        if (line.isCombo && line.comboItems && line.comboItems.length > 0) {
          const bundleTotal = roundMoney(line.price * line.quantity);
          const componentWeights = line.comboItems.map((comp) =>
            Math.max(0, (comp.itemPrice + comp.additionalPrice) * comp.quantity)
          );
          const totalWeight = componentWeights.reduce((s, w) => s + w, 0);

          let allocatedSoFar = 0;

          line.comboItems.forEach((comp, idx) => {
            const totalCompQty = comp.quantity * line.quantity;
            const isLast = idx === line.comboItems!.length - 1;
            const compLineTotal = isLast
              ? roundMoney(bundleTotal - allocatedSoFar)
              : totalWeight > 0
                ? roundMoney((bundleTotal * componentWeights[idx]) / totalWeight)
                : roundMoney(bundleTotal / line.comboItems!.length);

            allocatedSoFar = roundMoney(allocatedSoFar + compLineTotal);

            const notePrefix = `[Combo: ${line.name}]`;
            const combinedNote = line.notes ? `${notePrefix} ${line.notes}` : notePrefix;

            expanded.push({
              menuItemId: comp.menuItemId,
              name: comp.itemName,
              quantity: totalCompQty,
              unitPrice: totalCompQty > 0 ? roundMoney(compLineTotal / totalCompQty) : 0,
              totalPrice: compLineTotal,
              sku: line.sku,
              targetStation:
                orderTargetStation !== 'AUTO' ? orderTargetStation : line.targetStation,
              notes: combinedNote,
            });
          });
        } else {
          const modList = (line.selectedModifiers ?? []).map((m) => ({
            modifierId: m.modifierId,
            name: `${m.groupName}: ${m.name}`,
            price: m.price,
          }));
          const modifiersPrice = roundMoney(modList.reduce((sum, m) => sum + m.price, 0));
          const modNoteText =
            modList.length > 0 ? modList.map((m) => m.name).join(' | ') : '';
          const combinedNote =
            modNoteText && line.notes
              ? `${modNoteText} — ${line.notes}`
              : line.notes || modNoteText || undefined;

          expanded.push({
            menuItemId: parseInt(line.id, 10),
            name: line.name,
            quantity: line.quantity,
            unitPrice: line.price,
            modifiersPrice,
            totalPrice: roundMoney(line.price * line.quantity),
            sku: line.sku,
            targetStation:
              orderTargetStation !== 'AUTO' ? orderTargetStation : line.targetStation,
            selectedModifiers: modList.length > 0 ? modList : undefined,
            notes: combinedNote,
          });
        }
      }

      return expanded;
    },
    [orderTargetStation]
  );

  const stationRoutingPreview = useMemo(() => {
    const grouped: Record<
      string,
      { stationName: string; unitsCount: number; isRedirected: boolean; isFailover: boolean }
    > = {};

    const addStationUnits = (
      resolved: { stationName: string; isRedirected: boolean; isFailover: boolean },
      units: number
    ) => {
      if (!grouped[resolved.stationName]) {
        grouped[resolved.stationName] = {
          stationName: resolved.stationName,
          unitsCount: 0,
          isRedirected: resolved.isRedirected,
          isFailover: resolved.isFailover,
        };
      }
      grouped[resolved.stationName].unitsCount += units;
      if (resolved.isRedirected) grouped[resolved.stationName].isRedirected = true;
      if (resolved.isFailover) grouped[resolved.stationName].isFailover = true;
    };

    for (const item of cart) {
      if (item.isCombo && item.comboItems?.length) {
        for (const comp of item.comboItems) {
          const resolved = getEffectiveItemStation({
            id: String(comp.menuItemId),
            targetStation: item.targetStation,
          });
          addStationUnits(resolved, comp.quantity * item.quantity);
        }
      } else {
        const resolved = getEffectiveItemStation(item);
        addStationUnits(resolved, item.quantity);
      }
    }

    return Object.values(grouped);
  }, [cart, getEffectiveItemStation]);

  const calculations = useMemo(() => {
    const rawSubtotal = roundMoney(
      cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    );
    const manualDiscountKes = roundMoney(rawSubtotal * (orderDiscountPercent / 100));
    const promoDiscountKes = appliedPromo ? roundMoney(appliedPromo.calculatedDiscountKes) : 0;

    let rewardDiscountKes = 0;
    if (selectedReward) {
      if (selectedReward.rewardType === 'DISCOUNT_FIXED') {
        rewardDiscountKes = roundMoney(selectedReward.rewardValue);
      } else if (selectedReward.rewardType === 'PERCENTAGE_OFF') {
        rewardDiscountKes = roundMoney(rawSubtotal * (selectedReward.rewardValue / 100));
      }
    }

    const totalDiscountAmount = roundMoney(
      Math.min(rawSubtotal, manualDiscountKes + promoDiscountKes + rewardDiscountKes)
    );
    const discountedGross = roundMoney(Math.max(0, rawSubtotal - totalDiscountAmount));

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

    const packingChargeAmount = roundMoney(
      activeServiceModel ? parseFloat(activeServiceModel.packingChargeAmount) || 0 : 0
    );

    let netAmount = 0;
    let vatAmount = 0;
    let levyAmount = 0;
    let serviceChargeAmount = 0;
    let grandTotal = 0;

    if (isVatInclusive) {
      const combinedDivisor = 1 + vatRate + levyRate + modelServiceChargePercent;
      netAmount = roundMoney(discountedGross / combinedDivisor);
      vatAmount = roundMoney(netAmount * vatRate);
      levyAmount = roundMoney(netAmount * levyRate);
      serviceChargeAmount = roundMoney(netAmount * modelServiceChargePercent);
      grandTotal = roundMoney(discountedGross + packingChargeAmount);
    } else {
      netAmount = discountedGross;
      vatAmount = roundMoney(netAmount * vatRate);
      levyAmount = roundMoney(netAmount * levyRate);
      serviceChargeAmount = roundMoney(netAmount * modelServiceChargePercent);
      grandTotal = roundMoney(
        netAmount + vatAmount + levyAmount + serviceChargeAmount + packingChargeAmount
      );
    }

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

  const selectedTableObj = useMemo(
    () => tables.find((t) => String(t.id) === selectedTableId) || null,
    [tables, selectedTableId]
  );

  // Permission-Driven Capabilities (Zero Hardcoded Custom Role Slugs)
  const userPermissions = useMemo(
    () => (Array.isArray(currentUser?.permissions) ? currentUser.permissions : []),
    [currentUser?.permissions]
  );

  const isWildcardAdmin =
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'SUPER_ADMIN' ||
    userPermissions.includes('*');

  const canManageCashShift =
    isWildcardAdmin ||
    userPermissions.includes('cash.view') ||
    userPermissions.includes('cash.reconcile');

  const canToggleAutoLock =
    isWildcardAdmin ||
    userPermissions.includes('staff.manage') ||
    userPermissions.includes('settings.manage') ||
    userPermissions.includes('cash.reconcile');

  // Enterprise Custody Rule: Sales require an OPEN cash drawer session AND an active branch shift
  const isSelectedDrawerOpen = Boolean(
    selectedDrawerObj &&
      (selectedDrawerObj.status === 'OPEN' || selectedDrawerObj.hasOpenSession)
  );
  const isShiftOpenForTrading = Boolean(activeShift && activeShift.status === 'OPEN');
  const isRegisterReadyForSales = isSelectedDrawerOpen && isShiftOpenForTrading;

  const splitTotalCovered = useMemo(() => {
    const c = parseFloat(splitCashAmount) || 0;
    const m = parseFloat(splitMpesaAmount) || 0;
    return roundMoney(c + m);
  }, [splitCashAmount, splitMpesaAmount]);

  const cashChangeDue = useMemo(() => {
    if (paymentMethod === 'Cash') {
      const tendered = parseFloat(cashTendered) || 0;
      return roundMoney(Math.max(0, tendered - calculations.grandTotal));
    }
    if (paymentMethod === 'Split') {
      return roundMoney(Math.max(0, splitTotalCovered - calculations.grandTotal));
    }
    return 0;
  }, [paymentMethod, cashTendered, splitTotalCovered, calculations.grandTotal]);

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

  const maxAllowedDiscount = useMemo(() => {
    if (!custodianGuardrails) return 20;
    if (!custodianGuardrails.allowManualDiscount) return 0;
    return custodianGuardrails.maxDiscountPercent;
  }, [custodianGuardrails]);

  const handleOpenPayment = () => {
    if (cart.length === 0) return;
    if (!isRegisterReadyForSales) {
      setStockAlert(
        canManageCashShift
          ? 'Register is closed. Open an active shift float & cash drawer before settling sales.'
          : 'Register is closed. Ask a supervisor or cashier to open a shift float before settling sales.'
      );
      return;
    }
    if (activeServiceModel?.requiresTable && !selectedTableId) {
      setStockAlert('This service model requires assigning a dining table before settlement.');
      setIsOrderMetaExpanded(true);
      return;
    }
    setCheckoutError(null);
    setStockAlert(null);
    setOfflineMpesaRef('');
    setCheckoutIdempotencyKey(`POS-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`);
    setCashTendered(calculations.grandTotal.toFixed(2));
    setMpesaPhone(customerPhone || '');
    const half = roundMoney(calculations.grandTotal / 2);
    setSplitCashAmount(half.toFixed(2));
    setSplitMpesaAmount(roundMoney(calculations.grandTotal - half).toFixed(2));
    setIsPaymentModalOpen(true);
  };

  const canSubmitPayment = useMemo(() => {
    if (isCheckingOut || !isRegisterReadyForSales) return false;
    if (paymentMethod === 'Cash') {
      return (parseFloat(cashTendered) || 0) >= calculations.grandTotal;
    }
    if (paymentMethod === 'Split') {
      return splitTotalCovered >= calculations.grandTotal;
    }
    return true;
  }, [
    isCheckingOut,
    isRegisterReadyForSales,
    paymentMethod,
    cashTendered,
    calculations.grandTotal,
    splitTotalCovered,
  ]);

  const handleCompleteCheckout = async () => {
    if (isCheckingOut) return;
    setCheckoutError(null);

    if (!isRegisterReadyForSales) {
      setCheckoutError(
        'Cannot complete sale: no active shift and open cash drawer for this outlet.'
      );
      return;
    }
    if (paymentMethod === 'Cash' && (parseFloat(cashTendered) || 0) < calculations.grandTotal) {
      setCheckoutError('Cash tendered is less than the total payable amount.');
      return;
    }
    if (paymentMethod === 'Split' && splitTotalCovered < calculations.grandTotal) {
      setCheckoutError(
        `Split tender total (${currencySymbol} ${splitTotalCovered.toLocaleString()}) is less than Total Due.`
      );
      return;
    }
    if (
      isOnline &&
      (paymentMethod === 'M-Pesa' ||
        (paymentMethod === 'Split' && (parseFloat(splitMpesaAmount) || 0) > 0))
    ) {
      const targetPhone = (mpesaPhone || customerPhone).trim();
      if (!isValidKenyanPhone(targetPhone)) {
        setCheckoutError('Enter a valid Kenyan M-Pesa phone number (07XXXXXXXX or 2547XXXXXXXX).');
        return;
      }
    }

    setIsCheckingOut(true);

    const tableObj = tables.find((t) => String(t.id) === selectedTableId);
    const expandedItems = expandCartForOrderApi(cart);
    const authoritativeSerial =
      activeBranch?.etimsDeviceSerial || financialSettings?.etimsDeviceSerial || null;

    const processOfflineFallback = async () => {
      const queued = await enqueueOfflineOrder({
        branchId: activeBranch?.id ?? null,
        tableId: selectedTableId ? parseInt(selectedTableId, 10) : null,
        tableName: tableObj ? tableObj.tableLabel : activeServiceModel?.name || 'Walk-in',
        customerId: selectedCustomer?.id ?? null,
        orderType: activeServiceModel?.name || 'Dine-In',
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        buyerKraPin: buyerKraPin.trim() || null,
        subtotal: calculations.netAmount,
        tax: calculations.vatAmount,
        cateringLevy: calculations.levyAmount,
        serviceCharge: calculations.serviceChargeAmount,
        discountTotal: calculations.discountAmount,
        total: calculations.grandTotal,
        paymentMethod,
        mpesaReference: offlineMpesaRef.trim() || null,
        notes: orderTargetStation !== 'AUTO' ? `Station: ${orderTargetStation}` : null,
        items: expandedItems.map((i) => ({
          menuItemId: i.menuItemId,
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          modifiersPrice: i.modifiersPrice ?? 0,
          totalPrice: i.totalPrice,
          selectedModifiers: i.selectedModifiers ?? [],
          notes: i.notes ?? null,
        })),
      });

      const updatedQueue = await getQueuedOfflineOrders();
      setPendingOfflineCount(updatedQueue.length);

      const dispatchedStations = Array.from(
        new Set(stationRoutingPreview.map((s) => s.stationName))
      );

      setCompletedOrder({
        orderNumber: `${queued.idempotencyKey.slice(0, 14)} (OFFLINE)`,
        isOfflineQueued: true,
        paymentConfirmationStatus: 'QUEUED_OFFLINE',
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
        servedBy: currentUser?.fullName || currentUser?.firstName || 'POS Cashier',
        drawerName: selectedDrawerObj?.name || 'Main Till',
        timestamp: new Date().toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }),
        businessName: receiptTemplate?.headerTitle || business?.name || 'Restaurant Workspace',
        headerSubtitle: receiptTemplate?.headerSubtitle || '',
        branchName: activeBranch?.name || '',
        branchAddress: activeBranch?.address || '',
        branchPhone: activeBranch?.phone || business?.phone || '',
        kraPin: financialSettings?.taxPin || activeBranch?.kraPin || business?.kraPin || '',
        etimsDeviceSerial: authoritativeSerial,
        footerMessage:
          'OFFLINE RECEIPT — Queued for automatic cloud sync & KRA eTIMS fiscalization.',
        returnPolicy: receiptTemplate?.returnPolicy || null,
        wifiDetails: receiptTemplate?.wifiDetails || null,
      });

      setCart([]);
      setOfflineMpesaRef('');
      setOrderTargetStation('AUTO');
      setAppliedPromo(null);
      setSelectedReward(null);
      setOrderDiscountPercent(0);
      setIsPaymentModalOpen(false);
      setMobileTab('menu');
      setOfflineSyncBanner(
        `Order queued locally (${updatedQueue.length} pending). Will auto-sync once online.`
      );
    };

    try {
      if (!isOnline || (typeof navigator !== 'undefined' && !navigator.onLine)) {
        await processOfflineFallback();
        return;
      }

      await fetchApi('/api/v1/pos/validate-stock', {
        method: 'POST',
        body: JSON.stringify({
          branchId: activeBranch?.id,
          items: expandedItems.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
          })),
        }),
      });

      const idempKey =
        checkoutIdempotencyKey || `POS-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

      const result = await fetchApi('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify({
          idempotencyKey: idempKey,
          branchId: activeBranch?.id,
          waiterId: currentUser?.id,
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
          items: expandedItems,
        }),
      });

      const authoritativeOrderNumber: string | undefined = result?.data?.orderNumber;
      if (!authoritativeOrderNumber) {
        throw new Error('Server did not return an authoritative order reference.');
      }

      let loyaltyWarning: string | null = null;
      if (selectedCustomer && selectedReward) {
        try {
          await fetchApi('/api/v1/loyalty/rewards/redeem', {
            method: 'POST',
            body: JSON.stringify({
              customerId: selectedCustomer.id,
              rewardId: selectedReward.id,
              orderId: result?.data?.id,
              notes: `Redeemed on Order ${authoritativeOrderNumber} (${activeBranch?.name || 'Outlet'})`,
            }),
          });
        } catch (rewardErr: unknown) {
          loyaltyWarning = getErrorMessage(
            rewardErr,
            'Order saved, but loyalty reward redemption needs manual reconciliation.'
          );
        }
      }

      if (activeServiceModel?.requiresTable && selectedTableId) {
        setTables((prev) =>
          prev.map((t) => (String(t.id) === selectedTableId ? { ...t, status: 'Occupied' } : t))
        );
      }

      let paymentConfirmationStatus: 'PAID' | 'PENDING_MPESA' | 'STK_FAILED' | 'CARD_PENDING' =
        paymentMethod === 'Card' ? 'CARD_PENDING' : 'PAID';
      let paymentStatusMessage: string | null = null;

      if (
        paymentMethod === 'M-Pesa' ||
        (paymentMethod === 'Split' && (parseFloat(splitMpesaAmount) || 0) > 0)
      ) {
        const amountToPrompt =
          paymentMethod === 'Split'
            ? parseFloat(splitMpesaAmount)
            : calculations.grandTotal;
        const targetPhone = (mpesaPhone || customerPhone).trim();

        try {
          await fetchApi('/api/v1/payments/mpesa/stk-push', {
            method: 'POST',
            body: JSON.stringify({
              phoneNumber: targetPhone,
              amount: amountToPrompt,
              accountReference: authoritativeOrderNumber,
              orderId: result?.data?.id,
              notes: `POS Tender for ${customerName || 'Guest'}`,
            }),
          });
          paymentConfirmationStatus = 'PENDING_MPESA';
          paymentStatusMessage = `M-Pesa STK Push sent to ${targetPhone} (${currencySymbol} ${amountToPrompt.toLocaleString()}). Awaiting customer PIN confirmation.`;
        } catch (mpesaErr: unknown) {
          paymentConfirmationStatus = 'STK_FAILED';
          paymentStatusMessage = `Order ${authoritativeOrderNumber} recorded, but M-Pesa STK Push failed: ${getErrorMessage(mpesaErr, 'Gateway unreachable')}. Collect via Till / C2B reconciliation.`;
        }
      }

      const dispatchedStations = Array.from(
        new Set(stationRoutingPreview.map((s) => s.stationName))
      );

      setCompletedOrder({
        ...(result?.data || {}),
        orderNumber: authoritativeOrderNumber,
        paymentConfirmationStatus,
        paymentStatusMessage,
        loyaltyWarning,
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
        etimsDeviceSerial: result?.data?.etimsDeviceSerial || authoritativeSerial,
        footerMessage: receiptTemplate?.footerMessage || 'Thank you for your business. Karibu tena!',
        returnPolicy: receiptTemplate?.returnPolicy || null,
        wifiDetails: receiptTemplate?.wifiDetails || null,
      });

      setCart([]);
      setCheckoutIdempotencyKey('');
      setOrderTargetStation('AUTO');
      setAppliedPromo(null);
      setSelectedReward(null);
      setOrderDiscountPercent(0);
      setIsPaymentModalOpen(false);
      setMobileTab('menu');
      void loadInitialData(activeBranch?.id);
    } catch (error: unknown) {
      if (isOfflineOrNetworkError(error)) {
        try {
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setIsOnline(false);
          }
          await processOfflineFallback();
          return;
        } catch (offlinePolicyErr: unknown) {
          setCheckoutError(
            getErrorMessage(
              offlinePolicyErr,
              'Network is offline and order could not be queued under offline policy.'
            )
          );
          return;
        }
      }

      setCheckoutError(
        getErrorMessage(error, 'POS Checkout transaction encountered an error.')
      );
      void loadInitialData(activeBranch?.id);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handlePrintReceipt = () => {
    if (isPrinting) return;
    const receiptElement = receiptPrintRef.current;
    if (!receiptElement) {
      window.print();
      return;
    }

    setIsPrinting(true);
    const widthSetting = receiptTemplate?.paperWidth || '80MM';
    const isA4 = widthSetting === 'A4_INVOICE';
    const is58mm = widthSetting === '58MM';
    const paperWidth = isA4 ? '210mm' : is58mm ? '58mm' : '80mm';
    const printableWidth = isA4 ? '190mm' : is58mm ? '48mm' : '72mm';

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.top = '-9999px';
    printFrame.style.left = '-9999px';
    printFrame.style.width = printableWidth;
    printFrame.style.height = 'auto';
    printFrame.style.border = 'none';

    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document;
    if (!frameDoc) {
      document.body.removeChild(printFrame);
      setIsPrinting(false);
      return;
    }

    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Receipt - ${completedOrder?.orderNumber || 'Slip'}</title>
          <style>
            @page { size: ${paperWidth} auto; margin: ${isA4 ? '10mm' : '0mm'} !important; }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: ${printableWidth} !important;
              background: #ffffff !important;
              -webkit-print-color-adjust: exact !important;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              font-size: ${isA4 ? '13px' : is58mm ? '10px' : '12px'};
              line-height: 1.35;
              font-weight: 700;
              color: #000000 !important;
              padding: ${isA4 ? '6mm' : '2mm 1mm 4mm 1mm'} !important;
              box-sizing: border-box;
            }
            .header-title {
              font-size: ${isA4 ? '18px' : is58mm ? '13px' : '15px'};
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
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
        setIsPrinting(false);
      }, 1000);
    }, 250);
  };

  // Count active metadata customizations for the compact order drawer pill
  const activeMetaCount =
    (selectedCustomer ? 1 : 0) +
    (appliedPromo ? 1 : 0) +
    (selectedReward ? 1 : 0) +
    (orderDiscountPercent > 0 ? 1 : 0) +
    (buyerKraPin.trim() ? 1 : 0) +
    (orderTargetStation !== 'AUTO' ? 1 : 0);

  return (
    <div
      className={`flex flex-col gap-2 sm:gap-3 font-sans w-full min-w-0 overflow-hidden ${
        isDedicatedKiosk
          ? 'h-full'
          : 'h-[calc(100dvh-5.5rem)] lg:h-[calc(100dvh-6.75rem)]'
      }`}
    >
      {/* 1. ADAPTIVE COMPACT TERMINAL HEADER */}
      <div className="bg-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl border border-gray-200 shadow-xs shrink-0 w-full min-w-0">
        {/* Primary Compact Row (Always visible on all screen sizes, zero overflow) */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          {/* Left: Operator Switcher + Desktop Outlet/Drawer Pills */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Desktop Outlet & Drawer (Hidden on < xl; revealed via Terminal drawer toggle) */}
            <div className="hidden xl:flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-2 bg-slate-50 border border-gray-200 px-2.5 py-1.5 rounded-xl min-w-0 max-w-[210px]">
                <Building2 size={14} className="text-servora-core shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[8.5px] font-bold uppercase text-gray-400 block leading-none truncate">
                    {business?.name || 'Active Outlet'}
                  </span>
                  {branches.length > 1 && !isDedicatedKiosk ? (
                    <select
                      aria-label="Active Branch"
                      value={activeBranch?.id || ''}
                      onChange={(e) => handleBranchSwitch(e.target.value)}
                      disabled={!isOnline}
                      className="bg-transparent text-xs font-bold text-servora-navy focus:outline-none cursor-pointer disabled:opacity-60 w-full truncate"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs font-bold text-servora-navy block truncate">
                      {activeBranch?.name || 'Main Outlet'}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 border border-gray-200 px-2.5 py-1.5 rounded-xl min-w-0 max-w-[250px]">
                <Wallet size={14} className="text-servora-core shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-[8.5px] font-bold uppercase text-gray-400 block leading-none">
                    Cash Drawer
                  </span>
                  {drawers.length > 0 ? (
                    <select
                      aria-label="Cash Drawer"
                      value={selectedDrawerId}
                      onChange={(e) => setSelectedDrawerId(e.target.value)}
                      className="bg-transparent text-xs font-bold text-servora-navy focus:outline-none cursor-pointer w-full truncate"
                    >
                      {drawers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} [{d.drawerCode}] &bull; {d.status}
                        </option>
                      ))}
                    </select>
                  ) : canManageCashShift && !isDedicatedKiosk ? (
                    <Link
                      href="/cash-management/drawers"
                      className="text-xs font-bold text-amber-700 hover:underline block truncate"
                    >
                      Configure Drawer &rarr;
                    </Link>
                  ) : (
                    <span className="text-xs font-bold text-gray-500 block truncate">
                      No Active Register
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Active Operator PIN Switcher (Always visible, cleanly truncated on phones) */}
            {currentUser && (
              <button
                type="button"
                disabled={!isOnline}
                onClick={() => {
                  setIsTerminalLocked(false);
                  setIsPinKioskOpen(true);
                }}
                title="Switch Waiter / Cashier via POS PIN"
                className="flex items-center gap-1.5 bg-servora-pale hover:bg-blue-100 border border-servora-core/25 px-2.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50 min-w-0 max-w-[190px] sm:max-w-[240px]"
              >
                <UserCheck size={14} className="text-servora-core shrink-0" />
                <span className="font-bold text-servora-navy truncate">
                  {currentUser.fullName || currentUser.firstName}
                </span>
                <span className="hidden sm:inline text-[10px] font-mono uppercase text-servora-deepTeal shrink-0">
                  ({currentUser.role})
                </span>
                <Lock size={11} className="text-servora-core shrink-0" />
              </button>
            )}

            {/* Mobile / Tablet Terminal Controls Drawer Toggle (< xl) */}
            <button
              type="button"
              onClick={() => setIsTerminalControlsOpen((prev) => !prev)}
              className={`xl:hidden inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer shrink-0 ${
                isTerminalControlsOpen
                  ? 'bg-servora-navy text-white border-servora-navy'
                  : 'bg-slate-50 text-servora-navy border-gray-200 hover:bg-gray-100'
              }`}
            >
              <Wallet size={12} />
              <span className="hidden sm:inline">Terminal</span>
              {isTerminalControlsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>

          {/* Right: Compact Action Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Auto-Lock Toggle: Restricted to Supervisors / Managers (RBAC-enforced) */}
            {!isDedicatedKiosk && canToggleAutoLock && (
              <button
                type="button"
                onClick={() => setAutoLockAfterSale((v) => !v)}
                title="Auto-lock terminal to PIN keypad after each completed sale"
                className={`hidden xl:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10.5px] font-bold border transition-colors cursor-pointer ${
                  autoLockAfterSale
                    ? 'bg-servora-navy text-white border-servora-navy'
                    : 'bg-slate-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <Lock size={10} />
                <span>{autoLockAfterSale ? 'Auto-Lock ON' : 'Auto-Lock'}</span>
              </button>
            )}

            <span
              title={isOnline ? 'Connected to Servora Cloud' : 'Offline Mode Active'}
              className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-bold border ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse'
              }`}
            >
              {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
              <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
            </span>

            {pendingOfflineCount > 0 && (
              <button
                type="button"
                onClick={handleSyncOfflineQueue}
                disabled={!isOnline || isSyncingOffline}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 disabled:opacity-50 cursor-pointer"
              >
                <UploadCloud size={13} />
                <span>{isSyncingOffline ? '...' : pendingOfflineCount}</span>
              </button>
            )}

            {isSafeDropWarning && canManageCashShift && (
              <span
                title="Drawer cash balance near safe-drop limit"
                className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-[11px] font-bold animate-pulse"
              >
                <AlertTriangle size={12} className="text-amber-600" />
                <span>Safe Drop</span>
              </span>
            )}

            {/* Shift / Open Float Control: Actionable link for Cash/Shift roles; Read-only status pill for Waiters */}
            {!isDedicatedKiosk && canManageCashShift ? (
              !isRegisterReadyForSales ? (
                <Link
                  href="/cash-management/shifts"
                  className="hidden xl:inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1.5 rounded-xl text-[11px] font-bold hover:bg-amber-100 transition-colors"
                >
                  <Clock size={12} /> Open Float
                </Link>
              ) : (
                <Link
                  href="/cash-management/shifts"
                  className="hidden xl:inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1.5 rounded-xl text-[11px] font-bold hover:bg-emerald-100 transition-colors"
                >
                  <Unlock size={12} className="text-emerald-600" />
                  <span>Shift #{activeShift?.id}</span>
                </Link>
              )
            ) : (
              <span
                className={`hidden xl:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border ${
                  isRegisterReadyForSales
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {isRegisterReadyForSales ? <Unlock size={12} /> : <Lock size={12} />}
                <span>
                  {isRegisterReadyForSales ? `Shift #${activeShift?.id}` : 'Register Closed'}
                </span>
              </span>
            )}

            <button
              type="button"
              disabled={!isOnline}
              onClick={lockTerminalToKioskPin}
              title="Lock Terminal & Revert to PIN Screen"
              aria-label="Lock POS Terminal"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-servora-navy text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40 text-xs font-bold"
            >
              <Lock size={13} />
              <span className="hidden sm:inline">Lock</span>
            </button>

            <button
              type="button"
              onClick={() => loadInitialData(activeBranch?.id)}
              title="Sync Workspace, Drawers & Catalog"
              aria-label="Refresh POS Data"
              className="p-1.5 sm:p-2 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin text-servora-core' : ''} />
            </button>
          </div>
        </div>

        {/* Collapsible Mobile/Tablet Terminal Drawer (< xl) */}
        {isTerminalControlsOpen && (
          <div className="xl:hidden mt-2.5 pt-2.5 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Branch Selector */}
            <div className="flex items-center gap-2 bg-slate-50 border border-gray-200 px-3 py-1.5 rounded-xl min-w-0">
              <Building2 size={14} className="text-servora-core shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-bold uppercase text-gray-400 block leading-none truncate">
                  {business?.name || 'Active Outlet'}
                </span>
                {branches.length > 1 && !isDedicatedKiosk ? (
                  <select
                    aria-label="Active Branch"
                    value={activeBranch?.id || ''}
                    onChange={(e) => handleBranchSwitch(e.target.value)}
                    disabled={!isOnline}
                    className="bg-transparent text-xs font-bold text-servora-navy focus:outline-none cursor-pointer w-full truncate"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs font-bold text-servora-navy block truncate">
                    {activeBranch?.name || 'Main Outlet'}
                  </span>
                )}
              </div>
            </div>

            {/* Cash Drawer Selector */}
            <div className="flex items-center gap-2 bg-slate-50 border border-gray-200 px-3 py-1.5 rounded-xl min-w-0">
              <Wallet size={14} className="text-servora-core shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-bold uppercase text-gray-400 block leading-none">
                  Cash Drawer Register
                </span>
                {drawers.length > 0 ? (
                  <select
                    aria-label="Cash Drawer"
                    value={selectedDrawerId}
                    onChange={(e) => setSelectedDrawerId(e.target.value)}
                    className="bg-transparent text-xs font-bold text-servora-navy focus:outline-none cursor-pointer w-full truncate"
                  >
                    {drawers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} [{d.drawerCode}] &bull; {d.status}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs font-bold text-gray-500 block truncate">
                    No Active Register
                  </span>
                )}
              </div>
            </div>

            {/* Shift Status & Supervisor-Only Controls */}
            <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
              {!isDedicatedKiosk && canManageCashShift ? (
                !isRegisterReadyForSales ? (
                  <Link
                    href="/cash-management/shifts"
                    className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold"
                  >
                    <Clock size={12} /> Open Shift Float &rarr;
                  </Link>
                ) : (
                  <Link
                    href="/cash-management/shifts"
                    className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold"
                  >
                    <Unlock size={12} /> Shift #{activeShift?.id} Active
                  </Link>
                )
              ) : (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                    isRegisterReadyForSales
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {isRegisterReadyForSales ? <Unlock size={12} /> : <Lock size={12} />}
                  <span>
                    {isRegisterReadyForSales
                      ? `Shift #${activeShift?.id} Open`
                      : 'Register Closed'}
                  </span>
                </span>
              )}

              {!isDedicatedKiosk && canToggleAutoLock && (
                <button
                  type="button"
                  onClick={() => setAutoLockAfterSale((v) => !v)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                    autoLockAfterSale
                      ? 'bg-servora-navy text-white border-servora-navy'
                      : 'bg-slate-50 text-gray-600 border-gray-200'
                  }`}
                >
                  <Lock size={11} />
                  <span>{autoLockAfterSale ? 'Auto-Lock After Sale: ON' : 'Auto-Lock: OFF'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CLOSED-REGISTER / NO ACTIVE SHIFT LOCKOUT BANNER */}
      {!isLoading && !isRegisterReadyForSales && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 bg-amber-50 border border-amber-300 text-amber-950 px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Lock size={14} className="text-amber-700 shrink-0" />
            <span>
              POS checkout locked: no active shift &amp; open cash drawer for{' '}
              <strong>{activeBranch?.name || 'this outlet'}</strong>.{' '}
              {canManageCashShift
                ? 'Open a shift float to start trading.'
                : 'Ask a supervisor or cashier to open a shift float.'}
            </span>
          </div>
          {canManageCashShift && !isDedicatedKiosk && (
            <Link
              href="/cash-management/shifts"
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold shrink-0 transition-colors"
            >
              Open Shift Float &rarr;
            </Link>
          )}
        </div>
      )}

      {/* STATUS / KDS FOOD READY / STOCK ALERT BANNERS */}
      {offlineSyncBanner && (
        <div
          role="status"
          className="flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 text-emerald-900 px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
            <span className="truncate">{offlineSyncBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setOfflineSyncBanner(null)}
            aria-label="Dismiss notification"
            className="text-emerald-700 hover:text-emerald-950 shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {readyFoodAlerts.length > 0 && (
        <div role="status" className="flex flex-col gap-1.5 shrink-0">
          {readyFoodAlerts.slice(0, 2).map((alert) => (
            <div
              key={alert.id}
              className="flex items-center justify-between gap-2.5 bg-emerald-600 text-white px-3.5 py-2 rounded-xl text-xs shadow-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <ChefHat size={15} className="shrink-0 animate-bounce" />
                <div className="min-w-0">
                  <span className="font-bold block truncate">{alert.title}</span>
                  <span className="text-[11px] text-emerald-50 block truncate">
                    {alert.detail}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleAcknowledgeFoodReady(alert.id)}
                className="px-2.5 py-1 bg-white text-emerald-800 hover:bg-emerald-50 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer"
              >
                Picked Up
              </button>
            </div>
          ))}
        </div>
      )}

      {stockAlert && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 bg-rose-50 border border-rose-200 text-rose-800 px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle size={14} className="text-rose-600 shrink-0" />
            <span className="truncate">{stockAlert}</span>
          </div>
          <button
            type="button"
            onClick={() => setStockAlert(null)}
            aria-label="Dismiss stock alert"
            className="text-rose-600 hover:text-rose-900 shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* MOBILE / TABLET PORTRAIT TAB SWITCHER (< lg) */}
      <div className="flex lg:hidden bg-white p-1 rounded-xl border border-gray-200 shadow-xs shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('menu')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            mobileTab === 'menu'
              ? 'bg-servora-navy text-white shadow-xs'
              : 'text-gray-500 hover:text-servora-navy'
          }`}
        >
          <Layers size={14} /> Catalog ({filteredItems.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            mobileTab === 'cart'
              ? 'bg-servora-navy text-white shadow-xs'
              : 'text-gray-500 hover:text-servora-navy'
          }`}
        >
          <ShoppingCart size={14} /> Active Order
          {totalItemsCount > 0 && (
            <span className="bg-servora-core text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {totalItemsCount}
            </span>
          )}
        </button>
      </div>

      {/* MAIN SPLIT-VIEW VIEWPORT */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0 min-w-0 overflow-hidden">
        {/* LEFT COLUMN: FLUID VISUAL MENU CATALOG */}
        <div
          className={`flex-1 flex-col min-h-0 min-w-0 bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden ${
            mobileTab === 'menu' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Compact Search, Station, Table & Category Filters */}
          <div className="p-2.5 sm:p-3 border-b border-gray-200 space-y-2 shrink-0 bg-white">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="relative sm:col-span-6 lg:col-span-5 xl:col-span-6 min-w-0">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={14}
                />
                <input
                  type="text"
                  aria-label="Search menu catalog"
                  placeholder="Scan SKU or search dishes, combos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 sm:py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-servora-core transition-all"
                />
              </div>

              <div className="grid grid-cols-2 sm:col-span-6 lg:col-span-7 xl:col-span-6 gap-2 min-w-0">
                {availableStationNames.length > 0 && (
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 px-2.5 py-1.5 rounded-xl min-w-0">
                    <ChefHat size={13} className="text-servora-core shrink-0" />
                    <select
                      aria-label="Filter by kitchen station"
                      value={selectedStationFilter}
                      onChange={(e) => setSelectedStationFilter(e.target.value)}
                      className="bg-transparent text-xs font-bold text-servora-navy focus:outline-none cursor-pointer w-full truncate"
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

                {activeServiceModel?.requiresTable && (
                  <div
                    className={`flex items-center gap-1.5 border px-2.5 py-1.5 rounded-xl min-w-0 ${
                      selectedTableId
                        ? 'bg-blue-50/70 border-servora-core/40'
                        : 'bg-amber-50/60 border-amber-300'
                    }`}
                  >
                    <Utensils size={13} className="text-servora-core shrink-0" />
                    <select
                      aria-label="Assign dining table"
                      value={selectedTableId}
                      onChange={(e) => setSelectedTableId(e.target.value)}
                      className="bg-transparent text-xs font-bold text-servora-navy focus:outline-none cursor-pointer w-full truncate"
                    >
                      <option value="">Table *</option>
                      {tables.map((t) => {
                        const isCurrentlySelected = String(t.id) === selectedTableId;
                        const isOccupied = t.status === 'Occupied';
                        return (
                          <option
                            key={t.id}
                            value={t.id}
                            disabled={isOccupied && !isCurrentlySelected}
                          >
                            {t.tableLabel} ({t.status})
                            {isOccupied && !isCurrentlySelected ? ' — In Use' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Category Ribbon */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-[11.5px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-servora-navy text-white shadow-xs'
                      : cat === COMBOS_CATEGORY_LABEL
                        ? 'bg-blue-50 text-servora-core border border-blue-200 hover:bg-blue-100'
                        : 'bg-gray-100/80 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat === COMBOS_CATEGORY_LABEL && <ShoppingBasket size={11} />}
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Fluid Self-Adapting Menu Cards Grid */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-3.5 bg-slate-50/50">
            {isLoading ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(142px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(165px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(185px,1fr))] gap-2.5 sm:gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-gray-200 bg-white overflow-hidden animate-pulse"
                  >
                    <div className="aspect-[4/3] bg-gray-200" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                <Utensils size={38} className="mb-2 opacity-25" />
                <p className="text-sm font-bold text-servora-navy">No products available</p>
                <p className="text-xs text-gray-400">
                  Refine search criteria or check Menu Catalog Master configuration.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(142px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(165px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(185px,1fr))] gap-2.5 sm:gap-3 pb-2">
                {filteredItems.map((item) => {
                  const { remaining } = getItemRemainingSellable(item);
                  const resolvedStation = getEffectiveItemStation(item);
                  const hasModifiers =
                    !item.isCombo && (itemModifierGroupsMap[Number(item.id)]?.length ?? 0) > 0;

                  return (
                    <PosCatalogCard
                      key={item.id}
                      item={item}
                      currencySymbol={currencySymbol}
                      remaining={remaining}
                      stationName={resolvedStation.stationName}
                      hasModifiers={hasModifiers}
                      cartQty={cartQtyByCardId[item.id] || 0}
                      onAdd={addToCart}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Sticky Mobile/Tablet Quick Checkout Bar (shown when cart has items on Catalog tab) */}
          {cart.length > 0 && (
            <div className="lg:hidden shrink-0 p-2.5 bg-white border-t border-gray-200 flex items-center gap-2 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
              <button
                type="button"
                onClick={() => setMobileTab('cart')}
                className="flex-1 py-2.5 px-3 bg-servora-navy text-white rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <ShoppingCart size={14} />
                  <span>
                    {totalItemsCount} {totalItemsCount === 1 ? 'Item' : 'Items'}
                  </span>
                </span>
                <span className="font-mono">
                  {currencySymbol} {Math.round(calculations.grandTotal).toLocaleString()}
                </span>
              </button>
              <button
                type="button"
                onClick={handleOpenPayment}
                disabled={!isRegisterReadyForSales}
                title={
                  !isRegisterReadyForSales
                    ? 'Register closed — open a shift float to charge'
                    : 'Proceed to tender settlement'
                }
                className="py-2.5 px-4 bg-servora-core hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isRegisterReadyForSales ? <CreditCard size={14} /> : <Lock size={14} />}
                <span>{isRegisterReadyForSales ? 'Charge' : 'Closed'}</span>
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: FLUID ACTIVE ORDER PANEL (NEVER CLIPS ON ANY HEIGHT) */}
        <div
          className={`w-full lg:w-[350px] xl:w-[390px] 2xl:w-[425px] flex-col bg-white rounded-2xl shadow-xs border border-gray-200 shrink-0 overflow-hidden h-full min-h-0 ${
            mobileTab === 'cart' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Service Model Selector */}
          <div className="flex p-1.5 bg-slate-50 border-b border-gray-200 shrink-0 gap-1 overflow-x-auto scrollbar-hide">
            {serviceModels.length > 0 ? (
              serviceModels.map((model) => {
                const Icon = SERVICE_MODEL_ICONS[model.type] || ShoppingBag;
                const isSelected = activeServiceModel?.id === model.id;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setActiveServiceModel(model)}
                    className={`flex-1 min-w-[82px] py-1.5 px-2 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-white text-servora-navy shadow-xs border border-gray-200'
                        : 'text-gray-500 hover:text-servora-navy'
                    }`}
                  >
                    <Icon
                      size={12}
                      className={isSelected ? 'text-servora-core shrink-0' : 'shrink-0'}
                    />
                    <span className="truncate">{model.name}</span>
                  </button>
                );
              })
            ) : (
              <div className="py-1 px-2 text-xs font-bold text-servora-navy">Standard Dining</div>
            )}
          </div>

          {/* Compact Collapsible Guest / Loyalty / Promo / KDS Header */}
          <div className="border-b border-gray-200 bg-white shrink-0">
            <button
              type="button"
              onClick={() => setIsOrderMetaExpanded((prev) => !prev)}
              className="w-full px-3 py-2 flex items-center justify-between gap-2 text-xs hover:bg-slate-50/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <span className="font-bold text-servora-navy flex items-center gap-1 shrink-0">
                  <Users size={13} className="text-servora-core" />
                  <span>Order Details</span>
                </span>

                {activeServiceModel?.requiresTable && (
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                      selectedTableObj
                        ? 'bg-blue-50 text-servora-core border border-blue-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {selectedTableObj ? selectedTableObj.tableLabel : 'Table *'}
                  </span>
                )}

                {selectedCustomer && (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 truncate max-w-[110px]">
                    {selectedCustomer.name}
                  </span>
                )}

                {appliedPromo && (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {appliedPromo.code}
                  </span>
                )}

                {orderDiscountPercent > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    -{orderDiscountPercent}%
                  </span>
                )}

                {activeMetaCount === 0 && !activeServiceModel?.requiresTable && (
                  <span className="text-[10.5px] text-gray-400 truncate">
                    Guest, Loyalty, Promo, KDS
                  </span>
                )}
              </div>

              <span className="text-gray-400 shrink-0 flex items-center gap-1 text-[10.5px] font-semibold">
                <span>{isOrderMetaExpanded ? 'Hide' : 'Edit'}</span>
                {isOrderMetaExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            </button>

            {isOrderMetaExpanded && (
              <div className="px-3 pb-3 pt-1.5 space-y-2 border-t border-gray-100 text-xs max-h-[42dvh] overflow-y-auto">
                {/* Mobile Table Assignment (convenient when on Active Order tab) */}
                {activeServiceModel?.requiresTable && (
                  <div className="flex items-center justify-between gap-2 p-2 bg-blue-50/70 border border-blue-200 rounded-xl">
                    <span className="font-bold text-servora-core flex items-center gap-1.5 shrink-0">
                      <Utensils size={12} /> Table:
                    </span>
                    <select
                      aria-label="Select dining table"
                      value={selectedTableId}
                      onChange={(e) => setSelectedTableId(e.target.value)}
                      className="bg-white border border-blue-200 rounded-lg px-2 py-1 text-xs font-bold text-servora-navy focus:outline-none cursor-pointer flex-1 max-w-[200px]"
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
                            {t.tableLabel} ({t.status})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* KDS Routing Override */}
                {kitchenStations.length > 0 && (
                  <div className="flex items-center justify-between gap-2 bg-slate-50 border border-gray-200 rounded-xl px-2.5 py-1.5">
                    <span className="font-bold text-servora-navy flex items-center gap-1 shrink-0 text-[11px]">
                      <ChefHat size={12} className="text-servora-core" /> KDS:
                    </span>
                    <select
                      aria-label="Order KDS routing"
                      value={orderTargetStation}
                      onChange={(e) => setOrderTargetStation(e.target.value)}
                      className="bg-white border border-gray-200 rounded-lg px-2 py-0.5 text-[11px] font-bold text-servora-navy focus:outline-none cursor-pointer flex-1 min-w-0 truncate"
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

                {/* CRM / Loyalty Member Lookup */}
                {!selectedCustomer ? (
                  <div className="relative">
                    <Award
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-500"
                      size={13}
                    />
                    <input
                      type="text"
                      disabled={!isOnline}
                      placeholder={
                        isOnline
                          ? 'Lookup CRM / Loyalty Member (phone, name, PIN)...'
                          : 'CRM Lookup unavailable offline'
                      }
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-amber-50/40 border border-amber-200/80 rounded-xl focus:outline-none focus:border-amber-400 text-xs disabled:opacity-60"
                    />
                    {customerMatches.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 max-h-44 overflow-y-auto divide-y divide-gray-100">
                        {customerMatches.map((cust) => (
                          <button
                            key={cust.id}
                            type="button"
                            onClick={() => handleSelectLoyaltyCustomer(cust)}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50/60 flex justify-between items-center cursor-pointer"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="font-bold text-servora-navy block truncate">
                                {cust.name}
                              </span>
                              <span className="text-[10px] text-gray-500 font-mono">
                                {cust.phone}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
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
                  <div className="p-2 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <UserCheck size={14} className="text-amber-700 shrink-0" />
                        <div className="min-w-0">
                          <span className="font-bold text-servora-navy block leading-tight truncate">
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
                        className="text-gray-400 hover:text-rose-600 cursor-pointer shrink-0"
                        title="Detach Member"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {loyaltyRewards.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Gift size={12} className="text-amber-700 shrink-0" />
                        <select
                          aria-label="Redeem loyalty reward"
                          value={selectedReward?.id || ''}
                          onChange={(e) => {
                            const rId = parseInt(e.target.value, 10);
                            setSelectedReward(loyaltyRewards.find((r) => r.id === rId) || null);
                          }}
                          className="flex-1 bg-white border border-amber-200 rounded-lg px-2 py-1 text-[11px] font-bold text-servora-navy focus:outline-none cursor-pointer min-w-0"
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

                {!selectedCustomer && (
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      placeholder="Guest Name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:border-servora-core text-xs min-w-0"
                    />
                    <input
                      type="text"
                      placeholder="Phone (07...)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-mono focus:outline-none focus:border-servora-core text-xs min-w-0"
                    />
                  </div>
                )}

                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Buyer KRA PIN (eTIMS)"
                    value={buyerKraPin}
                    onChange={(e) => setBuyerKraPin(e.target.value.toUpperCase())}
                    className="flex-1 min-w-0 px-2.5 py-1.5 bg-slate-50 border border-gray-200 rounded-xl font-mono uppercase focus:outline-none focus:border-servora-core text-xs"
                  />

                  {activeServiceModel?.promptGuestCount && (
                    <div className="flex items-center gap-1 bg-slate-50 border border-gray-200 rounded-xl px-2 shrink-0">
                      <Users size={11} className="text-gray-400" />
                      <input
                        type="number"
                        min={1}
                        max={50}
                        aria-label="Guest count"
                        value={guestCount}
                        onChange={(e) =>
                          setGuestCount(Math.max(1, parseInt(e.target.value, 10) || 1))
                        }
                        className="w-7 bg-transparent text-xs font-bold text-servora-navy focus:outline-none font-mono text-center"
                      />
                    </div>
                  )}

                  <div
                    className="flex items-center gap-1 bg-slate-50 border border-gray-200 rounded-xl px-2 shrink-0"
                    title={
                      appliedPromo
                        ? 'Manual discount disabled while promo code is active'
                        : `Custodian Max Discount: ${maxAllowedDiscount}%`
                    }
                  >
                    {maxAllowedDiscount === 0 || appliedPromo ? (
                      <Lock size={10} className="text-gray-400" />
                    ) : (
                      <Percent size={10} className="text-gray-400" />
                    )}
                    <select
                      aria-label="Manual discount percentage"
                      value={orderDiscountPercent}
                      disabled={maxAllowedDiscount === 0 || Boolean(appliedPromo)}
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

                {/* Promo Code Bar */}
                <div className="flex gap-1.5 items-center">
                  {!appliedPromo ? (
                    <>
                      <div className="relative flex-1 min-w-0">
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
                        disabled={
                          !promoCodeInput.trim() ||
                          cart.length === 0 ||
                          isValidatingPromo ||
                          !isOnline
                        }
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-servora-navy font-bold rounded-lg text-[11px] disabled:opacity-40 cursor-pointer shrink-0"
                      >
                        {isValidatingPromo ? '...' : 'Apply'}
                      </button>
                    </>
                  ) : (
                    <div className="flex-1 flex justify-between items-center px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-800 font-bold">
                      <span className="flex items-center gap-1 font-mono truncate">
                        <Tag size={11} /> {appliedPromo.code} (-{currencySymbol}{' '}
                        {appliedPromo.calculatedDiscountKes.toLocaleString()})
                      </span>
                      <button
                        type="button"
                        onClick={() => setAppliedPromo(null)}
                        className="text-emerald-700 hover:text-rose-600 cursor-pointer shrink-0"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}
                </div>
                {promoError && <p className="text-[10px] text-rose-600 font-bold">{promoError}</p>}
              </div>
            )}
          </div>

          {/* Scrollable Cart Itemized List (Always guaranteed generous vertical height) */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-gray-400">
                <ShoppingBag size={32} className="mb-1.5 opacity-25" />
                <p className="text-xs font-bold text-servora-navy">Ticket is empty</p>
                <p className="text-[11px] text-gray-400 text-center px-4">
                  Tap dishes, drinks, or combos to build an order
                </p>
              </div>
            ) : (
              cart.map((item) => {
                const resolvedSt = getEffectiveItemStation(item);
                const { remaining } = getItemRemainingSellable(item);
                const atStockLimit = remaining !== null && remaining <= 0;

                return (
                  <div
                    key={item.cartItemId}
                    className="bg-slate-50/70 border border-gray-200 p-2.5 rounded-xl shadow-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          {item.isCombo && (
                            <span className="text-[8.5px] font-bold uppercase px-1.5 py-0.5 rounded bg-servora-core text-white shrink-0">
                              Combo
                            </span>
                          )}
                          <h4 className="text-xs font-bold text-servora-navy truncate">
                            {item.name}
                          </h4>
                          {atStockLimit && (
                            <span className="text-[8.5px] font-bold uppercase px-1 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0">
                              Max
                            </span>
                          )}
                        </div>
                        {item.isCombo && item.comboItems && (
                          <p className="text-[10px] text-gray-500 truncate mt-0.5">
                            {item.comboItems
                              .map((c) => `${c.quantity * item.quantity}x ${c.itemName}`)
                              .join(', ')}
                          </p>
                        )}
                        {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {item.selectedModifiers.map((m) => (
                              <div
                                key={`${m.groupName}-${m.modifierId}`}
                                className="flex items-center justify-between text-[10px] text-purple-800 bg-purple-50/70 px-1.5 py-0.5 rounded"
                              >
                                <span className="truncate">+ {m.name}</span>
                                {m.price > 0 && (
                                  <span className="font-mono font-semibold shrink-0 ml-2">
                                    +{currencySymbol} {m.price.toFixed(0)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-[11px] font-mono font-bold text-servora-core mt-0.5">
                          {currencySymbol} {(item.price * item.quantity).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-gray-200 shadow-xs shrink-0">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.cartItemId, -1)}
                          aria-label={`Decrease quantity of ${item.name}`}
                          className="p-1.5 text-gray-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        >
                          {item.quantity === 1 ? <Trash2 size={12} /> : <Minus size={12} />}
                        </button>
                        <span className="text-xs font-bold text-servora-navy w-5 text-center font-mono">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.cartItemId, 1)}
                          disabled={atStockLimit}
                          title={atStockLimit ? 'Maximum available stock reached' : 'Add one more'}
                          aria-label={`Increase quantity of ${item.name}`}
                          className="p-1.5 text-gray-500 hover:text-servora-core rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
                      <select
                        aria-label={`Station routing for ${item.name}`}
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
                        className={`border rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold focus:outline-none cursor-pointer max-w-[135px] truncate ${
                          resolvedSt.isRedirected
                            ? 'bg-amber-50 border-amber-300 text-amber-800'
                            : 'bg-white border-gray-200 text-servora-navy'
                        }`}
                      >
                        <option value="">{resolvedSt.stationName}</option>
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
                        className="flex-1 min-w-0 bg-white border border-gray-200 rounded-md px-2 py-0.5 text-[10px] text-gray-700 focus:outline-none focus:border-servora-core"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Always-Visible Sticky Financial Summary & Charge Dock */}
          <div className="p-3 bg-slate-50 border-t border-gray-200 shrink-0 space-y-2">
            <div className="space-y-0.5 text-[11px]">
              <div className="flex justify-between text-gray-500">
                <span>
                  Net Base + VAT ({financialSettings?.vatRate || '16'}%)
                  {calculations.levyAmount > 0 ? ' + Levy' : ''}
                </span>
                <span className="font-mono">
                  {currencySymbol}{' '}
                  {calculations.netAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  +{' '}
                  {(calculations.vatAmount + calculations.levyAmount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

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
                  <span>Packaging</span>
                  <span className="font-mono">
                    +{currencySymbol} {calculations.packingChargeAmount.toLocaleString()}
                  </span>
                </div>
              )}

              {calculations.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Discounts &amp; Rewards</span>
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
                <div className="flex justify-between text-amber-700 font-bold text-[10.5px]">
                  <span>Loyalty Points</span>
                  <span className="font-mono">+{calculations.estimatedPointsEarned} pts</span>
                </div>
              )}

              <div className="flex justify-between items-baseline text-sm font-bold text-servora-navy pt-1.5 border-t border-gray-200">
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

            <div className="grid grid-cols-5 gap-2">
              <button
                type="button"
                onClick={handleClearTicket}
                disabled={cart.length === 0}
                className={`col-span-2 py-2.5 text-xs font-bold rounded-xl border transition-colors disabled:opacity-40 cursor-pointer ${
                  confirmClearArmed
                    ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700'
                    : 'text-gray-600 bg-white border-gray-200 hover:bg-gray-100 hover:text-rose-600'
                }`}
              >
                {confirmClearArmed ? 'Confirm?' : 'Clear'}
              </button>
              <button
                type="button"
                onClick={handleOpenPayment}
                disabled={cart.length === 0 || !isRegisterReadyForSales}
                title={
                  !isRegisterReadyForSales
                    ? 'Register closed — an active shift & open drawer are required'
                    : 'Open tender settlement'
                }
                className="col-span-3 py-2.5 text-xs font-bold text-white bg-servora-core rounded-xl shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isRegisterReadyForSales ? <CreditCard size={14} /> : <Lock size={14} />}
                <span className="truncate">
                  {isRegisterReadyForSales
                    ? `Charge ${currencySymbol} ${Math.round(calculations.grandTotal).toLocaleString()}`
                    : 'Register Closed'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ITEM MODIFIER CUSTOMIZATION MODAL (Mobile Bottom Sheet / Desktop Dialog) */}
      {customizingItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="customize-item-title"
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-200 space-y-4 max-h-[90dvh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 id="customize-item-title" className="text-sm font-bold text-servora-navy">
                  Customize: {customizingItem.name}
                </h3>
                <p className="text-[11px] text-gray-500">
                  Base: {currencySymbol} {customizingItem.price.toLocaleString()} &bull; Customized:{' '}
                  <strong className="font-mono text-servora-core">
                    {currencySymbol} {draftCustomizedUnitPrice.toLocaleString()}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCustomizingItem(null)}
                aria-label="Close customization modal"
                className="text-gray-400 hover:text-servora-navy cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            {modifierModalError && (
              <div
                role="alert"
                className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2"
              >
                <AlertTriangle size={14} className="shrink-0" />
                <span>{modifierModalError}</span>
              </div>
            )}

            <div className="space-y-4">
              {(itemModifierGroupsMap[Number(customizingItem.id)] || []).map((group) => {
                const picked = draftSelections[group.id] || [];
                const isSingle = group.maxSelections === 1;

                return (
                  <div key={group.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-servora-navy block">
                          {group.name}
                        </span>
                        {group.description && (
                          <span className="text-[10px] text-gray-400">{group.description}</span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                          group.isRequired
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {group.isRequired ? 'Required' : 'Optional'} &bull;{' '}
                        {isSingle ? 'Pick 1' : `Up to ${group.maxSelections}`}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {group.options.map((opt) => {
                        const active = picked.includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setModifierModalError(null);
                              setDraftSelections((prev) => {
                                const cur = prev[group.id] || [];
                                if (isSingle) {
                                  return {
                                    ...prev,
                                    [group.id]: active && !group.isRequired ? [] : [opt.id],
                                  };
                                }
                                if (active) {
                                  return {
                                    ...prev,
                                    [group.id]: cur.filter((id) => id !== opt.id),
                                  };
                                }
                                if (cur.length >= group.maxSelections) return prev;
                                return { ...prev, [group.id]: [...cur, opt.id] };
                              });
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                              active
                                ? 'bg-blue-50 border-servora-core text-servora-navy font-bold'
                                : 'bg-slate-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span
                                className={`w-3.5 h-3.5 rounded-${isSingle ? 'full' : 'sm'} border flex items-center justify-center ${
                                  active
                                    ? 'border-servora-core bg-servora-core text-white'
                                    : 'border-gray-300 bg-white'
                                }`}
                              >
                                {active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </span>
                              <span>{opt.name}</span>
                            </span>
                            <span className="font-mono text-servora-core">
                              {opt.priceAdjustment > 0
                                ? `+${currencySymbol} ${opt.priceAdjustment.toFixed(2)}`
                                : 'Free'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setCustomizingItem(null)}
                className="px-4 py-2.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmModifiers}
                className="flex-1 sm:flex-initial px-5 py-2.5 text-xs font-bold text-white bg-servora-core hover:bg-blue-700 rounded-xl cursor-pointer"
              >
                Add ({currencySymbol} {draftCustomizedUnitPrice.toLocaleString()})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TENDER SETTLEMENT & STATION ROUTING MODAL (Mobile Bottom Sheet / Desktop Dialog) */}
      {isPaymentModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs"
        >
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[92dvh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="min-w-0 pr-2">
                <h3 className="text-sm font-bold text-servora-navy">
                  Tender Settlement &amp; KDS Routing
                </h3>
                <p className="text-[11px] text-gray-500 truncate">
                  {activeBranch?.name || 'Outlet'} &bull;{' '}
                  {selectedDrawerObj?.name || 'Register'} &bull;{' '}
                  {selectedTableObj
                    ? `Table ${selectedTableObj.tableLabel}`
                    : activeServiceModel?.name || 'Counter'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-gray-400 hover:text-servora-navy cursor-pointer p-1 shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {!isOnline && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold flex items-center gap-2">
                <WifiOff size={14} className="text-amber-700 shrink-0" />
                <span>
                  Offline Survivability Active — Order will queue locally and reconcile automatically on reconnect.
                </span>
              </div>
            )}

            {checkoutError && (
              <div
                role="alert"
                className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-start gap-2"
              >
                <AlertTriangle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                <span>{checkoutError}</span>
              </div>
            )}

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
                  type="button"
                  onClick={() => {
                    setCheckoutError(null);
                    setPaymentMethod(method);
                  }}
                  className={`py-2.5 px-1 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
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
                  inputMode="decimal"
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
                  <Smartphone size={13} />
                  {isOnline
                    ? 'Daraja STK Push Initiation (Awaits Guest PIN)'
                    : 'Offline M-Pesa Confirmation Reference'}
                </span>
                {isOnline ? (
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="2547XXXXXXXX or 07XXXXXXXX"
                    value={mpesaPhone}
                    onChange={(e) => setMpesaPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-xs focus:outline-none"
                  />
                ) : (
                  <input
                    type="text"
                    placeholder="Enter M-Pesa Code (e.g. UK8912KL99)"
                    value={offlineMpesaRef}
                    onChange={(e) => setOfflineMpesaRef(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg font-mono uppercase font-bold text-xs focus:outline-none"
                  />
                )}
              </div>
            )}

            {paymentMethod === 'Card' && (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-servora-navy space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <CreditCard size={13} className="text-servora-core" /> Card Terminal (PDQ) Settlement
                </span>
                <p className="text-[11px] text-gray-600">
                  Confirm approval on your physical PDQ terminal before authorizing the receipt.
                </p>
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
                      inputMode="decimal"
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
                      inputMode="decimal"
                      value={splitMpesaAmount}
                      onChange={(e) => setSplitMpesaAmount(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg font-mono font-bold text-xs"
                    />
                  </div>
                </div>
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-gray-600">Combined Tender:</span>
                  <span
                    className={`font-bold ${
                      splitTotalCovered >= calculations.grandTotal
                        ? 'text-emerald-700'
                        : 'text-rose-600'
                    }`}
                  >
                    {currencySymbol} {splitTotalCovered.toLocaleString()}
                  </span>
                </div>
                {isOnline ? (
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="M-Pesa Mobile Number (07...)"
                    value={mpesaPhone}
                    onChange={(e) => setMpesaPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-purple-300 rounded-lg font-mono text-xs focus:outline-none"
                  />
                ) : (
                  <input
                    type="text"
                    placeholder="Offline M-Pesa Reference Code"
                    value={offlineMpesaRef}
                    onChange={(e) => setOfflineMpesaRef(e.target.value.toUpperCase())}
                    className="w-full px-2.5 py-1.5 bg-white border border-purple-300 rounded-lg font-mono uppercase text-xs focus:outline-none"
                  />
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleCompleteCheckout}
              disabled={!canSubmitPayment}
              className="w-full py-3 bg-servora-core hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-all flex justify-center items-center gap-2 text-xs disabled:opacity-40 cursor-pointer"
            >
              {isCheckingOut ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle size={15} />
                  {isOnline
                    ? 'Authorize Transaction & Route to KDS'
                    : 'Queue Offline Order & Print Receipt'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* DYNAMIC FISCAL THERMAL RECEIPT MODAL */}
      {completedOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div
            id="thermal-receipt-printable"
            className={`bg-white rounded-t-3xl sm:rounded-2xl w-full p-5 shadow-2xl border border-gray-200 space-y-3 font-mono text-xs text-black transition-all max-h-[92dvh] overflow-y-auto ${
              receiptTemplate?.paperWidth === '58MM'
                ? 'sm:max-w-[280px]'
                : receiptTemplate?.paperWidth === 'A4_INVOICE'
                  ? 'sm:max-w-[460px]'
                  : 'sm:max-w-[340px]'
            }`}
          >
            {completedOrder.paymentStatusMessage && (
              <div
                className={`p-2.5 rounded-xl border font-sans text-[11px] font-semibold print:hidden ${
                  completedOrder.paymentConfirmationStatus === 'STK_FAILED'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                {completedOrder.paymentStatusMessage}
              </div>
            )}
            {completedOrder.loyaltyWarning && (
              <div className="p-2.5 rounded-xl border bg-amber-50 border-amber-200 text-amber-900 font-sans text-[11px] font-semibold print:hidden">
                {completedOrder.loyaltyWarning}
              </div>
            )}

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

              <div className="dashed-divider" />

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

              <div className="dashed-divider" />

              <div className="space-y-1">
                {completedOrder.items.map((i: CartItem) => (
                  <div key={i.cartItemId} className="space-y-0.5">
                    <div className="flex-between text-[11px]">
                      <span className="font-bold max-w-[70%] break-words">
                        {i.quantity}x {i.name}
                        {receiptTemplate?.showItemSku && i.sku ? ` [${i.sku}]` : ''}
                      </span>
                      <span className="font-bold whitespace-nowrap">
                        {(i.price * i.quantity).toLocaleString()}
                      </span>
                    </div>
                    {i.isCombo && i.comboItems && (
                      <p className="text-[9px] pl-2 text-gray-700">
                        Includes:{' '}
                        {i.comboItems
                          .map((c) => `${c.quantity * i.quantity}x ${c.itemName}`)
                          .join(', ')}
                      </p>
                    )}
                    {receiptTemplate?.showItemModifiers !== false &&
                      i.selectedModifiers &&
                      i.selectedModifiers.length > 0 && (
                        <div className="pl-2 space-y-0.5">
                          {i.selectedModifiers.map((m) => (
                            <p
                              key={`${m.groupName}-${m.modifierId}`}
                              className="text-[9px] text-gray-700"
                            >
                              + {m.name}
                              {m.price > 0 ? ` (+${currencySymbol} ${m.price.toFixed(0)})` : ''}
                            </p>
                          ))}
                        </div>
                      )}
                    {receiptTemplate?.showKitchenNotes && i.notes && (
                      <p className="text-[9.5px] italic pl-2">* {i.notes}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="dashed-divider" />

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

                <div className="solid-divider" />

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

              <div className="dashed-divider" />

              <div className="space-y-0.5 text-[11px]">
                <div className="flex-between font-bold">
                  <span>Tender:</span>
                  <span className="uppercase">
                    {completedOrder.paymentMethod}
                    {completedOrder.paymentConfirmationStatus === 'PENDING_MPESA'
                      ? ' (PENDING)'
                      : ''}
                  </span>
                </div>
                {completedOrder.cashChangeDue > 0 && (
                  <div className="flex-between font-bold">
                    <span>Change Returned:</span>
                    <span>
                      {currencySymbol} {completedOrder.cashChangeDue.toLocaleString()}
                    </span>
                  </div>
                )}
                {receiptTemplate?.showLoyaltyPoints !== false && completedOrder.loyaltyTier && (
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

              {receiptTemplate?.showEtimsQrCode !== false && completedOrder.etimsDeviceSerial && (
                <div className="text-center pt-2 space-y-1">
                  <div className="w-16 h-16 mx-auto bg-gray-100 border border-gray-300 rounded flex items-center justify-center">
                    <QrCode size={48} className="text-black" />
                  </div>
                  <p className="text-[9px] font-bold">
                    {completedOrder.isOfflineQueued
                      ? 'PENDING KRA eTIMS SYNC'
                      : 'KRA eTIMS FISCAL INVOICE'}
                  </p>
                  <p className="text-[8px] text-gray-700">
                    SCU: {completedOrder.etimsDeviceSerial}
                  </p>
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
                disabled={isPrinting}
                onClick={handlePrintReceipt}
                className="flex-1 py-2.5 bg-servora-navy text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Printer size={14} /> {isPrinting ? 'Printing...' : 'Print Receipt'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCompletedOrder(null);
                  if ((autoLockAfterSale || isDedicatedKiosk) && isOnline) {
                    lockTerminalToKioskPin();
                  }
                }}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARED WAITER / CASHIER PIN KIOSK OVERLAY */}
      <PosPinKioskOverlay
        isOpen={isPinKioskOpen}
        isLocked={isTerminalLocked}
        branchId={activeBranch?.id ?? null}
        branchName={activeBranch?.name || 'Main Outlet'}
        currentOperatorName={currentUser?.fullName || currentUser?.firstName}
        operators={kioskOperators}
        onClose={() => setIsPinKioskOpen(false)}
        onSwitched={handleOperatorSwitched}
      />
    </div>
  );
}