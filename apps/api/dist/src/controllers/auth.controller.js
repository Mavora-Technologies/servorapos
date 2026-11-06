"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.login = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const auth_validator_1 = require("../validators/auth.validator");
const auth_service_1 = require("../services/auth.service");
const login = async (req, res) => {
    try {
        const validatedData = auth_validator_1.loginSchema.parse(req.body);
        const result = await (0, auth_service_1.loginUser)(validatedData);
        res.status(200).json({
            status: 'success',
            data: result,
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        if (error.message === 'Invalid credentials' || error.message === 'Account is disabled') {
            res.status(401).json({ status: 'error', message: error.message });
            return;
        }
        console.error('[Auth Controller Error]:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.login = login;
const getMe = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const [userRecord] = await db_1.db
            .select({
            id: schema_1.users.id,
            firstName: schema_1.users.firstName,
            lastName: schema_1.users.lastName,
            email: schema_1.users.email,
            role: schema_1.users.role,
            tenantId: schema_1.users.tenantId,
            businessName: schema_1.tenants.businessName,
            legalName: schema_1.tenants.legalName,
            kraPin: schema_1.tenants.kraPin,
            currency: schema_1.tenants.currency,
            timezone: schema_1.tenants.timezone,
            phone: schema_1.tenants.phone,
            emailOfficial: schema_1.tenants.email,
        })
            .from(schema_1.users)
            .leftJoin(schema_1.tenants, (0, drizzle_orm_1.eq)(schema_1.users.tenantId, schema_1.tenants.id))
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
            .limit(1);
        if (!userRecord) {
            res.status(404).json({ status: 'error', message: 'User profile not found' });
            return;
        }
        let branchRecord = null;
        if (userRecord.tenantId) {
            const [foundBranch] = await db_1.db
                .select({
                id: schema_1.branches.id,
                name: schema_1.branches.name,
                code: schema_1.branches.code,
                address: schema_1.branches.address,
                phone: schema_1.branches.phone,
                email: schema_1.branches.email,
                kraPin: schema_1.branches.kraPin,
                etimsBranchId: schema_1.branches.etimsBranchId,
                etimsDeviceSerial: schema_1.branches.etimsDeviceSerial,
                receiptFooter: schema_1.branches.receiptFooter,
            })
                .from(schema_1.branches)
                .where((0, drizzle_orm_1.eq)(schema_1.branches.tenantId, userRecord.tenantId))
                .limit(1);
            branchRecord = foundBranch;
        }
        res.status(200).json({
            status: 'success',
            data: {
                user: {
                    id: userRecord.id,
                    firstName: userRecord.firstName,
                    lastName: userRecord.lastName,
                    fullName: `${userRecord.firstName} ${userRecord.lastName}`.trim(),
                    email: userRecord.email,
                    role: userRecord.role,
                },
                business: {
                    id: userRecord.tenantId,
                    name: userRecord.businessName,
                    legalName: userRecord.legalName || userRecord.businessName,
                    kraPin: branchRecord?.kraPin || userRecord.kraPin || '',
                    currency: userRecord.currency || 'KES',
                    timezone: userRecord.timezone,
                    phone: userRecord.phone,
                    email: userRecord.emailOfficial,
                },
                branch: {
                    id: branchRecord?.id ?? 1,
                    name: branchRecord?.name ?? 'Headquarters',
                    code: branchRecord?.code ?? 'HQ',
                    address: branchRecord?.address ?? '',
                    phone: branchRecord?.phone ?? '',
                    kraPin: branchRecord?.kraPin ?? '',
                    etimsBranchId: branchRecord?.etimsBranchId ?? '00',
                    etimsDeviceSerial: branchRecord?.etimsDeviceSerial ?? 'CU-PENDING-INIT',
                    receiptFooter: branchRecord?.receiptFooter ?? 'Thank you for your business. Karibu tena!',
                },
            },
        });
    }
    catch (error) {
        console.error('[Auth GetMe Error]:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
};
exports.getMe = getMe;
