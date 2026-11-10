import { z } from 'zod';

export const scopeDomainEnum = z.enum([
  'GENERAL_OPS',
  'WORKFORCE_HCM',
  'INVENTORY_SUPPLY',
  'FINANCE_TREASURY',
  'GUEST_CRM',
]);

export const createAiSessionSchema = z.object({
  title: z.string().trim().min(2).max(255).default('Strategic Advisory Session'),
  scopeDomain: scopeDomainEnum.default('GENERAL_OPS'),
});

export const promptAiCopilotSchema = z.object({
  sessionId: z.coerce.number().positive().optional().nullable(),
  prompt: z.string().trim().min(2, 'Inquiry prompt is required'),
  scopeDomain: scopeDomainEnum.default('GENERAL_OPS'),
  includeTelemetrySnapshot: z.boolean().default(true),
});

export const executeCopilotActionSchema = z.object({
  actionCode: z.enum([
    'ADJUST_SHIFTS_FOR_DEMAND',
    'REORDER_DEPLETED_STOCK',
    'DISPATCH_LAPSED_PROMO',
    'FLAG_LABOR_OVERTIME',
    'REFRESH_KITCHEN_SLA',
  ]),
  payload: z.record(z.string(), z.any()).optional(),
});

export type CreateAiSessionInput = z.infer<typeof createAiSessionSchema>;
export type PromptAiCopilotInput = z.infer<typeof promptAiCopilotSchema>;
export type ExecuteCopilotActionInput = z.infer<typeof executeCopilotActionSchema>;