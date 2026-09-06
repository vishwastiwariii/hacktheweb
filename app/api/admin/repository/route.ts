import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth/admin";
import {
    deleteRepository,
    getRepositories,
} from "@/app/lib/services/repository.service";

// Repositories are created via POST /api/admin/repositories/import (GitHub URL).
// This route only lists and removes them.
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
    if (message === "Repository not found") {
        return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: NextRequest) {
    try {
        const { supabase } = await requireAdmin();
        const eventId = resolveEventId(request.nextUrl.searchParams.get("id"));
        const repositories = await getRepositories(supabase, eventId);
        return NextResponse.json({ repositories });
    } catch (err) {
        return errorResponse(err);
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { supabase } = await requireAdmin();

        const repositoryId = request.nextUrl.searchParams.get("repositoryId");
        if (!repositoryId) {
            return NextResponse.json(
                { error: "repositoryId query parameter is required" },
                { status: 400 },
            );
        }

        const eventId = resolveEventId(request.nextUrl.searchParams.get("id"));
        await deleteRepository(supabase, eventId, repositoryId);
        return new NextResponse(null, { status: 204 });
    } catch (err) {
        return errorResponse(err);
    }
}
