// apps/api/src/validators/combo.validator.ts
import { z } from 'zod';
import { MAX_MENU_IMAGE_BYTES } from '../utils/cloudinary';

const optionalTrimmed = z
  .string()
  .trim()
  .transform((val) => (val === '' ? null : val))
  .nullable()
  .optional();

const optionalTimestamp = z
  .string()
  .trim()
  .transform((val) => (val === '' ? null : val))
  .nullable()
  .optional()
  .refine((val) => !val || !Number.isNaN(Date.parse(val)), {
    message: 'Invalid date/time format',
  });

export const createComboItemSchema = z.object({
  menuItemId: z.coerce.number().int().positive('Valid menu item is required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').default(1),
  additionalPrice: z.coerce.number().min(0, 'Additional price cannot be negative').default(0),
});

const comboBundleBaseSchema = z.object({
  name: z.string().trim().min(2, 'Combo bundle name must be at least 2 characters').max(150),
  description: optionalTrimmed,
  sku: optionalTrimmed,
  branchId: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().int().positive().nullable().optional()
  ),
  basePrice: z.coerce.number().min(0, 'Base price must be zero or greater'),
  isAvailable: z.boolean().default(true),
  validFrom: optionalTimestamp,
  validUntil: optionalTimestamp,
  imageUrl: z
    .string()
    .trim()
    .transform((val) => (val === '' ? null : val))
    .nullable()
    .optional()
    .refine((val) => !val || /^https?:\/\//i.test(val) || val.startsWith('/'), {
      message: 'Image URL must be a valid URL or relative path',
    }),
  imagePublicId: optionalTrimmed,
  imageOriginalFilename: optionalTrimmed,
  imageMimeType: optionalTrimmed,
  imageFileSize: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().int().nonnegative().max(MAX_MENU_IMAGE_BYTES).nullable().optional()
  ),
  items: z
    .array(createComboItemSchema)
    .min(1, 'Please attach at least one dish or drink to the combo'),
});

export const createComboBundleSchema = comboBundleBaseSchema.refine(
  (d) => !d.validFrom || !d.validUntil || Date.parse(d.validUntil) >= Date.parse(d.validFrom),
  {
    message: 'Promotional end date must be on or after the start date.',
    path: ['validUntil'],
  }
);

export const updateComboBundleSchema = comboBundleBaseSchema.partial();

export type CreateComboItemInput = z.infer<typeof createComboItemSchema>;
export type CreateComboBundleInput = z.infer<typeof createComboBundleSchema>;
export type UpdateComboBundleInput = z.infer<typeof updateComboBundleSchema>;