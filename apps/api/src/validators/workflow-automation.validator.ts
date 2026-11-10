import { z } from 'zod';
import { AUTOMATION_EVENT_CATALOG, AUTOMATION_ACTION_CATALOG } from '../config/automation-catalog';

export const workflowDomainEnum = z.enum([
  'WORKFORCE_HCM',
  'INVENTORY_SCM',
  'GUEST_CRM',
  'FINANCE_TREASURY',
]);

export const conditionLogicSchema = z.object({
  field: z.string().trim().min(1, 'Payload field is required'),
  operator: z.enum(['GREATER_THAN', 'LESS_THAN', 'EQUALS', 'CONTAINS']),
  value: z.union([z.number(), z.string(), z.boolean()]),
  unit: z.string().optional(),
});

export const actionPayloadSchema = z.object({
  targetRoleId: z.coerce.number().int().positive('A valid target role from your enterprise directory is required').optional().nullable(),
  targetRoleSlug: z.string().trim().optional(),
  priorityLevel: z.enum(['NORMAL', 'HIGH', 'URGENT']).default('HIGH'),
  safetyBufferDays: z.coerce.number().int().min(1).max(60).optional(),
  bonusPoints: z.coerce.number().int().min(1).optional(),
  channel: z.enum(['SMS', 'EMAIL', 'SYSTEM']).default('SYSTEM'),
  autoExecute: z.boolean().default(true),
});

export const createWorkflowRuleSchema = z.object({
  name: z.string().trim().min(3, 'Rule name must be at least 3 characters').max(255),
  description: z.string().trim().optional().nullable(),
  domain: workflowDomainEnum.default('WORKFORCE_HCM'),
  triggerEvent: z.string().refine((val) => val in AUTOMATION_EVENT_CATALOG, {
    message: 'Trigger event must match an enterprise catalog definition',
  }),
  conditionLogic: conditionLogicSchema,
  actionType: z.string().refine((val) => val in AUTOMATION_ACTION_CATALOG, {
    message: 'Action type must match an enterprise actuator definition',
  }),
  actionPayload: actionPayloadSchema,
  branchId: z.coerce.number().positive().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateWorkflowRuleSchema = createWorkflowRuleSchema.partial();

export const listWorkflowRulesQuerySchema = z.object({
  domain: z.string().trim().optional(),
  isActive: z.enum(['ALL', 'TRUE', 'FALSE']).default('ALL'),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type CreateWorkflowRuleInput = z.infer<typeof createWorkflowRuleSchema>;
export type UpdateWorkflowRuleInput = z.infer<typeof updateWorkflowRuleSchema>;
export type ListWorkflowRulesQuery = z.infer<typeof listWorkflowRulesQuerySchema>;