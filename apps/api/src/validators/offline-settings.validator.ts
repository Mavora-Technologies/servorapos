// apps/api/src/validators/offline-settings.validator.ts
import { z } from 'zod';

export const CONFLICT_STRATEGIES = [
  'SERVER_TIMESTAMP_WINS',
  'CLIENT_TIMESTAMP_WINS',
  'MANUAL_REVIEW',
] as const;

export const updateOfflineSettingsSchema = z
  .object({
    branchId: z.preprocess(
      (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
      z.number().int().positive('Invalid branch ID').nullable()
    ),
    allowOfflineSales: z.boolean().default(true),
    maxOfflineHours: z.coerce.number().int().min(1).max(720).default(72),
    maxOfflineTicketTotal: z.coerce.number().min(0).default(50000),
    maxOfflineCumulativeBalance: z.coerce.number().min(0).default(500000),
    requireManagerAuthForOffline: z.boolean().default(false),
    conflictResolutionStrategy: z.enum(CONFLICT_STRATEGIES).default('SERVER_TIMESTAMP_WINS'),
    autoSyncOnReconnect: z.boolean().default(true),
    syncBatchSize: z.coerce.number().int().min(1).max(500).default(50),
    syncIntervalSeconds: z.coerce.number().int().min(5).max(3600).default(30),
    cacheCatalogItems: z.boolean().default(true),
    cacheCustomerDirectory: z.boolean().default(true),
    cacheTaxTables: z.boolean().default(true),
    cacheUserCredentials: z.boolean().default(true),
    encryptLocalStorage: z.boolean().default(true),
    allowOfflineCash: z.boolean().default(true),
    allowOfflineCard: z.boolean().default(true),
    allowOfflineMpesaReference: z.boolean().default(true),
    allowOfflineGiftCards: z.boolean().default(false),
    allowOfflineCreditTabs: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (
      data.maxOfflineCumulativeBalance > 0 &&
      data.maxOfflineTicketTotal > data.maxOfflineCumulativeBalance
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxOfflineTicketTotal'],
        message: 'Single ticket ceiling cannot exceed the cumulative unsynced balance limit.',
      });
    }
  });

export const offlineQueuedOrderItemSchema = z.object({
  menuItemId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(255).optional(),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().min(0),
  modifiersPrice: z.coerce.number().min(0).optional().default(0),
  totalPrice: z.coerce.number().min(0),
  selectedModifiers: z
    .array(
      z.object({
        modifierId: z.coerce.number().int().positive(),
        name: z.string(),
        price: z.coerce.number(),
      })
    )
    .optional()
    .default([]),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const offlineQueuedOrderSchema = z.object({
  idempotencyKey: z.string().trim().min(6).max(100),
  clientCreatedAt: z.string().datetime({ offset: true }).optional(),
  branchId: z.coerce.number().int().positive().optional().nullable(),
  tableId: z.coerce.number().int().positive().optional().nullable(),
  tableName: z.string().trim().max(100).optional().nullable(),
  customerId: z.coerce.number().int().positive().optional().nullable(),
  orderType: z.string().trim().min(1).max(50).default('Dine-In'),
  customerName: z.string().trim().max(255).optional().nullable(),
  customerPhone: z.string().trim().max(50).optional().nullable(),
  buyerKraPin: z.string().trim().max(50).optional().nullable(),
  subtotal: z.coerce.number().min(0),
  tax: z.coerce.number().min(0).default(0),
  cateringLevy: z.coerce.number().min(0).default(0),
  serviceCharge: z.coerce.number().min(0).default(0),
  discountTotal: z.coerce.number().min(0).default(0),
  total: z.coerce.number().min(0),
  paymentMethod: z.string().trim().min(1).max(50),
  mpesaReference: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  items: z.array(offlineQueuedOrderItemSchema).min(1),
});

export const syncOfflineBatchSchema = z.object({
  terminalIdentifier: z.string().trim().min(2, 'Terminal identifier is required').max(100),
  batchReference: z.string().trim().min(4, 'Batch reference is required').max(100),
  branchId: z.coerce.number().int().positive().optional().nullable(),
  orders: z.array(offlineQueuedOrderSchema).min(1, 'At least one queued order is required').max(500),
});

export type UpdateOfflineSettingsInput = z.infer<typeof updateOfflineSettingsSchema>;
export type OfflineQueuedOrderInput = z.infer<typeof offlineQueuedOrderSchema>;
export type SyncOfflineBatchInput = z.infer<typeof syncOfflineBatchSchema>;