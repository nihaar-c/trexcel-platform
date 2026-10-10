import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = new URL("..", import.meta.url).pathname;
const MIGRATIONS_DIR = join(ROOT, "supabase/migrations");

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

function readMigration(filename: string): string {
  return readFileSync(join(MIGRATIONS_DIR, filename), "utf8");
}

// Extracts "public.tablename" table names created in a SQL string.
function tablesCreatedIn(sql: string): string[] {
  return [
    ...sql.matchAll(
      /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.(\w+)/gi
    ),
  ].map(([, name]) => name.toLowerCase());
}

describe("migration hygiene", () => {
  it("no two migration files share the same timestamp prefix", () => {
    const files = migrationFiles();
    const prefixes = files.map((f) => f.split("_")[0]);
    const duplicates = prefixes.filter((p, i) => prefixes.indexOf(p) !== i);
    expect(
      [...new Set(duplicates)],
      `Duplicate migration timestamp prefixes found — run db push will fail: ${[...new Set(duplicates)].join(", ")}`
    ).toHaveLength(0);
  });

  it("every CREATE TABLE in a migration also enables RLS on that table", () => {
    const violations: string[] = [];

    for (const file of migrationFiles()) {
      const sql = readMigration(file);
      for (const table of tablesCreatedIn(sql)) {
        const hasRls = new RegExp(
          `alter\\s+table\\s+(?:public\\.)?${table}\\s+enable\\s+row\\s+level\\s+security`,
          "i"
        ).test(sql);
        if (!hasRls) violations.push(`${file}: public.${table} missing ENABLE ROW LEVEL SECURITY`);
      }
    }

    expect(violations, violations.join("\n")).toHaveLength(0);
  });

  it("every CREATE TABLE in a migration has at least one RLS policy", () => {
    const violations: string[] = [];

    for (const file of migrationFiles()) {
      const sql = readMigration(file);
      for (const table of tablesCreatedIn(sql)) {
        const hasPolicy = new RegExp(
          `create\\s+policy\\s+[^\\n]+on\\s+(?:public\\.)?${table}`,
          "i"
        ).test(sql);
        if (!hasPolicy) violations.push(`${file}: public.${table} has no CREATE POLICY`);
      }
    }

    expect(violations, violations.join("\n")).toHaveLength(0);
  });

  it("every CREATE TABLE in a migration has a corresponding storage bucket or is a plain DB table", () => {
    // Sanity-check that storage bucket INSERTs in a migration match the
    // bucket names used in app code (narrow, but catches the exact bug class).
    const allSql = migrationFiles().map(readMigration).join("\n");

    const migratedBuckets = new Set(
      [
        ...allSql.matchAll(
          /insert\s+into\s+storage\.buckets[^;]*values\s*\(\s*'(\w+)'/gi
        ),
      ].map(([, b]) => b.toLowerCase())
    );

    // Collect every .storage.from("X") reference across app + lib source.
    const appSource = collectTsSource(
      join(ROOT, "app"),
      join(ROOT, "lib"),
    );
    const referencedBuckets = new Set(
      [...appSource.matchAll(/\.storage\.from\("(\w+)"\)/g)].map(([, b]) =>
        b.toLowerCase()
      )
    );

    // Buckets that exist in the codebase long before migrations were tracked
    // (provisioned directly via Supabase dashboard).
    const BASELINE_BUCKETS = new Set(["site", "avatars"]);

    const missing = [...referencedBuckets].filter(
      (b) => !migratedBuckets.has(b) && !BASELINE_BUCKETS.has(b)
    );

    expect(
      missing,
      `Storage buckets referenced in code but missing from migrations: ${missing.join(", ")}`
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------

function collectTsSource(...dirs: string[]): string {
  const chunks: string[] = [];
  for (const dir of dirs) walkTs(dir, chunks);
  return chunks.join("\n");
}

function walkTs(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.isDirectory() &&
      !entry.name.startsWith(".") &&
      entry.name !== "node_modules"
    ) {
      walkTs(join(dir, entry.name), out);
    } else if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
      out.push(readFileSync(join(dir, entry.name), "utf8"));
    }
  }
}
