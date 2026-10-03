"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { MenuItemWithEconomics } from "@/domain/menu/types";
import type { RecipeWithCost } from "@/domain/recipes/types";
import { formatMoney } from "@/lib/format/money";
import { MenuForm } from "./menu-form";
import { createMenuItemAction, updateMenuItemAction, deleteMenuItemAction } from "./actions";

interface Props {
  initialItems: MenuItemWithEconomics[];
  recipes: RecipeWithCost[];
  platformFeePct: string | number | null;
  hasIngredients: boolean;
}

export function MenuClientView({ initialItems, recipes, platformFeePct, hasIngredients }: Props) {
  const [items, setItems] = useState(initialItems);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: "create" | "edit" | "delete";
    item: MenuItemWithEconomics | null;
  }>({ isOpen: false, mode: "create", item: null });
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, searchQuery]);

  const closeModal = () => setModalState({ isOpen: false, mode: "create", item: null });

  if (!hasIngredients) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">No ingredients</h3>
        <p className="mt-2 text-sm text-zinc-500">The user cannot create a recipe, therefore cannot create a menu item.</p>
        <div className="mt-6">
          <Link
            href="/ingredients"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Go to Ingredients
          </Link>
        </div>
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">No recipes found</h3>
        <p className="mt-2 text-sm text-zinc-500">Recipes are required first before creating menu items.</p>
        <div className="mt-6">
          <Link
            href="/recipes"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Create your first recipe
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="w-full sm:max-w-xs">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-zinc-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md leading-5 bg-white dark:bg-zinc-800 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
        <button
          onClick={() => setModalState({ isOpen: true, mode: "create", item: null })}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          Add Menu Item
        </button>
      </div>

      {modalState.isOpen && modalState.mode !== "delete" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <MenuForm
            title={modalState.mode === "create" ? "Add Menu Item" : "Edit Menu Item"}
            submitLabel={modalState.mode === "create" ? "Create" : "Save Changes"}
            recipes={recipes}
            platformFeePct={platformFeePct}
            initialValues={
              modalState.item
                ? {
                    name: modalState.item.name,
                    recipe_id: modalState.item.recipe_id || "",
                    selling_price: modalState.item.selling_price,
                    active: modalState.item.active,
                  }
                : undefined
            }
            onSubmit={async (input) => {
              const action = modalState.mode === "create" ? createMenuItemAction : updateMenuItemAction.bind(null, modalState.item!.id);
              const result = await action(input);
              if (result.success) {
                setItems(result.data);
                closeModal();
              }
              return result;
            }}
            onCancel={closeModal}
          />
        </div>
      )}

      {modalState.isOpen && modalState.mode === "delete" && modalState.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">Delete Menu Item</h3>
            <p className="text-sm text-zinc-500 mb-6">
              Are you sure you want to delete <strong>{modalState.item.name}</strong>? This action cannot be undone.
              Consider deactivating it instead.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeModal}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsDeleting(true);
                  const result = await deleteMenuItemAction(modalState.item!.id);
                  setIsDeleting(false);
                  if (result.success) {
                    setItems(result.data);
                    closeModal();
                  } else {
                    alert(result.error);
                  }
                }}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">No menu items yet</h3>
          <p className="mt-1 text-sm text-zinc-500">Create your first menu item to see your economics.</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 text-sm">
          No menu items found for &quot;{searchQuery}&quot;.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-5 rounded-lg border flex flex-col justify-between ${
                item.active 
                  ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" 
                  : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800/60 opacity-80"
              }`}
            >
              <div>
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 truncate pr-2">
                    {item.name}
                  </h3>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      {formatMoney(item.selling_price)}
                    </span>
                    {!item.active && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-zinc-500">
                    <span>Recipe</span>
                    <span className="text-zinc-900 dark:text-zinc-100 truncate max-w-[120px]">{item.recipe_name || "Unknown"}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>Cost / serving</span>
                    <span className="text-zinc-900 dark:text-zinc-100">{item.cost_per_serving ? formatMoney(item.cost_per_serving) : "-"}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>Food cost</span>
                    <span className="text-zinc-900 dark:text-zinc-100">{item.food_cost_percent ? `${item.food_cost_percent}%` : "-"}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>Contribution</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{item.contribution ? formatMoney(item.contribution) : "-"}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>Margin</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{item.contribution_margin ? `${item.contribution_margin}%` : "-"}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
                <button
                  onClick={() => setModalState({ isOpen: true, mode: "edit", item })}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Edit
                </button>
                <button
                  onClick={() => setModalState({ isOpen: true, mode: "delete", item })}
                  className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
