import * as waitlistRepo from '../repositories/waitlist.repository';

export const getWaitlist = async (tenantId: number) => await waitlistRepo.fetchWaitlist(tenantId);
export const addToWaitlist = async (tenantId: number, data: any) => await waitlistRepo.createWaitlistEntry(tenantId, data);
export const changeWaitlistStatus = async (tenantId: number, id: number, status: string) => await waitlistRepo.updateWaitlistStatus(tenantId, id, status);