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
  it("inserts a student profile row with the correct payload", async () => {
    insert.mockResolvedValue({ error: null });

    await insertProfile("user-123", "student@example.com");

    expect(insert).toHaveBeenCalledWith({
      id: "user-123",
      email: "student@example.com",
      role: "student",
    });
  });

  it("returns { error: null } on success", async () => {
    insert.mockResolvedValue({ error: null });

    const result = await insertProfile("user-123", "student@example.com");

    expect(result).toEqual({ error: null });
  });

  it("returns { error: <message> } when the database insert fails", async () => {
    insert.mockResolvedValue({ error: { message: "RLS policy violation" } });

    const result = await insertProfile("user-456", "other@example.com");

    expect(result).toEqual({ error: "RLS policy violation" });
  });

  it("returns { error: null } when the database error field is undefined", async () => {
    insert.mockResolvedValue({ error: undefined });

    const result = await insertProfile("user-789", "third@example.com");

    expect(result).toEqual({ error: null });
  });
});
