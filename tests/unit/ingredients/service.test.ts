import { describe, it, expect, vi } from "vitest";
import {
  updateIngredient,
  deleteIngredient,
} from "../../../src/infrastructure/supabase/ingredients";
import {
  BaseUnitImmutableError,
  IngredientReferencedInRecipesError,
  IngredientNotFoundError,
} from "../../../src/application/ingredients/errors";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Ingredient Service Business Rules", () => {
  const businessId = "b1111111-1111-1111-1111-111111111111";
  const ingredientId = "i1111111-1111-1111-1111-111111111111";

  const existingIngredient = {
    id: ingredientId,
    business_id: businessId,
    name: "Chicken",
    base_unit: "kg",
    current_price: 330,
    currency: "INR",
    supplier: "Vendor A",
    created_at: "2026-10-02T10:00:00Z",
    updated_at: "2026-10-02T10:00:00Z",
  };

  it("strictly enforces base_unit immutability on update", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: existingIngredient,
                error: null,
              }),
            }),
          }),
        }),
      }),
      rpc: vi.fn(),
    } as unknown as SupabaseClient;

    await expect(
      updateIngredient(mockSupabase, businessId, ingredientId, {
        base_unit: "g", // attempt to modify base unit
        current_price: 350,
      }),
    ).rejects.toThrow(BaseUnitImmutableError);

    // RPC should not have been called
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  it("blocks deletion and throws IngredientReferencedInRecipesError when referenced by recipes", async () => {
    const deleteSpy = vi.fn();
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "recipe_ingredients") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                count: 3, // referenced in 3 recipes
                error: null,
              }),
            }),
          };
        }
        if (table === "ingredients") {
          return {
            delete: deleteSpy,
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    await expect(
      deleteIngredient(mockSupabase, businessId, ingredientId),
    ).rejects.toThrow(IngredientReferencedInRecipesError);

    try {
      await deleteIngredient(mockSupabase, businessId, ingredientId);
    } catch (err) {
      expect(err).toBeInstanceOf(IngredientReferencedInRecipesError);
      expect((err as IngredientReferencedInRecipesError).recipeCount).toBe(3);
      expect((err as Error).message).toContain("used in 3 recipes.");
    }

    // Must never attempt delete on ingredients table
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it("allows deletion when recipe reference count is 0", async () => {
    const eqSpy2 = vi.fn().mockResolvedValue({ error: null });
    const eqSpy1 = vi.fn().mockReturnValue({ eq: eqSpy2 });
    const deleteSpy = vi.fn().mockReturnValue({ eq: eqSpy1 });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "recipe_ingredients") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                count: 0, // unreferenced
                error: null,
              }),
            }),
          };
        }
        if (table === "ingredients") {
          return {
            delete: deleteSpy,
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    await expect(
      deleteIngredient(mockSupabase, businessId, ingredientId),
    ).resolves.toBeUndefined();

    expect(deleteSpy).toHaveBeenCalled();
  });

  it("invokes update_ingredient_price RPC when price changes", async () => {
    const rpcSpy = vi.fn().mockResolvedValue({ error: null });
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const refreshedIngredient = {
      ...existingIngredient,
      current_price: 350,
      updated_at: "2026-10-02T12:00:00Z",
    };

    let callCount = 0;
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "ingredients") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockImplementation(() => {
                    callCount++;
                    return Promise.resolve({
                      data: callCount === 1 ? existingIngredient : refreshedIngredient,
                      error: null,
                    });
                  }),
                }),
              }),
            }),
            update: updateSpy,
          };
        }
        return {};
      }),
      rpc: rpcSpy,
    } as unknown as SupabaseClient;

    const result = await updateIngredient(mockSupabase, businessId, ingredientId, {
      current_price: 350,
    });

    expect(rpcSpy).toHaveBeenCalledWith("update_ingredient_price", {
      p_ingredient_id: ingredientId,
      p_new_price: 350,
      p_source: "manual",
    });
    expect(result.current_price).toBe(350);
  });

  it("does NOT invoke update_ingredient_price RPC when price is unchanged", async () => {
    const rpcSpy = vi.fn();
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const updatedIngredient = {
      ...existingIngredient,
      supplier: "New Supplier Corp",
    };

    let callCount = 0;
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "ingredients") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockImplementation(() => {
                    callCount++;
                    return Promise.resolve({
                      data: callCount === 1 ? existingIngredient : updatedIngredient,
                      error: null,
                    });
                  }),
                }),
              }),
            }),
            update: updateSpy,
          };
        }
        return {};
      }),
      rpc: rpcSpy,
    } as unknown as SupabaseClient;

    const result = await updateIngredient(mockSupabase, businessId, ingredientId, {
      supplier: "New Supplier Corp",
    });

    // RPC should NOT be invoked
    expect(rpcSpy).not.toHaveBeenCalled();
    // Normal table update should be invoked for supplier
    expect(updateSpy).toHaveBeenCalled();
    expect(result.supplier).toBe("New Supplier Corp");
  });

  it("throws IngredientNotFoundError when target ingredient does not exist", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    await expect(
      updateIngredient(mockSupabase, businessId, "non-existent-id", {
        name: "Test",
      }),
    ).rejects.toThrow(IngredientNotFoundError);
  });
});
