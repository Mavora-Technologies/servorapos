import * as tableRepo from '../repositories/table.repository';

export const fetchFloorPlan = async (tenantId: number) => await tableRepo.getFloorPlan(tenantId);
export const addArea = async (tenantId: number, name: string) => await tableRepo.createArea(tenantId, name);
export const addTable = async (tenantId: number, data: any) => await tableRepo.createTable(tenantId, data);
export const changeTableStatus = async (tenantId: number, tableId: number, status: string) => await tableRepo.updateStatus(tenantId, tableId, status);