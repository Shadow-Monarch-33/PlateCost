import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required Supabase environment variables.");
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function randomEmail(prefix) {
  return `test_${prefix}_${crypto.randomBytes(6).toString("hex")}@platecost-test.internal`;
}

function randomPassword() {
  return `P@ss_${crypto.randomBytes(16).toString("hex")}`;
}

async function run() {
  console.log("=== OCT 2: LIVE CROSS-TENANT INGREDIENT & RLS BEHAVIORAL VERIFICATION ===\n");

  const cleanupTasks = [];

  try {
    // 1. SETUP: Create User A & User B
    console.log("1. Creating temporary test users A and B...");
    const emailA = randomEmail("userA");
    const passwordA = randomPassword();
    const { data: userARes, error: userAErr } = await adminClient.auth.admin.createUser({
      email: emailA,
      password: passwordA,
      email_confirm: true,
    });
    if (userAErr) throw new Error(`Failed to create User A: ${userAErr.message}`);
    const userA = userARes.user;
    cleanupTasks.push(() => adminClient.auth.admin.deleteUser(userA.id));

    const emailB = randomEmail("userB");
    const passwordB = randomPassword();
    const { data: userBRes, error: userBErr } = await adminClient.auth.admin.createUser({
      email: emailB,
      password: passwordB,
      email_confirm: true,
    });
    if (userBErr) throw new Error(`Failed to create User B: ${userBErr.message}`);
    const userB = userBRes.user;
    cleanupTasks.push(() => adminClient.auth.admin.deleteUser(userB.id));

    console.log(`   User A created: ${userA.id} (${emailA})`);
    console.log(`   User B created: ${userB.id} (${emailB})`);

    // 2. SETUP: Create Business A & Business B
    console.log("\n2. Creating temporary businesses A and B...");
    const { data: bizA, error: bizAErr } = await adminClient
      .from("businesses")
      .insert({ name: "Business A Tenant Test", currency: "INR", owner_id: userA.id })
      .select("id, name")
      .single();
    if (bizAErr) throw new Error(`Failed to create Business A: ${bizAErr.message}`);
    cleanupTasks.push(() => adminClient.from("businesses").delete().eq("id", bizA.id));

    const { data: bizB, error: bizBErr } = await adminClient
      .from("businesses")
      .insert({ name: "Business B Tenant Test", currency: "INR", owner_id: userB.id })
      .select("id, name")
      .single();
    if (bizBErr) throw new Error(`Failed to create Business B: ${bizBErr.message}`);
    cleanupTasks.push(() => adminClient.from("businesses").delete().eq("id", bizB.id));

    // Assign memberships
    await adminClient.from("business_members").insert([
      { business_id: bizA.id, user_id: userA.id, role: "owner" },
      { business_id: bizB.id, user_id: userB.id, role: "owner" },
    ]);
    console.log(`   Business A: ${bizA.id} (Owner: User A)`);
    console.log(`   Business B: ${bizB.id} (Owner: User B)`);

    // 3. SETUP: Create Ingredient A in Business A and Ingredient B in Business B
    console.log("\n3. Creating initial test ingredients...");
    const { data: ingA, error: ingAErr } = await adminClient
      .from("ingredients")
      .insert({
        business_id: bizA.id,
        name: "Chicken A Tenant",
        base_unit: "kg",
        current_price: 330,
        supplier: "Poultry Farm A",
        currency: "INR",
      })
      .select()
      .single();
    if (ingAErr) throw new Error(`Failed to insert Ingredient A: ${ingAErr.message}`);
    cleanupTasks.push(() => adminClient.from("ingredients").delete().eq("id", ingA.id));

    const { data: ingB, error: ingBErr } = await adminClient
      .from("ingredients")
      .insert({
        business_id: bizB.id,
        name: "Rice B Tenant",
        base_unit: "kg",
        current_price: 55,
        supplier: "Rice Mill B",
        currency: "INR",
      })
      .select()
      .single();
    if (ingBErr) throw new Error(`Failed to insert Ingredient B: ${ingBErr.message}`);
    cleanupTasks.push(() => adminClient.from("ingredients").delete().eq("id", ingB.id));

    console.log(`   Ingredient A created: ${ingA.id} (${ingA.name}, ₹${ingA.current_price}) in Business A`);
    console.log(`   Ingredient B created: ${ingB.id} (${ingB.name}, ₹${ingB.current_price}) in Business B`);

    // 4. AUTHENTICATE User A and User B using standard anon client
    console.log("\n4. Authenticating User A and User B via standard anon client sessions...");
    const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { error: loginAErr } = await clientA.auth.signInWithPassword({
      email: emailA,
      password: passwordA,
    });
    if (loginAErr) throw new Error(`Failed to sign in User A: ${loginAErr.message}`);

    const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { error: loginBErr } = await clientB.auth.signInWithPassword({
      email: emailB,
      password: passwordB,
    });
    if (loginBErr) throw new Error(`Failed to sign in User B: ${loginBErr.message}`);

    console.log("   User A authenticated JWT successfully.");
    console.log("   User B authenticated JWT successfully.");

    // ==========================================
    // 5. CROSS-TENANT READ/WRITE ASSERTIONS
    // ==========================================
    console.log("\n5. Executing cross-tenant isolation checks...");

    // Test A1: User A reads Ingredient A (Same tenant)
    const { data: readA1, error: errA1 } = await clientA
      .from("ingredients")
      .select("*")
      .eq("id", ingA.id);
    if (errA1 || readA1.length !== 1) {
      throw new Error(`FAIL A1: User A should read Ingredient A. err=${errA1?.message}, len=${readA1?.length}`);
    }
    console.log("   ✓ PASS A1: User A can read Business A ingredient.");

    // Test A2: User A attempts to read Ingredient B (Cross tenant)
    const { data: readA2, error: errA2 } = await clientA
      .from("ingredients")
      .select("*")
      .eq("id", ingB.id);
    if (errA2 || readA2.length !== 0) {
      throw new Error(`FAIL A2: User A must NOT read Ingredient B. len=${readA2?.length}`);
    }
    console.log("   ✓ PASS A2: User A cannot read Business B ingredient (0 rows returned).");

    // Test A3: User A attempts to insert into Business B
    const { error: errA3 } = await clientA
      .from("ingredients")
      .insert({
        business_id: bizB.id,
        name: "Hacked Ingredient by A",
        base_unit: "kg",
        current_price: 999,
        currency: "INR",
      })
      .select();
    if (!errA3) {
      throw new Error("FAIL A3: User A insert into Business B should be rejected by RLS!");
    }
    console.log(`   ✓ PASS A3: User A cross-tenant insert into Business B rejected by RLS: "${errA3.message}".`);

    // Test A4: User A attempts to update Ingredient B
    const { data: updateA4 } = await clientA
      .from("ingredients")
      .update({ current_price: 999 })
      .eq("id", ingB.id)
      .select();
    if (updateA4 && updateA4.length > 0) {
      throw new Error("FAIL A4: User A should not update Ingredient B!");
    }
    // Verify DB state for Ingredient B remains unchanged
    const { data: verifyBAfterA4 } = await adminClient
      .from("ingredients")
      .select("current_price")
      .eq("id", ingB.id)
      .single();
    if (Number(verifyBAfterA4.current_price) !== 55) {
      throw new Error("FAIL A4: Ingredient B price was mutated by unauthorized user!");
    }
    console.log("   ✓ PASS A4: User A cross-tenant update on Ingredient B affected 0 rows; price intact at ₹55.");

    // Test A5: User A attempts to delete Ingredient B
    const { data: delA5 } = await clientA
      .from("ingredients")
      .delete()
      .eq("id", ingB.id)
      .select();
    if (delA5 && delA5.length > 0) {
      throw new Error("FAIL A5: User A should not delete Ingredient B!");
    }
    const { data: verifyBAfterA5 } = await adminClient
      .from("ingredients")
      .select("id")
      .eq("id", ingB.id)
      .single();
    if (!verifyBAfterA5) {
      throw new Error("FAIL A5: Ingredient B was deleted by unauthorized user!");
    }
    console.log("   ✓ PASS A5: User A cross-tenant delete on Ingredient B affected 0 rows; ingredient intact.");

    // Test B1: User B reads Ingredient B (Same tenant)
    const { data: readB1, error: errB1 } = await clientB
      .from("ingredients")
      .select("*")
      .eq("id", ingB.id);
    if (errB1 || readB1.length !== 1) {
      throw new Error(`FAIL B1: User B should read Ingredient B. len=${readB1?.length}`);
    }
    console.log("   ✓ PASS B1: User B can read Business B ingredient.");

    // Test B2: User B attempts to read Ingredient A (Cross tenant)
    const { data: readB2, error: errB2 } = await clientB
      .from("ingredients")
      .select("*")
      .eq("id", ingA.id);
    if (errB2 || readB2.length !== 0) {
      throw new Error(`FAIL B2: User B must NOT read Ingredient A. len=${readB2?.length}`);
    }
    console.log("   ✓ PASS B2: User B cannot read Business A ingredient (0 rows returned).");

    // Test B3: User B attempts to insert into Business A
    const { error: errB3 } = await clientB
      .from("ingredients")
      .insert({
        business_id: bizA.id,
        name: "Hacked Ingredient by B",
        base_unit: "kg",
        current_price: 999,
        currency: "INR",
      })
      .select();
    if (!errB3) {
      throw new Error("FAIL B3: User B insert into Business A should be rejected by RLS!");
    }
    console.log(`   ✓ PASS B3: User B cross-tenant insert into Business A rejected by RLS: "${errB3.message}".`);

    // Test B4: User B attempts to update Ingredient A
    const { data: updateB4 } = await clientB
      .from("ingredients")
      .update({ current_price: 999 })
      .eq("id", ingA.id)
      .select();
    if (updateB4 && updateB4.length > 0) {
      throw new Error("FAIL B4: User B should not update Ingredient A!");
    }
    const { data: verifyAAfterB4 } = await adminClient
      .from("ingredients")
      .select("current_price")
      .eq("id", ingA.id)
      .single();
    if (Number(verifyAAfterB4.current_price) !== 330) {
      throw new Error("FAIL B4: Ingredient A price was mutated by unauthorized user!");
    }
    console.log("   ✓ PASS B4: User B cross-tenant update on Ingredient A affected 0 rows; price intact at ₹330.");

    // Test B5: User B attempts to delete Ingredient A
    const { data: delB5 } = await clientB
      .from("ingredients")
      .delete()
      .eq("id", ingA.id)
      .select();
    if (delB5 && delB5.length > 0) {
      throw new Error("FAIL B5: User B should not delete Ingredient A!");
    }
    const { data: verifyAAfterB5 } = await adminClient
      .from("ingredients")
      .select("id")
      .eq("id", ingA.id)
      .single();
    if (!verifyAAfterB5) {
      throw new Error("FAIL B5: Ingredient A was deleted by unauthorized user!");
    }
    console.log("   ✓ PASS B5: User B cross-tenant delete on Ingredient A affected 0 rows; ingredient intact.");

    // ==========================================
    // 6. ATOMIC PRICE UPDATE RPC & PRICE HISTORY
    // ==========================================
    console.log("\n6. Testing atomic update_ingredient_price RPC & price history rules...");

    // Test RPC 1: User A updates Ingredient A price ₹330 -> ₹350
    const { error: rpcErrA1 } = await clientA.rpc("update_ingredient_price", {
      p_ingredient_id: ingA.id,
      p_new_price: 350,
      p_source: "manual",
    });
    if (rpcErrA1) throw new Error(`FAIL RPC1: update_ingredient_price failed: ${rpcErrA1.message}`);
    console.log("   ✓ PASS RPC1: User A updated Ingredient A price from ₹330 to ₹350 via RPC.");

    // Verify exactly 1 history row was created with old_price = 330, new_price = 350
    const { data: histA1, error: histErrA1 } = await clientA
      .from("ingredient_price_history")
      .select("*")
      .eq("ingredient_id", ingA.id);
    if (histErrA1) throw new Error(`FAIL Hist1: ${histErrA1.message}`);
    if (histA1.length !== 1) {
      throw new Error(`FAIL Hist1: Expected exactly 1 history record, got ${histA1.length}`);
    }
    const h1 = histA1[0];
    if (Number(h1.old_price) !== 330 || Number(h1.new_price) !== 350 || h1.source !== "manual") {
      throw new Error(`FAIL Hist1: History fields mismatch: old=${h1.old_price}, new=${h1.new_price}, source=${h1.source}`);
    }
    console.log(`   ✓ PASS Hist1: Exactly 1 price history row created (₹330 -> ₹350, unit=${h1.unit}, source=manual).`);

    // Test RPC 2: User A calls RPC with SAME price (₹350 -> ₹350)
    const { error: rpcErrA2 } = await clientA.rpc("update_ingredient_price", {
      p_ingredient_id: ingA.id,
      p_new_price: 350,
      p_source: "manual",
    });
    if (rpcErrA2) throw new Error(`FAIL RPC2: ${rpcErrA2.message}`);

    // Verify 0 additional history rows created (count remains 1)
    const { data: histA2 } = await clientA
      .from("ingredient_price_history")
      .select("*")
      .eq("ingredient_id", ingA.id);
    if (histA2.length !== 1) {
      throw new Error(`FAIL Hist2: Redundant price update created duplicate history record! count=${histA2.length}`);
    }
    console.log("   ✓ PASS Hist2: Identical price update created 0 redundant history rows (count remains 1).");

    // Test RPC 3: User A attempts RPC price update on Ingredient B (Cross tenant)
    const { error: rpcErrA3 } = await clientA.rpc("update_ingredient_price", {
      p_ingredient_id: ingB.id,
      p_new_price: 200,
      p_source: "manual",
    });
    if (!rpcErrA3) {
      throw new Error("FAIL RPC3: User A should NOT be able to run update_ingredient_price on Ingredient B!");
    }
    console.log(`   ✓ PASS RPC3: User A cross-tenant RPC rejected: "${rpcErrA3.message}".`);

    // Test RPC 4: User A attempts negative price update
    const { error: rpcErrA4 } = await clientA.rpc("update_ingredient_price", {
      p_ingredient_id: ingA.id,
      p_new_price: -50,
      p_source: "manual",
    });
    if (!rpcErrA4) {
      throw new Error("FAIL RPC4: Negative price must be rejected by RPC!");
    }
    console.log(`   ✓ PASS RPC4: Negative price rejected by RPC: "${rpcErrA4.message}".`);

    // ==========================================
    // 7. SAFE DELETION (RECIPE REFERENTIAL INTEGRITY)
    // ==========================================
    console.log("\n7. Testing safe deletion rules and foreign key restrictions...");

    // Create Recipe and RecipeIngredient referencing Ingredient A
    const { data: recipeA, error: recErr } = await adminClient
      .from("recipes")
      .insert({
        business_id: bizA.id,
        name: "Chicken Biryani Test",
        yield_quantity: 4,
        yield_unit: "piece",
      })
      .select()
      .single();
    if (recErr) throw new Error(`Failed to create test recipe: ${recErr.message}`);
    cleanupTasks.push(() => adminClient.from("recipes").delete().eq("id", recipeA.id));

    const { error: recIngErr } = await adminClient
      .from("recipe_ingredients")
      .insert({
        recipe_id: recipeA.id,
        ingredient_id: ingA.id,
        quantity: 1,
        unit: "kg",
      });
    if (recIngErr) throw new Error(`Failed to link recipe ingredient: ${recIngErr.message}`);

    console.log(`   Linked Ingredient A to Recipe "${recipeA.name}".`);

    // User A attempts to delete Ingredient A while referenced
    const { count: refCount } = await clientA
      .from("recipe_ingredients")
      .select("*", { count: "exact", head: true })
      .eq("ingredient_id", ingA.id);

    if (refCount !== 1) {
      throw new Error(`Expected recipe refCount to be 1, got ${refCount}`);
    }

    // Direct delete attempt should be restricted by database FK constraint
    const { error: blockedDelErr } = await clientA
      .from("ingredients")
      .delete()
      .eq("id", ingA.id);
    if (!blockedDelErr) {
      throw new Error("FAIL Delete: Foreign key restriction failed to block deletion!");
    }
    console.log(`   ✓ PASS SafeDelete: Deletion blocked while referenced in recipe ("${blockedDelErr.message}").`);

    // Now remove the recipe_ingredients reference
    await adminClient.from("recipe_ingredients").delete().eq("recipe_id", recipeA.id);
    console.log("   Removed recipe reference.");

    // Now User A deletes Ingredient A
    const { error: allowedDelErr } = await clientA
      .from("ingredients")
      .delete()
      .eq("id", ingA.id);
    if (allowedDelErr) {
      throw new Error(`FAIL Delete: Unreferenced ingredient deletion failed: ${allowedDelErr.message}`);
    }
    console.log("   ✓ PASS SafeDelete: Unreferenced ingredient successfully deleted.");

    // Verify price history was also cascaded/cleaned up for Ingredient A
    const { data: histPostDel } = await adminClient
      .from("ingredient_price_history")
      .select("id")
      .eq("ingredient_id", ingA.id);
    if (histPostDel.length !== 0) {
      throw new Error(`FAIL Delete: Expected 0 residual price history rows, found ${histPostDel.length}`);
    }
    console.log("   ✓ PASS SafeDelete: Residual price history cleanly cascaded.");

    console.log("\n=======================================================");
    console.log(">>> ALL CROSS-TENANT & BUSINESS RULE CHECKS PASSED! <<<");
    console.log("=======================================================\n");

  } finally {
    console.log("Cleaning up all temporary test fixtures...");
    for (const task of cleanupTasks.reverse()) {
      try {
        await task();
      } catch (err) {
        console.warn("Cleanup warning:", err.message);
      }
    }
    console.log("Cleanup complete. Database is clean.\n");
  }
}

run().catch((err) => {
  console.error("FATAL ERROR in cross-tenant verification:", err);
  process.exit(1);
});
