"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeCopilotActionSchema = exports.promptAiCopilotSchema = exports.createAiSessionSchema = exports.scopeDomainEnum = void 0;
const zod_1 = require("zod");
exports.scopeDomainEnum = zod_1.z.enum([
    'GENERAL_OPS',
    'WORKFORCE_HCM',
    'INVENTORY_SUPPLY',
    'FINANCE_TREASURY',
    'GUEST_CRM',
]);
exports.createAiSessionSchema = zod_1.z.object({
    title: zod_1.z.string().trim().min(2).max(255).default('Strategic Advisory Session'),
    scopeDomain: exports.scopeDomainEnum.default('GENERAL_OPS'),
});
exports.promptAiCopilotSchema = zod_1.z.object({
    sessionId: zod_1.z.coerce.number().positive().optional().nullable(),
    prompt: zod_1.z.string().trim().min(2, 'Inquiry prompt is required'),
    scopeDomain: exports.scopeDomainEnum.default('GENERAL_OPS'),
    includeTelemetrySnapshot: zod_1.z.boolean().default(true),
});
exports.executeCopilotActionSchema = zod_1.z.object({
    actionCode: zod_1.z.enum([
        'ADJUST_SHIFTS_FOR_DEMAND',
        'REORDER_DEPLETED_STOCK',
        'DISPATCH_LAPSED_PROMO',
        'FLAG_LABOR_OVERTIME',
        'REFRESH_KITCHEN_SLA',
    ]),
    payload: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
