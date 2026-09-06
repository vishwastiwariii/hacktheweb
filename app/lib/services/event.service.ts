import { SupabaseClient } from "@supabase/supabase-js";


export async function getEvent(
    supabase: SupabaseClient, 
    eventId: string
) {
    const { data, error } = await supabase.from("events").select('*').eq("id", eventId).single()

    if (error || !data) {
        throw new Error("Event not found")
    }

    return data
}

export async function updateEvent(
    supabase: SupabaseClient, 
    eventId: string, 
    input: {
        name? : string,
        description? : string,
        registration_open? : boolean,
        starts_at? : string | null,
        ends_at? : string | null
    }
) {
    const { data , error } = await supabase.from("events").update(input).eq("id", eventId).select().single()

    if (error) {
        throw new Error("Event Update failed")
    }

    return data
}