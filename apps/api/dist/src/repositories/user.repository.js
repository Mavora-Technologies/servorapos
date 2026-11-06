"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStaffUser = void 0;
// apps/api/src/repositories/user.repository.ts
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const createStaffUser = async (tenantId, data) => {
    const passwordHash = await bcrypt_1.default.hash(data.password, 10);
    const [newUser] = await db_1.db
        .insert(schema_1.users)
        .values({
        tenantId, // Tied to the logged-in admin's business
        defaultBranchId: data.branchId || null,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.toLowerCase().trim(),
        passwordHash,
        role: data.role, // <-- Dynamic role assigned by the admin
        isActive: true,
    })
        .returning({
        id: schema_1.users.id,
        email: schema_1.users.email,
        firstName: schema_1.users.firstName,
        lastName: schema_1.users.lastName,
        role: schema_1.users.role,
    });
    return newUser;
};
exports.createStaffUser = createStaffUser;
