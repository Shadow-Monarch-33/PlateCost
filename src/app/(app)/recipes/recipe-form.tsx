"use client";

import Link from "next/link";
import { useState } from "react";
import type { BaseUnit } from "@/domain/financial/types";
import { getCompatibleUnits } from "@/domain/recipes/unit-dimensions";
import {
  DEFAULT_SERVINGS,
  validateRecipeInput,
  type RecipeInput,
} from "@/application/validation/recipe";
import { costRecipe } from "@/application/recipes/costing";
import { formatMoney } from "@/lib/format/money";

export const NO_INGREDIENTS_MESSAGE = "Add ingredients first before creating a recipe.";

export interface RecipeFormIngredient {
  id: string;
  name: string;
  base_unit: BaseUnit;
  /** Current ingredient price per base unit (numeric string). */
  current_price: string;
}

export interface RecipeFormRow {
  key: string;
  ingredient_id: string;
  quantity: string;
  unit: BaseUnit | "";
}

export interface RecipeFormInitialValues {
  name: string;
  servings: string;
  rows: Omit<RecipeFormRow, "key">[];
}

interface Props {
  title: string;
  submitLabel: string;
  pendingLabel: string;
  ingredients: RecipeFormIngredient[];
  initialValues?: RecipeFormInitialValues;
  isPending: boolean;
  serverError: string | null;
  onSubmit: (input: RecipeInput) => void;
  onCancel: () => void;
}

let rowKeySequence = 0;
function nextRowKey(): string {
  rowKeySequence += 1;
  return `recipe-row-${rowKeySequence}`;
}

function emptyRow(): RecipeFormRow {
  return { key: nextRowKey(), ingredient_id: "", quantity: "", unit: "" };
}

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-zinc-500";

export function RecipeForm({
  title,
  submitLabel,
  pendingLabel,
  ingredients,
  initialValues,
  isPending,
  serverError,
  onSubmit,
  onCancel,
}: Props) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [servings, setServings] = useState(
    initialValues?.servings ?? String(DEFAULT_SERVINGS),
  );
  const [rows, setRows] = useState<RecipeFormRow[]>(() => {
    if (initialValues) {
      return initialValues.rows.map((row) => ({ ...row, key: nextRowKey() }));
    }
    return ingredients.length > 0 ? [emptyRow()] : [];
  });
  const [formError, setFormError] = useState<string | null>(null);

  const ingredientById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const hasIngredients = ingredients.length > 0;

  const updateRow = (key: string, patch: Partial<RecipeFormRow>) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const handleIngredientChange = (row: RecipeFormRow, ingredientId: string) => {
    const ingredient = ingredientById.get(ingredientId);
    if (!ingredient) {
      updateRow(row.key, { ingredient_id: "", unit: "" });
      return;
    }
    const compatible = getCompatibleUnits(ingredient.base_unit);
    const keepUnit = row.unit !== "" && compatible.includes(row.unit);
    updateRow(row.key, {
      ingredient_id: ingredientId,
      unit: keepUnit ? row.unit : ingredient.base_unit,
    });
  };

  const buildInput = (): RecipeInput => ({
    name,
    servings: servings.trim() === "" ? undefined : servings,
    ingredients: rows.map((row) => ({
      ingredient_id: row.ingredient_id,
      quantity: row.quantity,
      unit: row.unit,
    })) as RecipeInput["ingredients"],
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const result = validateRecipeInput(buildInput(), ingredients);
    if (!result.success) {
      setFormError(result.error);
      return;
    }
    onSubmit(result.data);
  };

  // Live preview: computed by the Finance Engine adapter from CURRENT prices.
  let preview: { batch: string; perServing: string; lines: Map<string, string> } | null = null;
  const previewCheck = validateRecipeInput(buildInput(), ingredients);
  if (previewCheck.success) {
    try {
      const costing = costRecipe({
        servings: previewCheck.data.servings,
        lines: previewCheck.data.ingredients.map((line) => {
          const ingredient = ingredientById.get(line.ingredient_id)!;
          return {
            quantity: line.quantity,
            unit: line.unit,
            ingredientCurrentPrice: ingredient.current_price,
            ingredientBaseUnit: ingredient.base_unit,
          };
        }),
      });
      preview = {
        batch: formatMoney(costing.batchCost),
        perServing: formatMoney(costing.costPerServing),
        lines: new Map(
          previewCheck.data.ingredients.map((line, index) => [
            line.ingredient_id,
            formatMoney(costing.lineCosts[index]!),
          ]),
        ),
      };
    } catch {
      preview = null;
    }
  }

  const displayedError = formError ?? serverError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="recipe-form-title"
        className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl border border-zinc-200 max-h-[90vh] overflow-y-auto"
      >
        <h2 id="recipe-form-title" className="text-lg font-semibold text-zinc-900">
          {title}
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Costs are calculated from each ingredient&apos;s current price.
        </p>

        {displayedError && (
          <div
            role="alert"
            className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700"
          >
            {displayedError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label htmlFor="recipe-name" className="block text-xs font-medium text-zinc-700">
                Recipe Name *
              </label>
              <input
                id="recipe-name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Chicken Biryani"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="recipe-servings" className="block text-xs font-medium text-zinc-700">
                Servings *
              </label>
              <input
                id="recipe-servings"
                name="servings"
                type="number"
                min="0"
                step="any"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <fieldset>
            <legend className="block text-xs font-medium text-zinc-700">Ingredients *</legend>

            {!hasIngredients ? (
              <div className="mt-2 rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-600">
                <p>{NO_INGREDIENTS_MESSAGE}</p>
                <Link
                  href="/ingredients"
                  className="mt-2 inline-block text-sm font-medium text-zinc-900 underline"
                >
                  Go to Ingredients
                </Link>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                {rows.length === 0 && (
                  <p className="text-xs text-zinc-500">No ingredient rows. Add one below.</p>
                )}
                {rows.map((row, index) => {
                  const ingredient = ingredientById.get(row.ingredient_id);
                  const units = ingredient ? getCompatibleUnits(ingredient.base_unit) : [];
                  return (
                    <div
                      key={row.key}
                      className="grid grid-cols-12 items-end gap-2 rounded-lg border border-zinc-200 p-2"
                    >
                      <div className="col-span-12 sm:col-span-5">
                        <label
                          htmlFor={`${row.key}-ingredient`}
                          className="block text-[11px] text-zinc-500"
                        >
                          Ingredient {index + 1}
                        </label>
                        <select
                          id={`${row.key}-ingredient`}
                          value={row.ingredient_id}
                          onChange={(e) => handleIngredientChange(row, e.target.value)}
                          className={inputClass}
                        >
                          <option value="">Select ingredient</option>
                          {ingredients.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name} ({formatMoney(option.current_price)}/{option.base_unit})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-5 sm:col-span-3">
                        <label
                          htmlFor={`${row.key}-quantity`}
                          className="block text-[11px] text-zinc-500"
                        >
                          Quantity
                        </label>
                        <input
                          id={`${row.key}-quantity`}
                          type="number"
                          min="0"
                          step="any"
                          value={row.quantity}
                          onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <label
                          htmlFor={`${row.key}-unit`}
                          className="block text-[11px] text-zinc-500"
                        >
                          Unit
                        </label>
                        <select
                          id={`${row.key}-unit`}
                          value={row.unit}
                          disabled={!ingredient}
                          onChange={(e) => updateRow(row.key, { unit: e.target.value as BaseUnit })}
                          className={inputClass}
                        >
                          {!ingredient && <option value="">—</option>}
                          {units.map((unit) => (
                            <option key={unit} value={unit}>
                              {unit}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setRows((prev) => prev.filter((candidate) => candidate.key !== row.key))
                          }
                          aria-label={`Remove ingredient ${index + 1}`}
                          className="rounded-md border border-red-200 px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setRows((prev) => [...prev, emptyRow()])}
                  className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                >
                  + Add ingredient
                </button>
              </div>
            )}
          </fieldset>

          <div className="grid grid-cols-2 gap-3 rounded-lg bg-zinc-50 p-3 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-zinc-500">Batch cost</p>
              <p className="font-semibold text-zinc-900 tabular-nums">{preview?.batch ?? "—"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-zinc-500">Cost per serving</p>
              <p className="font-semibold text-zinc-900 tabular-nums">
                {preview?.perServing ?? "—"}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {isPending ? pendingLabel : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
