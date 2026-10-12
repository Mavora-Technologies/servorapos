import * as kitchenRepo from '../repositories/kitchen.repository';

export const fetchActiveTickets = async (tenantId: number) => {
  return await kitchenRepo.getActiveKitchenTickets(tenantId);
};

export const advanceTicketStatus = async (tenantId: number, orderId: number, status: string) => {
  if (!['Preparing', 'Ready'].includes(status)) {
    throw new Error('Invalid kitchen status transition');
  }
  return await kitchenRepo.updateTicketStatus(tenantId, orderId, status);
};