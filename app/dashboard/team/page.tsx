import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import CopyJoinCode from "@/app/components/team/copy-join-code";
import TeamIssuesPanel from "@/app/components/contributions/team-issues-panel";
import UserAvatar from "@/app/components/ui/user-avatar";
import {
  MAX_TEAM_SIZE,
  getTeam,
  getTeamPointHistory,
  getUserTeam,
} from "@/app/lib/services/team.service";
import { getTeamContributions } from "@/app/lib/services/contribution.service";
import { getTeamClaims } from "@/app/lib/services/claim.service";

export default async function TeamDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const eventId = process.env.ACTIVE_EVENT_ID;
  if (!eventId) {
    throw new Error("ACTIVE_EVENT_ID is not configured");
  }

  const membership = await getUserTeam(supabase, user.id, eventId);
  if (!membership) {
    redirect("/dashboard");
  }

  const team = await getTeam(supabase, membership.team.id);
  if (!team) {
    redirect("/dashboard");
  }

  const [pointHistory, contributions, claims] = await Promise.all([
    getTeamPointHistory(supabase, team.id, 5).catch(() => []),
    getTeamContributions(supabase, team.id).catch(() => []),
    getTeamClaims(supabase, team.id).catch(() => []),
  ]);

  // A claim already represented by a contribution row is dropped so it doesn't
  // show twice.
  const issueIdsWithContribution = new Set(
    contributions.map((c) => c.issue?.id).filter(Boolean),
  );
  const pendingClaims = claims.filter(
    (claim) => !issueIdsWithContribution.has(claim.issueId),
  );

  // Leader first, then in the order members joined.
  const members = [...(team.team_members ?? [])].sort((a, b) => {
    if (a.role !== b.role) return a.role === "leader" ? -1 : 1;
    return (a.created_at ?? "").localeCompare(b.created_at ?? "");
  });
  const openSeats = Math.max(0, MAX_TEAM_SIZE - members.length);

  // Only the signed-in member's GitHub identity is available (RLS keeps other
  // profiles private). Their row shows real name + handle; everyone else falls
  // back to a placeholder until a members API lands.
  const metadata = user.user_metadata;
  const yourName =
    metadata.full_name ?? metadata.name ?? metadata.user_name ?? "You";
  const yourHandle = metadata.user_name ?? metadata.preferred_username ?? null;
  const yourAvatar = metadata.avatar_url as string | undefined;

  return (
    <div className="flex flex-1 flex-col bg-[#0e0f12] text-zinc-100">
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-accent transition-opacity hover:opacity-80"
        >
          ← Back to dashboard
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            {team.name}
          </h1>
          <span className="bg-accent px-3 py-1.5 text-sm font-bold text-accent-foreground">
            {team.score ?? 0} pts
          </span>
        </div>

        <hr className="my-8 border-zinc-800" />

        <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
          {/* Members */}
          <section>
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-lg font-extrabold text-white">
                Members{" "}
                <span className="text-accent">
                  {members.length} / {MAX_TEAM_SIZE}
                </span>
              </h2>
              <span className="text-sm text-zinc-500">
                Teams can have up to {MAX_TEAM_SIZE} members
              </span>
            </div>

            <ul className="mt-4 divide-y divide-zinc-800 border-t border-zinc-800">
              {members.map((member) => {
                const isYou = member.user_id === user.id;
                const isLeader = member.role === "leader";
                return (
                  <li
                    key={member.user_id}
                    className="flex items-center gap-4 py-4"
                  >
                    <UserAvatar
                      src={isYou ? yourAvatar : undefined}
                      name={isYou ? yourName : undefined}
                      size={44}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white">
                        {isYou ? yourName : "Teammate"}
                      </p>
                      <p className="truncate text-sm text-zinc-500">
                        {isYou
                          ? yourHandle
                            ? `@${yourHandle}`
                            : "You"
                          : "Name and handle not available yet"}
                      </p>
                    </div>

                    <RoleBadge leader={isLeader} />
                  </li>
                );
              })}

              {openSeats > 0 && (
                <li className="flex items-center gap-4 py-4">
                  <span className="h-11 w-11 shrink-0 border border-dashed border-zinc-700" />
                  <p className="text-sm text-zinc-500">
                    {openSeats} seat{openSeats === 1 ? "" : "s"} open — share the
                    join code
                  </p>
                </li>
              )}
            </ul>
          </section>

          {/* Join code + recent points */}
          <aside className="h-fit border border-zinc-800">
            <div className="border-b border-zinc-800 p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">
                Join code
              </p>
              <p className="mt-2 font-mono text-3xl font-extrabold tracking-[0.35em] text-white">
                {team.join_code}
              </p>
              <p className="mt-3 text-sm text-zinc-500">
                Six characters. Anyone with this code can take one of your open
                seats.
              </p>
              <CopyJoinCode code={team.join_code} />
            </div>

            <div className="p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">
                Recent points
              </p>
              {pointHistory.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">
                  No points on the board yet. Merged, approved PRs show up here.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-zinc-800">
                  {pointHistory.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between gap-3 py-3 text-sm"
                    >
                      <span className="min-w-0 truncate text-zinc-300">
                        {entry.reason ?? "Points awarded"}
                      </span>
                      <span className="shrink-0 font-bold text-white">
                        {entry.amount >= 0 ? `+${entry.amount}` : entry.amount}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>

        <hr className="my-10 border-zinc-800" />

        <TeamIssuesPanel
          contributions={contributions}
          pendingClaims={pendingClaims}
        />
      </div>
    </div>
  );
}

function RoleBadge({ leader }: { leader: boolean }) {
  return (
    <span
      className={`shrink-0 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${
        leader ? "bg-accent/15 text-accent" : "bg-zinc-800 text-zinc-400"
      }`}
    >
      {leader ? "Leader" : "Member"}
    </span>
  );
}