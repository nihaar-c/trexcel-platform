import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { REQUIRED_PROFILE_FIELDS } from "@/lib/profile";
import { makeQuery } from "../../helpers/query";

const mockRedirect = vi.hoisted(() =>
  vi.fn((url: string) => { throw new Error(`NEXT_REDIRECT:${url}`); }),
);
const mockGetUser = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const client = vi.hoisted(() => ({ props: null as any }));

vi.mock("next/navigation", () => ({ redirect: mockRedirect }));
vi.mock("next/link", () => ({ default: ({ children }: any) => children }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));
vi.mock("@/app/dashboard/submissions/SubmissionsClient", () => ({
  default: (props: unknown) => {
    client.props = props;
    return null;
  },
}));

const { default: Page } = await import("@/app/dashboard/submissions/page");

const FULL = Object.fromEntries(REQUIRED_PROFILE_FIELDS.map((f) => [f, "x"]));

function setup({
  profile = { role: "student", team_id: "t-1" } as unknown,
  details = FULL as unknown,
  waiver = { completed_at: "2026-10-01T00:00:00Z" } as unknown,
} = {}) {
  const b = {
    profiles: makeQuery({ data: profile }),
    teams: makeQuery({ data: { team_name: "Team Alpha", theme: null, memo: null } }),
    submissions: makeQuery({ data: [] }),
    waivers: makeQuery({ data: waiver }),
    student_details: makeQuery({ data: details }),
  };
  mockFrom.mockImplementation((t: keyof typeof b) => b[t]);
  return b;
}

async function render() {
  renderToStaticMarkup((await Page()) as any);
}

beforeEach(() => {
  vi.clearAllMocks();
  client.props = null;
  mockGetUser.mockResolvedValue({ data: { user: { id: "u-1" } } });
});

describe("SubmissionsPage — profileComplete", () => {
  it("is true when every profile field and the avatar are set", async () => {
    setup();
    await render();
    expect(client.props.profileComplete).toBe(true);
  });

  it("is false when the profile picture is missing", async () => {
    setup({ details: { ...FULL, avatar_url: null } });
    await render();
    expect(client.props.profileComplete).toBe(false);
  });

  it("is false when another field is blank", async () => {
    setup({ details: { ...FULL, parent_email: "  " } });
    await render();
    expect(client.props.profileComplete).toBe(false);
  });

  it("is false when the student has no student_details row", async () => {
    setup({ details: null });
    await render();
    expect(client.props.profileComplete).toBe(false);
  });

  it("is independent of the waiver", async () => {
    setup({ waiver: null });
    await render();
    expect(client.props.profileComplete).toBe(true);
    expect(client.props.waiverComplete).toBe(false);
  });

  it("looks up the current user's student_details with every required column", async () => {
    const b = setup();
    await render();
    expect(b.student_details.eq).toHaveBeenCalledWith("user_id", "u-1");
    const [cols] = b.student_details.select.mock.calls[0];
    for (const f of REQUIRED_PROFILE_FIELDS) expect(cols).toContain(f);
  });
});

describe("SubmissionsPage — routing", () => {
  it("redirects unauthenticated users to /login", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    setup();
    await expect(render()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("redirects mentors to /dashboard", async () => {
    setup({ profile: { role: "mentor", team_id: "t-1" } });
    await expect(render()).rejects.toThrow("NEXT_REDIRECT:/dashboard");
  });

  it("marks the page read-only for a student with no team", async () => {
    setup({ profile: { role: "student", team_id: null } });
    await render();
    expect(client.props.readOnly).toBe(true);
  });
});
