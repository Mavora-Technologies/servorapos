"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTOMATION_ACTION_CATALOG = exports.AUTOMATION_EVENT_CATALOG = void 0;
exports.AUTOMATION_EVENT_CATALOG = {
    SHIFT_OVERTIME_APPROACHING: {
        event: 'SHIFT_OVERTIME_APPROACHING',
        label: 'Shift Overtime Approaching',
        domain: 'WORKFORCE_HCM',
        description: 'Fired when a staff member approaches maximum statutory daily or weekly hours',
        payloadFields: [
            {
                field: 'hoursRemainingToOvertime',
                label: 'Hours Remaining to Overtime',
                type: 'NUMBER',
                unit: 'Hours',
                allowedOperators: ['LESS_THAN', 'EQUALS'],
                defaultValue: 4,
            },
            {
                field: 'currentConsecutiveDaysWorked',
                label: 'Consecutive Days Worked',
                type: 'NUMBER',
                unit: 'Days',
                allowedOperators: ['GREATER_THAN', 'EQUALS'],
                defaultValue: 6,
            },
        ],
        supportedActions: ['FLAG_MANAGER_HANDOVER', 'DISPATCH_COMMUNICATION'],
    },
    STAFF_ABSENTEEISM_FLAGGED: {
        event: 'STAFF_ABSENTEEISM_FLAGGED',
        label: 'Staff Clock-in Delay / Absenteeism',
        domain: 'WORKFORCE_HCM',
        description: 'Triggered when a rostered employee fails to clock in past the grace window',
        payloadFields: [
            {
                field: 'minutesLate',
                label: 'Minutes Past Shift Start',
                type: 'NUMBER',
                unit: 'Minutes',
                allowedOperators: ['GREATER_THAN', 'EQUALS'],
                defaultValue: 15,
            },
        ],
        supportedActions: ['FLAG_MANAGER_HANDOVER', 'DISPATCH_COMMUNICATION'],
    },
    INVENTORY_RUNOUT_PROJECTED: {
        event: 'INVENTORY_RUNOUT_PROJECTED',
        label: 'Inventory Runout Projected (SCM)',
        domain: 'INVENTORY_SCM',
        description: 'Triggered by AI consumption velocity when days of supply hit safety thresholds',
        payloadFields: [
            {
                field: 'daysOfSupplyRemaining',
                label: 'Days of Supply Remaining',
                type: 'NUMBER',
                unit: 'Days',
                allowedOperators: ['LESS_THAN', 'EQUALS'],
                defaultValue: 2,
            },
            {
                field: 'stockoutCostExposureKes',
                label: 'Projected Stockout Cost Exposure',
                type: 'NUMBER',
                unit: 'KES',
                allowedOperators: ['GREATER_THAN'],
                defaultValue: 5000,
            },
        ],
        supportedActions: ['GENERATE_PURCHASE_ORDER', 'FLAG_MANAGER_HANDOVER'],
    },
    VIP_PATRON_SPEND_MILESTONE: {
        event: 'VIP_PATRON_SPEND_MILESTONE',
        label: 'VIP Patron Spend Milestone (CRM)',
        domain: 'GUEST_CRM',
        description: 'Triggered during dining checkout when a guest ticket surpasses thresholds',
        payloadFields: [
            {
                field: 'singleCheckTotalKes',
                label: 'Single Check Total Spend',
                type: 'NUMBER',
                unit: 'KES',
                allowedOperators: ['GREATER_THAN', 'EQUALS'],
                defaultValue: 8000,
            },
            {
                field: 'patronLoyaltyPoints',
                label: 'Current Loyalty Points Balance',
                type: 'NUMBER',
                unit: 'Points',
                allowedOperators: ['GREATER_THAN', 'EQUALS'],
                defaultValue: 500,
            },
        ],
        supportedActions: ['ISSUE_LOYALTY_VOUCHER', 'DISPATCH_COMMUNICATION'],
    },
    TILL_VARIANCE_OUT_OF_BOUNDS: {
        event: 'TILL_VARIANCE_OUT_OF_BOUNDS',
        label: 'Till Shift Discrepancy (Treasury)',
        domain: 'FINANCE_TREASURY',
        description: 'Triggered during shift closeout when register variance breaches tolerance',
        payloadFields: [
            {
                field: 'varianceAmountKes',
                label: 'Absolute Cash Discrepancy',
                type: 'NUMBER',
                unit: 'KES',
                allowedOperators: ['GREATER_THAN'],
                defaultValue: 500,
            },
        ],
        supportedActions: ['FLAG_MANAGER_HANDOVER', 'DISPATCH_COMMUNICATION'],
    },
};
exports.AUTOMATION_ACTION_CATALOG = {
    FLAG_MANAGER_HANDOVER: {
        label: 'Flag Task in Shift Handover',
        requiresTargetRole: true,
        payloadFields: [{ name: 'priorityLevel', label: 'Priority Escalation', type: 'SELECT' }],
    },
    DISPATCH_COMMUNICATION: {
        label: 'Send Alert Notification',
        requiresTargetRole: true,
        payloadFields: [{ name: 'channel', label: 'Delivery Channel (SMS / Email)', type: 'SELECT' }],
    },
    GENERATE_PURCHASE_ORDER: {
        label: 'Auto-Generate Purveyor Purchase Order',
        requiresTargetRole: false,
        payloadFields: [{ name: 'safetyBufferDays', label: 'Restock Target Buffer (Days)', type: 'NUMBER' }],
    },
    ISSUE_LOYALTY_VOUCHER: {
        label: 'Issue Reward Token / Voucher',
        requiresTargetRole: false,
        payloadFields: [{ name: 'bonusPoints', label: 'Bonus Reward Points', type: 'NUMBER' }],
    },
};
