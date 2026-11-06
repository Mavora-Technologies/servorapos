"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTenantWithAdmin = void 0;
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
        // 4. Insert Admin User with OWNER role matching schema enum
        const [newAdmin] = await tx
            .insert(schema_1.users)
            .values({
            tenantId: newTenant.id,
            defaultBranchId: newBranch?.id || null,
            firstName: adminData.firstName,
            lastName: adminData.lastName,
            email: adminData.email.toLowerCase().trim(),
            passwordHash,
            role: 'OWNER', // Explicitly assign OWNER
            isActive: true,
        })
            .returning({
            id: schema_1.users.id,
            email: schema_1.users.email,
            firstName: schema_1.users.firstName,
            lastName: schema_1.users.lastName,
            role: schema_1.users.role,
        });
        return { tenant: newTenant, admin: newAdmin, branch: newBranch };
    });
};
exports.createTenantWithAdmin = createTenantWithAdmin;
