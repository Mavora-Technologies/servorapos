"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMenuItemSchema = exports.createCategorySchema = void 0;
// apps/api/src/validators/menu.validator.ts
const zod_1 = require("zod");
exports.createCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Category name is required"),
    description: zod_1.z.string().optional(),
});
exports.createMenuItemSchema = zod_1.z.object({
    categoryId: zod_1.z.number().int("Category ID is required"),
    name: zod_1.z.string().min(2, "Item name is required"),
    sku: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    price: zod_1.z.number().positive("Price must be a positive number"),
    isAvailable: zod_1.z.boolean().optional().default(true),
    imageUrl: zod_1.z.string().url("Must be a valid URL").optional(),
});
