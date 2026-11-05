import * as kitchenRepo from '../repositories/kitchen.repository';

export const fetchActiveTickets = async (tenantId: number, station?: string) => {
  return await kitchenRepo.getActiveKitchenTickets(tenantId, station);
};

export const advanceTicketStatus = async (tenantId: number, orderId: number, status: string) => {
  if (!['Preparing', 'Ready', 'Cancelled'].includes(status)) {
    throw new Error('Invalid kitchen status transition');
  }
  return await kitchenRepo.updateTicketStatus(tenantId, orderId, status);
};

export const fetchKitchenHistory = async (tenantId: number) => {
  return await kitchenRepo.getKitchenHistoryTickets(tenantId);
};

export const fetchKitchenPerformance = async (tenantId: number) => {
  return await kitchenRepo.getKitchenPerformanceStats(tenantId);
};