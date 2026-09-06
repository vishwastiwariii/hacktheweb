import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import {
  MAX_TEAM_SIZE,
  getTeam,
  getUserTeam,
} from "@/app/lib/services/team.service";

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

  // Leader first, then in the order members joined.
  const members = [...(team.team_members ?? [])].sort((a, b) => {
    if (a.role !== b.role) return a.role === "leader" ? -1 : 1;
    return (a.created_at ?? "").localeCompare(b.created_at ?? "");
  });

  const metadata = user.user_metadata;
  const yourName =
    metadata.user_name ?? metadata.full_name ?? metadata.name ?? "You";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <Link
        href="/dashboard"
        className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        ← Back to dashboard
      </Link>

      <div className="mt-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{team.name}</h1>
        <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {team.score ?? 0} pts
        </span>
      </div>

      <section className="mt-8 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Join code
        </h2>
        <p className="mt-2 font-mono text-2xl font-semibold tracking-[0.3em]">
          {team.join_code}
        </p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Share this with teammates so they can join. A team can have up to{" "}
          {MAX_TEAM_SIZE} members.
        </p>
      </section>

      <section className="mt-6 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Members
          </h2>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {members.length} / {MAX_TEAM_SIZE}
          </span>
        </div>

        <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
          {members.map((member) => {
            const isYou = member.user_id === user.id;
            return (
              <li
                key={member.user_id}
                className="flex items-center justify-between py-3 text-sm"
              >
                {/* Only the signed-in member's GitHub identity is available here;
                    richer member profiles land when the profiles table is wired
                    up at login. */}
                <span className="font-medium">
                  {isYou ? `${yourName} (you)` : "Teammate"}
                </span>
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium capitalize text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {member.role}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
