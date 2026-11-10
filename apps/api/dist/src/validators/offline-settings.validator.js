"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateSyncBatchSchema = exports.updateOfflineSettingsSchema = void 0;
const zod_1 = require("zod");
exports.updateOfflineSettingsSchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().positive().optional().nullable(),
    allowOfflineSales: zod_1.z.boolean().default(true),
    maxOfflineHours: zod_1.z.coerce.number().min(1).max(720).default(72),
    maxOfflineTicketTotal: zod_1.z.coerce.number().min(0).default(50000),
    maxOfflineCumulativeBalance: zod_1.z.coerce.number().min(0).default(500000),
    requireManagerAuthForOffline: zod_1.z.boolean().default(false),
    conflictResolutionStrategy: zod_1.z
        .enum(['SERVER_TIMESTAMP_WINS', 'CLIENT_TIMESTAMP_WINS', 'MANUAL_REVIEW'])
        .default('SERVER_TIMESTAMP_WINS'),
    autoSyncOnReconnect: zod_1.z.boolean().default(true),
    syncBatchSize: zod_1.z.coerce.number().min(1).max(500).default(50),
    syncIntervalSeconds: zod_1.z.coerce.number().min(5).max(3600).default(30),
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
});
exports.simulateSyncBatchSchema = zod_1.z.object({
    terminalIdentifier: zod_1.z.string().trim().min(2, 'Terminal ID is required'),
    recordCount: zod_1.z.coerce.number().min(1, 'Record count must be at least 1').default(5),
});
