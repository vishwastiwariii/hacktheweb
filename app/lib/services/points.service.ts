import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdjustTeamPointsInput } from "@/app/lib/validation/points";

export type AdjustmentEntry = {
  id: string;
  teamId: string;
  teamName: string;
  amount: number;
  reason: string | null;
  createdAt: string;
};

type RawTeam = { name: string };
type RawAdjustment = {
  id: string;
  team_id: string;
  amount: number;
  reason: string | null;
  created_at: string;
  teams: RawTeam | RawTeam[] | null;
};

// Latest manual adjustments for the event, newest first.
export async function getRecentAdjustments(
  supabase: SupabaseClient,
  eventId: string,
  limit = 20,
): Promise<AdjustmentEntry[]> {
  const { data, error } = await supabase
    .from("point_transactions")
    .select("id, team_id, amount, reason, created_at, teams ( name )")
    .eq("event_id", eventId)
    .eq("kind", "ADJUSTMENT")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as RawAdjustment[]).map((row) => {
    const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
    return {
      id: row.id,
      teamId: row.team_id,
      teamName: team?.name ?? "Unknown team",
      amount: row.amount,
      reason: row.reason,
      createdAt: row.created_at,
    };
  });
}

export type AdjustResult =
  | { ok: true; message: string; score: number | null }
  | { ok: false; error: string };

// Ledger row + cached score in one transaction (adjust_team_points).
export async function adjustTeamPoints(
  supabase: SupabaseClient,
  input: AdjustTeamPointsInput,
): Promise<AdjustResult> {
  const { data, error } = await supabase.rpc("adjust_team_points", {
    p_team_id: input.teamId,
    p_amount: input.amount,
    p_reason: input.reason,
  });

  if (error) {
    return { ok: false, error: error.message || "Could not adjust points." };
  }

  const score =
    data && typeof data === "object" && "score" in data
      ? Number((data as { score: unknown }).score)
      : null;
  const sign = input.amount > 0 ? "+" : "";

  return {
    ok: true,
    score,
    message: `${sign}${input.amount} ${Math.abs(input.amount) === 1 ? "point" : "points"} recorded.`,
  };
}
