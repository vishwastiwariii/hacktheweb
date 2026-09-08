import Link from "next/link";
import { requireAdminPage } from "@/app/lib/auth/admin";
import {
  getReviewQueue,
  type ReviewFilter,
  type ReviewItem,
} from "@/app/lib/services/review.service";
import Pagination from "@/app/components/ui/pagination";
import DifficultyBadge from "@/app/components/ui/difficulty-badge";
import ReviewActions from "@/app/components/admin/review-actions";

const PAGE_SIZE = 20;

const TABS: { key: ReviewFilter; label: string }[] = [
  { key: "PENDING_REVIEW", label: "Pending" },
  { key: "NEEDS_ATTENTION", label: "Needs attention" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
  { key: "ALL", label: "All" },
];

const STATUS_LABEL: Record<string, string> = {
  OPEN: "PR open",
  MERGED: "Merged",
  PENDING_REVIEW: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  UNMATCHED: "Unmatched author",
  NEEDS_ISSUE_MAPPING: "No issue mapped",
};

// Why the Approve button is unavailable for this row, if it is.
function blockedReason(item: ReviewItem): string | null {
  if (item.status === "APPROVED" || item.status === "REJECTED") return null;
  if (!item.merged) return "The pull request isn't merged yet.";
  if (!item.team) return "PR author isn't on a team — resolve UNMATCHED first.";
  if (!item.issue) return "No issue is mapped — resolve NEEDS_ISSUE_MAPPING first.";
  if (item.status !== "PENDING_REVIEW") return "Not pending review.";
  return null;
}

export default async function AdminContributionsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  const { filter: filterParam, page: pageParam } = await searchParams;

  const { supabase } = await requireAdminPage();

  const eventId = process.env.ACTIVE_EVENT_ID;
  if (!eventId) throw new Error("ACTIVE_EVENT_ID is not configured");

  const filter = TABS.some((tab) => tab.key === filterParam)
    ? (filterParam as ReviewFilter)
    : "PENDING_REVIEW";
  const page = Math.max(1, Number(pageParam ?? "1") || 1);

  const queue = await getReviewQueue(supabase, eventId, {
    filter,
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <Link
        href="/admin"
        className="text-sm font-medium text-accent transition-opacity hover:opacity-80"
      >
        ← Back to admin
      </Link>

      <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
        Contribution review
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
        Every pull request the platform is tracking. Open the PR to check the
        work, then approve to release the issue&apos;s points to the team, or
        reject to award nothing. Point values come from the GitHub label — they
        can&apos;t be edited here.
      </p>

      <div className="mt-8 flex flex-wrap gap-2 border-y border-zinc-800 py-4">
        {TABS.map((tab) => {
          const active = tab.key === filter;
          return (
            <Link
              key={tab.key}
              href={`/admin/contributions?filter=${tab.key}`}
              className={`border px-4 py-2 text-sm transition-colors ${
                active
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-zinc-700 text-zinc-300 hover:bg-zinc-900"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {queue.items.length === 0 ? (
        <div className="mt-6 border border-dashed border-zinc-700 p-8">
          <p className="text-xl font-extrabold text-white">Nothing here.</p>
          <p className="mt-2 text-sm text-zinc-500">
            {filter === "PENDING_REVIEW"
              ? "No merged PRs are waiting on a decision."
              : "No contributions in this bucket yet."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-800">
          {queue.items.map((item) => {
            const reason = blockedReason(item);
            return (
              <li
                key={item.id}
                className="flex flex-col gap-4 py-5 lg:flex-row lg:items-start lg:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-base font-bold text-white">
                      {item.issue?.title ??
                        item.prTitle ??
                        `PR #${item.prNumber}`}
                    </h3>
                    {item.issue && (
                      <DifficultyBadge difficulty={item.issue.difficulty} />
                    )}
                    <span className="inline-flex items-center border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-zinc-300">
                      {STATUS_LABEL[item.status] ?? item.status}
                    </span>
                  </div>

                  <p className="mt-1 font-mono text-xs text-zinc-500">
                    {item.issue
                      ? `${item.issue.repoFullName} · #${item.issue.number}`
                      : "issue not mapped"}{" "}
                    · PR #{item.prNumber} · by @{item.prAuthorLogin}
                  </p>

                  <p className="mt-2 text-sm text-zinc-400">
                    Team:{" "}
                    <span className="font-bold text-zinc-200">
                      {item.team?.name ?? "— (unmatched)"}
                    </span>
                  </p>

                  {item.status === "REJECTED" && item.reviewNote && (
                    <p className="mt-2 text-sm text-red-400">
                      Rejected: {item.reviewNote}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                    {item.prUrl ? (
                      <a
                        href={item.prUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center justify-center gap-1.5 border border-zinc-700 px-3 text-sm font-bold text-zinc-100 transition-colors hover:bg-zinc-900"
                      >
                        View PR ↗
                      </a>
                    ) : (
                      <span className="text-zinc-600">No PR link</span>
                    )}
                    {item.issue?.htmlUrl && (
                      <a
                        href={item.issue.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-zinc-400 hover:underline"
                      >
                        View issue ↗
                      </a>
                    )}
                    {reason && <span className="text-amber-400">{reason}</span>}
                  </div>
                </div>

                <div className="flex shrink-0 items-start gap-6">
                  <div className="w-12 text-right">
                    <p className="text-3xl font-extrabold leading-none text-white">
                      {item.awardablePoints || "—"}
                    </p>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                      pts
                    </p>
                  </div>

                  <ReviewActions
                    contributionId={item.id}
                    status={item.status}
                    canApprove={
                      item.status === "PENDING_REVIEW" &&
                      item.merged &&
                      !!item.team &&
                      !!item.issue
                    }
                    blockedReason={reason}
                    awardablePoints={item.awardablePoints}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination
        page={queue.page}
        totalPages={queue.totalPages}
        total={queue.total}
        pathname="/admin/contributions"
        baseParams={{ filter }}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
