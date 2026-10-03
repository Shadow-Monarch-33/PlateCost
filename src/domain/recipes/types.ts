import type { BaseUnit } from "../financial/types";

/** A persisted recipe ingredient line joined to the ingredient's CURRENT state. */
export interface RecipeIngredientLine {
  ingredient_id: string;
  ingredient_name: string;
  quantity: string;
  unit: BaseUnit;
  ingredient_base_unit: BaseUnit;
  /** Current ingredient price per base unit (numeric string). Never a stored recipe price. */
  ingredient_current_price: string;
  /** Cost contribution of this line at the current ingredient price (2-dp numeric string). */
  line_cost: string;
}

export interface RecipeWithCost {
  id: string;
  name: string;
  servings: string;
  created_at: string;
  updated_at: string;
  lines: RecipeIngredientLine[];
  /** Batch cost (2-dp numeric string). */
  batch_cost: string;
  /** Cost per serving (2-dp numeric string). */
  cost_per_serving: string;
}
