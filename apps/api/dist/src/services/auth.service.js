"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = void 0;
// apps/api/src/services/auth.service.ts
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const loginUser = async (data) => {
    // Find user by email
    const userResult = await db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, data.email)).limit(1);
    const user = userResult[0];
    if (!user) {
        throw new Error('Invalid credentials');
    }
    if (!user.isActive) {
        throw new Error('Account is disabled');
    }
    // Verify password
    const isPasswordValid = await bcrypt_1.default.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
        throw new Error('Invalid credentials');
    }
    // Generate secure session token[cite: 2]
    const token = jsonwebtoken_1.default.sign({
        userId: user.id,
        tenantId: user.tenantId
    }, process.env.JWT_SECRET, { expiresIn: '24h' });
    return {
        token,
        user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            tenantId: user.tenantId
        }
    };
};
exports.loginUser = loginUser;
