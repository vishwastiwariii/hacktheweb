import Link from "next/link";
import { requireAdminPage } from "@/app/lib/auth/admin";
import { getIssuesPage } from "@/app/lib/services/issue.service";
import { getRepositories } from "@/app/lib/services/repository.service";
import Pagination from "@/app/components/ui/pagination";
import IssueAvailabilityToggle from "@/app/components/admin/issue-availability-toggle";
import { DifficultyBadge, LabelChips } from "@/app/components/issues/issue-meta";

export default async function AdminIssuesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; repo?: string }>;
}) {
  const { page: pageParam, repo: repoParam } = await searchParams;

  const { supabase } = await requireAdminPage();

  const eventId = process.env.ACTIVE_EVENT_ID;
  if (!eventId) throw new Error("ACTIVE_EVENT_ID is not configured");

  const page = Math.max(1, Number(pageParam ?? "1") || 1);
  const [repositories, result] = await Promise.all([
    getRepositories(supabase, eventId),
    getIssuesPage(supabase, { eventId, repositoryId: repoParam, page, pageSize: 20 }),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <Link
        href="/admin"
        className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        ← Back to admin
      </Link>

      <h1 className="mt-4 text-2xl font-semibold">Issues</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Imported from GitHub. Points and difficulty come from labels and cannot be
        edited here — you only choose which issues are available for the hackathon.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/admin/issues"
          className={
            !repoParam
              ? "rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
              : "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
          }
        >
          All repos
        </Link>
        {repositories.map((repo) => (
          <Link
            key={repo.id}
            href={`/admin/issues?repo=${repo.id}`}
            className={
              repoParam === repo.id
                ? "rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
                : "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            }
          >
            {repo.full_name}
          </Link>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
        {result.issues.length === 0 ? (
          <p className="px-6 py-6 text-sm text-zinc-600 dark:text-zinc-400">
            No issues. Import a repository first.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {result.issues.map((issue) => (
              <li key={issue.id} className="flex items-start justify-between gap-4 px-6 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <a
                      href={issue.html_url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {issue.title}
                    </a>
                    <DifficultyBadge difficulty={issue.difficulty} />
                    <span className="shrink-0 text-sm font-medium">
                      {issue.points} pts
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {issue.repo_full_name} · #{issue.github_issue_number}
                    {issue.claimed && " · claimed"}
                  </p>
                  {!issue.metadata_valid && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      Invalid metadata: {issue.metadata_error ?? "missing labels"}
                    </p>
                  )}
                  <LabelChips labels={issue.labels} />
                </div>
                <div className="shrink-0 pt-0.5">
                  <IssueAvailabilityToggle
                    issueId={issue.id}
                    available={issue.available}
                  />
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
        pathname="/admin/issues"
        baseParams={{ repo: repoParam }}
      />
    </div>
  );
}
