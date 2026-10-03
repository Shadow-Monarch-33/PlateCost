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
  return `test_recipe_${prefix}_${crypto.randomBytes(6).toString("hex")}@platecost-test.internal`;
}

function randomPassword() {
  return `P@ss_${crypto.randomBytes(16).toString("hex")}`;
}

async function run() {
  console.log("=== OCT 3: LIVE CROSS-TENANT RECIPES & RLS VERIFICATION ===\n");

  const cleanupTasks = [];

  try {
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

    console.log("   Created User A and User B.");

    console.log("\n2. Getting their isolated business tenants...");
    const { data: bizA } = await adminClient.from("business_members").select("business_id").eq("user_id", userA.id).single();
    const { data: bizB } = await adminClient.from("business_members").select("business_id").eq("user_id", userB.id).single();
    if (!bizA || !bizB) throw new Error("Trigger failed to create businesses.");
    console.log(`   User A Business: ${bizA.business_id}`);
    console.log(`   User B Business: ${bizB.business_id}`);

    const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    await clientA.auth.signInWithPassword({ email: emailA, password: passwordA });

    const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    await clientB.auth.signInWithPassword({ email: emailB, password: passwordB });

    console.log("\n3. Creating Ingredients for User A and User B...");
    const { data: ingA, error: errIngA } = await clientA.from("ingredients").insert({
      business_id: bizA.business_id,
      name: "Flour A",
      base_unit: "kg",
      current_price: 50,
    }).select().single();
    if (errIngA) throw new Error(`Failed ing A: ${errIngA.message}`);
    
    const { data: ingB, error: errIngB } = await clientB.from("ingredients").insert({
      business_id: bizB.business_id,
      name: "Sugar B",
      base_unit: "kg",
      current_price: 60,
    }).select().single();
    if (errIngB) throw new Error(`Failed ing B: ${errIngB.message}`);

    console.log("\n4. Creating a Recipe for User A...");
    // Use the RPC for creation
    const { error: rpcErrA } = await clientA.rpc("save_recipe", {
      p_business_id: bizA.business_id,
      p_recipe_id: null,
      p_name: "Cake A",
      p_servings: 10,
      p_ingredients: [
        { ingredient_id: ingA.id, quantity: 2, unit: "kg" }
      ]
    });
    if (rpcErrA) throw new Error(`Failed to create Recipe A: ${rpcErrA.message}`);
    
    // Fetch it
    const { data: recipeA } = await clientA.from("recipes").select("id").eq("business_id", bizA.business_id).single();
    console.log(`   Created Recipe A: ${recipeA.id}`);

    console.log("\n5. Verifying Cross-Tenant Isolation (RLS)...");
    
    // User B tries to read User A's recipe
    const { data: readB } = await clientB.from("recipes").select("*").eq("id", recipeA.id);
    if (readB.length > 0) throw new Error("FAIL: User B can read User A's recipe!");
    console.log("   ✓ PASS: User B cannot read User A's recipe.");

    // User B tries to delete User A's recipe
    const { error: delErr } = await clientB.from("recipes").delete().eq("id", recipeA.id);
    const { data: stillThere } = await adminClient.from("recipes").select("id").eq("id", recipeA.id).single();
    if (!stillThere) throw new Error("FAIL: User B deleted User A's recipe!");
    console.log("   ✓ PASS: User B cannot delete User A's recipe.");

    // User A tries to create a recipe using User B's ingredient
    const { error: rpcCrossErr } = await clientA.rpc("save_recipe", {
      p_business_id: bizA.business_id,
      p_recipe_id: null,
      p_name: "Malicious Cake",
      p_servings: 5,
      p_ingredients: [
        { ingredient_id: ingB.id, quantity: 1, unit: "kg" }
      ]
    });
    if (!rpcCrossErr) throw new Error("FAIL: User A successfully used User B's ingredient!");
    console.log(`   ✓ PASS: User A rejected when using User B's ingredient: "${rpcCrossErr.message}"`);

    // Verify deletion cascade
    console.log("\n6. Verifying Recipe Deletion cascades to recipe_ingredients...");
    await clientA.from("recipes").delete().eq("id", recipeA.id);
    const { data: refCount } = await adminClient.from("recipe_ingredients").select("id").eq("recipe_id", recipeA.id);
    if (refCount.length > 0) throw new Error("FAIL: recipe_ingredients did not cascade delete!");
    console.log("   ✓ PASS: Deletion cascaded to recipe_ingredients successfully.");

    console.log("\n=======================================================");
    console.log(">>> ALL RECIPE CROSS-TENANT CHECKS PASSED! <<<");
    console.log("=======================================================\n");

  } finally {
    console.log("Cleaning up test users...");
    for (const task of cleanupTasks.reverse()) {
      await task().catch(() => {});
    }
  }
}

run().catch(err => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
