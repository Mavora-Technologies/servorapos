"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTenantWithAdmin = void 0;
// apps/api/src/repositories/tenant.repository.ts
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const createTenantWithAdmin = async (businessName, adminData) => {
    return await db_1.db.transaction(async (tx) => {
        // 1. Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt_1.default.hash(adminData.password, saltRounds);
        // 2. Insert Tenant
        const [newTenant] = await tx
            .insert(schema_1.tenants)
            .values({
            businessName,
        })
            .returning();
        // 3. Create Default Primary Branch
        const [newBranch] = await tx
            .insert(schema_1.branches)
            .values({
            tenantId: newTenant.id,
            name: `${businessName} Main Branch`,
            code: 'MAIN',
        })
            .returning();
        // 4. Insert Admin User with ADMIN role matching schema enum
        const [insertedAdmin] = await tx
            .insert(schema_1.users)
            .values({
            tenantId: newTenant.id,
            defaultBranchId: newBranch?.id || null,
            firstName: adminData.firstName,
            lastName: adminData.lastName,
            email: adminData.email.toLowerCase().trim(),
            passwordHash,
            role: 'ADMIN', // Matches 'ADMIN' in userRoleEnum
            isActive: true,
        })
            .returning(); // Returns the full inserted user record, avoiding object mapping type mismatch
        // Shape the returned admin object precisely as needed
        const newAdmin = {
            id: insertedAdmin.id,
            email: insertedAdmin.email,
            firstName: insertedAdmin.firstName,
            lastName: insertedAdmin.lastName,
            role: insertedAdmin.role,
        };
        return { tenant: newTenant, admin: newAdmin, branch: newBranch };
    });
};
exports.createTenantWithAdmin = createTenantWithAdmin;
