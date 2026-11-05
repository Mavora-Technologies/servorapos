// apps/api/src/validators/stock-transfer.validator.ts
import { z } from 'zod';

export const createTransferItemSchema = z.object({
  inventoryItemId: z.coerce.number().positive('Inventory item is required'),
  requestedQuantity: z.coerce.number().positive('Quantity must be greater than zero'),
  unitCost: z.coerce.number().min(0).optional(),
});

export const createTransferSchema = z
  .object({
    sourceBranchId: z.coerce.number().positive('Source branch is required'),
    destinationBranchId: z.coerce.number().positive('Destination branch is required'),
    notes: z.string().optional().nullable(),
    items: z.array(createTransferItemSchema).min(1, 'At least one item is required for transfer'),
  })
  .refine((data) => data.sourceBranchId !== data.destinationBranchId, {
    message: 'Source and destination branches must be different',
    path: ['destinationBranchId'],
  });

export const dispatchTransferSchema = z.object({
  carrierVehiclePlate: z.string().trim().min(2, 'Vehicle registration plate is required'),
  driverName: z.string().trim().min(2, 'Driver or transport agent name is required'),
  dispatchTempProbe: z.coerce
    .number()
    .min(-30, 'Temperature below realistic reefer minimum (-30°C)')
    .max(60, 'Temperature above realistic transit maximum (60°C)')
    .optional()
    .nullable(),
  items: z
    .array(
      z.object({
        itemId: z.coerce.number().positive('Transfer line ID is required'),
        sentQuantity: z.coerce.number().positive('Dispatched quantity must be greater than zero'),
        batchNumber: z.string().trim().optional().nullable(),
      })
    )
    .min(1, 'At least one line item must be dispatched'),
  notes: z.string().optional().nullable(),
});

export const receiveTransferSchema = z.object({
  arrivalTempProbe: z.coerce
    .number()
    .min(-30, 'Temperature below realistic reefer minimum (-30°C)')
    .max(60, 'Temperature above realistic transit maximum (60°C)')
    .optional()
    .nullable(),
  items: z
    .array(
      z.object({
        itemId: z.coerce.number().positive('Transfer line ID is required'),
        receivedQuantity: z.coerce.number().min(0, 'Received quantity must be non-negative'),
        notes: z.string().optional().nullable(),
      })
    )
    .min(1, 'At least one line item must be verified'),
  notes: z.string().optional().nullable(),
});

export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type DispatchTransferInput = z.infer<typeof dispatchTransferSchema>;
export type ReceiveTransferInput = z.infer<typeof receiveTransferSchema>;