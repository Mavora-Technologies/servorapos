// apps/api/src/services/billing.service.ts
import * as billingRepo from '../repositories/billing.repository';
import type {
  UpdateSubscriptionPlanInput,
  AddPaymentMethodInput,
  ListInvoicesQuery,
  SettleInvoiceInput,
} from '../validators/billing.validator';

export const fetchTenantBillingOverview = async (tenantId: number) => {
  return await billingRepo.findBillingOverviewByTenant(tenantId);
};

export const saveTenantSubscription = async (
  tenantId: number,
  input: UpdateSubscriptionPlanInput
) => {
  return await billingRepo.upsertTenantSubscriptionTransaction(tenantId, input);
};

export const fetchTenantInvoices = async (tenantId: number, query: ListInvoicesQuery) => {
  return await billingRepo.listTenantInvoices(tenantId, query);
};

export const registerPaymentMethod = async (
  tenantId: number,
  input: AddPaymentMethodInput
) => {
  return await billingRepo.addPaymentMethodTransaction(tenantId, input);
};

export const removePaymentMethod = async (tenantId: number, methodId: number) => {
  if (!Number.isInteger(methodId) || methodId <= 0) {
    throw new Error('Valid payment method ID is required.');
  }
  return await billingRepo.deletePaymentMethodTransaction(tenantId, methodId);
};

export const markDefaultPaymentMethod = async (tenantId: number, methodId: number) => {
  if (!Number.isInteger(methodId) || methodId <= 0) {
    throw new Error('Valid payment method ID is required.');
  }
  return await billingRepo.setDefaultPaymentMethodTransaction(tenantId, methodId);
};

export const processInvoiceSettlement = async (
  tenantId: number,
  input: SettleInvoiceInput
) => {
  return await billingRepo.settleInvoiceTransaction(tenantId, input);
};