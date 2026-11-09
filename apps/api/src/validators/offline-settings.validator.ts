import { z } from 'zod';

export const updateOfflineSettingsSchema = z.object({
  branchId: z.coerce.number().positive().optional().nullable(),
  allowOfflineSales: z.boolean().default(true),
  maxOfflineHours: z.coerce.number().min(1).max(720).default(72),
  maxOfflineTicketTotal: z.coerce.number().min(0).default(50000),
  maxOfflineCumulativeBalance: z.coerce.number().min(0).default(500000),
  requireManagerAuthForOffline: z.boolean().default(false),
  conflictResolutionStrategy: z
    .enum(['SERVER_TIMESTAMP_WINS', 'CLIENT_TIMESTAMP_WINS', 'MANUAL_REVIEW'])
    .default('SERVER_TIMESTAMP_WINS'),
  autoSyncOnReconnect: z.boolean().default(true),
  syncBatchSize: z.coerce.number().min(1).max(500).default(50),
  syncIntervalSeconds: z.coerce.number().min(5).max(3600).default(30),
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
});

export const simulateSyncBatchSchema = z.object({
  terminalIdentifier: z.string().trim().min(2, 'Terminal ID is required'),
  recordCount: z.coerce.number().min(1, 'Record count must be at least 1').default(5),
});

export type UpdateOfflineSettingsInput = z.infer<typeof updateOfflineSettingsSchema>;
export type SimulateSyncBatchInput = z.infer<typeof simulateSyncBatchSchema>;