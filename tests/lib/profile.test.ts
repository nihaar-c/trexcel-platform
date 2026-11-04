import { describe, expect, it } from "vitest";
import { isProfileComplete, PROFILE_SELECT, REQUIRED_PROFILE_FIELDS } from "@/lib/profile";

const FULL = Object.fromEntries(
  REQUIRED_PROFILE_FIELDS.map((f) => [f, "x"]),
) as Record<(typeof REQUIRED_PROFILE_FIELDS)[number], string | null>;

describe("isProfileComplete", () => {
  it("is false with no details", () => {
    expect(isProfileComplete(null)).toBe(false);
    expect(isProfileComplete(undefined)).toBe(false);
  });

  it("is true when every field is filled", () => {
    expect(isProfileComplete(FULL)).toBe(true);
  });

  it.each(REQUIRED_PROFILE_FIELDS)("is false when %s is null", (f) => {
    expect(isProfileComplete({ ...FULL, [f]: null })).toBe(false);
  });

  it("treats whitespace-only values as blank", () => {
    expect(isProfileComplete({ ...FULL, city: "   " })).toBe(false);
  });

  it("PROFILE_SELECT lists exactly the required fields", () => {
    expect(PROFILE_SELECT.split(", ").sort()).toEqual(
      [...REQUIRED_PROFILE_FIELDS].sort(),
    );
  });
});
