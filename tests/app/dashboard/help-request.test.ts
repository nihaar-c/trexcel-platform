import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mock primitives
// ---------------------------------------------------------------------------
const mockGetUser = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockResendSend = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

vi.mock("resend", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Resend: vi.fn().mockImplementation(function (this: any) {
    this.emails = { send: mockResendSend };
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

const { submitHelpRequest } = await import("@/app/dashboard/actions");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBuilder(result: { data: unknown; error: unknown }) {
  const b = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    upsert: vi.fn().mockResolvedValue(result),
    then: (res: (v: unknown) => void, rej?: (e: unknown) => void) =>
      Promise.resolve(result).then(res, rej),
  };
  (["select", "eq"] as const).forEach((m) => b[m].mockReturnValue(b));
  return b;
}

function withDetails(firstName: string | null, lastName: string | null) {
  return makeBuilder({ data: { first_name: firstName, last_name: lastName }, error: null });
}

// ---------------------------------------------------------------------------
// submitHelpRequest
// ---------------------------------------------------------------------------

describe("submitHelpRequest", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockFrom.mockReset();
    mockResendSend.mockReset();

    process.env.RESEND_API_KEY = "re_test_key";
    process.env.HELP_EMAIL = "admin@example.com";
  });

  it("returns an error when the user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await submitHelpRequest("Help!", null, null);

    expect(result).toEqual({ error: "Not authenticated." });
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it("returns an error when the message is empty", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1", email: "s@test.com" } } });
    mockFrom.mockImplementation(() => withDetails("Jane", "Doe"));

    const result = await submitHelpRequest("   ", null, null);

    expect(result?.error).toBeTruthy();
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it("sends an email and returns success when no attachment is provided", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1", email: "student@test.com" } } });
    mockFrom.mockImplementation(() => withDetails("Jane", "Doe"));
    mockResendSend.mockResolvedValue({ data: {}, error: null });

    const result = await submitHelpRequest("I need help logging in.", null, null);

    expect(result).toEqual({ success: true });
    expect(mockResendSend).toHaveBeenCalledOnce();
    const call = mockResendSend.mock.calls[0][0];
    expect(call.to).toContain("admin@example.com");
    expect(call.html).toContain("Jane Doe");
    expect(call.html).toContain("I need help logging in.");
    expect(call.html).not.toContain("Attachment");
  });

  it("includes the attachment section with URL and name when both are provided", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1", email: "student@test.com" } } });
    mockFrom.mockImplementation(() => withDetails("Jane", "Doe"));
    mockResendSend.mockResolvedValue({ data: {}, error: null });

    const result = await submitHelpRequest(
      "See attached screenshot.",
      "https://storage.example.com/help-attachments/screenshot.png",
      "screenshot.png",
    );

    expect(result).toEqual({ success: true });
    const call = mockResendSend.mock.calls[0][0];
    expect(call.html).toContain("Attachment");
    expect(call.html).toContain("https://storage.example.com/help-attachments/screenshot.png");
    expect(call.html).toContain("screenshot.png");
  });

  it("omits the attachment section when fileUrl is null (no file selected)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1", email: "student@test.com" } } });
    mockFrom.mockImplementation(() => withDetails("Jane", "Doe"));
    mockResendSend.mockResolvedValue({ data: {}, error: null });

    await submitHelpRequest("Just a text message.", null, null);

    const call = mockResendSend.mock.calls[0][0];
    expect(call.html).not.toContain("Attachment");
    expect(call.html).not.toContain("href");
  });

  it("escapes HTML in the file name to prevent injection", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1", email: "student@test.com" } } });
    mockFrom.mockImplementation(() => withDetails("Jane", "Doe"));
    mockResendSend.mockResolvedValue({ data: {}, error: null });

    await submitHelpRequest(
      "Here is the file.",
      "https://storage.example.com/x.png",
      '<img src=x onerror=alert(1)>.png',
    );

    const call = mockResendSend.mock.calls[0][0];
    expect(call.html).not.toContain("<img");
    expect(call.html).toContain("&lt;img");
  });

  it("returns an error when Resend fails to send", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1", email: "student@test.com" } } });
    mockFrom.mockImplementation(() => withDetails("Jane", "Doe"));
    mockResendSend.mockResolvedValue({ data: null, error: { message: "rate limit" } });

    const result = await submitHelpRequest("Please help me!", null, null);

    expect(result?.error).toBeTruthy();
    expect(result?.error).not.toContain("rate limit");
  });

  it("returns an error when Resend throws unexpectedly", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1", email: "student@test.com" } } });
    mockFrom.mockImplementation(() => withDetails("Jane", "Doe"));
    mockResendSend.mockRejectedValue(new Error("network timeout"));

    const result = await submitHelpRequest("Help!", null, null);

    expect(result?.error).toBeTruthy();
  });

  it("falls back to user email in the subject when student_details has no name", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1", email: "anon@test.com" } } });
    mockFrom.mockImplementation(() => withDetails(null, null));
    mockResendSend.mockResolvedValue({ data: {}, error: null });

    await submitHelpRequest("Who am I?", null, null);

    const call = mockResendSend.mock.calls[0][0];
    expect(call.subject).toContain("anon@test.com");
  });
});
