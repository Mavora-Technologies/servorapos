import { z } from 'zod';

export const ticketCategoryEnum = z.enum([
  'HARDWARE',
  'BILLING',
  'POS_KDS',
  'INVENTORY',
  'AUTH_SECURITY',
  'GENERAL',
]);

export const ticketPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const ticketStatusEnum = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_USER',
  'RESOLVED',
  'CLOSED',
]);

export const createTicketSchema = z.object({
  branchId: z.coerce.number().positive().optional().nullable(),
  subject: z.string().trim().min(2, 'Subject must be at least 2 characters').max(255),
  category: ticketCategoryEnum,
  priority: ticketPriorityEnum.default('MEDIUM'),
  description: z.string().trim().min(2, 'Description must be at least 2 characters'),
  diagnosticsPayload: z.record(z.string(), z.any()).optional().nullable(),
});

export const addTicketMessageSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty'),
  attachments: z.array(z.string().url()).default([]),
});

export const updateTicketStatusSchema = z.object({
  status: ticketStatusEnum,
});

export const listTicketsQuerySchema = z.object({
  status: z.string().trim().optional(),
  priority: z.string().trim().optional(),
  category: z.string().trim().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(15),
});

export const listKbQuerySchema = z.object({
  category: z.string().trim().optional(),
  search: z.string().trim().optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type AddTicketMessageInput = z.infer<typeof addTicketMessageSchema>;
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
export type ListKbQuery = z.infer<typeof listKbQuerySchema>;