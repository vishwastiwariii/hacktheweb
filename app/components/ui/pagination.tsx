import Link from "next/link";

// Link-based pager for server components. `baseParams` carries any other query
// params (e.g. the selected repo) so they survive page changes.
export default function Pagination({
  page,
  totalPages,
  total,
  pathname,
  baseParams,
  pageSize = 20,
}: {
  page: number;
  totalPages: number;
  total: number;
  pathname: string;
  baseParams?: Record<string, string | undefined>;
  pageSize?: number;
}) {
  if (total === 0) return null;

  const href = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(baseParams ?? {})) {
      if (value) params.set(key, value);
    }
    params.set("page", String(target));
    return `${pathname}?${params.toString()}`;
  };

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const cell =
    "inline-flex h-9 min-w-9 items-center justify-center border px-3 text-sm font-bold transition-colors";
  const enabled =
    "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900";
  const disabled =
    "border-zinc-200 text-zinc-400 dark:border-zinc-800 dark:text-zinc-600";
  const active = "border-accent bg-accent text-accent-foreground";

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200 pt-5 dark:border-zinc-800">
      {totalPages > 1 ? (
        <div className="flex items-center gap-2">
          {prevDisabled ? (
            <span className={`${cell} ${disabled}`}>← Previous</span>
          ) : (
            <Link href={href(page - 1)} className={`${cell} ${enabled}`}>
              ← Previous
            </Link>
          )}

          {pageList(page, totalPages).map((entry, i) =>
            entry === "…" ? (
              <span key={`gap-${i}`} className="px-1 text-sm text-zinc-500">
                …
              </span>
            ) : entry === page ? (
              <span key={entry} className={`${cell} ${active}`}>
                {entry}
              </span>
            ) : (
              <Link
                key={entry}
                href={href(entry)}
                className={`${cell} ${enabled}`}
              >
                {entry}
              </Link>
            ),
          )}

          {nextDisabled ? (
            <span className={`${cell} ${disabled}`}>Next →</span>
          ) : (
            <Link href={href(page + 1)} className={`${cell} ${enabled}`}>
              Next →
            </Link>
          )}
        </div>
      ) : (
        <span />
      )}

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Showing {start}–{end} of {total}
      </p>
    </div>
  );
}

// First page, last page, and the current page ±1, with "…" between gaps.
// Everything is shown when there are 7 pages or fewer.
function pageList(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const wanted = new Set([1, totalPages, page, page - 1, page + 1]);
  const nums = [...wanted]
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b);

  const out: (number | "…")[] = [];
  nums.forEach((n, i) => {
    out.push(n);
    const next = nums[i + 1];
    if (next !== undefined && next - n > 1) out.push("…");
  });
  return out;
}
