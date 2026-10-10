import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mock primitives
// ---------------------------------------------------------------------------
const mockGetUser = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockUpload = vi.hoisted(() => vi.fn());
const mockGetPublicUrl = vi.hoisted(() => vi.fn());
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
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      })),
    },
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

function fd(fields: Record<string, string | File>): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return form;
}

function fakeFile(name: string, sizeBytes: number, type = "image/png"): File {
  const file = new File([new Uint8Array(Math.min(sizeBytes, 10))], name, { type });
  Object.defineProperty(file, "size", { value: sizeBytes });
  return file;
}

// ---------------------------------------------------------------------------
// submitHelpRequest
// ---------------------------------------------------------------------------

describe("submitHelpRequest", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockFrom.mockReset();
    mockUpload.mockReset();
    mockGetPublicUrl.mockReset();
    mockResendSend.mockReset();

    process.env.RESEND_API_KEY = "re_test_key";
    process.env.HELP_EMAIL = "admin@example.com";
  });

  it("returns an error when the user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await submitHelpRequest(null, fd({ message: "Help!" }));

    expect(result).toEqual({ error: "Not authenticated." });
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it("returns an error when the message is empty", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1", email: "s@test.com" } } });
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: { first_name: "Jane", last_name: "Doe" }, error: null })
    );

    const result = await submitHelpRequest(null, fd({ message: "   " }));

    expect(result?.error).toBeTruthy();
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it("returns an error when the attachment exceeds 10 MB", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1", email: "s@test.com" } } });
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: { first_name: "Jane", last_name: "Doe" }, error: null })
    );

    const bigFile = fakeFile("big.pdf", 11 * 1024 * 1024);
    const result = await submitHelpRequest(
      null,
      fd({ message: "Please help", attachment: bigFile })
    );

    expect(result).toEqual({ error: "Attachment must be under 10 MB." });
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("sends an email and returns success when no attachment is provided", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1", email: "student@test.com" } } });
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: { first_name: "Jane", last_name: "Doe" }, error: null })
    );
    mockResendSend.mockResolvedValue({ data: {}, error: null });

    const result = await submitHelpRequest(null, fd({ message: "I need help logging in." }));

    expect(result).toEqual({ success: true });
    expect(mockResendSend).toHaveBeenCalledOnce();
    const call = mockResendSend.mock.calls[0][0];
    expect(call.to).toContain("admin@example.com");
    expect(call.html).toContain("Jane Doe");
    expect(call.html).toContain("I need help logging in.");
    expect(call.html).not.toContain("Attachment");
  });

  it("uploads the file and includes its URL in the email", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1", email: "student@test.com" } } });
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: { first_name: "Jane", last_name: "Doe" }, error: null })
    );
    mockUpload.mockResolvedValue({ data: {}, error: null });
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: "https://storage.example.com/help-attachments/u-1/screenshot.png" },
    });
    mockResendSend.mockResolvedValue({ data: {}, error: null });

    const file = fakeFile("screenshot.png", 500);
    const result = await submitHelpRequest(
      null,
      fd({ message: "See attached screenshot.", attachment: file })
    );

    expect(result).toEqual({ success: true });
    expect(mockUpload).toHaveBeenCalledOnce();
    const emailCall = mockResendSend.mock.calls[0][0];
    expect(emailCall.html).toContain("https://storage.example.com/help-attachments/u-1/screenshot.png");
  });

  it("returns an error when the storage upload fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1", email: "student@test.com" } } });
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: { first_name: "Jane", last_name: "Doe" }, error: null })
    );
    mockUpload.mockResolvedValue({ data: null, error: { message: "bucket not found" } });

    const file = fakeFile("doc.pdf", 500, "application/pdf");
    const result = await submitHelpRequest(
      null,
      fd({ message: "Here is my file.", attachment: file })
    );

    expect(result?.error).toMatch(/upload failed/i);
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it("returns an error when Resend fails to send", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1", email: "student@test.com" } } });
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: { first_name: "Jane", last_name: "Doe" }, error: null })
    );
    mockResendSend.mockResolvedValue({ data: null, error: { message: "rate limit" } });

    const result = await submitHelpRequest(null, fd({ message: "Please help me!" }));

    expect(result?.error).toBeTruthy();
    expect(result?.error).not.toContain("rate limit"); // don't leak internal details
  });

  it("falls back to the user email as the sender name when student_details has no name", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u-1", email: "anon@test.com" } } });
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: { first_name: null, last_name: null }, error: null })
    );
    mockResendSend.mockResolvedValue({ data: {}, error: null });

    await submitHelpRequest(null, fd({ message: "Who am I?" }));

    const emailCall = mockResendSend.mock.calls[0][0];
    expect(emailCall.subject).toContain("anon@test.com");
  });
});
