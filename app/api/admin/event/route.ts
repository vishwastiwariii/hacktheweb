import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth/admin";
import { getEvent, updateEvent } from "@/app/lib/services/event.service";
import { updateEventSchema } from "@/app/lib/validation/event";

// One hackathon event is active at a time; its id comes from ACTIVE_EVENT_ID.
function resolveEventId(explicit?: string | null): string {
    const eventId = explicit || process.env.ACTIVE_EVENT_ID;
    if (!eventId) {
        throw new Error("No event id provided and ACTIVE_EVENT_ID is not configured");
    }
    return eventId;
}

function errorResponse(err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";

    if (message === "Unauthorized User") {
        return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "Not an Admin" || message === "Profile not found") {
        return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message === "Event not found") {
        return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: NextRequest) {
    try {
        const { supabase } = await requireAdmin();
        const eventId = resolveEventId(request.nextUrl.searchParams.get("id"));
        const event = await getEvent(supabase, eventId);
        return NextResponse.json({ event });
    } catch (err) {
        return errorResponse(err);
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const { supabase } = await requireAdmin();

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const { id, ...fields } = (body ?? {}) as Record<string, unknown>;
        const eventId = resolveEventId(
            typeof id === "string" ? id : request.nextUrl.searchParams.get("id"),
        );

        // Re-validate on the server; never trust what the client sent.
        const parsed = updateEventSchema.safeParse(fields);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? "Invalid event update" },
                { status: 422 },
            );
        }

        const event = await updateEvent(supabase, eventId, parsed.data);
        return NextResponse.json({ event });
    } catch (err) {
        return errorResponse(err);
    }
}
