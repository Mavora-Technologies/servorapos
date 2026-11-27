"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncOfflineBatchSchema = exports.offlineQueuedOrderSchema = exports.offlineQueuedOrderItemSchema = exports.updateOfflineSettingsSchema = exports.CONFLICT_STRATEGIES = void 0;
// apps/api/src/validators/offline-settings.validator.ts
const zod_1 = require("zod");
exports.CONFLICT_STRATEGIES = [
    'SERVER_TIMESTAMP_WINS',
    'CLIENT_TIMESTAMP_WINS',
    'MANUAL_REVIEW',
];
exports.updateOfflineSettingsSchema = zod_1.z
    .object({
    branchId: zod_1.z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), zod_1.z.number().int().positive('Invalid branch ID').nullable()),
    allowOfflineSales: zod_1.z.boolean().default(true),
    maxOfflineHours: zod_1.z.coerce.number().int().min(1).max(720).default(72),
    maxOfflineTicketTotal: zod_1.z.coerce.number().min(0).default(50000),
    maxOfflineCumulativeBalance: zod_1.z.coerce.number().min(0).default(500000),
    requireManagerAuthForOffline: zod_1.z.boolean().default(false),
    conflictResolutionStrategy: zod_1.z.enum(exports.CONFLICT_STRATEGIES).default('SERVER_TIMESTAMP_WINS'),
    autoSyncOnReconnect: zod_1.z.boolean().default(true),
    syncBatchSize: zod_1.z.coerce.number().int().min(1).max(500).default(50),
    syncIntervalSeconds: zod_1.z.coerce.number().int().min(5).max(3600).default(30),
    cacheCatalogItems: zod_1.z.boolean().default(true),
    cacheCustomerDirectory: zod_1.z.boolean().default(true),
    cacheTaxTables: zod_1.z.boolean().default(true),
    cacheUserCredentials: zod_1.z.boolean().default(true),
    encryptLocalStorage: zod_1.z.boolean().default(true),
    allowOfflineCash: zod_1.z.boolean().default(true),
    allowOfflineCard: zod_1.z.boolean().default(true),
    allowOfflineMpesaReference: zod_1.z.boolean().default(true),
    allowOfflineGiftCards: zod_1.z.boolean().default(false),
    allowOfflineCreditTabs: zod_1.z.boolean().default(false),
})
    .superRefine((data, ctx) => {
    if (data.maxOfflineCumulativeBalance > 0 &&
        data.maxOfflineTicketTotal > data.maxOfflineCumulativeBalance) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['maxOfflineTicketTotal'],
            message: 'Single ticket ceiling cannot exceed the cumulative unsynced balance limit.',
        });
    }
});
exports.offlineQueuedOrderItemSchema = zod_1.z.object({
    menuItemId: zod_1.z.coerce.number().int().positive(),
    name: zod_1.z.string().trim().min(1).max(255).optional(),
    quantity: zod_1.z.coerce.number().positive(),
    unitPrice: zod_1.z.coerce.number().min(0),
    modifiersPrice: zod_1.z.coerce.number().min(0).optional().default(0),
    totalPrice: zod_1.z.coerce.number().min(0),
    selectedModifiers: zod_1.z
        .array(zod_1.z.object({
        modifierId: zod_1.z.coerce.number().int().positive(),
        name: zod_1.z.string(),
        price: zod_1.z.coerce.number(),
    }))
        .optional()
        .default([]),
    notes: zod_1.z.string().trim().max(500).optional().nullable(),
});
exports.offlineQueuedOrderSchema = zod_1.z.object({
    idempotencyKey: zod_1.z.string().trim().min(6).max(100),
    clientCreatedAt: zod_1.z.string().datetime({ offset: true }).optional(),
    branchId: zod_1.z.coerce.number().int().positive().optional().nullable(),
    tableId: zod_1.z.coerce.number().int().positive().optional().nullable(),
    tableName: zod_1.z.string().trim().max(100).optional().nullable(),
    customerId: zod_1.z.coerce.number().int().positive().optional().nullable(),
    orderType: zod_1.z.string().trim().min(1).max(50).default('Dine-In'),
    customerName: zod_1.z.string().trim().max(255).optional().nullable(),
    customerPhone: zod_1.z.string().trim().max(50).optional().nullable(),
    buyerKraPin: zod_1.z.string().trim().max(50).optional().nullable(),
    subtotal: zod_1.z.coerce.number().min(0),
    tax: zod_1.z.coerce.number().min(0).default(0),
    cateringLevy: zod_1.z.coerce.number().min(0).default(0),
    serviceCharge: zod_1.z.coerce.number().min(0).default(0),
    discountTotal: zod_1.z.coerce.number().min(0).default(0),
    total: zod_1.z.coerce.number().min(0),
    paymentMethod: zod_1.z.string().trim().min(1).max(50),
    mpesaReference: zod_1.z.string().trim().max(100).optional().nullable(),
    notes: zod_1.z.string().trim().max(500).optional().nullable(),
    items: zod_1.z.array(exports.offlineQueuedOrderItemSchema).min(1),
});
exports.syncOfflineBatchSchema = zod_1.z.object({
    terminalIdentifier: zod_1.z.string().trim().min(2, 'Terminal identifier is required').max(100),
    batchReference: zod_1.z.string().trim().min(4, 'Batch reference is required').max(100),
    branchId: zod_1.z.coerce.number().int().positive().optional().nullable(),
    orders: zod_1.z.array(exports.offlineQueuedOrderSchema).min(1, 'At least one queued order is required').max(500),
});
