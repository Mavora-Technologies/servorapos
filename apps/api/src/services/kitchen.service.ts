// apps/api/src/services/kitchen.service.ts
import * as kitchenRepo from '../repositories/kitchen.repository';
import {
  KitchenTicketsQuery,
  KitchenHistoryQuery,
  KitchenPerformanceQuery,
  CreateKitchenStationInput,
  UpdateKitchenStationInput,
  UpdateKitchenGlobalSettingsInput,
} from '../validators/kitchen.validator';

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

export const fetchKitchenHistory = async (
  tenantId: number,
  query: Partial<KitchenHistoryQuery> = { limit: 150 }
) => {
  return await kitchenRepo.getKitchenHistoryTickets(tenantId, query);
};

export const fetchKitchenPerformance = async (
  tenantId: number,
  query: KitchenPerformanceQuery = {}
) => {
  return await kitchenRepo.getKitchenPerformanceStats(tenantId, query);
};

export const fetchStationWorkload = async (tenantId: number, branchId?: number) => {
  return await kitchenRepo.getStationWorkloadSummary(tenantId, branchId);
};

export const bumpStationQueueItems = async (
  tenantId: number,
  userId: number | null,
  orderId: number,
  station: string
) => {
  return await kitchenRepo.bumpStationItemsOnOrder(tenantId, userId, orderId, station);
};

export const fetchStationsManagementOverview = async (
  tenantId: number,
  branchId?: number
) => {
  const [stations, workloads, globalSettings, categories] = await Promise.all([
    kitchenRepo.listConfiguredKitchenStations(tenantId, branchId),
    kitchenRepo.getStationWorkloadSummary(tenantId, branchId),
    kitchenRepo.getKitchenGlobalSettingsRecord(tenantId),
    kitchenRepo.listTenantMenuCategoriesForRouting(tenantId),
  ]);

  return {
    stations,
    workloads,
    globalSettings,
    categories,
  };
};

export const createKitchenStation = async (
  tenantId: number,
  userId: number | null,
  input: CreateKitchenStationInput
) => {
  return await kitchenRepo.createKitchenStationRecord(tenantId, userId, input);
};

export const updateKitchenStation = async (
  tenantId: number,
  userId: number | null,
  stationId: number,
  input: UpdateKitchenStationInput
) => {
  return await kitchenRepo.updateKitchenStationRecord(tenantId, userId, stationId, input);
};

export const deleteKitchenStation = async (
  tenantId: number,
  userId: number | null,
  stationId: number
) => {
  return await kitchenRepo.deleteKitchenStationRecord(tenantId, userId, stationId);
};

export const saveKitchenGlobalSettings = async (
  tenantId: number,
  userId: number | null,
  input: UpdateKitchenGlobalSettingsInput
) => {
  return await kitchenRepo.upsertKitchenGlobalSettingsRecord(tenantId, userId, input);
};