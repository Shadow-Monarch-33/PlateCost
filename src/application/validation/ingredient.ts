import { z } from "zod";

export const supportedBaseUnits = ["g", "kg", "ml", "L", "piece"] as const;

const supplierField = z
  .string()
  .trim()
  .max(100, "Supplier name is too long")
  .nullish()
  .transform((val) => (val && val.length > 0 ? val : null))
  .optional();

export const createIngredientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Ingredient name cannot be empty")
    .max(100, "Ingredient name is too long"),
  base_unit: z.enum(supportedBaseUnits, {
    message: "Base unit must be one of: g, kg, ml, L, piece",
  }),
  current_price: z.coerce
    .number()
    .min(0, "Price cannot be negative")
    .finite("Price must be a valid number"),
  supplier: supplierField,
});

export const updateIngredientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Ingredient name cannot be empty")
    .max(100, "Ingredient name is too long")
    .optional(),
  current_price: z.coerce
    .number()
    .min(0, "Price cannot be negative")
    .finite("Price must be a valid number")
    .optional(),
  supplier: supplierField,
});

export type CreateIngredientInput = z.infer<typeof createIngredientSchema>;
export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>;
