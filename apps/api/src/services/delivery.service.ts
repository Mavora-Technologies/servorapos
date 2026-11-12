import * as deliveryRepo from '../repositories/delivery.repository';
import {
  ListDeliveriesQuery,
  DispatchDeliveryInput,
} from '../validators/delivery.validator';

export const getDeliveries = async (tenantId: number, query?: ListDeliveriesQuery) =>
  await deliveryRepo.fetchDeliveryOrders(tenantId, query);

export const getFleetStaff = async (tenantId: number) =>
  await deliveryRepo.fetchFleetStaffDirectory(tenantId);

export const dispatchOrder = async (
  tenantId: number,
  userId: number,
  orderId: number,
  input: DispatchDeliveryInput
) => {
  return await deliveryRepo.assignDriverTransaction(tenantId, userId, orderId, input);
};

export const completeDelivery = async (
  tenantId: number,
  userId: number,
  orderId: number
) => {
  return await deliveryRepo.markDeliveredTransaction(tenantId, userId, orderId);
};