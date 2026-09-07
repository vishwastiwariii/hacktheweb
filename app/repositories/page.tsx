import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getIssuesPage } from "@/app/lib/services/issue.service";
import { getRepositories } from "@/app/lib/services/repository.service";
import AppHeader from "@/app/components/layout/app-header";
import Pagination from "@/app/components/ui/pagination";
import IssueRow from "@/app/components/issues/issue-row";

const PAGE_SIZE = 20;

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
  // Default to the first repo so the page always shows something claimable.
  const selectedRepo =
    (selectedRepoId
      ? repositories.find((repo) => repo.id === selectedRepoId)
      : repositories[0]) ?? null;

  const page = Math.max(1, Number(pageParam ?? "1") || 1);
  const result = selectedRepo
    ? await getIssuesPage(supabase, {
        eventId,
        repositoryId: selectedRepo.id,
        claimableOnly: true,
        page,
        pageSize: PAGE_SIZE,
        orderBy: "points",
      })
    : null;

  return (
    <div className="flex flex-1 flex-col bg-[#0e0f12] text-zinc-100">
      <AppHeader />

      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Repositories
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          {repositories.length}{" "}
          {repositories.length === 1 ? "project" : "projects"} in the hackathon.
          Pick one to see what&apos;s claimable inside it.
        </p>

        {repositories.length === 0 ? (
          <div className="mt-8 border border-dashed border-zinc-700 p-8">
            <p className="text-xl font-extrabold text-white">
              No repositories have been imported for this event yet.
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Ping the organisers if you think that&apos;s a mistake.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap gap-2 border-y border-zinc-800 py-4">
              {repositories.map((repo) => {
                const active = repo.id === selectedRepo?.id;
                return (
                  <Link
                    key={repo.id}
                    href={`/repositories?repo=${repo.id}`}
                    className={`border px-4 py-2 font-mono text-sm transition-colors ${
                      active
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-zinc-700 text-zinc-300 hover:bg-zinc-900"
                    }`}
                  >
                    {repo.full_name}
                  </Link>
                );
              })}
            </div>

            {selectedRepo && result && (
              <>
                <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-extrabold text-white">
                    Claimable issues in{" "}
                    <span className="font-mono text-accent">
                      {selectedRepo.full_name}
                    </span>
                  </h2>
                  <a
                    href={
                      selectedRepo.html_url ??
                      `https://github.com/${selectedRepo.full_name}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-bold text-accent transition-opacity hover:opacity-80"
                  >
                    Open repo on GitHub →
                  </a>
                </div>

                {result.issues.length === 0 ? (
                  <div className="mt-4 border border-dashed border-zinc-700 p-8">
                    <p className="text-xl font-extrabold text-white">
                      Everything here is claimed right now.
                    </p>
                    <p className="mt-2 text-sm text-zinc-500">
                      Try another repository, or check back after the next sync.
                    </p>
                  </div>
                ) : (
                  <ul className="mt-2 divide-y divide-zinc-800">
                    {result.issues.map((issue) => (
                      <IssueRow key={issue.id} issue={issue} showRepo={false} />
                    ))}
                  </ul>
                )}

                <Pagination
                  page={result.page}
                  totalPages={result.totalPages}
                  total={result.total}
                  pathname="/repositories"
                  baseParams={{ repo: selectedRepo.id }}
                  pageSize={PAGE_SIZE}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
