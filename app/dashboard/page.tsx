import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import AppHeader from "@/app/components/layout/app-header";
import UserAvatar from "@/app/components/ui/user-avatar";
import {
  MAX_TEAM_SIZE,
  getTeam,
  getTeamRank,
  getUserPoints,
  getUserTeam,
} from "@/app/lib/services/team.service";

const SECONDARY_LINK =
  "inline-flex items-center border border-zinc-700 px-4 py-2.5 text-sm font-bold text-zinc-100 transition-colors hover:bg-zinc-900";
const PRIMARY_LINK =
  "inline-flex items-center bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground transition-opacity hover:opacity-90";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  const eventId = process.env.ACTIVE_EVENT_ID;
  if (!eventId) {
    throw new Error("ACTIVE_EVENT_ID is not configured");
  }

  // Supabase stores the GitHub profile details it got at login here.
  const metadata = data.user.user_metadata;
  const name = metadata.full_name ?? metadata.name ?? "Unnamed";
  const githubUsername = metadata.user_name ?? metadata.preferred_username;
  const avatarUrl = metadata.avatar_url as string | undefined;

  const [membership, userPoints] = await Promise.all([
    getUserTeam(supabase, data.user.id, eventId),
    getUserPoints(supabase, data.user.id),
  ]);

  // Team card extras: member count and computed leaderboard rank.
  const [team, teamRank] = membership
    ? await Promise.all([
        getTeam(supabase, membership.team.id),
        getTeamRank(supabase, membership.team.id),
      ])
    : [null, null];
  const memberCount = team?.team_members?.length ?? 0;

  return (
    <div className="flex flex-1 flex-col bg-[#0e0f12] text-zinc-100">
      <AppHeader />

      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        {/* Identity + personal points */}
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-5">
            <UserAvatar src={avatarUrl} name={name} size={72} />
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                {name}
              </h1>
              {githubUsername && (
                <a
                  href={`https://github.com/${githubUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block font-mono text-sm text-accent hover:underline"
                >
                  @{githubUsername} on GitHub
                </a>
              )}
            </div>
          </div>

          <div className="shrink-0 border-zinc-800 sm:border-l sm:pl-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">
              Your points so far
            </p>
            <p className="mt-1 text-5xl font-extrabold tracking-tight text-white">
              {userPoints}
            </p>
          </div>
        </div>

        <hr className="my-10 border-zinc-800" />

        {/* Team — exactly one of these renders */}
        {membership ? (
          <section>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent">
              Your team
            </p>
            <div className="mt-3 border border-zinc-800 p-6 sm:max-w-xl">
              <h2 className="text-3xl font-extrabold tracking-tight text-white">
                {membership.team.name}
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                You joined as {membership.role}
              </p>

              <hr className="my-5 border-zinc-800" />

              <div className="flex flex-wrap gap-x-10 gap-y-4">
                <Stat
                  label="Team score"
                  value={`${membership.team.score ?? 0} pts`}
                />
                <Stat
                  label="Members"
                  value={`${memberCount} / ${MAX_TEAM_SIZE}`}
                />
                <Stat label="Rank" value={teamRank ? `#${teamRank}` : "—"} />
              </div>

              <Link
                href="/dashboard/team"
                className="mt-5 inline-block text-sm font-bold text-accent hover:underline"
              >
                View team →
              </Link>
            </div>
          </section>
        ) : (
          <section>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent">
              Your team
            </p>
            <div className="mt-3 border border-zinc-800 p-6 sm:max-w-xl">
              <h2 className="text-3xl font-extrabold tracking-tight text-white">
                You&apos;re not on a team
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                Teams are up to {MAX_TEAM_SIZE} people, and every point you earn
                goes to the team. Start one and share the code, or paste a code a
                friend sent you.
              </p>

              <hr className="my-5 border-zinc-800" />

              <div className="flex flex-wrap gap-3">
                <Link href="/team/create" className={PRIMARY_LINK}>
                  Create a team
                </Link>
                <Link href="/team/join" className={SECONDARY_LINK}>
                  Join a team
                </Link>
              </div>
            </div>
          </section>
        )}

        <hr className="my-10 border-zinc-800" />

        <div className="flex flex-wrap gap-3">
          <Link href="/issues" className={SECONDARY_LINK}>
            Browse claimable issues
          </Link>
          <Link href="/repositories" className={SECONDARY_LINK}>
            Repositories
          </Link>
          <Link href="/leaderboard" className={SECONDARY_LINK}>
            Leaderboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold text-white">{value}</p>
    </div>
  );
}
