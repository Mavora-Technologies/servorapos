import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(2, "Category name is required"),
  description: z.string().optional(),
});

export const createMenuItemSchema = z.object({
  categoryId: z.number().int("Category ID is required"),
  name: z.string().min(2, "Item name is required"),
  sku: z.string().optional(),
  description: z.string().optional(),
  price: z.number().positive("Price must be a positive number"),
  isAvailable: z.boolean().optional().default(true),
  imageUrl: z.string().url("Must be a valid URL").optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;