import type { BaseUnit, CurrencyCode } from "../financial/types";

export type { BaseUnit, CurrencyCode };

export type PriceChangeSource = "manual" | "invoice" | "import";

export interface Ingredient {
  id: string;
  business_id: string;
  name: string;
  base_unit: BaseUnit;
  current_price: number;
  currency: CurrencyCode;
  supplier: string | null;
  created_at: string;
  updated_at: string;
}

export interface IngredientPriceHistory {
  id: string;
  ingredient_id: string;
  business_id: string;
  price: number;
  old_price: number | null;
  new_price: number | null;
  unit: BaseUnit | null;
  currency: CurrencyCode;
  source: PriceChangeSource;
  invoice_id?: string | null;
  observed_at: string;
  changed_at: string;
  created_at: string;
}
