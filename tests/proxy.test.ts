import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const mockGetUser = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

const { proxy } = await import("@/proxy");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requestFor(pathname: string) {
  return new NextRequest(new URL(pathname, "https://trexcel.example.com"));
}

function authedUser(id = "user-1") {
  mockGetUser.mockResolvedValue({
    data: { user: { id, email: "user@example.com" } },
  });
}

/** Makes supabase.from("profiles").select().eq().single() return { role } */
function withRole(role: string | null) {
  const b = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: role ? { role } : null,
      error: null,
    }),
  };
  (["select", "eq"] as const).forEach((m) => b[m].mockReturnValue(b));
  mockFrom.mockReturnValue(b);
}

beforeEach(() => {
  mockGetUser.mockReset();
  mockFrom.mockReset();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
});

// ---------------------------------------------------------------------------
// Unauthenticated access
// ---------------------------------------------------------------------------

describe("proxy — unauthenticated", () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  it("redirects /dashboard to /login", async () => {
    const response = await proxy(requestFor("/dashboard"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://trexcel.example.com/login"
    );
  });

  it("redirects a nested /dashboard route to /login", async () => {
    const response = await proxy(requestFor("/dashboard/submissions"));
    expect(response.headers.get("location")).toBe(
      "https://trexcel.example.com/login"
    );
  });

  it("redirects /admin to /login", async () => {
    const response = await proxy(requestFor("/admin"));
    expect(response.headers.get("location")).toBe(
      "https://trexcel.example.com/login"
    );
  });

  it("redirects /judge to /login", async () => {
    const response = await proxy(requestFor("/judge"));
    expect(response.headers.get("location")).toBe(
      "https://trexcel.example.com/login"
    );
  });

  it("passes through public routes like /login", async () => {
    const response = await proxy(requestFor("/login"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("passes through the root path", async () => {
    const response = await proxy(requestFor("/"));
    expect(response.headers.get("location")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Authenticated — /dashboard
// ---------------------------------------------------------------------------

describe("proxy — authenticated /dashboard", () => {
  it("lets any authenticated user through to /dashboard", async () => {
    authedUser();
    const response = await proxy(requestFor("/dashboard"));
    expect(response.headers.get("location")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Authenticated — /admin role gate
// ---------------------------------------------------------------------------

describe("proxy — /admin role gate", () => {
  it("redirects a student away from /admin to /dashboard", async () => {
    authedUser();
    withRole("student");
    const response = await proxy(requestFor("/admin"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://trexcel.example.com/dashboard"
    );
  });

  it("redirects a judge away from /admin to /dashboard", async () => {
    authedUser();
    withRole("judge");
    const response = await proxy(requestFor("/admin"));
    expect(response.headers.get("location")).toBe(
      "https://trexcel.example.com/dashboard"
    );
  });

  it("lets an admin through to /admin", async () => {
    authedUser();
    withRole("admin");
    const response = await proxy(requestFor("/admin"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects a user with no profile row (null role) away from /admin", async () => {
    authedUser();
    withRole(null);
    const response = await proxy(requestFor("/admin"));
    expect(response.headers.get("location")).toBe(
      "https://trexcel.example.com/dashboard"
    );
  });
});

// ---------------------------------------------------------------------------
// Authenticated — /judge role gate
// ---------------------------------------------------------------------------

describe("proxy — /judge role gate", () => {
  it("redirects a student away from /judge to /dashboard", async () => {
    authedUser();
    withRole("student");
    const response = await proxy(requestFor("/judge"));
    expect(response.headers.get("location")).toBe(
      "https://trexcel.example.com/dashboard"
    );
  });

  it("lets a judge through to /judge", async () => {
    authedUser();
    withRole("judge");
    const response = await proxy(requestFor("/judge"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("lets an admin through to /judge (admin has judge access)", async () => {
    authedUser();
    withRole("admin");
    const response = await proxy(requestFor("/judge"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects a mentor away from /judge to /dashboard", async () => {
    authedUser();
    withRole("mentor");
    const response = await proxy(requestFor("/judge"));
    expect(response.headers.get("location")).toBe(
      "https://trexcel.example.com/dashboard"
    );
  });
});
