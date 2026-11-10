"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testPrintSchema = exports.updatePrinterSchema = exports.createPrinterSchema = void 0;
const zod_1 = require("zod");
exports.createPrinterSchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().positive('Operating branch location is required'),
    name: zod_1.z.string().trim().min(2, 'Device name must be at least 2 characters'),
    deviceType: zod_1.z.enum(['RECEIPT', 'KITCHEN', 'BAR', 'LABEL', 'FISCAL_BOX']),
    connectionType: zod_1.z.enum(['NETWORK_TCP', 'USB', 'BLUETOOTH', 'SERIAL']).default('NETWORK_TCP'),
    ipAddress: zod_1.z
        .string()
        .trim()
        .regex(/^(\d{1,3}\.){3}\d{1,3}$/, 'Must be a valid IPv4 address (e.g. 192.168.1.200)')
        .optional()
        .nullable(),
    port: zod_1.z.coerce.number().min(1).max(65535).default(9100),
    macAddress: zod_1.z.string().trim().optional().nullable(),
    driverProtocol: zod_1.z.enum(['ESC_POS', 'STAR_LINE', 'TSPL', 'EPSON_XML']).default('ESC_POS'),
    paperWidth: zod_1.z.enum(['80MM', '58MM']).default('80MM'),
    autoCut: zod_1.z.boolean().default(true),
    openCashDrawerOnPrint: zod_1.z.boolean().default(false),
    beepOnPrint: zod_1.z.boolean().default(false),
    beepCount: zod_1.z.coerce.number().min(1).max(5).default(1),
    backupPrinterId: zod_1.z.coerce.number().positive().optional().nullable(),
    assignedStations: zod_1.z.array(zod_1.z.string()).default([]),
    isActive: zod_1.z.boolean().default(true),
});
exports.updatePrinterSchema = exports.createPrinterSchema.partial();
exports.testPrintSchema = zod_1.z.object({
    printerId: zod_1.z.coerce.number().positive('Printer identifier is required'),
});
