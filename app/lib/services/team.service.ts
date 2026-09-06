import { SupabaseClient } from "@supabase/supabase-js";
import { generateCode } from "../utils/join-code";


export const MAX_TEAM_SIZE = 4;

export type TeamSummary = {
    id: string;
    name: string;
    join_code: string;
    event_id: string;
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

    const { data: team, error: teamError } = await supabase.from("teams").insert({
        event_id: eventId,
        name: teamName,
        join_code: joinCode
    })
    .select()
    .single()

    if (!team || teamError) {
        throw new Error(teamError?.message || "Failed to create a team")
    }

    const { error: memberError } = await supabase.from("team_members").insert({
        team_id: team.id,
        user_id: userId,
        event_id: event.id,
        role: "leader"
    })

    if (memberError) {
    // Rollback manually if membership creation fails
        await supabase
        .from("teams")
        .delete()
        .eq("id", team.id);
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

    // Join codes are stored uppercase; joinTeamSchema already uppercases the input.
    const { data: team, error: teamError } = await supabase.from("teams")
        .select("id, name, join_code, event_id, created_at")
        .eq("event_id", eventId)
        .eq("join_code", joinCode)
        .maybeSingle()

    if (teamError) {
        throw new Error(teamError.message)
    }

    if (!team) {
        throw new Error("Invalid join code")
    }

    const { count, error: countError } = await supabase.from("team_members")
        .select("user_id", { count: "exact", head: true })
        .eq("team_id", team.id)

    if (countError) {
        throw new Error(countError.message)
    }

    if ((count ?? 0) >= MAX_TEAM_SIZE) {
        throw new Error("This team is already full")
    }

    const { error: memberError } = await supabase.from("team_members").insert({
        team_id: team.id,
        user_id: userId,
        event_id: eventId,
        role: "member"
    })

    if (memberError) {
    // Unique (user_id, event_id) means they raced into another team between the
    // check above and this insert.
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