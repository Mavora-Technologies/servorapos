"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = exports.DEFAULT_ROLE_PERMISSIONS = void 0;
// apps/api/src/services/auth.service.ts
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
exports.DEFAULT_ROLE_PERMISSIONS = {
    SUPER_ADMIN: ['*'],
    ADMIN: ['*'], // Updated from OWNER to ADMIN
    MANAGER: [
        'dashboard.view', 'pos.access', 'pos.checkout', 'pos.void', 'pos.discount',
        'orders.view', 'tables.view', 'tables.manage', 'reservations.view', 'reservations.manage', 'delivery.view',
        'kitchen.view', 'kitchen.manage', 'menu.view', 'menu.manage', 'recipes.view',
        'inventory.view', 'inventory.adjust', 'inventory.manage', 'inventory.count',
        'suppliers.view', 'purchasing.view', 'purchasing.manage', 'purchasing.receive',
        'payments.view', 'payments.reconcile', 'cash.view', 'cash.reconcile', 'refunds.view',
        'customers.view', 'loyalty.view', 'loyalty.manage', 'reports.view', 'staff.view', 'staff.manage',
        'notifications.view', 'help.view',
    ],
    CASHIER: [
        'dashboard.view', 'pos.access', 'pos.checkout', 'orders.view',
        'tables.view', 'reservations.view', 'payments.view', 'cash.view', 'customers.view', 'loyalty.view', 'help.view',
    ],
    WAITER: [
        'pos.access', 'orders.view', 'tables.view', 'reservations.view', 'kitchen.view', 'help.view',
    ],
    CHEF: [
        'kitchen.view', 'kitchen.manage', 'recipes.view', 'inventory.view', 'menu.view', 'help.view',
    ],
    STOREKEEPER: [
        'inventory.view', 'inventory.adjust', 'inventory.manage', 'inventory.count',
        'suppliers.view', 'purchasing.view', 'purchasing.receive', 'help.view',
    ],
    ACCOUNTANT: [
        'dashboard.view', 'orders.view', 'inventory.view', 'suppliers.view', 'purchasing.view',
        'payments.view', 'payments.reconcile', 'cash.view', 'cash.reconcile', 'refunds.view',
        'finance.view', 'finance.manage', 'finance.adjust', 'reports.view', 'reports.export', 'help.view',
    ],
};
const loginUser = async (data) => {
    const [user] = await db_1.db
        .select()
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.email, data.email))
        .limit(1);
    if (!user) {
        throw new Error('Invalid credentials');
    }
    if (!user.isActive) {
        throw new Error('Account is disabled');
    }
    const isPasswordValid = await bcrypt_1.default.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
        throw new Error('Invalid credentials');
    }
    let userPermissions = [];
    // Updated from OWNER to ADMIN
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
        userPermissions = ['*'];
    }
    else {
        const [matchedRole] = await db_1.db
            .select({ permissions: schema_1.roles.permissions })
            .from(schema_1.roles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.roles.slug, user.role), user.tenantId
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.roles.tenantId, user.tenantId), (0, drizzle_orm_1.eq)(schema_1.roles.isSystemRole, true))
            : (0, drizzle_orm_1.eq)(schema_1.roles.isSystemRole, true)))
            .limit(1);
        userPermissions =
            matchedRole?.permissions && matchedRole.permissions.length > 0
                ? matchedRole.permissions
                : exports.DEFAULT_ROLE_PERMISSIONS[user.role] ?? ['pos.access', 'help.view'];
    }
    await db_1.db
        .update(schema_1.users)
        .set({ lastLoginAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, user.id));
    const secret = process.env.JWT_SECRET || 'servora-super-secret-key-2026';
    const token = jsonwebtoken_1.default.sign({
        userId: user.id,
        tenantId: user.tenantId,
        role: user.role,
        permissions: userPermissions,
        defaultBranchId: user.defaultBranchId,
    }, secret, { expiresIn: '24h' });
    return {
        token,
        user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            permissions: userPermissions,
            tenantId: user.tenantId,
            defaultBranchId: user.defaultBranchId,
        },
    };
};
exports.loginUser = loginUser;
