import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import LogoutButton from "@/app/components/auth/logout-button";
import { getEvent } from "@/app/lib/services/event.service";
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
  const initial = name.charAt(0).toUpperCase();

  const [membership, userPoints, eventName] = await Promise.all([
    getUserTeam(supabase, data.user.id, eventId),
    getUserPoints(supabase, data.user.id),
    getEvent(supabase, eventId)
      .then((event) => (event?.name as string | undefined) ?? null)
      .catch(() => null),
  ]);

  // Team card extras: member count and computed leaderboard rank.
  const [team, teamRank] = membership
    ? await Promise.all([
        getTeam(supabase, membership.team.id),
        getTeamRank(supabase, eventId, membership.team.score ?? 0),
      ])
    : [null, null];
  const memberCount = team?.team_members?.length ?? 0;

  return (
    <div className="flex flex-1 flex-col bg-[#0e0f12] text-zinc-100">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/dashboard"
            className="text-lg font-extrabold tracking-tight text-white"
          >
            Hack The Web
          </Link>
          {eventName && (
            <span className="hidden text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 sm:block">
              {eventName}
            </span>
          )}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-sm text-zinc-300">
              <Avatar
                src={avatarUrl}
                initial={initial}
                size={28}
                className="text-xs"
              />
              <span className="hidden sm:inline">{name}</span>
            </span>
            <LogoutButton className="inline-flex h-9 items-center gap-2 border border-zinc-700 px-4 text-sm font-bold text-zinc-100 transition-colors hover:bg-zinc-900">
              <LogoutIcon />
              Log out
            </LogoutButton>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        {/* Identity + personal points */}
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-5">
            <Avatar
              src={avatarUrl}
              initial={initial}
              size={72}
              className="text-3xl"
            />
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
                <Stat
                  label="Rank"
                  value={teamRank ? `#${teamRank}` : "—"}
                />
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

function Avatar({
  src,
  initial,
  size,
  className,
}: {
  src?: string;
  initial: string;
  size: number;
  className?: string;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-sm object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-sm bg-accent/10 font-extrabold text-accent ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      {initial}
    </div>
  );
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
