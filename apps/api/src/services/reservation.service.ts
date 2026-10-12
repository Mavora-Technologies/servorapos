import * as reservationRepo from '../repositories/reservation.repository';

export const getReservations = async (tenantId: number) => await reservationRepo.fetchReservations(tenantId);
export const addReservation = async (tenantId: number, data: any) => await reservationRepo.createReservation(tenantId, data);
export const changeStatus = async (tenantId: number, id: number, status: string) => await reservationRepo.updateReservationStatus(tenantId, id, status);