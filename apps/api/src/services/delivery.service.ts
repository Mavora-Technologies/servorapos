import * as deliveryRepo from '../repositories/delivery.repository';

export const getDeliveries = async (tenantId: number) => await deliveryRepo.fetchDeliveryOrders(tenantId);

// 3PL Integration Simulator
const requestThirdPartyLogistics = async (provider: string) => {
  // In production, this uses the provider's REST API (e.g., Uber Direct API or Bolt API)
  // to request a rider and receive the driver details & tracking link.
  
  const mockDrivers = ['Kamau (Bodaboda)', 'Ochieng (Rider)', 'Njoroge', 'Wanjiku (Delivery)'];
  const randomDriver = mockDrivers[Math.floor(Math.random() * mockDrivers.length)];
  const randomPhone = `07${Math.floor(Math.random() * 90000000 + 10000000)}`;
  const mockFee = Math.floor(Math.random() * 300) + 150; // Random fee between 150 - 450 KES

  return {
    provider,
    driverName: randomDriver,
    driverPhone: randomPhone,
    trackingUrl: `https://track.${provider.toLowerCase().replace(/\s/g, '')}.com/live/ord-${Math.floor(Math.random() * 10000)}`,
    deliveryFee: mockFee
  };
};

export const dispatchOrder = async (tenantId: number, orderId: number, data: any) => {
  let dispatchData = { ...data };

  // If using a 3PL provider, call their API to assign the rider automatically
  if (data.provider !== 'In-House') {
    const apiResponse = await requestThirdPartyLogistics(data.provider);
    dispatchData = { ...dispatchData, ...apiResponse };
  }

  return await deliveryRepo.assignDriverTransaction(tenantId, orderId, dispatchData);
};

export const completeDelivery = async (tenantId: number, orderId: number) => await deliveryRepo.markDeliveredTransaction(tenantId, orderId);