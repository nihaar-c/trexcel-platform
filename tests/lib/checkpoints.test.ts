import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ADMIN_CHECKPOINTS, CHECKPOINT_FORMS } from "@/lib/checkpoints";
import { SUBMISSIONS_ENABLED } from "@/lib/features";

const ROOT = new URL("../..", import.meta.url).pathname;

describe("checkpoint config", () => {
  it("has a Google Forms viewform URL for checkpoints 1 and 2 only", () => {
    expect(Object.keys(CHECKPOINT_FORMS).sort()).toEqual(["1", "2"]);
    for (const url of Object.values(CHECKPOINT_FORMS)) {
      expect(url).toMatch(/^https:\/\/docs\.google\.com\/forms\/d\/e\/[\w-]+\/viewform$/);
    }
    expect(CHECKPOINT_FORMS[1]).not.toBe(CHECKPOINT_FORMS[2]);
  });

  it("lets admins check off checkpoints 1-4", () => {
    expect([...ADMIN_CHECKPOINTS]).toEqual([1, 2, 3, 4]);
  });

  it("keeps the student submissions feature disabled", () => {
    expect(SUBMISSIONS_ENABLED).toBe(false);
  });

  it("CSP allows framing docs.google.com (and nothing broader)", async () => {
    const { default: config } = await import("@/next.config");
    const rules = await config.headers!();
    const csp = rules[0].headers.find((h) => h.key === "Content-Security-Policy")!.value;
    expect(csp).toContain("frame-src https://docs.google.com");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});

describe("checkpoint_submissions migration", () => {
  const sql = readFileSync(
    join(ROOT, "supabase/migrations/20261110_checkpoint_submissions.sql"),
    "utf8",
  );

  it("enforces one row per team per checkpoint and a 1-4 range", () => {
    expect(sql).toMatch(/UNIQUE\s*\(team_id,\s*checkpoint\)/i);
    expect(sql).toMatch(/CHECK\s*\(checkpoint BETWEEN 1 AND 4\)/i);
  });

  it("restricts student inserts to checkpoints 1-2 for their own team", () => {
    expect(sql).toMatch(/submitted_by = auth\.uid\(\)/);
    expect(sql).toMatch(/checkpoint IN \(1, 2\)/);
    expect(sql).toMatch(/p\.role = 'student'/);
  });

  it("only lets admins delete (un-check)", () => {
    const del = sql.match(/FOR DELETE USING \(([^;]*)\);/i);
    expect(del?.[1].trim()).toBe("public.is_admin()");
    expect(sql).not.toMatch(/FOR UPDATE/i);
  });

  it("enables RLS and scopes reads to the team's members or admins", () => {
    expect(sql).toMatch(/ALTER TABLE public\.checkpoint_submissions ENABLE ROW LEVEL SECURITY/i);
    const sel = sql.match(/FOR SELECT USING \(([\s\S]*?)\);\n/i)?.[1] ?? "";
    expect(sel).toContain("public.is_admin()");
    expect(sel).toContain("p.team_id = checkpoint_submissions.team_id");
  });
});
