"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { RecipeWithCost } from "@/domain/recipes/types";
import { formatMoney } from "@/lib/format/money";
import { RecipeForm, type RecipeFormIngredient } from "./recipe-form";
import type { RecipeInput } from "@/application/validation/recipe";
import {
  createRecipeAction,
  updateRecipeAction,
  deleteRecipeAction,
} from "./actions";

interface Props {
  initialRecipes: RecipeWithCost[];
  ingredients: RecipeFormIngredient[];
}

export function RecipesClientView({ initialRecipes, ingredients }: Props) {
  const [recipes, setRecipes] = useState<RecipeWithCost[]>(initialRecipes);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<RecipeWithCost | null>(null);
  const [deletingRecipe, setDeletingRecipe] = useState<RecipeWithCost | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleAddSubmit = (input: RecipeInput) => {
    startTransition(async () => {
      setFormError(null);
      const result = await createRecipeAction(input);
      if (result.success) {
        setRecipes(result.data);
        setIsAddOpen(false);
      } else {
        setFormError(result.error);
      }
    });
  };

  const handleEditSubmit = (input: RecipeInput) => {
    if (!editingRecipe) return;
    startTransition(async () => {
      setFormError(null);
      const result = await updateRecipeAction(editingRecipe.id, input);
      if (result.success) {
        setRecipes(result.data);
        setEditingRecipe(null);
      } else {
        setFormError(result.error);
      }
    });
  };

  const handleDeleteConfirm = () => {
    if (!deletingRecipe) return;
    startTransition(async () => {
      setDeleteError(null);
      const result = await deleteRecipeAction(deletingRecipe.id);
      if (result.success) {
        setRecipes(result.data);
        setDeletingRecipe(null);
      } else {
        setDeleteError(result.error);
      }
    });
  };

  const hasNoIngredients = ingredients.length === 0;
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const visibleRecipes = normalizedSearchQuery
    ? recipes.filter((recipe) => recipe.name.toLowerCase().includes(normalizedSearchQuery))
    : recipes;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Recipes
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Create recipes, scale servings, and calculate plate costs dynamically from live ingredient prices.
          </p>
        </div>
        <div>
          <button
            onClick={() => {
              setFormError(null);
              setIsAddOpen(true);
            }}
            disabled={hasNoIngredients}
            className="inline-flex items-center justify-center rounded-lg border border-transparent bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-zinc-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add Recipe
          </button>
        </div>
      </div>

      {hasNoIngredients && (
        <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-amber-800">
            Add ingredients first before creating a recipe.
          </p>
          <Link
            href="/ingredients"
            className="mt-3 inline-flex text-sm font-medium text-amber-900 underline hover:text-amber-700"
          >
            Go to Ingredients &rarr;
          </Link>
        </div>
      )}

      {!hasNoIngredients && recipes.length === 0 && (
        <div className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 border-dashed p-12 text-center">
          <p className="text-zinc-600 text-sm">No recipes yet.</p>
          <p className="mt-1 text-zinc-500 text-sm">
            Create your first recipe to start calculating food costs.
          </p>
          <button
            onClick={() => {
              setFormError(null);
              setIsAddOpen(true);
            }}
            className="mt-4 inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-xs hover:bg-zinc-50 transition-colors"
          >
            + Add Recipe
          </button>
        </div>
      )}

      {recipes.length > 0 && (
        <div className="mt-8">
          <label htmlFor="recipe-search" className="sr-only">
            Search recipes
          </label>
          <input
            id="recipe-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search recipes..."
            className="w-full max-w-sm rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-900 placeholder-zinc-400 shadow-2xs focus:border-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-zinc-500"
          />
        </div>
      )}

      {recipes.length > 0 && visibleRecipes.length === 0 && (
        <div className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-12 text-center">
          <p className="text-sm text-zinc-600">No recipes found</p>
        </div>
      )}

      {visibleRecipes.length > 0 && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleRecipes.map((recipe) => (
            <div
              key={recipe.id}
              className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-xs"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-900 line-clamp-1">
                    {recipe.name}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    {recipe.servings} serving{Number(recipe.servings) !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setFormError(null);
                      setEditingRecipe(recipe);
                    }}
                    className="text-xs font-medium text-zinc-600 hover:text-zinc-900 underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setDeleteError(null);
                      setDeletingRecipe(recipe);
                    }}
                    className="text-xs font-medium text-red-600 hover:text-red-700 underline"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="mt-4 flex-1">
                <p className="text-[11px] font-medium text-zinc-700 mb-2 uppercase tracking-wide">Ingredients</p>
                <div className="space-y-1.5">
                  {recipe.lines.slice(0, 3).map((line, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-zinc-600 line-clamp-1 pr-2">{line.ingredient_name}</span>
                      <span className="text-zinc-400 whitespace-nowrap">
                        {line.quantity} {line.unit}
                      </span>
                    </div>
                  ))}
                  {recipe.lines.length > 3 && (
                    <div className="text-xs text-zinc-400 italic mt-1">
                      + {recipe.lines.length - 3} more
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 border-t border-zinc-100 pt-4 flex items-end justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Batch</p>
                  <p className="text-sm text-zinc-900 font-medium">{formatMoney(recipe.batch_cost)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Per Serving</p>
                  <p className="text-lg text-emerald-600 font-bold tracking-tight">{formatMoney(recipe.cost_per_serving)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAddOpen && (
        <RecipeForm
          title="Create Recipe"
          submitLabel="Create"
          pendingLabel="Creating..."
          ingredients={ingredients}
          isPending={isPending}
          serverError={formError}
          onSubmit={handleAddSubmit}
          onCancel={() => {
            setIsAddOpen(false);
            setFormError(null);
          }}
        />
      )}

      {editingRecipe && (
        <RecipeForm
          title={`Edit ${editingRecipe.name}`}
          submitLabel="Save Changes"
          pendingLabel="Saving..."
          ingredients={ingredients}
          initialValues={{
            name: editingRecipe.name,
            servings: editingRecipe.servings,
            rows: editingRecipe.lines.map((line, idx) => ({
              key: `edit-${idx}`,
              ingredient_id: line.ingredient_id,
              quantity: line.quantity,
              unit: line.unit,
            })),
          }}
          isPending={isPending}
          serverError={formError}
          onSubmit={handleEditSubmit}
          onCancel={() => {
            setEditingRecipe(null);
            setFormError(null);
          }}
        />
      )}

      {deletingRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl border border-zinc-200">
            <h2 className="text-lg font-semibold text-zinc-900">Delete Recipe</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Are you sure you want to delete <strong>{deletingRecipe.name}</strong>? This cannot be undone.
            </p>

            {deleteError && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setDeletingRecipe(null);
                  setDeleteError(null);
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleDeleteConfirm}
                className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isPending ? "Deleting..." : "Delete Recipe"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
