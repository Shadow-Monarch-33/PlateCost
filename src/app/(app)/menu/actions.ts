"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { resolveUserBusiness } from "@/infrastructure/supabase/ingredients";
import {
  getMenuItemsWithEconomics,
  saveMenuItem,
  deleteMenuItem,
} from "@/infrastructure/supabase/menu";
import type { MenuItemInput } from "@/application/validation/menu";
import type { MenuItemWithEconomics } from "@/domain/menu/types";

export type MenuActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function toErrorResult(error: unknown, fallback: string): { success: false; error: string } {
  return {
    success: false,
    error: error instanceof Error ? error.message : fallback,
  };
}

async function getScopedClient() {
  const supabase = await createSupabaseServerClient();
  const session = await resolveUserBusiness(supabase);
  return { supabase, businessId: session.businessId };
}

export async function createMenuItemAction(
  input: MenuItemInput,
): Promise<MenuActionResult<MenuItemWithEconomics[]>> {
  try {
    const { supabase, businessId } = await getScopedClient();
    await saveMenuItem(supabase, businessId, null, input);
    const items = await getMenuItemsWithEconomics(supabase, businessId);
    revalidatePath("/menu");
    return { success: true, data: items };
  } catch (error) {
    return toErrorResult(error, "Failed to create menu item.");
  }
}

export async function updateMenuItemAction(
  menuItemId: string,
  input: MenuItemInput,
): Promise<MenuActionResult<MenuItemWithEconomics[]>> {
  try {
    const { supabase, businessId } = await getScopedClient();
    await saveMenuItem(supabase, businessId, menuItemId, input);
    const items = await getMenuItemsWithEconomics(supabase, businessId);
    revalidatePath("/menu");
    return { success: true, data: items };
  } catch (error) {
    return toErrorResult(error, "Failed to update menu item.");
  }
}

export async function deleteMenuItemAction(
  menuItemId: string,
): Promise<MenuActionResult<MenuItemWithEconomics[]>> {
  try {
    const { supabase, businessId } = await getScopedClient();
    await deleteMenuItem(supabase, businessId, menuItemId);
    const items = await getMenuItemsWithEconomics(supabase, businessId);
    revalidatePath("/menu");
    return { success: true, data: items };
  } catch (error) {
    return toErrorResult(error, "Failed to delete menu item.");
  }
}
