import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import {
  getClaimableIssueCounts,
  getIssuesPage,
} from "@/app/lib/services/issue.service";
import { getUserTeam } from "@/app/lib/services/team.service";
import AppHeader from "@/app/components/layout/app-header";
import Pagination from "@/app/components/ui/pagination";
import IssueRow from "@/app/components/issues/issue-row";

const PAGE_SIZE = 20;

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
  const [result, counts, membership] = await Promise.all([
    getIssuesPage(supabase, {
      eventId,
      claimableOnly: true,
      page,
      pageSize: PAGE_SIZE,
      orderBy: "points",
    }),
    getClaimableIssueCounts(supabase, eventId),
    getUserTeam(supabase, user.id, eventId).catch(() => null),
  ]);
  const viewerTeamId = membership?.team.id ?? null;
  const canClaim = !!membership;

  return (
    <div className="flex flex-1 flex-col bg-[#0e0f12] text-zinc-100">
      <AppHeader />

      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Claimable issues
          </h1>
          <Link
            href="/repositories"
            className="text-sm font-bold text-accent transition-opacity hover:opacity-80"
          >
            Browse by repository →
          </Link>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Everything the maintainers have opened up for the hackathon. Pick
          something in your range, read the thread, then claim it so nobody
          doubles up.
        </p>

        <div className="mt-8 flex items-center justify-between gap-4 border-b border-zinc-800 pb-3 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
          <span>
            {counts.open} open · {counts.claimed} claimed
          </span>
          <span className="hidden sm:block">Sorted by points, high to low</span>
        </div>

        {result.issues.length === 0 ? (
          <div className="mt-6 border border-dashed border-zinc-700 p-8">
            <p className="text-xl font-extrabold text-white">
              Nothing available to claim yet. Check back soon.
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Maintainers are still labelling issues. Meanwhile, browse the
              repositories to see what&apos;s coming.
            </p>
            <Link
              href="/repositories"
              className="mt-4 inline-flex border border-zinc-700 px-4 py-2.5 text-sm font-bold text-zinc-100 transition-colors hover:bg-zinc-900"
            >
              Browse repositories
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {result.issues.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                viewerTeamId={viewerTeamId}
                canClaim={canClaim}
              />
            ))}
          </ul>
        )}

        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          total={result.total}
          pathname="/issues"
          pageSize={PAGE_SIZE}
        />
      </div>
    </div>
  );
}
