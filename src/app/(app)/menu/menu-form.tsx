"use client";

import Link from "next/link";
import { useState } from "react";
import { validateMenuItemInput, type MenuItemInput } from "@/application/validation/menu";
import type { RecipeWithCost } from "@/domain/recipes/types";
import { calculateMenuEconomics } from "@/application/menu/costing";
import { formatMoney } from "@/lib/format/money";

export interface MenuFormInitialValues {
  name: string;
  recipe_id: string;
  selling_price: string;
  active: boolean;
}

interface Props {
  title: string;
  submitLabel: string;
  initialValues?: MenuFormInitialValues;
  recipes: RecipeWithCost[];
  platformFeePct: string | number | null;
  onSubmit: (input: MenuItemInput) => Promise<{ success: boolean; error?: string }>;
  onCancel: () => void;
}

export function MenuForm({
  title,
  submitLabel,
  initialValues,
  recipes,
  platformFeePct,
  onSubmit,
  onCancel,
}: Props) {
  const [name, setName] = useState(initialValues?.name || "");
  const [recipeId, setRecipeId] = useState(initialValues?.recipe_id || "");
  const [sellingPrice, setSellingPrice] = useState(initialValues?.selling_price || "");
  const [active, setActive] = useState(initialValues?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derive economics preview
  const selectedRecipe = recipes.find((r) => r.id === recipeId);
  const economics = calculateMenuEconomics({
    sellingPrice: Number(sellingPrice) || 0,
    costPerServing: selectedRecipe ? selectedRecipe.cost_per_serving : null,
    platformFeePercent: platformFeePct,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let input: MenuItemInput;
    try {
      input = validateMenuItemInput({
        name,
        recipe_id: recipeId || null,
        selling_price: Number(sellingPrice),
        active,
      });
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (err.errors && err.errors[0]) {
        setError(err.errors[0].message);
      } else {
        setError(err.message || "Invalid input");
      }
      return;
    }

    setIsSubmitting(true);
    const result = await onSubmit(input);
    setIsSubmitting(false);

    if (!result.success && result.error) {
      setError(result.error);
    }
  };

  if (recipes.length === 0) {
    return (
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 text-center">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">{title}</h2>
        <p className="text-sm text-zinc-500 mb-4">Recipes are required to create a menu item.</p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 focus:outline-none"
          >
            Cancel
          </button>
          <Link
            href="/recipes"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none"
          >
            Go to Recipes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 max-w-lg w-full mx-auto">
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">{title}</h2>

      {error && (
        <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md border border-red-200 dark:border-red-900/30">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Menu Item Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. Chicken Biryani"
            required
            maxLength={100}
          />
        </div>

        <div>
          <label htmlFor="recipe" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Assigned Recipe
          </label>
          <select
            id="recipe"
            value={recipeId}
            onChange={(e) => setRecipeId(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="" disabled>Select a recipe</option>
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} (Cost: {formatMoney(r.cost_per_serving)} / serving)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="price" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Selling Price
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500 text-sm">
              ₹
            </span>
            <input
              id="price"
              type="number"
              step="0.01"
              min="0.01"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              className="w-full pl-7 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="199.00"
              required
            />
          </div>
        </div>

        <div className="flex items-center">
          <input
            id="active"
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-zinc-300 rounded"
          />
          <label htmlFor="active" className="ml-2 block text-sm text-zinc-700 dark:text-zinc-300">
            Active (visible on menu)
          </label>
        </div>

        {selectedRecipe && sellingPrice && Number(sellingPrice) > 0 && (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-md border border-zinc-200 dark:border-zinc-800 space-y-2 mt-4">
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Economics Preview</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-zinc-500">Cost / serving:</div>
              <div className="text-right text-zinc-900 dark:text-zinc-100">{formatMoney(selectedRecipe.cost_per_serving)}</div>
              
              <div className="text-zinc-500">Food cost %:</div>
              <div className="text-right text-zinc-900 dark:text-zinc-100">{economics.foodCostPercent}%</div>
              
              <div className="text-zinc-500">Contribution:</div>
              <div className="text-right text-zinc-900 dark:text-zinc-100 font-medium">{economics.contribution ? formatMoney(economics.contribution) : "-"}</div>
              
              <div className="text-zinc-500">Margin:</div>
              <div className="text-right text-zinc-900 dark:text-zinc-100 font-medium">{economics.contributionMargin}%</div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 focus:outline-none disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none disabled:opacity-50 flex items-center"
          >
            {isSubmitting ? "Saving..." : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
