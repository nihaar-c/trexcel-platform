import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const mockNotFound = vi.hoisted(() =>
  vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
);
const mockFrom = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ notFound: mockNotFound }));
// Strip Link down to its children so renderToStaticMarkup stays simple.
vi.mock("next/link", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ children }: any) => children,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));

const { default: Page } = await import("@/app/admin/users/[id]/page");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBuilder(result: { data: unknown; error: null }) {
  const b: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  b.select.mockReturnValue(b);
  b.eq.mockReturnValue(b);
  return b;
}

const BASE_PROFILE = {
  id: "user-1",
  email: "jane@example.com",
  first_name: "Jane" as string | null,
  last_name: "Doe" as string | null,
  role: "student",
  team_id: "team-1",
  teams: { team_name: "Team Alpha" },
};

const BASE_DETAILS = {
  user_id: "user-1",
  first_name: "Jane",
  last_name: "Doe",
  phone: "555-1234",
  school_name: "Lincoln High",
  student_id: "SID-001",
  gender: "Female",
  race: "Asian",
  parent_first_name: "Mary",
  parent_last_name: "Doe",
  parent_email: "mary@example.com",
  parent_phone: "555-5678",
  address: "123 Main St",
  city: "San Jose",
  state: "CA",
  zip_code: "95101",
  avatar_url: null,
};

const BASE_WAIVER = {
  user_id: "user-1",
  completed_at: "2026-10-15T00:00:00Z",
  agreed: true,
  media_consent: true,
  student_full_name: "Jane Doe",
  student_signature: "Jane Doe",
  parent_name: "Mary Doe",
  parent_signature: "Mary Doe",
  parent_email: "mary@example.com",
  parent_phone: "555-5678",
  signed_date: "2026-10-15",
  file_url: null as string | null,
  updated_at: "2026-10-15T00:00:00Z",
};

function setup({
  profile = BASE_PROFILE as typeof BASE_PROFILE | null,
  details = null as typeof BASE_DETAILS | null,
  waiver = null as typeof BASE_WAIVER | null,
} = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "profiles")
      return makeBuilder({ data: profile, error: null });
    if (table === "student_details")
      return makeBuilder({ data: details, error: null });
    if (table === "waivers")
      return makeBuilder({ data: waiver, error: null });
    return makeBuilder({ data: null, error: null });
  });
}

async function render(id = "user-1"): Promise<string> {
  // Await the async server component to get synchronous JSX, then stringify.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsx = await Page({ params: Promise.resolve({ id }) });
  return renderToStaticMarkup(jsx as any);
}

beforeEach(() => vi.clearAllMocks());

// ---------------------------------------------------------------------------
// not found
// ---------------------------------------------------------------------------

describe("AdminUserDetailPage — not found", () => {
  it("calls notFound() when the profile row is missing", async () => {
    setup({ profile: null });
    await expect(render("missing")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// name display
// ---------------------------------------------------------------------------

describe("AdminUserDetailPage — name display", () => {
  it("renders first + last name when both are present", async () => {
    setup();
    expect(await render()).toContain("Jane Doe");
  });

  it("falls back to email when profile has no name", async () => {
    setup({ profile: { ...BASE_PROFILE, first_name: null, last_name: null } });
    const html = await render();
    expect(html).toContain("jane@example.com");
  });

  it("shows the team name", async () => {
    setup();
    expect(await render()).toContain("Team Alpha");
  });

  it("shows the role badge", async () => {
    setup({ profile: { ...BASE_PROFILE, role: "judge" } });
    expect(await render()).toContain("judge");
  });
});

// ---------------------------------------------------------------------------
// profile completion badge
// ---------------------------------------------------------------------------

describe("AdminUserDetailPage — profile completion badge", () => {
  it("shows 'Profile complete' when student_details has a first_name", async () => {
    setup({ details: BASE_DETAILS });
    expect(await render()).toContain("Profile complete");
  });

  it("shows 'Profile incomplete' when student_details is absent", async () => {
    setup({ details: null });
    expect(await render()).toContain("Profile incomplete");
  });
});

// ---------------------------------------------------------------------------
// waiver completion badge
// ---------------------------------------------------------------------------

describe("AdminUserDetailPage — waiver completion badge", () => {
  it("shows 'Waiver complete' when waiver has a completed_at timestamp", async () => {
    setup({ waiver: BASE_WAIVER });
    expect(await render()).toContain("Waiver complete");
  });

  it("shows 'Waiver incomplete' when no waiver row exists", async () => {
    setup({ waiver: null });
    expect(await render()).toContain("Waiver incomplete");
  });
});

// ---------------------------------------------------------------------------
// student details fields
// ---------------------------------------------------------------------------

describe("AdminUserDetailPage — student details fields", () => {
  it("renders school name", async () => {
    setup({ details: BASE_DETAILS });
    expect(await render()).toContain("Lincoln High");
  });

  it("renders student phone number", async () => {
    setup({ details: BASE_DETAILS });
    expect(await render()).toContain("555-1234");
  });

  it("renders parent email", async () => {
    setup({ details: BASE_DETAILS });
    expect(await render()).toContain("mary@example.com");
  });

  it("renders city and state", async () => {
    setup({ details: BASE_DETAILS });
    const html = await render();
    expect(html).toContain("San Jose");
    expect(html).toContain("CA");
  });
});

// ---------------------------------------------------------------------------
// waiver details
// ---------------------------------------------------------------------------

describe("AdminUserDetailPage — waiver details", () => {
  it("shows 'Not completed' status when waiver is absent", async () => {
    setup();
    expect(await render()).toContain("Not completed");
  });

  it("shows student and parent signatures", async () => {
    setup({ waiver: BASE_WAIVER });
    const html = await render();
    expect(html).toContain("Jane Doe");   // student_signature
    expect(html).toContain("Mary Doe");   // parent_signature
  });

  it("renders the waiver file link when file_url is set", async () => {
    setup({ waiver: { ...BASE_WAIVER, file_url: "https://example.com/waiver.pdf" } });
    const html = await render();
    expect(html).toContain("https://example.com/waiver.pdf");
    expect(html).toContain("View file");
  });

  it("does not render a file link when file_url is null", async () => {
    setup({ waiver: BASE_WAIVER }); // file_url is null
    expect(await render()).not.toContain("View file");
  });

  it("shows media consent as Yes when true", async () => {
    setup({ waiver: { ...BASE_WAIVER, media_consent: true } });
    expect(await render()).toContain("Yes");
  });

  it("shows media consent as No when false", async () => {
    setup({ waiver: { ...BASE_WAIVER, media_consent: false } });
    expect(await render()).toContain("No");
  });
});
