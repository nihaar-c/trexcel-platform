import { beforeEach, describe, expect, it, vi } from "vitest";

const { insert } = vi.hoisted(() => ({
  insert: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn(() => ({ insert })),
  })),
}));

const { insertProfile } = await import("@/app/login/actions");

beforeEach(() => {
  insert.mockReset();
});

describe("insertProfile", () => {
  it("inserts a student profile row for the given user", async () => {
    insert.mockResolvedValue({ error: null });

    await insertProfile("user-123", "student@example.com");

    expect(insert).toHaveBeenCalledWith({
      id: "user-123",
      email: "student@example.com",
      role: "student",
    });
  });
});
