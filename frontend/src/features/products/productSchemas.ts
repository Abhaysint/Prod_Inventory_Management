import { z } from "zod";

/**
 * SEPARATE create and update schemas (Section 3.8 item 3).
 * sku and category_id are required at creation but immutable afterwards
 * (ProductUpdate accepts only name, description, unit_price, reorder_level),
 * so the update schema deliberately omits both fields.
 *
 * Numeric inputs are kept as strings in the form and converted on submit,
 * so validation errors surface inline before any request leaves the browser.
 */

const nameField = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(200, "Name is too long (max 200 characters)");

const descriptionField = z
  .string()
  .trim()
  .max(1000, "Description is too long (max 1000 characters)");

const unitPriceField = z
  .string()
  .trim()
  .min(1, "Unit price is required")
  .refine((v) => !Number.isNaN(Number(v)), "Unit price must be a number")
  .refine((v) => Number(v) > 0, "Unit price must be greater than 0");

const reorderLevelField = z
  .string()
  .trim()
  .min(1, "Reorder level is required")
  .refine(
    (v) => Number.isInteger(Number(v)) && Number(v) >= 0,
    "Reorder level must be a whole number of 0 or more"
  );

export const createProductSchema = z.object({
  name: nameField,
  sku: z.string().trim().min(1, "SKU is required").max(100, "SKU is too long (max 100 characters)"),
  category_id: z.string().trim().min(1, "Select a category"),
  description: descriptionField,
  unit_price: unitPriceField,
  reorder_level: reorderLevelField,
});

export const updateProductSchema = z.object({
  name: nameField,
  description: descriptionField,
  unit_price: unitPriceField,
  reorder_level: reorderLevelField,
});

export type CreateProductValues = z.infer<typeof createProductSchema>;
export type UpdateProductValues = z.infer<typeof updateProductSchema>;
