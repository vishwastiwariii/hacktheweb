import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getIssuesPage } from "@/app/lib/services/issue.service";
import Pagination from "@/app/components/ui/pagination";
import ClaimIssueButton from "@/app/components/issues/claim-issue-button";
import { DifficultyBadge, LabelChips } from "@/app/components/issues/issue-meta";

export default async function IssuesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const eventId = process.env.ACTIVE_EVENT_ID;
  if (!eventId) throw new Error("ACTIVE_EVENT_ID is not configured");

  const page = Math.max(1, Number(pageParam ?? "1") || 1);
  // Only available + valid-metadata issues are claimable.
  const result = await getIssuesPage(supabase, {
    eventId,
    claimableOnly: true,
    page,
    pageSize: 20,
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Issues</h1>
        <Link
          href="/repositories"
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-zinc-300 px-4 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Browse by repository
        </Link>
      </div>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Issues open for the hackathon. Points and difficulty come from GitHub
        labels.
      </p>

      <div className="mt-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
        {result.issues.length === 0 ? (
          <p className="px-6 py-6 text-sm text-zinc-600 dark:text-zinc-400">
            Nothing available to claim yet. Check back soon.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {result.issues.map((issue) => (
              <li key={issue.id} className="flex items-start justify-between gap-4 px-6 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">{issue.title}</span>
                    <DifficultyBadge difficulty={issue.difficulty} />
                    <span className="text-sm font-medium">{issue.points} pts</span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {issue.repo_full_name} · #{issue.github_issue_number}
                  </p>
                  <LabelChips labels={issue.labels} />
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <a
                    href={issue.html_url ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-zinc-600 hover:underline dark:text-zinc-400"
                  >
                    View on GitHub
                  </a>
                  {issue.claimed ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                      claimed
                    </span>
                  ) : (
                    <ClaimIssueButton issueId={issue.id} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        pathname="/issues"
      />
    </div>
  );
}
