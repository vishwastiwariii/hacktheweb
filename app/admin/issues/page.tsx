import Link from "next/link";
import { requireAdminPage } from "@/app/lib/auth/admin";
import { getIssuesPage } from "@/app/lib/services/issue.service";
import { getRepositories } from "@/app/lib/services/repository.service";
import Pagination from "@/app/components/ui/pagination";
import AvailabilityToggle from "@/app/components/admin/availability-toggle";
import DifficultyBadge from "@/app/components/ui/difficulty-badge";
import LabelChips from "@/app/components/ui/label-chips";

const PAGE_SIZE = 20;

function chipClass(active: boolean) {
  return `border px-4 py-2 text-sm transition-colors ${
    active
      ? "border-accent bg-accent text-accent-foreground"
      : "border-zinc-700 text-zinc-300 hover:bg-zinc-900"
  }`;
}

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
    getIssuesPage(supabase, {
      eventId,
      repositoryId: repoParam,
      page,
      pageSize: PAGE_SIZE,
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <Link
        href="/admin"
        className="text-sm font-medium text-accent transition-opacity hover:opacity-80"
      >
        ← Back to admin
      </Link>

      <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
        Issues
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
        Every imported issue, whatever its state. Fix anything flagged as invalid
        metadata, then switch on the ones students should be able to claim.
      </p>

      <div className="mt-8 flex flex-wrap gap-2 border-y border-zinc-800 py-4">
        <Link href="/admin/issues" className={chipClass(!repoParam)}>
          All repos
        </Link>
        {repositories.map((repo) => (
          <Link
            key={repo.id}
            href={`/admin/issues?repo=${repo.id}`}
            className={`font-mono ${chipClass(repoParam === repo.id)}`}
          >
            {repo.full_name}
          </Link>
        ))}
      </div>

      {result.issues.length === 0 ? (
        <div className="mt-6 border border-dashed border-zinc-700 p-8">
          <p className="text-xl font-extrabold text-white">
            No issues. Import a repository first.
          </p>
          <Link
            href="/admin/repositories"
            className="mt-4 inline-flex bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground transition-opacity hover:opacity-90"
          >
            Go to repositories
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-800">
          {result.issues.map((issue) => (
            <li
              key={issue.id}
              className="flex flex-col gap-4 py-5 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <a
                    href={issue.html_url ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="text-base font-bold text-white transition-colors hover:text-accent"
                  >
                    {issue.title}
                  </a>
                  <DifficultyBadge difficulty={issue.difficulty} />
                  <span className="text-sm font-bold text-zinc-400">
                    {issue.points ? `${issue.points} pts` : "— pts"}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs text-zinc-500">
                  {issue.repo_full_name} · #{issue.github_issue_number}
                  {issue.claimed && " · claimed"}
                </p>
                {!issue.metadata_valid && (
                  <p className="mt-2 flex items-start gap-2 text-sm text-red-400">
                    <AlertIcon />
                    <span>
                      <span className="font-bold">Invalid metadata:</span>{" "}
                      {issue.metadata_error ?? "missing labels"}
                    </span>
                  </p>
                )}
                <LabelChips labels={issue.labels} />
              </div>

              <div className="shrink-0 pt-0.5">
                <AvailabilityToggle
                  issueId={issue.id}
                  available={issue.available}
                  metadataValid={issue.metadata_valid}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        pathname="/admin/issues"
        baseParams={{ repo: repoParam }}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}

function AlertIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="mt-0.5 h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
