import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getIssuesPage } from "@/app/lib/services/issue.service";
import { getRepositories } from "@/app/lib/services/repository.service";
import Pagination from "@/app/components/ui/pagination";
import ClaimIssueButton from "@/app/components/issues/claim-issue-button";
import { DifficultyBadge, LabelChips } from "@/app/components/issues/issue-meta";

export default async function RepositoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ repo?: string; page?: string }>;
}) {
  const { repo: selectedRepoId, page: pageParam } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const eventId = process.env.ACTIVE_EVENT_ID;
  if (!eventId) throw new Error("ACTIVE_EVENT_ID is not configured");

  const repositories = await getRepositories(supabase, eventId);
  const selectedRepo = selectedRepoId
    ? repositories.find((repo) => repo.id === selectedRepoId) ?? null
    : null;

  const page = Math.max(1, Number(pageParam ?? "1") || 1);
  const result = selectedRepo
    ? await getIssuesPage(supabase, {
        eventId,
        repositoryId: selectedRepo.id,
        claimableOnly: true,
        page,
        pageSize: 20,
      })
    : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Repositories</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Pick a repository to see the issues you can claim.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {repositories.length === 0 && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No repositories have been imported for this event yet.
          </p>
        )}
        {repositories.map((repo) => {
          const active = repo.id === selectedRepo?.id;
          return (
            <Link
              key={repo.id}
              href={`/repositories?repo=${repo.id}`}
              className={
                active
                  ? "rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
                  : "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
              }
            >
              {repo.full_name}
            </Link>
          );
        })}
      </div>

      {selectedRepo && result && (
        <>
          <div className="mt-8 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <h2 className="border-b border-zinc-200 px-6 py-3 text-sm font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              Claimable issues in {selectedRepo.full_name}
            </h2>
            {result.issues.length === 0 ? (
              <p className="px-6 py-6 text-sm text-zinc-600 dark:text-zinc-400">
                Nothing to claim here right now.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {result.issues.map((issue) => (
                  <li
                    key={issue.id}
                    className="flex items-start justify-between gap-4 px-6 py-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {issue.title}
                        </span>
                        <DifficultyBadge difficulty={issue.difficulty} />
                        <span className="text-sm font-medium">
                          {issue.points} pts
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        #{issue.github_issue_number}
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
            pathname="/repositories"
            baseParams={{ repo: selectedRepo.id }}
          />
        </>
      )}
    </div>
  );
}
