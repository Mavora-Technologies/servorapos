"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onboardTenant = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const tenant_validator_1 = require("../validators/tenant.validator");
const tenant_service_1 = require("../services/tenant.service");
const onboardTenant = async (req, res) => {
    try {
        const validatedData = tenant_validator_1.createTenantSchema.parse(req.body);
        const normalizedEmail = validatedData.email.toLowerCase().trim();
        // 1. Proactive lookup to avoid creating orphaned transactions or DB errors
        const [existingUser] = await db_1.db
            .select({ id: schema_1.users.id })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.email, normalizedEmail))
            .limit(1);
        if (existingUser) {
            res.status(409).json({
                status: 'error',
                field: 'email',
                message: 'This email is already registered. Please sign in or use another email.',
            });
            return;
        }
        // 2. Delegate to service layer
        const result = await (0, tenant_service_1.onboardNewTenant)(validatedData);
        res.status(201).json({
            status: 'success',
            message: 'Workspace and administrator created successfully',
            data: result,
        });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        const pgErrorCode = error.code || error.cause?.code;
        const pgConstraint = error.constraint || error.cause?.constraint;
        if (pgErrorCode === '23505') {
            if (pgConstraint === 'users_email_unique' ||
                error.detail?.includes('email') ||
                error.cause?.detail?.includes('email')) {
                res.status(409).json({
                    status: 'error',
                    field: 'email',
                    message: 'This email is already registered. Please sign in or use another email.',
                });
                return;
            }
            res.status(409).json({
                status: 'error',
                message: 'A restaurant workspace with these details already exists.',
            });
            return;
        }
        console.error('[Onboarding Error]:', error);
        res.status(500).json({
            status: 'error',
            message: 'Unable to complete workspace registration. Please try again later.',
        });
    }
};
exports.onboardTenant = onboardTenant;
