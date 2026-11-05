import { createTenantWithAdmin } from '../repositories/tenant.repository';
import { CreateTenantInput } from '../validators/tenant.validator';

export const onboardNewTenant = async (data: CreateTenantInput) => {
  return await createTenantWithAdmin(data.businessName, {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email.toLowerCase().trim(),
    password: data.password,
  });
};