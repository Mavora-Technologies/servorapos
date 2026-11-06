"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onboardNewTenant = void 0;
const tenant_repository_1 = require("../repositories/tenant.repository");
const onboardNewTenant = async (data) => {
    return await (0, tenant_repository_1.createTenantWithAdmin)(data.businessName, {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.toLowerCase().trim(),
        password: data.password,
    });
};
exports.onboardNewTenant = onboardNewTenant;
