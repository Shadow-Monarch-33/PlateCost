export interface MenuItem {
  id: string;
  business_id: string;
  recipe_id: string | null;
  name: string;
  selling_price: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuItemWithEconomics extends MenuItem {
  recipe_name: string | null;
  cost_per_serving: string | null;
  food_cost_percent: string | null;
  contribution: string | null;
  contribution_margin: string | null;
}
