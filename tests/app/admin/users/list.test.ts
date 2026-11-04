import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { REQUIRED_PROFILE_FIELDS } from "@/lib/profile";
import { makeQuery } from "../../../helpers/query";

const mockFrom = vi.hoisted(() => vi.fn());
vi.mock("next/link", () => ({ default: ({ children }: any) => children }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));

const { default: Page } = await import("@/app/admin/users/page");

const FULL = Object.fromEntries(REQUIRED_PROFILE_FIELDS.map((f) => [f, "x"]));

const person = (n: string) => ({
  id: n,
  email: `${n}@x.com`,
  first_name: n,
  last_name: null,
  role: "student",
  team_id: null,
  teams: null,
});

function setup(details: unknown[], waivers: unknown[] = []) {
  const b = {
    profiles: makeQuery({ data: [person("a"), person("b"), person("c")] }),
    waivers: makeQuery({ data: waivers }),
    student_details: makeQuery({ data: details }),
  };
  mockFrom.mockImplementation((t: keyof typeof b) => b[t]);
  return b;
}

// Rows come back sorted by email: a, b, c. Column 5 is "Profile", 6 is "Waiver".
async function rows() {
  const html = renderToStaticMarkup((await Page()) as any);
  return html.split("<tr").slice(2).map((tr) => ({
    // Cells contain one icon each; green = done.
    profileDone: tr.split("<td")[5].includes("text-green-500"),
    waiverDone: tr.split("<td")[6].includes("text-green-500"),
  }));
}

beforeEach(() => vi.clearAllMocks());

describe("AdminUsersPage — profile completion indicator", () => {
  it("is done only for users with every field, including the avatar", async () => {
    setup([
      { user_id: "a", ...FULL },
      { user_id: "b", ...FULL, avatar_url: null },
      // c has no student_details row at all
    ]);
    expect((await rows()).map((r) => r.profileDone)).toEqual([true, false, false]);
  });

  it("is not done when any single field is blank", async () => {
    setup([
      { user_id: "a", ...FULL, parent_phone: "" },
      { user_id: "b", ...FULL, zip_code: null },
      { user_id: "c", ...FULL },
    ]);
    expect((await rows()).map((r) => r.profileDone)).toEqual([false, false, true]);
  });

  it("is not done for a row that only has a first_name (the old rule)", async () => {
    setup([{ user_id: "a", first_name: "Jane" }]);
    expect((await rows())[0].profileDone).toBe(false);
  });

  it("queries every column needed to evaluate completion", async () => {
    const b = setup([]);
    await Page();
    const [cols] = b.student_details.select.mock.calls[0];
    for (const f of REQUIRED_PROFILE_FIELDS) expect(cols).toContain(f);
    expect(cols).toContain("user_id");
  });

  it("does not affect the waiver indicator", async () => {
    setup([{ user_id: "a", ...FULL }], [{ user_id: "b" }]);
    const r = await rows();
    expect(r.map((x) => x.waiverDone)).toEqual([false, true, false]);
    expect(r.map((x) => x.profileDone)).toEqual([true, false, false]);
  });
});
