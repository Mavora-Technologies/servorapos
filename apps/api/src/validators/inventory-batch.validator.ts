import { z } from 'zod';

export const createBatchSchema = z.object({
  inventoryItemId: z.coerce.number().positive('Inventory item is required'),
  supplierId: z.coerce.number().positive().optional().nullable(),
  batchNumber: z.string().min(2, 'Batch/Lot code must be at least 2 characters').trim(),
  supplierBatchNumber: z.string().trim().optional().nullable(),
  certificateNumber: z.string().trim().optional().nullable(),
  initialQuantity: z.coerce.number().positive('Initial quantity must be greater than 0'),
  unitCost: z.coerce.number().min(0).optional(),
  locationBin: z.string().trim().optional().nullable(),
  storageTemperature: z.coerce.number().optional().nullable(),
  receivedDate: z.string().optional(),
  expiryDate: z.string().min(1, 'Expiration date is required'),
  status: z.enum(['ACTIVE', 'QUARANTINE', 'QUALITY_HOLD']).default('ACTIVE'),
  notes: z.string().optional().nullable(),
});

export const updateBatchStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'QUARANTINE', 'QUALITY_HOLD', 'DISCARDED']),
  notes: z.string().optional().nullable(),
});

export const discardBatchSchema = z.object({
  quantity: z.coerce.number().positive('Discard quantity must be greater than 0'),
  reason: z.string().min(2, 'Reason for disposal is required').trim(),
  notes: z.string().optional().nullable(),
});

export type CreateBatchInput = z.infer<typeof createBatchSchema>;
export type UpdateBatchStatusInput = z.infer<typeof updateBatchStatusSchema>;
export type DiscardBatchInput = z.infer<typeof discardBatchSchema>;