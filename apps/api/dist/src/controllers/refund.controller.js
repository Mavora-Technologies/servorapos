"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRefund = exports.getRefunds = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
const refund_validator_1 = require("../validators/refund.validator");
// 1. Get All Enterprise Refunds
const TREASURY_ACCOUNTS = [
    'M-Pesa B2B Corporate Paybill (55210)',
    'Equity Bank Operational Account (KES)',
    'KCB Bank Head Office Account',
    'Main Safe Petty Cash Drawer',
];
const getRefunds = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const records = await db_1.db
            .select({
            id: schema_1.refunds.id,
            refundNumber: schema_1.refunds.refundNumber,
            refundFlow: schema_1.refunds.refundFlow,
            status: schema_1.refunds.status,
            refundMethod: schema_1.refunds.refundMethod,
            clearingAccount: schema_1.refunds.clearingAccount,
            transactionReference: schema_1.refunds.transactionReference,
            amount: schema_1.refunds.amount,
            restockItems: schema_1.refunds.restockItems,
            reasonCode: schema_1.refunds.reasonCode,
            orderId: schema_1.refunds.orderId,
            supplierId: schema_1.refunds.supplierId,
            supplierName: schema_1.suppliers.name,
            branchName: schema_1.branches.name,
            processedByEmail: schema_1.users.email,
            notes: schema_1.refunds.notes,
            createdAt: schema_1.refunds.createdAt,
        })
            .from(schema_1.refunds)
            .leftJoin(schema_1.suppliers, (0, drizzle_orm_1.eq)(schema_1.refunds.supplierId, schema_1.suppliers.id))
            .leftJoin(schema_1.branches, (0, drizzle_orm_1.eq)(schema_1.refunds.branchId, schema_1.branches.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.refunds.processedById, schema_1.users.id))
            .where((0, drizzle_orm_1.eq)(schema_1.refunds.tenantId, tenantId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.refunds.createdAt));
        let totalCustomerRefunds = 0;
        let totalVendorRefunds = 0;
        records.forEach((r) => {
            const amt = parseFloat(r.amount) || 0;
            if (r.refundFlow === 'AR_CUSTOMER_REFUND') {
                totalCustomerRefunds += amt;
            }
            else {
                totalVendorRefunds += amt;
            }
        });
        res.status(200).json({
            status: 'success',
            data: {
                summary: {
                    totalRefundsCount: records.length,
                    totalCustomerRefunds: Number(totalCustomerRefunds.toFixed(2)),
                    totalVendorRefunds: Number(totalVendorRefunds.toFixed(2)),
                    netRefundOutflow: Number((totalCustomerRefunds - totalVendorRefunds).toFixed(2)),
                },
                refunds: records,
            },
        });
    }
    catch (error) {
        console.error('[Get Refunds Error]:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch refunds' });
    }
};
exports.getRefunds = getRefunds;
// 2. Post Enterprise Refund Document (Credit Memo / Payout)
const createRefund = async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const rawBranchId = req.user?.defaultBranchId;
        const branchId = rawBranchId ? Number(rawBranchId) : null;
        const userId = req.user?.userId ?? req.user?.id ?? null;
        if (!tenantId) {
            res.status(401).json({ status: 'error', message: 'Unauthorized' });
            return;
        }
        const payload = refund_validator_1.createRefundSchema.parse(req.body);
        const result = await db_1.db.transaction(async (tx) => {
            const refNum = `REF-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
            // 1. Post corresponding double-entry treasury payment record
            const pmtNum = `PMT-REF-${Date.now().toString().slice(-4)}`;
            const [pmtRecord] = await tx
                .insert(schema_1.payments)
                .values({
                tenantId: Number(tenantId),
                branchId,
                paymentNumber: pmtNum,
                paymentFlow: payload.refundFlow === 'AR_CUSTOMER_REFUND' ? 'OUTBOUND_AP' : 'INBOUND_AR',
                status: 'RECONCILED',
                paymentMethod: payload.refundMethod,
                clearingAccount: payload.clearingAccount,
                transactionReference: payload.transactionReference || null,
                supplierId: payload.supplierId || null,
                orderId: payload.orderId || null,
                amount: payload.amount.toFixed(4),
                reconciledAt: new Date(),
                processedById: userId ? Number(userId) : null,
                notes: `Refund Payout (${payload.reasonCode}): ${payload.notes || 'Credit memo disbursement'}`,
            })
                .returning();
            // 2. Insert Refund Record
            const [refundRecord] = await tx
                .insert(schema_1.refunds)
                .values({
                tenantId: Number(tenantId),
                branchId,
                refundNumber: refNum,
                refundFlow: payload.refundFlow,
                status: 'PROCESSED',
                orderId: payload.orderId || null,
                supplierId: payload.supplierId || null,
                paymentId: pmtRecord.id,
                refundMethod: payload.refundMethod,
                clearingAccount: payload.clearingAccount,
                transactionReference: payload.transactionReference || null,
                amount: payload.amount.toFixed(4),
                restockItems: payload.restockItems,
                reasonCode: payload.reasonCode,
                processedById: userId ? Number(userId) : null,
                notes: payload.notes || null,
            })
                .returning();
            return refundRecord;
        });
        res.status(201).json({ status: 'success', data: result, message: 'Refund credit memo posted successfully' });
    }
    catch (error) {
        if (error.name === 'ZodError') {
            res.status(400).json({ status: 'error', errors: error.errors });
            return;
        }
        res.status(400).json({ status: 'error', message: error.message });
    }
};
exports.createRefund = createRefund;
