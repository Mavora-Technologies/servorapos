"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listWorkflowRulesQuerySchema = exports.updateWorkflowRuleSchema = exports.createWorkflowRuleSchema = exports.actionPayloadSchema = exports.conditionLogicSchema = exports.workflowDomainEnum = void 0;
const zod_1 = require("zod");
const automation_catalog_1 = require("../config/automation-catalog");
exports.workflowDomainEnum = zod_1.z.enum([
    'WORKFORCE_HCM',
    'INVENTORY_SCM',
    'GUEST_CRM',
    'FINANCE_TREASURY',
]);
exports.conditionLogicSchema = zod_1.z.object({
    field: zod_1.z.string().trim().min(1, 'Payload field is required'),
    operator: zod_1.z.enum(['GREATER_THAN', 'LESS_THAN', 'EQUALS', 'CONTAINS']),
    value: zod_1.z.union([zod_1.z.number(), zod_1.z.string(), zod_1.z.boolean()]),
    unit: zod_1.z.string().optional(),
});
exports.actionPayloadSchema = zod_1.z.object({
    targetRoleId: zod_1.z.coerce.number().int().positive('A valid target role from your enterprise directory is required').optional().nullable(),
    targetRoleSlug: zod_1.z.string().trim().optional(),
    priorityLevel: zod_1.z.enum(['NORMAL', 'HIGH', 'URGENT']).default('HIGH'),
    safetyBufferDays: zod_1.z.coerce.number().int().min(1).max(60).optional(),
    bonusPoints: zod_1.z.coerce.number().int().min(1).optional(),
    channel: zod_1.z.enum(['SMS', 'EMAIL', 'SYSTEM']).default('SYSTEM'),
    autoExecute: zod_1.z.boolean().default(true),
});
exports.createWorkflowRuleSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(3, 'Rule name must be at least 3 characters').max(255),
    description: zod_1.z.string().trim().optional().nullable(),
    domain: exports.workflowDomainEnum.default('WORKFORCE_HCM'),
    triggerEvent: zod_1.z.string().refine((val) => val in automation_catalog_1.AUTOMATION_EVENT_CATALOG, {
        message: 'Trigger event must match an enterprise catalog definition',
    }),
    conditionLogic: exports.conditionLogicSchema,
    actionType: zod_1.z.string().refine((val) => val in automation_catalog_1.AUTOMATION_ACTION_CATALOG, {
        message: 'Action type must match an enterprise actuator definition',
    }),
    actionPayload: exports.actionPayloadSchema,
    branchId: zod_1.z.coerce.number().positive().optional().nullable(),
    isActive: zod_1.z.boolean().default(true),
});
exports.updateWorkflowRuleSchema = exports.createWorkflowRuleSchema.partial();
exports.listWorkflowRulesQuerySchema = zod_1.z.object({
    domain: zod_1.z.string().trim().optional(),
    isActive: zod_1.z.enum(['ALL', 'TRUE', 'FALSE']).default('ALL'),
    search: zod_1.z.string().trim().optional(),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(25),
});
