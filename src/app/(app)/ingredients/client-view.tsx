"use client";

import { useState, useTransition } from "react";
import type {
  Ingredient,
  IngredientPriceHistory,
  BaseUnit,
} from "@/domain/ingredients/types";
import { supportedBaseUnits } from "@/application/validation/ingredient";
import {
  createIngredientAction,
  updateIngredientAction,
  deleteIngredientAction,
  fetchPriceHistoryAction,
} from "./actions";

interface Props {
  initialIngredients: Ingredient[];
  businessId: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return isoString;
  }
}

export function IngredientsClientView({ initialIngredients }: Props) {
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredients);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [deletingIngredient, setDeletingIngredient] = useState<Ingredient | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Ingredient | null>(null);
  const [historyRecords, setHistoryRecords] = useState<IngredientPriceHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Form states
  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Filtered ingredients
  const filtered = ingredients.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.supplier && item.supplier.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  // --- ADD INGREDIENT ---
  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const name = (formData.get("name") as string)?.trim();
    const base_unit = formData.get("base_unit") as BaseUnit;
    const priceStr = formData.get("current_price") as string;
    const supplier = (formData.get("supplier") as string)?.trim() || null;

    const current_price = Number(priceStr);
    if (!name) {
      setFormError("Ingredient name cannot be empty.");
      return;
    }
    if (isNaN(current_price) || current_price < 0) {
      setFormError("Price must be a valid non-negative number.");
      return;
    }

    startTransition(async () => {
      const res = await createIngredientAction({
        name,
        base_unit,
        current_price,
        supplier,
      });

      if (!res.success) {
        setFormError(res.error);
        return;
      }

      setIngredients((prev) =>
        [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setIsAddOpen(false);
      setFeedbackMessage(`Ingredient "${res.data.name}" created successfully.`);
      setTimeout(() => setFeedbackMessage(null), 4000);
    });
  };

  // --- EDIT INGREDIENT ---
  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingIngredient) return;
    setFormError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const name = (formData.get("name") as string)?.trim();
    const priceStr = formData.get("current_price") as string;
    const supplier = (formData.get("supplier") as string)?.trim() || null;

    const current_price = Number(priceStr);
    if (!name) {
      setFormError("Ingredient name cannot be empty.");
      return;
    }
    if (isNaN(current_price) || current_price < 0) {
      setFormError("Price must be a valid non-negative number.");
      return;
    }

    startTransition(async () => {
      const res = await updateIngredientAction(editingIngredient.id, {
        name,
        current_price,
        supplier,
      });

      if (!res.success) {
        setFormError(res.error);
        return;
      }

      setIngredients((prev) =>
        prev
          .map((item) => (item.id === res.data.id ? res.data : item))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setEditingIngredient(null);
      setFeedbackMessage(`Ingredient "${res.data.name}" updated successfully.`);
      setTimeout(() => setFeedbackMessage(null), 4000);
    });
  };

  // --- DELETE INGREDIENT ---
  const handleDeleteConfirm = async () => {
    if (!deletingIngredient) return;
    setFormError(null);

    startTransition(async () => {
      const res = await deleteIngredientAction(deletingIngredient.id);
      if (!res.success) {
        setFormError(res.error);
        return;
      }

      setIngredients((prev) => prev.filter((i) => i.id !== deletingIngredient.id));
      setFeedbackMessage(
        `Ingredient "${deletingIngredient.name}" deleted successfully.`,
      );
      setDeletingIngredient(null);
      setTimeout(() => setFeedbackMessage(null), 4000);
    });
  };

  // --- PRICE HISTORY ---
  const handleOpenHistory = async (ingredient: Ingredient) => {
    setHistoryTarget(ingredient);
    setHistoryRecords([]);
    setIsLoadingHistory(true);
    const res = await fetchPriceHistoryAction(ingredient.id);
    setIsLoadingHistory(false);
    if (res.success) {
      setHistoryRecords(res.data);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Ingredients
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage raw ingredient costs, canonical base units, suppliers, and track historical prices.
          </p>
        </div>
        <div>
          <button
            onClick={() => {
              setFormError(null);
              setIsAddOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-zinc-800 transition-colors"
          >
            + Add Ingredient
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedbackMessage && (
        <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
          {feedbackMessage}
        </div>
      )}

      {/* Search Bar */}
      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <input
            type="text"
            placeholder="Search ingredients or suppliers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-900 placeholder-zinc-400 shadow-2xs focus:border-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-zinc-500"
          />
        </div>
        <div className="text-xs text-zinc-500">
          Showing {filtered.length} of {ingredients.length} items
        </div>
      </div>

      {/* Ingredients Table */}
      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-medium text-zinc-600 uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-6 py-3.5">
                  Ingredient
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Base Unit
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Current Price
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Supplier
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Last Updated
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-zinc-500"
                  >
                    {ingredients.length === 0
                      ? "No ingredients found. Click \"+ Add Ingredient\" to get started."
                      : "No ingredients match your search."}
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/75 transition-colors">
                    <td className="px-6 py-4 font-medium text-zinc-900">
                      {item.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                        {item.base_unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-zinc-900">
                      {formatCurrency(item.current_price)}{" "}
                      <span className="font-normal text-xs text-zinc-500">
                        / {item.base_unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-600">
                      {item.supplier || <span className="text-zinc-400">—</span>}
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-500">
                      {formatDate(item.updated_at)}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenHistory(item)}
                        className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
                      >
                        History
                      </button>
                      <button
                        onClick={() => {
                          setFormError(null);
                          setEditingIngredient(item);
                        }}
                        className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setFormError(null);
                          setDeletingIngredient(item);
                        }}
                        className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD MODAL --- */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-zinc-200">
            <h2 className="text-lg font-semibold text-zinc-900">Add Ingredient</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Create a new raw ingredient with its canonical base unit and cost.
            </p>

            {formError && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700">
                  Ingredient Name *
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Chicken"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700">
                  Base Unit *
                </label>
                <select
                  name="base_unit"
                  defaultValue="kg"
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-zinc-500"
                >
                  {supportedBaseUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Base units cannot be changed after creation.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700">
                  Current Price (₹) *
                </label>
                <input
                  name="current_price"
                  type="number"
                  step="0.0001"
                  min="0"
                  required
                  placeholder="e.g. 330"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700">
                  Supplier (Optional)
                </label>
                <input
                  name="supplier"
                  type="text"
                  placeholder="e.g. Local Poultry Farm"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-zinc-500"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
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
                  {isPending ? "Creating..." : "Save Ingredient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT MODAL --- */}
      {editingIngredient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-zinc-200">
            <h2 className="text-lg font-semibold text-zinc-900">Edit Ingredient</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Update name, supplier, or price. Price changes will be tracked in history.
            </p>

            {formError && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700">
                  Ingredient Name *
                </label>
                <input
                  name="name"
                  type="text"
                  defaultValue={editingIngredient.name}
                  required
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-zinc-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700">
                  Base Unit
                </label>
                <input
                  type="text"
                  disabled
                  value={editingIngredient.base_unit}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-500 cursor-not-allowed"
                />
                <p className="mt-1 text-[11px] font-medium text-amber-700">
                  Base unit cannot be changed after creation.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700">
                  Current Price (₹ / {editingIngredient.base_unit}) *
                </label>
                <input
                  name="current_price"
                  type="number"
                  step="0.0001"
                  min="0"
                  defaultValue={editingIngredient.current_price}
                  required
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-zinc-500"
                />
                <p className="mt-1 text-[11px] text-zinc-500">
                  Updating this price will atomically record a price history row.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700">
                  Supplier (Optional)
                </label>
                <input
                  name="supplier"
                  type="text"
                  defaultValue={editingIngredient.supplier ?? ""}
                  placeholder="e.g. Local Poultry Farm"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-zinc-500"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingIngredient(null)}
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
                  {isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- PRICE HISTORY MODAL --- */}
      {historyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-zinc-200 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-zinc-200 pb-3">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  Price History: {historyTarget.name}
                </h2>
                <p className="text-xs text-zinc-500">
                  Canonical base unit: {historyTarget.base_unit} • Current: {formatCurrency(historyTarget.current_price)}
                </p>
              </div>
              <button
                onClick={() => setHistoryTarget(null)}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 overflow-y-auto flex-1">
              {isLoadingHistory ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  Loading history...
                </div>
              ) : historyRecords.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  No historical price changes recorded. Current initial price: {formatCurrency(historyTarget.current_price)}.
                </div>
              ) : (
                <table className="min-w-full text-xs">
                  <thead className="border-b border-zinc-200 bg-zinc-50 font-medium text-zinc-600">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Date</th>
                      <th className="py-2.5 px-3 text-left">Change</th>
                      <th className="py-2.5 px-3 text-left">Unit</th>
                      <th className="py-2.5 px-3 text-left">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {historyRecords.map((rec) => (
                      <tr key={rec.id}>
                        <td className="py-2.5 px-3 text-zinc-500 whitespace-nowrap">
                          {formatDate(rec.changed_at)}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-zinc-900 whitespace-nowrap">
                          {rec.old_price != null ? formatCurrency(rec.old_price) : "—"} →{" "}
                          <span className="font-semibold text-zinc-900">
                            {rec.new_price != null ? formatCurrency(rec.new_price) : formatCurrency(rec.price)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-zinc-600">
                          {rec.unit || historyTarget.base_unit}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center rounded-sm bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 uppercase">
                            {rec.source}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-4 border-t border-zinc-200 pt-3 flex justify-end">
              <button
                onClick={() => setHistoryTarget(null)}
                className="rounded-lg border border-zinc-300 px-4 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRM MODAL --- */}
      {deletingIngredient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-zinc-200">
            <h2 className="text-lg font-semibold text-zinc-900">
              Delete Ingredient
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Are you sure you want to delete{" "}
              <strong className="text-zinc-900 font-semibold">
                {deletingIngredient.name}
              </strong>
              ? This action cannot be undone.
            </p>

            {formError && (
              <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                {formError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingIngredient(null)}
                disabled={isPending}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "Deleting..." : "Delete Ingredient"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
