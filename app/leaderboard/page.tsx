import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import AppHeader from "@/app/components/layout/app-header";
import LeaderboardTicker from "@/app/components/leaderboard/leaderboard-ticker";
import { getLeaderboard } from "@/app/lib/services/leaderboard.service";
import { MAX_TEAM_SIZE, getUserTeam } from "@/app/lib/services/team.service";

// Never cache — the ticker calls router.refresh() and expects fresh standings.
export const dynamic = "force-dynamic";

function agoLabel(iso: string | null): string {
  if (!iso) return "";
  const seconds = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 1000),
  );
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const eventId = process.env.ACTIVE_EVENT_ID;
  if (!eventId) throw new Error("ACTIVE_EVENT_ID is not configured");

  const [rows, membership] = await Promise.all([
    getLeaderboard(supabase, eventId),
    getUserTeam(supabase, user.id, eventId),
  ]);
  const myTeamId = membership?.team.id ?? null;

  return (
    <div className="flex flex-1 flex-col bg-[#0e0f12] text-zinc-100">
      <AppHeader />

      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Leaderboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
              Updates the moment an organiser approves a contribution. Keep it
              open on the big screen.
            </p>
          </div>
          <LeaderboardTicker />
        </div>

        {rows.length === 0 ? (
          <div className="mt-8 border border-dashed border-zinc-700 p-8">
            <p className="text-xl font-extrabold text-white">No teams yet.</p>
            <p className="mt-2 text-sm text-zinc-500">
              Standings appear once teams form and points land.
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-y border-zinc-800 text-left text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                  <th className="py-3 pr-4">Rank</th>
                  <th className="py-3 pr-4">Team</th>
                  <th className="hidden py-3 pr-4 md:table-cell">Members</th>
                  <th className="hidden py-3 pr-4 md:table-cell">Last delivery</th>
                  <th className="py-3 pl-4 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isMine = row.team_id === myTeamId;
                  const isTop = row.rank === 1;
                  return (
                    <tr
                      key={row.team_id}
                      className={`border-b border-zinc-800/70 ${
                        isTop ? "bg-accent/5" : ""
                      }`}
                    >
                      <td
                        className={`py-5 pr-4 align-middle ${
                          isMine ? "border-l-2 border-accent pl-3" : ""
                        }`}
                      >
                        <span
                          className={`text-2xl font-extrabold ${
                            isTop ? "text-white" : "text-zinc-500"
                          }`}
                        >
                          {row.rank}
                        </span>
                      </td>

                      <td className="py-5 pr-4 align-middle">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="text-base font-bold text-white">
                            {row.name}
                          </span>
                          {isMine && (
                            <span className="border border-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-accent">
                              Your team
                            </span>
                          )}
                          {row.recent_delta && row.recent_delta > 0 ? (
                            <span className="inline-flex items-center gap-1 bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-accent-foreground">
                              ▲ +{row.recent_delta} {agoLabel(row.recent_delta_at)}
                            </span>
                          ) : null}
                        </div>
                        {/* stacked meta on narrow screens */}
                        <div className="mt-1 flex gap-4 font-mono text-xs text-zinc-500 md:hidden">
                          <span>
                            {row.member_count}/{MAX_TEAM_SIZE}
                          </span>
                          {row.last_delivery_repo && (
                            <span>
                              {row.last_delivery_repo} #{row.last_delivery_issue}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="hidden py-5 pr-4 align-middle font-mono text-zinc-400 md:table-cell">
                        {row.member_count} / {MAX_TEAM_SIZE}
                      </td>
                      <td className="hidden py-5 pr-4 align-middle font-mono text-zinc-500 md:table-cell">
                        {row.last_delivery_repo
                          ? `${row.last_delivery_repo} #${row.last_delivery_issue}`
                          : "—"}
                      </td>

                      <td className="py-5 pl-4 text-right align-middle">
                        <span className="text-2xl font-extrabold text-white">
                          {row.score}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
