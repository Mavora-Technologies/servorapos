"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBusinessProfile = exports.getBusinessProfile = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const business_validator_1 = require("../validators/business.validator");
// 1. Get Business Entity Profile with Branch Count & Subscription telemetry
const getBusinessProfile = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const [tenant] = await db_1.db
            .select({
            id: schema_1.tenants.id,
            businessName: schema_1.tenants.businessName,
            slug: schema_1.tenants.slug,
            legalName: schema_1.tenants.legalName,
            kraPin: schema_1.tenants.kraPin,
            email: schema_1.tenants.email,
            phone: schema_1.tenants.phone,
            currency: schema_1.tenants.currency,
            timezone: schema_1.tenants.timezone,
            subscriptionPlan: schema_1.tenants.subscriptionPlan,
            subscriptionStatus: schema_1.tenants.subscriptionStatus,
            logoUrl: schema_1.tenants.logoUrl,
            isActive: schema_1.tenants.isActive,
            createdAt: schema_1.tenants.createdAt,
            updatedAt: schema_1.tenants.updatedAt,
        })
            .from(schema_1.tenants)
            .where((0, drizzle_orm_1.eq)(schema_1.tenants.id, tenantId))
            .limit(1);
        if (!tenant) {
            res.status(404).json({ status: 'error', message: 'Business entity not found' });
            return;
        }
        // Include branch summary for the corporate view
        const branchList = await db_1.db
            .select({
            id: schema_1.branches.id,
            name: schema_1.branches.name,
            code: schema_1.branches.code,
            isMainBranch: schema_1.branches.isMainBranch,
            isActive: schema_1.branches.isActive,
        })
            .from(schema_1.branches)
            .where((0, drizzle_orm_1.eq)(schema_1.branches.tenantId, tenantId));
        res.status(200).json({
            status: 'success',
            data: {
                ...tenant,
                branchesCount: branchList.length,
                branches: branchList,
            },
        });
    }
    catch (error) {
        console.error('[Get Business Profile Error]:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch business profile' });
    }
};
exports.getBusinessProfile = getBusinessProfile;
// 2. Update Business Profile
const updateBusinessProfile = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = business_validator_1.updateBusinessProfileSchema.parse(req.body);
        // If slug is provided and modified, check uniqueness across other tenants
        if (payload.slug) {
            const [existingSlug] = await db_1.db
                .select({ id: schema_1.tenants.id })
                .from(schema_1.tenants)
                .where((0, drizzle_orm_1.eq)(schema_1.tenants.slug, payload.slug))
                .limit(1);
            if (existingSlug && existingSlug.id !== tenantId) {
                res.status(400).json({ status: 'error', message: `Slug '${payload.slug}' is already taken by another organization` });
                return;
            }
        }
        const [updated] = await db_1.db
            .update(schema_1.tenants)
            .set({
            businessName: payload.businessName,
            slug: payload.slug || null,
            legalName: payload.legalName || null,
            kraPin: payload.kraPin ? payload.kraPin.toUpperCase() : null,
            email: payload.email || null,
            phone: payload.phone || null,
            currency: payload.currency,
            timezone: payload.timezone,
            logoUrl: payload.logoUrl || null,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.tenants.id, tenantId))
            .returning();
        res.status(200).json({
            status: 'success',
            message: 'Business profile updated successfully',
            data: updated,
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.updateBusinessProfile = updateBusinessProfile;
