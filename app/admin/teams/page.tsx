import Link from "next/link";
import { requireAdminPage } from "@/app/lib/auth/admin";
import { getLeaderboard } from "@/app/lib/services/leaderboard.service";
import { getRecentAdjustments } from "@/app/lib/services/points.service";
import AdjustPointsForm from "@/app/components/admin/adjust-points-form";

export default async function AdminTeamsPage() {
  const { supabase } = await requireAdminPage();

  const eventId = process.env.ACTIVE_EVENT_ID;
  if (!eventId) throw new Error("ACTIVE_EVENT_ID is not configured");

  const [teams, adjustments] = await Promise.all([
    getLeaderboard(supabase, eventId),
    getRecentAdjustments(supabase, eventId),
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
        Team points
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
        Add or remove points by hand — bonuses, penalties, or work the PR
        pipeline couldn&apos;t match. Every change is written to the ledger with
        your reason and shows up in the team&apos;s point history. Use a negative
        number to take points away.
      </p>

      {teams.length === 0 ? (
        <div className="mt-8 border border-dashed border-zinc-700 p-8">
          <p className="text-xl font-extrabold text-white">No teams yet.</p>
          <p className="mt-2 text-sm text-zinc-500">
            Teams appear here once participants create them.
          </p>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-zinc-800 border-y border-zinc-800">
          {teams.map((team) => (
            <li
              key={team.team_id}
              className="flex flex-col gap-4 py-5 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-5">
                <p className="w-8 shrink-0 font-mono text-sm font-bold text-zinc-500">
                  #{team.rank}
                </p>
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold text-white">
                    {team.name}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    {team.member_count}{" "}
                    {team.member_count === 1 ? "member" : "members"}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-start gap-6">
                <div className="w-16 text-right">
                  <p className="text-3xl font-extrabold leading-none text-white">
                    {team.score}
                  </p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                    pts
                  </p>
                </div>
                <AdjustPointsForm teamId={team.team_id} teamName={team.name} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-12 text-2xl font-extrabold text-white">
        Recent manual adjustments
      </h2>
      {adjustments.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">None yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-800 border-y border-zinc-800">
          {adjustments.map((entry) => (
            <li
              key={entry.id}
              className="flex items-baseline justify-between gap-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <span className="font-bold text-zinc-200">{entry.teamName}</span>
                <span className="text-zinc-500"> · {entry.reason ?? "—"}</span>
              </div>
              <div className="flex shrink-0 items-baseline gap-4">
                <span
                  className={`font-mono font-bold ${
                    entry.amount > 0 ? "text-accent" : "text-red-400"
                  }`}
                >
                  {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                </span>
                <time
                  dateTime={entry.createdAt}
                  className="font-mono text-xs text-zinc-500"
                >
                  {new Date(entry.createdAt).toLocaleString("en-GB", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </time>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
