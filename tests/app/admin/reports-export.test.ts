import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeQuery } from "../../helpers/query";

const state = vi.hoisted(() => ({ user: { id: "u" } as unknown, role: "admin" as string | null, from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: state.from,
  })),
}));

const { GET } = await import("@/app/admin/reports/export/route");
const get = (qs: string) => GET(new Request(`http://x/admin/reports/export?${qs}`));

beforeEach(() => {
  state.user = { id: "u" };
  state.role = "admin";
  const t = {
    profiles: makeQuery({ data: [{ id: "1", email: "a@x.com", first_name: "Ann", last_name: "Lee", phone: "5", role: "student", teams: { team_name: "Rex", invite_code: "C" } }] }),
    student_details: makeQuery({ data: [{ user_id: "1", school_name: "Lincoln" }] }),
    waivers: makeQuery({ data: [] }),
  } as Record<string, any>;
  // The role lookup also hits profiles; .single() must return the role.
  t.profiles.single = vi.fn().mockImplementation(async () => ({ data: { role: state.role }, error: null }));
  state.from.mockImplementation((n: string) => t[n]);
});

describe("GET /admin/reports/export", () => {
  it("401 when signed out", async () => {
    state.user = null;
    expect((await get("preset=teams")).status).toBe(401);
  });
  it("403 for non-admins", async () => {
    state.role = "student";
    expect((await get("preset=teams")).status).toBe(403);
  });
  it("400 when no fields chosen", async () => {
    expect((await get("groupBy=school_name")).status).toBe(400);
  });
  it("returns the team report as CSV", async () => {
    const res = await get("preset=teams");
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(Array.from(new Uint8Array(await res.clone().arrayBuffer()).slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    expect(res.headers.get("content-disposition")).toContain("team-report-");
    expect(await res.text()).toBe(
      "Team Name,Student Name,Email,Phone Number,School Name\r\nRex,Ann Lee,a@x.com,5,Lincoln\r\n",
    );
  });
  it("custom report honours fields and groupBy", async () => {
    const res = await get("fields=email&fields=school_name&groupBy=school_name");
    expect(res.headers.get("content-disposition")).toContain("custom-report-");
    expect(await res.text()).toBe("School Name,Email,School Name\r\nLincoln,a@x.com,Lincoln\r\n");
  });
});
