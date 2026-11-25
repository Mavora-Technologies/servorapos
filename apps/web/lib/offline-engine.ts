// apps/web/lib/offline-engine.ts
import { fetchApi } from '@/lib/api';

const DB_NAME = 'servora_offline_v1';
const DB_VERSION = 1;
const STORE_QUEUE = 'queued_orders';
const STORE_META = 'offline_meta';

export interface CachedOfflinePolicy {
  allowOfflineSales: boolean;
  maxOfflineHours: number;
  maxOfflineTicketTotal: number;
  maxOfflineCumulativeBalance: number;
  autoSyncOnReconnect: boolean;
  syncBatchSize: number;
  syncIntervalSeconds: number;
  allowOfflineCash: boolean;
  allowOfflineCard: boolean;
  allowOfflineMpesaReference: boolean;
  allowOfflineGiftCards: boolean;
  allowOfflineCreditTabs: boolean;
}

export interface QueuedOfflineOrder {
  idempotencyKey: string;
  clientCreatedAt: string;
  branchId?: number | null;
  tableId?: number | null;
  tableName?: string | null;
  customerId?: number | null;
  orderType: string;
  customerName?: string | null;
  customerPhone?: string | null;
  buyerKraPin?: string | null;
  subtotal: number;
  tax: number;
  cateringLevy: number;
  serviceCharge: number;
  discountTotal: number;
  total: number;
  paymentMethod: string;
  mpesaReference?: string | null;
  notes?: string | null;
  items: Array<{
    menuItemId: number;
    name?: string;
    quantity: number;
    unitPrice: number;
    modifiersPrice?: number;
    totalPrice: number;
    selectedModifiers?: Array<{ modifierId: number; name: string; price: number }>;
    notes?: string | null;
  }>;
  syncStatus: 'PENDING' | 'FAILED';
  lastError?: string | null;
}

function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB is unavailable in this environment.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'idempotencyKey' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB.'));
  });
}

export async function cacheOfflinePolicy(policy: CachedOfflinePolicy): Promise<void> {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, 'readwrite');
    tx.objectStore(STORE_META).put({
      key: 'policy',
      value: policy,
      updatedAt: new Date().toISOString(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedOfflinePolicy(): Promise<CachedOfflinePolicy | null> {
  try {
    const db = await openOfflineDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readonly');
      const req = tx.objectStore(STORE_META).get('policy');
      req.onsuccess = () => resolve(req.result?.value ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function getQueuedOfflineOrders(): Promise<QueuedOfflineOrder[]> {
  try {
    const db = await openOfflineDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_QUEUE, 'readonly');
      const req = tx.objectStore(STORE_QUEUE).getAll();
      req.onsuccess = () => resolve((req.result as QueuedOfflineOrder[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function enqueueOfflineOrder(
  order: Omit<QueuedOfflineOrder, 'idempotencyKey' | 'clientCreatedAt' | 'syncStatus'>
): Promise<QueuedOfflineOrder> {
  const policy = await getCachedOfflinePolicy();
  const existingQueue = await getQueuedOfflineOrders();

  if (policy) {
    if (!policy.allowOfflineSales) {
      throw new Error('Offline sales are disabled by your organization policy.');
    }
    if (policy.maxOfflineTicketTotal > 0 && order.total > policy.maxOfflineTicketTotal) {
      throw new Error(
        `Order total exceeds offline single-ticket ceiling (KES ${policy.maxOfflineTicketTotal.toLocaleString()}).`
      );
    }
    const pendingSum = existingQueue.reduce((sum, q) => sum + (q.total || 0), 0);
    if (
      policy.maxOfflineCumulativeBalance > 0 &&
      pendingSum + order.total > policy.maxOfflineCumulativeBalance
    ) {
      throw new Error(
        `Offline cumulative balance limit (KES ${policy.maxOfflineCumulativeBalance.toLocaleString()}) reached. Reconnect to sync.`
      );
    }
    const method = order.paymentMethod.toUpperCase();
    if (method.includes('CASH') && !policy.allowOfflineCash) {
      throw new Error('Cash tender is disabled during offline mode.');
    }
    if (method.includes('CARD') && !policy.allowOfflineCard) {
      throw new Error('Card store-and-forward is disabled during offline mode.');
    }
    if (method.includes('MPESA') && !policy.allowOfflineMpesaReference) {
      throw new Error('Offline M-Pesa reference capture is disabled.');
    }
  }

  const record: QueuedOfflineOrder = {
    ...order,
    idempotencyKey: `OFF-${crypto.randomUUID()}`,
    clientCreatedAt: new Date().toISOString(),
    syncStatus: 'PENDING',
    lastError: null,
  };

  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    tx.objectStore(STORE_QUEUE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return record;
}

export async function removeQueuedOrders(idempotencyKeys: string[]): Promise<void> {
  if (idempotencyKeys.length === 0) return;
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    const store = tx.objectStore(STORE_QUEUE);
    for (const key of idempotencyKeys) {
      store.delete(key);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function getTerminalIdentifier(): string {
  if (typeof window === 'undefined') return 'POS-WEB';
  let id = localStorage.getItem('servora_terminal_id');
  if (!id) {
    id = `POS-WEB-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    localStorage.setItem('servora_terminal_id', id);
  }
  return id;
}

/**
 * Flushes all locally queued offline POS orders to PostgreSQL in chunks.
 */
export async function syncQueuedTransactions(): Promise<{
  syncedCount: number;
  conflictCount: number;
  remainingCount: number;
  message: string;
}> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Terminal is currently offline. Reconnect to sync queued transactions.');
  }

  const queue = await getQueuedOfflineOrders();
  if (queue.length === 0) {
    return {
      syncedCount: 0,
      conflictCount: 0,
      remainingCount: 0,
      message: 'Local offline queue is empty.',
    };
  }

  const policy = await getCachedOfflinePolicy();
  const chunkSize = Math.max(1, policy?.syncBatchSize ?? 50);
  const terminalIdentifier = getTerminalIdentifier();

  let totalSynced = 0;
  let totalConflicts = 0;

  for (let i = 0; i < queue.length; i += chunkSize) {
    const chunk = queue.slice(i, i + chunkSize);
    const batchReference = `BATCH-${Date.now().toString(36).toUpperCase()}-${i}`;
    const branchId = chunk[0]?.branchId ?? null;

    const res = await fetchApi('/api/v1/settings/offline/sync', {
      method: 'POST',
      body: JSON.stringify({
        terminalIdentifier,
        batchReference,
        branchId,
        orders: chunk,
      }),
    });

    const reconciledKeys: string[] = res?.data?.reconciledKeys ?? [];
    const conflicts: Array<{ idempotencyKey: string; reason: string }> =
      res?.data?.conflicts ?? [];

    await removeQueuedOrders(reconciledKeys);
    totalSynced += reconciledKeys.length;
    totalConflicts += conflicts.length;
  }

  const remaining = await getQueuedOfflineOrders();
  return {
    syncedCount: totalSynced,
    conflictCount: totalConflicts,
    remainingCount: remaining.length,
    message: `Reconciled ${totalSynced} offline order(s)${
      totalConflicts > 0 ? ` with ${totalConflicts} conflict(s)` : ''
    }.`,
  };
}