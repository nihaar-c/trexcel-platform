import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInWithPassword, signUp } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { signInWithPassword, signUp },
  })),
}));

const redirect = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ redirect }));

const { login, signup } = await import("@/app/login/actions");

function formData(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

beforeEach(() => {
  signInWithPassword.mockReset();
  signUp.mockReset();
  redirect.mockReset();
});

describe("login", () => {
  it("signs in with the submitted email and password", async () => {
    signInWithPassword.mockResolvedValue({ error: null });

    await login(formData({ email: "student@example.com", password: "hunter2" }));

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "student@example.com",
      password: "hunter2",
    });
  });

  it("redirects to /dashboard on success", async () => {
    signInWithPassword.mockResolvedValue({ error: null });

    await login(formData({ email: "student@example.com", password: "hunter2" }));

    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("returns an error object instead of redirecting on failure", async () => {
    signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });

    const result = await login(
      formData({ email: "student@example.com", password: "wrong" }),
    );

    expect(result).toEqual({ error: "Invalid login credentials" });
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("signup", () => {
  it("signs up with the submitted email and password", async () => {
    signUp.mockResolvedValue({ error: null });

    await signup(formData({ email: "new@example.com", password: "hunter2" }));

    expect(signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "hunter2",
    });
  });

  it("redirects to /dashboard on success", async () => {
    signUp.mockResolvedValue({ error: null });

    await signup(formData({ email: "new@example.com", password: "hunter2" }));

    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("returns an error object instead of redirecting on failure", async () => {
    signUp.mockResolvedValue({
      error: { message: "User already registered" },
    });

    const result = await signup(
      formData({ email: "new@example.com", password: "hunter2" }),
    );

    expect(result).toEqual({ error: "User already registered" });
    expect(redirect).not.toHaveBeenCalled();
  });
});
