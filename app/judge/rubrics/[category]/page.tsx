import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function RubricDetailPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const rubricType = category.toUpperCase();

  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("rubric_categories")
    .select(
      `id, name, weight_pct, total_pts, display_order,
       criteria:rubric_criteria(id, name, min_score, max_score, score_weight, display_order)`,
    )
    .eq("rubric_type", rubricType)
    .order("display_order");

  if (!categories || categories.length === 0) notFound();

  const grandTotal = categories.reduce((s, c) => s + c.total_pts, 0);

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <Link
          href="/judge"
          className="hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-50">
          Rubric: {rubricType}
        </span>
      </div>

      <div className="mb-6 flex items-baseline gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Rubric: {rubricType}
        </h1>
        <span className="text-sm text-zinc-400 dark:text-zinc-500">
          {grandTotal} pts total
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {categories.map((cat) => {
          const criteria = [...(cat.criteria ?? [])].sort(
            (a, b) => a.display_order - b.display_order,
          );
          return (
            <div
              key={cat.id}
              className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {cat.weight_pct}% — {cat.name}
                </p>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {cat.total_pts} pts
                </p>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {criteria.map((cr) => (
                  <div
                    key={cr.id}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      {cr.name}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-zinc-400 dark:text-zinc-500">
                      <span>
                        Range: {cr.min_score}–{cr.max_score}
                      </span>
                      {cr.score_weight > 1 && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                          ×{cr.score_weight}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
