import bcrypt from 'bcrypt';
import { createTenantWithAdmin } from '../repositories/tenant.repository';
import { CreateTenantInput } from '../validators/tenant.validator';

export const onboardNewTenant = async (data: CreateTenantInput) => {
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(data.password, saltRounds);

  const result = await createTenantWithAdmin(data.businessName, {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    passwordHash,
  });

  return result;
};