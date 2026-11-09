import { z } from 'zod';

export const createPrinterSchema = z.object({
  branchId: z.coerce.number().positive('Operating branch location is required'),
  name: z.string().trim().min(2, 'Device name must be at least 2 characters'),
  deviceType: z.enum(['RECEIPT', 'KITCHEN', 'BAR', 'LABEL', 'FISCAL_BOX']),
  connectionType: z.enum(['NETWORK_TCP', 'USB', 'BLUETOOTH', 'SERIAL']).default('NETWORK_TCP'),
  ipAddress: z
    .string()
    .trim()
    .regex(/^(\d{1,3}\.){3}\d{1,3}$/, 'Must be a valid IPv4 address (e.g. 192.168.1.200)')
    .optional()
    .nullable(),
  port: z.coerce.number().min(1).max(65535).default(9100),
  macAddress: z.string().trim().optional().nullable(),
  driverProtocol: z.enum(['ESC_POS', 'STAR_LINE', 'TSPL', 'EPSON_XML']).default('ESC_POS'),
  paperWidth: z.enum(['80MM', '58MM']).default('80MM'),
  autoCut: z.boolean().default(true),
  openCashDrawerOnPrint: z.boolean().default(false),
  beepOnPrint: z.boolean().default(false),
  beepCount: z.coerce.number().min(1).max(5).default(1),
  backupPrinterId: z.coerce.number().positive().optional().nullable(),
  assignedStations: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export const updatePrinterSchema = createPrinterSchema.partial();

export const testPrintSchema = z.object({
  printerId: z.coerce.number().positive('Printer identifier is required'),
});

export type CreatePrinterInput = z.infer<typeof createPrinterSchema>;
export type UpdatePrinterInput = z.infer<typeof updatePrinterSchema>;