import { z } from "zod";
import { TransactionType } from "@/types/enums";

export const transactionSchema = z.object({
  transaction_type: z.enum(
    [
      TransactionType.INBOUND,
      TransactionType.OUTBOUND,
      TransactionType.ADJUSTMENT,
      TransactionType.RETURN,
    ],
    { required_error: "Select a transaction type" }
  ),
  quantity: z
    .string()
    .trim()
    .min(1, "Quantity is required")
    .refine(
      (v) => Number.isInteger(Number(v)) && Number(v) > 0,
      "Quantity must be a positive whole number (at least 1)"
    ),
  reference_doc: z
    .string()
    .trim()
    .max(100, "Reference document must be 100 characters or fewer"),
  notes: z
    .string()
    .trim()
    .max(500, "Notes must be 500 characters or fewer"),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;

