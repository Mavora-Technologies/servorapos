"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setStaffPin = exports.updateStaffMember = exports.createStaffMember = exports.findStaffById = exports.listStaffByTenant = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const listStaffByTenant = async (tenantId, filters) => {
    const query = db_1.db
        .select({
        id: schema_1.users.id,
        firstName: schema_1.users.firstName,
        lastName: schema_1.users.lastName,
        email: schema_1.users.email,
        phone: schema_1.users.phone,
        role: schema_1.users.role,
        isActive: schema_1.users.isActive,
        lastLoginAt: schema_1.users.lastLoginAt,
        createdAt: schema_1.users.createdAt,
        updatedAt: schema_1.users.updatedAt,
        hasPin: (0, drizzle_orm_1.sql) `CASE WHEN ${schema_1.users.pinHash} IS NOT NULL THEN true ELSE false END`,
        defaultBranchId: schema_1.users.defaultBranchId,
        branchName: schema_1.branches.name,
        branchCode: schema_1.branches.code,
    })
        .from(schema_1.users)
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.users.defaultBranchId, schema_1.branches.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId), filters?.branchId ? (0, drizzle_orm_1.eq)(schema_1.users.defaultBranchId, filters.branchId) : undefined, filters?.role ? (0, drizzle_orm_1.eq)(schema_1.users.role, filters.role) : undefined, filters?.isActive !== undefined ? (0, drizzle_orm_1.eq)(schema_1.users.isActive, filters.isActive) : undefined, filters?.search
        ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.users.firstName, `%${filters.search}%`), (0, drizzle_orm_1.ilike)(schema_1.users.lastName, `%${filters.search}%`), (0, drizzle_orm_1.ilike)(schema_1.users.email, `%${filters.search}%`), (0, drizzle_orm_1.ilike)(schema_1.users.phone, `%${filters.search}%`))
        : undefined))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.users.createdAt));
    const staffMembers = await query;
    // Retrieve tenant-accessible custom or system roles
    const tenantRoles = await db_1.db
        .select({
        id: schema_1.roles.id,
        name: schema_1.roles.name,
        slug: schema_1.roles.slug,
        permissions: schema_1.roles.permissions,
        isSystemRole: schema_1.roles.isSystemRole,
    })
        .from(schema_1.roles)
        .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.roles.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.roles.isSystemRole, true)));
    return {
        staff: staffMembers,
        roles: tenantRoles,
    };
};
exports.listStaffByTenant = listStaffByTenant;
const findStaffById = async (tenantId, staffId) => {
    const [staff] = await db_1.db
        .select({
        id: schema_1.users.id,
        firstName: schema_1.users.firstName,
        lastName: schema_1.users.lastName,
        email: schema_1.users.email,
        phone: schema_1.users.phone,
        role: schema_1.users.role,
        isActive: schema_1.users.isActive,
        lastLoginAt: schema_1.users.lastLoginAt,
        createdAt: schema_1.users.createdAt,
        defaultBranchId: schema_1.users.defaultBranchId,
        branchName: schema_1.branches.name,
        hasPin: (0, drizzle_orm_1.sql) `CASE WHEN ${schema_1.users.pinHash} IS NOT NULL THEN true ELSE false END`,
    })
        .from(schema_1.users)
        .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.users.defaultBranchId, schema_1.branches.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, staffId), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)))
        .limit(1);
    return staff || null;
};
exports.findStaffById = findStaffById;
const createStaffMember = async (tenantId, input) => {
    // Check for email collision across tenant ecosystem
    const [existing] = await db_1.db
        .select({ id: schema_1.users.id })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.email, input.email))
        .limit(1);
    if (existing) {
        throw new Error(`An account with email '${input.email}' already exists.`);
    }
    const saltRounds = 10;
    const passwordHash = await bcryptjs_1.default.hash(input.password, saltRounds);
    const pinHash = input.pin ? await bcryptjs_1.default.hash(input.pin, saltRounds) : null;
    const [newUser] = await db_1.db
        .insert(schema_1.users)
        .values({
        tenantId,
        defaultBranchId: input.defaultBranchId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone || null,
        passwordHash,
        pinHash,
        role: input.role,
        isActive: true,
    })
        .returning({
        id: schema_1.users.id,
        firstName: schema_1.users.firstName,
        lastName: schema_1.users.lastName,
        email: schema_1.users.email,
        phone: schema_1.users.phone,
        role: schema_1.users.role,
        isActive: schema_1.users.isActive,
        defaultBranchId: schema_1.users.defaultBranchId,
        createdAt: schema_1.users.createdAt,
    });
    return newUser;
};
exports.createStaffMember = createStaffMember;
const updateStaffMember = async (tenantId, staffId, input) => {
    const [existingStaff] = await db_1.db
        .select({ id: schema_1.users.id, email: schema_1.users.email })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, staffId), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)))
        .limit(1);
    if (!existingStaff) {
        throw new Error('Employee record not found.');
    }
    // Handle unique email change checks
    if (input.email && input.email !== existingStaff.email) {
        const [emailCollision] = await db_1.db
            .select({ id: schema_1.users.id })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.email, input.email))
            .limit(1);
        if (emailCollision) {
            throw new Error(`Email address '${input.email}' is already in use.`);
        }
    }
    const updateData = {
        updatedAt: new Date(),
    };
    if (input.firstName !== undefined)
        updateData.firstName = input.firstName;
    if (input.lastName !== undefined)
        updateData.lastName = input.lastName;
    if (input.email !== undefined)
        updateData.email = input.email;
    if (input.phone !== undefined)
        updateData.phone = input.phone;
    if (input.role !== undefined)
        updateData.role = input.role;
    if (input.defaultBranchId !== undefined)
        updateData.defaultBranchId = input.defaultBranchId;
    if (input.isActive !== undefined)
        updateData.isActive = input.isActive;
    if (input.password) {
        updateData.passwordHash = await bcryptjs_1.default.hash(input.password, 10);
    }
    if (input.pin) {
        updateData.pinHash = await bcryptjs_1.default.hash(input.pin, 10);
    }
    const [updated] = await db_1.db
        .update(schema_1.users)
        .set(updateData)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, staffId), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)))
        .returning({
        id: schema_1.users.id,
        firstName: schema_1.users.firstName,
        lastName: schema_1.users.lastName,
        email: schema_1.users.email,
        phone: schema_1.users.phone,
        role: schema_1.users.role,
        isActive: schema_1.users.isActive,
        defaultBranchId: schema_1.users.defaultBranchId,
        updatedAt: schema_1.users.updatedAt,
    });
    return updated;
};
exports.updateStaffMember = updateStaffMember;
const setStaffPin = async (tenantId, staffId, pin) => {
    const pinHash = await bcryptjs_1.default.hash(pin, 10);
    const [updated] = await db_1.db
        .update(schema_1.users)
        .set({ pinHash, updatedAt: new Date() })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, staffId), (0, drizzle_orm_1.eq)(schema_1.users.tenantId, tenantId)))
        .returning({ id: schema_1.users.id });
    if (!updated) {
        throw new Error('Employee record not found.');
    }
    return { success: true, message: 'POS Quick PIN updated successfully.' };
};
exports.setStaffPin = setStaffPin;
