import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveUserBusiness } from "../../../src/infrastructure/supabase/ingredients";
import type { SupabaseClient } from "@supabase/supabase-js";
import { UnauthorizedBusinessError } from "../../../src/application/ingredients/errors";

// Mock config module completely since we don't want env var dependencies in unit tests
vi.mock("../../../src/infrastructure/supabase/config", () => ({
  getPublicSupabaseEnvironment: () => ({ NEXT_PUBLIC_SUPABASE_URL: "http://localhost" }),
  getSupabaseServiceRoleKey: () => "fake-service-key"
}));

// Mock Supabase client creation
vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: vi.fn(() => ({
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "new-biz", name: "My Kitchen" }, error: null })
    }))
  };
});

describe("resolveUserBusiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUser = { id: "test-user-id" };

  it("throws UnauthorizedBusinessError if user is not authenticated", async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error("Auth failed") }),
      }
    } as unknown as SupabaseClient;

    await expect(resolveUserBusiness(supabase)).rejects.toThrow(UnauthorizedBusinessError);
  });

  it("returns existing business if user is a member", async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          business_id: "existing-biz-id",
          role: "owner",
          businesses: { name: "Test Business" }
        },
        error: null
      })
    } as unknown as SupabaseClient;

    const result = await resolveUserBusiness(supabase);
    expect(result).toEqual({
      userId: mockUser.id,
      businessId: "existing-biz-id",
      businessName: "Test Business",
      role: "owner"
    });
  });

  it("returns null if user has no business and autoProvision is false", async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    } as unknown as SupabaseClient;

    const result = await resolveUserBusiness(supabase, { autoProvision: false });
    expect(result).toBeNull();
  });
});
