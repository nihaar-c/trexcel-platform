import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.hoisted(() => vi.fn());

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser },
  })),
}));

const { proxy } = await import("@/proxy");

beforeEach(() => {
  getUser.mockReset();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
});

function requestFor(pathname: string) {
  return new NextRequest(new URL(pathname, "https://trexcel.example.com"));
}

describe("proxy", () => {
  it("redirects unauthenticated requests to /dashboard toward /login", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const response = await proxy(requestFor("/dashboard"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://trexcel.example.com/login",
    );
  });

  it("redirects unauthenticated requests to nested /dashboard routes toward /login", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const response = await proxy(requestFor("/dashboard/settings"));

    expect(response.headers.get("location")).toBe(
      "https://trexcel.example.com/login",
    );
  });

  it("lets authenticated requests through to /dashboard", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "student@example.com" } },
    });

    const response = await proxy(requestFor("/dashboard"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("does not redirect unauthenticated requests to routes outside /dashboard", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const response = await proxy(requestFor("/login"));

    expect(response.headers.get("location")).toBeNull();
  });
});
