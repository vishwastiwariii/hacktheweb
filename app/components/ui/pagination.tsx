import Link from "next/link";

// Link-based pager for server components. `baseParams` carries any other query
// params (e.g. the selected repo) so they survive page changes.
export default function Pagination({
  page,
  totalPages,
  total,
  pathname,
  baseParams,
}: {
  page: number;
  totalPages: number;
  total: number;
  pathname: string;
  baseParams?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) {
    return (
      <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
        {total} issue{total === 1 ? "" : "s"}
      </p>
    );
  }

  const href = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(baseParams ?? {})) {
      if (value) params.set(key, value);
    }
    params.set("page", String(target));
    return `${pathname}?${params.toString()}`;
  };

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;
  const linkCls =
    "inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 px-4 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900";
  const disabledCls =
    "inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 px-4 text-sm font-medium text-zinc-400 dark:border-zinc-800 dark:text-zinc-600";

  return (
    <div className="mt-4 flex items-center justify-between gap-4">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Page {page} of {totalPages} · {total} issue{total === 1 ? "" : "s"}
      </p>
      <div className="flex gap-2">
        {prevDisabled ? (
          <span className={disabledCls}>← Prev</span>
        ) : (
          <Link href={href(page - 1)} className={linkCls}>
            ← Prev
          </Link>
        )}
        {nextDisabled ? (
          <span className={disabledCls}>Next →</span>
        ) : (
          <Link href={href(page + 1)} className={linkCls}>
            Next →
          </Link>
        )}
      </div>
    </div>
  );
}
