import { z } from "zod";

/**
 * Mirrors CategoryCreate in app/schemas.py:
 * - name: str = Field(..., min_length=1, max_length=100)
 * - description: Optional[str] = Field(None, max_length=500)
 */
export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name is too long (max 100 characters)"),
  description: z
    .string()
    .trim()
    .max(500, "Description is too long (max 500 characters)"),
});

export type CreateCategoryValues = z.infer<typeof createCategorySchema>;

