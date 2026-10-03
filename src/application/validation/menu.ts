import { z } from "zod";

export const createMenuItemSchema = z.object({
  name: z.string().trim().min(1, "Menu item name is required").max(100, "Name must be under 100 characters"),
  recipe_id: z.string().uuid("Invalid recipe selected").nullable(),
  selling_price: z.number().positive("Selling price must be greater than 0"),
  active: z.boolean().default(true),
});

export const updateMenuItemSchema = createMenuItemSchema;

export type MenuItemInput = z.infer<typeof createMenuItemSchema>;

export function validateMenuItemInput(input: unknown): MenuItemInput {
  return createMenuItemSchema.parse(input);
}
