"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleBranchStatus = exports.updateBranch = exports.createBranch = exports.getBranches = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const branch_validator_1 = require("../validators/branch.validator");
// 1. Get all branches for the authenticated tenant
const getBranches = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const records = await db_1.db
            .select()
            .from(schema_1.branches)
            .where((0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.branches.createdAt));
        res.status(200).json({ status: 'success', data: records });
    }
    catch (error) {
        console.error('[Get Branches Error]:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch branches' });
    }
};
exports.getBranches = getBranches;
// 2. Create a new branch
const createBranch = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = branch_validator_1.createBranchSchema.parse(req.body);
        // Check code duplication within tenant
        const existing = await db_1.db
            .select({ id: schema_1.branches.id })
            .from(schema_1.branches)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.code, payload.code)))
            .limit(1);
        if (existing.length > 0) {
            res.status(400).json({ status: 'error', message: `Branch code '${payload.code}' is already registered` });
            return;
        }
        const [branch] = await db_1.db
            .insert(schema_1.branches)
            .values({
            tenantId,
            name: payload.name,
            code: payload.code,
            address: payload.address || null,
            phone: payload.phone || null,
            email: payload.email || null,
            isMainBranch: payload.isMainBranch,
            isActive: payload.isActive,
        })
            .returning();
        res.status(201).json({ status: 'success', data: branch });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.createBranch = createBranch;
// 3. Update an existing branch
const updateBranch = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = branch_validator_1.updateBranchSchema.parse(req.body);
        const [existing] = await db_1.db
            .select()
            .from(schema_1.branches)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId)))
            .limit(1);
        if (!existing) {
            res.status(404).json({ status: 'error', message: 'Branch not found' });
            return;
        }
        if (payload.code && payload.code !== existing.code) {
            const duplicateCode = await db_1.db
                .select({ id: schema_1.branches.id })
                .from(schema_1.branches)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId), (0, drizzle_orm_1.eq)(schema_1.branches.code, payload.code)))
                .limit(1);
            if (duplicateCode.length > 0) {
                res.status(400).json({ status: 'error', message: `Branch code '${payload.code}' is already registered` });
                return;
            }
        }
        const updateFields = { updatedAt: new Date() };
        if (payload.name !== undefined)
            updateFields.name = payload.name;
        if (payload.code !== undefined)
            updateFields.code = payload.code;
        if (payload.address !== undefined)
            updateFields.address = payload.address;
        if (payload.phone !== undefined)
            updateFields.phone = payload.phone;
        if (payload.email !== undefined)
            updateFields.email = payload.email;
        if (payload.isMainBranch !== undefined)
            updateFields.isMainBranch = payload.isMainBranch;
        if (payload.isActive !== undefined)
            updateFields.isActive = payload.isActive;
        const [updated] = await db_1.db
            .update(schema_1.branches)
            .set(updateFields)
            .where((0, drizzle_orm_1.eq)(schema_1.branches.id, existing.id))
            .returning();
        res.status(200).json({ status: 'success', data: updated });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.updateBranch = updateBranch;
// 4. Toggle active status
const toggleBranchStatus = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const { id } = req.params;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const [existing] = await db_1.db
            .select()
            .from(schema_1.branches)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.branches.id, Number(id)), (0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId)))
            .limit(1);
        if (!existing) {
            res.status(404).json({ status: 'error', message: 'Branch not found' });
            return;
        }
        const [updated] = await db_1.db
            .update(schema_1.branches)
            .set({ isActive: !existing.isActive, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.branches.id, existing.id))
            .returning();
        res.status(200).json({
            status: 'success',
            message: `Branch ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
            data: updated,
        });
    }
    catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.toggleBranchStatus = toggleBranchStatus;
