import { SupabaseClient } from "@supabase/supabase-js";

export type LeaderboardRow = {
    team_id: string;
    name: string;
    score: number;
    member_count: number;
    last_delivery_repo: string | null;
    last_delivery_issue: number | null;
    recent_delta: number | null;
    recent_delta_at: string | null;
    rank: number;
};

// Ranked standings for the event. get_leaderboard() (SECURITY DEFINER) returns
// every team ordered by score desc; rank is assigned here with standard
// competition ranking so ties share a position (1, 2, 2, 4).
export async function getLeaderboard(
    supabase: SupabaseClient,
    eventId: string
): Promise<LeaderboardRow[]> {
    const { data, error } = await supabase.rpc("get_leaderboard", {
        p_event_id: eventId,
    });

    if (error) {
        throw new Error(error.message);
    }

    const rows = (data ?? []) as Array<Omit<LeaderboardRow, "rank">>;

    let rank = 0;
    let previousScore: number | null = null;

    return rows.map((row, index) => {
        if (previousScore === null || row.score < previousScore) {
            rank = index + 1;
        }
        previousScore = row.score;
        return { ...row, rank };
    });
}
