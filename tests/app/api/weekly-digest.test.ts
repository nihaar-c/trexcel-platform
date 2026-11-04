import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRpc = vi.hoisted(() => vi.fn());
const mockNotify = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ rpc: mockRpc })),
}));
vi.mock("@/lib/notifications", async (orig) => ({
  ...(await orig<typeof import("@/lib/notifications")>()),
  notifyOrganizers: mockNotify,
}));

const { GET } = await import("@/app/api/cron/weekly-digest/route");

const req = (auth?: string) =>
  new Request("http://localhost/api/cron/weekly-digest", {
    headers: auth ? { authorization: auth } : {},
  });

beforeEach(() => {
  mockRpc.mockReset();
  mockNotify.mockReset();
  mockNotify.mockResolvedValue(true);
  process.env.CRON_SECRET = "s3cret";
});

describe("weekly digest cron", () => {
  it("rejects requests without the cron secret", async () => {
    expect((await GET(req())).status).toBe(401);
    expect((await GET(req("Bearer wrong"))).status).toBe(401);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("fails closed when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(req("Bearer undefined"))).status).toBe(401);
  });

  it("sends nothing when there are no new profiles", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    const res = await GET(req("Bearer s3cret"));
    expect(await res.json()).toEqual({ sent: false, count: 0 });
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("sends one email listing every new profile, escaped", async () => {
    mockRpc.mockResolvedValue({
      data: [
        { first_name: "Ada", last_name: "L", email: "a@x.com", school_name: "Hopper <High>", created_at: "2026-11-01" },
        { first_name: "Bo", last_name: "K", email: "b@x.com", school_name: "Turing", created_at: "2026-11-02" },
      ],
      error: null,
    });
    const res = await GET(req("Bearer s3cret"));
    expect(res.status).toBe(200);
    expect(mockNotify).toHaveBeenCalledTimes(1);
    const [subject, html] = mockNotify.mock.calls[0];
    expect(subject).toContain("2 new student profiles");
    expect(html).toContain("a@x.com");
    expect(html).toContain("Hopper &lt;High&gt;");
  });

  it("returns 500 when the query fails", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect((await GET(req("Bearer s3cret"))).status).toBe(500);
  });
});
