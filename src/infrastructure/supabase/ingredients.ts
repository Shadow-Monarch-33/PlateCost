import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Ingredient,
  IngredientPriceHistory,
} from "../../domain/ingredients/types";
import {
  createIngredientSchema,
  updateIngredientSchema,
  type CreateIngredientInput,
  type UpdateIngredientInput,
} from "../../application/validation/ingredient";
import {
  IngredientNotFoundError,
  IngredientReferencedInRecipesError,
  UnauthorizedBusinessError,
  BaseUnitImmutableError,
} from "../../application/ingredients/errors";
import { getPublicSupabaseEnvironment, getSupabaseServiceRoleKey } from "./config";

export interface BusinessSession {
  userId: string;
  businessId: string;
  role: string;
}

/**
 * Resolves the authenticated user and their active business membership.
 * Never trusts client-supplied business IDs.
 */
export async function resolveUserBusiness(
  supabase: SupabaseClient,
): Promise<BusinessSession> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new UnauthorizedBusinessError("Authentication required.");
  }

  // Check existing membership
  const { data: member, error: memberError } = await supabase
    .from("business_members")
    .select("business_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (memberError) {
    throw new Error(`Failed to query business membership: ${memberError.message}`);
  }

  if (member) {
    return {
      userId: user.id,
      businessId: member.business_id,
      role: member.role,
    };
  }

  // If user has no business yet (fresh sign-up / dev environment),
  // auto-provision a default business via service-role admin client.
  let serviceRoleKey: string | null = null;
  try {
    serviceRoleKey = getSupabaseServiceRoleKey();
  } catch {
    serviceRoleKey = null;
  }

  if (serviceRoleKey) {
    const { NEXT_PUBLIC_SUPABASE_URL } = getPublicSupabaseEnvironment();
    const admin = createClient(NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: newBusiness, error: createBizError } = await admin
      .from("businesses")
      .insert({
        name: "My Kitchen",
        currency: "INR",
        owner_id: user.id,
      })
      .select("id")
      .single();

    if (!createBizError && newBusiness) {
      const { error: memberInsertError } = await admin
        .from("business_members")
        .insert({
          business_id: newBusiness.id,
          user_id: user.id,
          role: "owner",
        });

      if (!memberInsertError) {
        return {
          userId: user.id,
          businessId: newBusiness.id,
          role: "owner",
        };
      }
    }
  }

  throw new UnauthorizedBusinessError("No active business found for user.");
}

function mapIngredientRow(row: Record<string, unknown>): Ingredient {
  return {
    id: String(row.id),
    business_id: String(row.business_id),
    name: String(row.name),
    base_unit: row.base_unit as Ingredient["base_unit"],
    current_price: Number(row.current_price),
    currency: "INR",
    supplier: row.supplier ? String(row.supplier) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapPriceHistoryRow(row: Record<string, unknown>): IngredientPriceHistory {
  return {
    id: String(row.id),
    ingredient_id: String(row.ingredient_id),
    business_id: String(row.business_id),
    price: Number(row.price),
    old_price: row.old_price != null ? Number(row.old_price) : null,
    new_price: row.new_price != null ? Number(row.new_price) : null,
    unit: (row.unit as IngredientPriceHistory["unit"]) ?? null,
    currency: "INR",
    source: (row.source as IngredientPriceHistory["source"]) ?? "manual",
    invoice_id: row.invoice_id ? String(row.invoice_id) : null,
    observed_at: String(row.observed_at ?? row.changed_at ?? row.created_at),
    changed_at: String(row.changed_at ?? row.observed_at ?? row.created_at),
    created_at: String(row.created_at),
  };
}

export async function getIngredients(
  supabase: SupabaseClient,
  businessId: string,
): Promise<Ingredient[]> {
  const { data, error } = await supabase
    .from("ingredients")
    .select("id, business_id, name, base_unit, current_price, currency, supplier, created_at, updated_at")
    .eq("business_id", businessId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch ingredients: ${error.message}`);
  }

  return (data ?? []).map(mapIngredientRow);
}

export async function getIngredient(
  supabase: SupabaseClient,
  businessId: string,
  ingredientId: string,
): Promise<Ingredient | null> {
  const { data, error } = await supabase
    .from("ingredients")
    .select("id, business_id, name, base_unit, current_price, currency, supplier, created_at, updated_at")
    .eq("id", ingredientId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch ingredient: ${error.message}`);
  }

  if (!data) return null;
  return mapIngredientRow(data);
}

export async function createIngredient(
  supabase: SupabaseClient,
  businessId: string,
  input: CreateIngredientInput,
): Promise<Ingredient> {
  const validated = createIngredientSchema.parse(input);

  const { data, error } = await supabase
    .from("ingredients")
    .insert({
      business_id: businessId,
      name: validated.name,
      base_unit: validated.base_unit,
      current_price: validated.current_price,
      currency: "INR",
      supplier: validated.supplier ?? null,
    })
    .select("id, business_id, name, base_unit, current_price, currency, supplier, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(`An ingredient named "${validated.name}" already exists in this business.`);
    }
    throw new Error(`Failed to create ingredient: ${error.message}`);
  }

  return mapIngredientRow(data);
}

export async function updateIngredient(
  supabase: SupabaseClient,
  businessId: string,
  ingredientId: string,
  input: UpdateIngredientInput & { base_unit?: string },
): Promise<Ingredient> {
  // Enforce base_unit immutability
  const existing = await getIngredient(supabase, businessId, ingredientId);
  if (!existing) {
    throw new IngredientNotFoundError(ingredientId);
  }

  if (input.base_unit !== undefined && input.base_unit !== existing.base_unit) {
    throw new BaseUnitImmutableError();
  }

  const validated = updateIngredientSchema.parse(input);

  // If price is changing, use the atomic Postgres RPC
  if (
    validated.current_price !== undefined &&
    validated.current_price !== existing.current_price
  ) {
    const { error: rpcError } = await supabase.rpc("update_ingredient_price", {
      p_ingredient_id: ingredientId,
      p_new_price: validated.current_price,
      p_source: "manual",
    });

    if (rpcError) {
      throw new Error(`Failed to update ingredient price: ${rpcError.message}`);
    }
  }

  // If name or supplier changed, update those columns directly
  const updates: Record<string, unknown> = {};
  if (validated.name !== undefined && validated.name !== existing.name) {
    updates.name = validated.name;
  }
  if (validated.supplier !== undefined && validated.supplier !== existing.supplier) {
    updates.supplier = validated.supplier;
  }

  if (Object.keys(updates).length > 0) {
    updates.updated_at = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("ingredients")
      .update(updates)
      .eq("id", ingredientId)
      .eq("business_id", businessId);

    if (updateError) {
      if (updateError.code === "23505") {
        throw new Error(`An ingredient named "${validated.name}" already exists in this business.`);
      }
      throw new Error(`Failed to update ingredient details: ${updateError.message}`);
    }
  }

  // Fetch refreshed row
  const refreshed = await getIngredient(supabase, businessId, ingredientId);
  if (!refreshed) {
    throw new IngredientNotFoundError(ingredientId);
  }
  return refreshed;
}

export async function deleteIngredient(
  supabase: SupabaseClient,
  businessId: string,
  ingredientId: string,
): Promise<void> {
  // Safe delete check: verify whether this ingredient is referenced in recipes
  const { count, error: countError } = await supabase
    .from("recipe_ingredients")
    .select("*", { count: "exact", head: true })
    .eq("ingredient_id", ingredientId);

  if (countError) {
    throw new Error(`Failed to verify recipe references: ${countError.message}`);
  }

  if (count !== null && count > 0) {
    throw new IngredientReferencedInRecipesError(count);
  }

  const { error: deleteError } = await supabase
    .from("ingredients")
    .delete()
    .eq("id", ingredientId)
    .eq("business_id", businessId);

  if (deleteError) {
    if (deleteError.code === "23503") {
      throw new IngredientReferencedInRecipesError(1);
    }
    throw new Error(`Failed to delete ingredient: ${deleteError.message}`);
  }
}

export async function getIngredientPriceHistory(
  supabase: SupabaseClient,
  businessId: string,
  ingredientId: string,
): Promise<IngredientPriceHistory[]> {
  const { data, error } = await supabase
    .from("ingredient_price_history")
    .select("id, ingredient_id, business_id, price, old_price, new_price, unit, currency, source, invoice_id, observed_at, changed_at, created_at")
    .eq("ingredient_id", ingredientId)
    .eq("business_id", businessId)
    .order("changed_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch price history: ${error.message}`);
  }

  return (data ?? []).map(mapPriceHistoryRow);
}
