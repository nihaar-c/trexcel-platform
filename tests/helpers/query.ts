import { vi } from "vitest";

/**
 * Chainable, awaitable stand-in for a supabase-js query builder.
 * Every chain method returns the builder; `single`/`maybeSingle` and `await`
 * all resolve to `result`. Chain methods are vi.fn() so tests can assert on
 * how a query was built.
 */
export function makeQuery(result: { data: unknown; error?: unknown }) {
  const res = { error: null, ...result };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b: Record<string, any> = {};
  for (const m of ["select", "eq", "neq", "in", "not", "order", "insert", "update", "upsert"]) {
    b[m] = vi.fn(() => b);
  }
  b.single = vi.fn().mockResolvedValue(res);
  b.maybeSingle = vi.fn().mockResolvedValue(res);
  b.then = (ok: (v: unknown) => void, fail?: (e: unknown) => void) =>
    Promise.resolve(res).then(ok, fail);
  return b;
}
