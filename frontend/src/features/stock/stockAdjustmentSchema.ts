import { z } from "zod";

export const stockAdjustmentSchema = z.object({
  productId: z.string().trim().min(1, "Please select a product"),
  new_quantity: z
    .string()
    .trim()
    .min(1, "New quantity is required")
    .refine(
      (v) => Number.isInteger(Number(v)) && Number(v) >= 0,
      "New quantity must be a whole number of 0 or more"
    ),
  reason: z
    .string()
    .trim()
    .min(1, "Reason is required")
    .max(500, "Reason must be 500 characters or fewer"),
});

export type StockAdjustmentValues = z.infer<typeof stockAdjustmentSchema>;

