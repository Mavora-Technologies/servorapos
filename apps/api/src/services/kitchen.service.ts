import * as kitchenRepo from '../repositories/kitchen.repository';
import { KitchenTicketsQuery } from '../validators/kitchen.validator';

export const fetchTenantStations = async (tenantId: number) => {
  return await kitchenRepo.getDistinctTenantKitchenStations(tenantId);
};

export const fetchActiveTickets = async (
  tenantId: number,
  query: KitchenTicketsQuery = {}
) => {
  return await kitchenRepo.getActiveKitchenTickets(tenantId, query);
};

export const advanceTicketStatus = async (
  tenantId: number,
  userId: number | null,
  orderId: number,
  status: string
) => {
  if (!['Confirmed', 'Preparing', 'Ready', 'Cancelled'].includes(status)) {
    throw new Error('Invalid kitchen status transition');
  }
  return await kitchenRepo.updateTicketStatus(tenantId, userId, orderId, status);
};

export const advanceLineItemStatus = async (
  tenantId: number,
  orderItemId: number,
  kitchenStatus: 'New' | 'Preparing' | 'Ready'
) => {
  return await kitchenRepo.updateLineItemKitchenStatus(
    tenantId,
    orderItemId,
    kitchenStatus
  );
};

export const fetchKitchenHistory = async (tenantId: number, branchId?: number) => {
  return await kitchenRepo.getKitchenHistoryTickets(tenantId, branchId);
};

export const fetchKitchenPerformance = async (tenantId: number, branchId?: number) => {
  return await kitchenRepo.getKitchenPerformanceStats(tenantId, branchId);
};