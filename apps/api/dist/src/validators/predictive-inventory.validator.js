"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dismissRecommendationSchema = exports.convertToPurchaseOrderSchema = exports.predictiveInventoryQuerySchema = exports.replenishmentStatusEnum = exports.urgencyLevelEnum = void 0;
const zod_1 = require("zod");
exports.urgencyLevelEnum = zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'STABLE', 'ALL']);
exports.replenishmentStatusEnum = zod_1.z.enum(['PENDING_REVIEW', 'APPROVED_PO_CREATED', 'REJECTED_DISMISSED', 'AUTO_DISPATCHED', 'ALL']);
exports.predictiveInventoryQuerySchema = zod_1.z.object({
    branchId: zod_1.z.coerce.number().positive().optional(),
    urgencyLevel: exports.urgencyLevelEnum.default('ALL'),
    approvalStatus: exports.replenishmentStatusEnum.default('PENDING_REVIEW'),
    search: zod_1.z.string().trim().optional(),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(25),
    sortBy: zod_1.z.enum(['RUNOUT_DATE', 'TOTAL_COST', 'URGENCY', 'STOCK_LEVEL']).default('RUNOUT_DATE'),
    sortOrder: zod_1.z.enum(['ASC', 'DESC']).default('ASC'),
});
exports.convertToPurchaseOrderSchema = zod_1.z.object({
    recommendationId: zod_1.z.coerce.number().positive('Recommendation ID is required'),
    approvedOrderQty: zod_1.z.coerce.number().positive('Order quantity must be greater than zero').optional(),
    supplierId: zod_1.z.coerce.number().positive().optional().nullable(),
    deliveryDate: zod_1.z.string().optional().nullable(),
    procurementNotes: zod_1.z.string().trim().optional(),
});
exports.dismissRecommendationSchema = zod_1.z.object({
    recommendationId: zod_1.z.coerce.number().positive('Recommendation ID is required'),
    dismissalReason: zod_1.z.string().trim().min(3, 'Reason for dismissal is required for audit logs'),
});
