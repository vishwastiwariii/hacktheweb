import { SupabaseClient } from "@supabase/supabase-js";
import { generateCode } from "../utils/join-code";


export const MAX_TEAM_SIZE = 4;

export type TeamSummary = {
    id: string;
    name: string;
    join_code: string;
    event_id: string;
    // Cached ledger total. Rank is not stored — derive it with getTeamRank().
    score: number;
    created_at: string;
};

export type PointHistoryEntry = {
    id: string;
    amount: number;
    reason: string | null;
    created_at: string;
};


export async function getUserTeam (
    supabase: SupabaseClient,
    userId: string,
    eventId: string
): Promise<{ team: TeamSummary; role: string } | null> {
    const { data, error } = await supabase.from("team_members").select(`role,
        teams (
            id,
            name,
            join_code,
            event_id,
            score,
            created_at
        )`
    )
    .eq("user_id", userId)

    if(error) {
        throw new Error(error.message)
    }

    // Supabase types an embedded relation as an array even when the foreign key
    // makes it one-to-one; at runtime it comes back as a single object.
    const rows = (data ?? []) as Array<{
        role: string;
        teams: TeamSummary | TeamSummary[] | null;
    }>;

    for (const row of rows) {
        const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
        if (team?.event_id === eventId) {
            return { team, role: row.role };
        }
    }

    return null;
}


export async function createTeam (
    supabase: SupabaseClient, 
    userId: string, 
    eventId: string, 
    teamName: string
) {
    const existingTeam = await getUserTeam(supabase, userId, eventId)

    if (existingTeam) {
        throw new Error("You are already part of a Team")
    }

    const { data: event, error: eventError } = await supabase.from("events").select("id, registration_open").eq("id", eventId).single()

    if (eventError || !event) {
        throw new Error("Event Not Found")
    }

    if(!event.registration_open) {
        throw new Error("Team registration is closed")
    }

    const { data: existingName } = await supabase.from("teams").select("id").eq("event_id", eventId).ilike("name", teamName).maybeSingle()

    if (existingName) {
        throw new Error("A Team with this name already exists")
    }

    const joinCode = generateCode()

    // Insert without a RETURNING read: the members-only SELECT policy on `teams`
    // would hide the fresh row (the leader membership doesn't exist yet).
    const { error: teamError } = await supabase.from("teams").insert({
        event_id: eventId,
        name: teamName,
        join_code: joinCode
    })

    if (teamError) {
        // 23505 = unique_violation (name or join_code already used for this event)
        if ((teamError as { code?: string }).code === "23505") {
            throw new Error("A team with this name already exists")
        }
        throw new Error(teamError.message || "Failed to create a team")
    }

    // Read the row back through the join-code helper (SECURITY DEFINER), since a
    // plain select is still gated by the members-only policy at this point.
    const { data: createdRows, error: lookupError } = await supabase.rpc(
        "team_by_join_code",
        { p_event_id: eventId, p_join_code: joinCode }
    )
    const team = (Array.isArray(createdRows) ? createdRows[0] : createdRows) as
        | TeamSummary
        | undefined

    if (lookupError || !team) {
        throw new Error("Team was created but could not be loaded")
    }

    // team_members has no event_id column — the event is reached through the team.
    const { error: memberError } = await supabase.from("team_members").insert({
        team_id: team.id,
        user_id: userId,
        role: "leader"
    })

    if (memberError) {
    // Best-effort rollback if membership creation fails.
        await supabase
        .from("teams")
        .delete()
        .eq("id", team.id);
        // 23505 = the one-membership-per-user constraint.
        if ((memberError as { code?: string }).code === "23505") {
            throw new Error("You are already part of a team");
        }
        throw new Error(memberError.message);
    }

    return team;
}


export async function joinTeam (
    supabase: SupabaseClient,
    userId: string,
    eventId: string,
    joinCode: string
) {
    const existingTeam = await getUserTeam(
        supabase,
        userId,
        eventId
    )

    if (existingTeam) {
        throw new Error("You are already part of a team")
    }

    const { data: event, error: eventError } = await supabase.from("events").select("id, registration_open").eq("id", eventId).single()

    if (eventError || !event) {
        throw new Error("Event Not Found")
    }

    if (!event.registration_open) {
        throw new Error("Team registration is closed")
    }

    // Join codes are stored uppercase; joinTeamSchema already uppercases the
    // input. team_by_join_code is SECURITY DEFINER so a non-member can resolve
    // the team without a table-wide read of `teams`.
    const { data: matchRows, error: teamError } = await supabase.rpc(
        "team_by_join_code",
        { p_event_id: eventId, p_join_code: joinCode }
    )

    if (teamError) {
        throw new Error(teamError.message)
    }

    const team = (Array.isArray(matchRows) ? matchRows[0] : matchRows) as
        | TeamSummary
        | undefined

    if (!team) {
        throw new Error("Invalid join code")
    }

    const { data: seatCount, error: countError } = await supabase.rpc(
        "team_seat_count",
        { p_team_id: team.id }
    )

    if (countError) {
        throw new Error(countError.message)
    }

    if ((seatCount ?? 0) >= MAX_TEAM_SIZE) {
        throw new Error("This team is already full")
    }

    const { error: memberError } = await supabase.from("team_members").insert({
        team_id: team.id,
        user_id: userId,
        role: "member"
    })

    if (memberError) {
    // 23505 = the one-membership-per-user constraint: they already joined a team
    // (possibly racing between the check above and this insert).
        if ((memberError as { code?: string }).code === "23505") {
            throw new Error("You are already part of a team")
        }
        throw new Error(memberError.message)
    }

    return team
}


export async function getTeam (
    supabase: SupabaseClient,
    teamId: string
) {
    const { data: team, error } = await supabase.from("teams")
        .select(`
            id,
            name,
            join_code,
            event_id,
            score,
            created_at,
            team_members (
                user_id,
                role,
                created_at
            )
        `)
        .eq("id", teamId)
        .single()

    if (error) {
        // PGRST116 = no rows returned by .single()
        if (error.code === "PGRST116") {
            return null
        }
        throw new Error(error.message)
    }

    return team
}


// Most recent ledger entries for a team, newest first. Used by the team page's
// "Recent points" panel. `reason` is the human label written when points were
// awarded (or by an admin adjustment).
export async function getTeamPointHistory (
    supabase: SupabaseClient,
    teamId: string,
    limit = 5
): Promise<PointHistoryEntry[]> {
    const { data, error } = await supabase
        .from("point_transactions")
        .select("id, amount, reason, created_at")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false })
        .limit(limit)

    if (error) {
        throw new Error(error.message)
    }

    return (data ?? []) as PointHistoryEntry[]
}


// Competition rank within the event: 1 + the number of teams with a strictly
// higher score (ties share a rank). Computed by the team_rank() SECURITY DEFINER
// function so it works even though a participant can only read their own team.
// Best-effort — returns null (UI shows "—") if the call fails.
export async function getTeamRank (
    supabase: SupabaseClient,
    teamId: string
): Promise<number | null> {
    try {
        const { data, error } = await supabase.rpc("team_rank", {
            p_team_id: teamId,
        })

        if (error || data == null) return null
        return typeof data === "number" ? data : Number(data)
    } catch {
        return null
    }
}


// A participant's personal tally: points from ledger entries whose contribution
// resolved an issue this user claimed. There is no per-user column on the
// ledger, so this walks claims -> contributions -> transactions. Best-effort:
// any read blocked by RLS (or missing data) collapses to 0.
export async function getUserPoints (
    supabase: SupabaseClient,
    userId: string
): Promise<number> {
    try {
        const { data: claims } = await supabase
            .from("issue_claims")
            .select("issue_id")
            .eq("claimed_by", userId)

        const issueIds = (claims ?? [])
            .map((c) => (c as { issue_id: string }).issue_id)
            .filter(Boolean)
        if (issueIds.length === 0) return 0

        const { data: contributions } = await supabase
            .from("contributions")
            .select("id")
            .in("issue_id", issueIds)
            .eq("points_awarded", true)

        const contributionIds = (contributions ?? [])
            .map((c) => (c as { id: string }).id)
            .filter(Boolean)
        if (contributionIds.length === 0) return 0

        const { data: transactions } = await supabase
            .from("point_transactions")
            .select("amount")
            .in("contribution_id", contributionIds)

        return (transactions ?? []).reduce(
            (sum, t) => sum + ((t as { amount: number }).amount ?? 0),
            0
        )
    } catch {
        return 0
    }
}