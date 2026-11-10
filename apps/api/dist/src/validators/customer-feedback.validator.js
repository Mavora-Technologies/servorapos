"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listFeedbackQuerySchema = exports.updateFeedbackStatusSchema = exports.createFeedbackSchema = exports.feedbackChannelEnum = exports.feedbackStatusEnum = exports.feedbackCategoryEnum = void 0;
const zod_1 = require("zod");
exports.feedbackCategoryEnum = zod_1.z.enum([
    'FOOD_QUALITY',
    'SERVICE_SPEED',
    'CLEANLINESS',
    'ORDER_ACCURACY',
    'STAFF_COURTESY',
    'VALUE_PRICE',
]);
exports.feedbackStatusEnum = zod_1.z.enum([
    'NEW',
    'UNDER_REVIEW',
    'ACTION_TAKEN',
    'RESOLVED',
    'CLOSED_DISMISSED',
]);
exports.feedbackChannelEnum = zod_1.z.enum([
    'TABLE_QR',
    'POS_TERMINAL',
    'ONLINE_RECEIPT',
    'DIRECT_INQUIRY',
    'MANAGER_INTERVIEW',
]);
exports.createFeedbackSchema = zod_1.z.object({
    customerId: zod_1.z.coerce.number().positive('Valid customer identifier is required'),
    branchId: zod_1.z.coerce.number().positive().optional().nullable(),
    orderId: zod_1.z.coerce.number().positive().optional().nullable(),
    staffId: zod_1.z.coerce.number().positive().optional().nullable(),
    feedbackCategory: exports.feedbackCategoryEnum.default('FOOD_QUALITY'),
    rating: zod_1.z.coerce.number().int().min(1).max(5),
    npsScore: zod_1.z.coerce.number().int().min(0).max(10).optional().nullable(),
    channel: exports.feedbackChannelEnum.default('TABLE_QR'),
    title: zod_1.z.string().trim().min(2, 'Title is required').max(200),
    comments: zod_1.z.string().trim().min(3, 'Comments are required'),
});
exports.updateFeedbackStatusSchema = zod_1.z.object({
    status: exports.feedbackStatusEnum,
    actionTaken: zod_1.z.string().trim().optional(),
    assignedToUserId: zod_1.z.coerce.number().positive().optional().nullable(),
});
exports.listFeedbackQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(25),
    branchId: zod_1.z.coerce.number().positive().optional(),
    status: zod_1.z.string().trim().optional(),
    category: zod_1.z.string().trim().optional(),
    rating: zod_1.z.coerce.number().int().min(1).max(5).optional(),
    search: zod_1.z.string().trim().optional(),
    sortBy: zod_1.z.enum(['CREATED_AT', 'RATING', 'STATUS']).default('CREATED_AT'),
    sortOrder: zod_1.z.enum(['ASC', 'DESC']).default('DESC'),
});
