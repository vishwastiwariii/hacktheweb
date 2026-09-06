import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/auth/admin";
import {
    getIssue,
    getIssuesPage,
    setIssueAvailability,
} from "@/app/lib/services/issue.service";
import { setIssueAvailabilitySchema } from "@/app/lib/validation/issue";

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
    if (message === "Issue not found") {
        return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: NextRequest) {
    try {
        const { supabase } = await requireAdmin();
        const { searchParams } = request.nextUrl;

        const issueId = searchParams.get("issueId");
        if (issueId) {
            const issue = await getIssue(supabase, issueId);
            if (!issue) {
                return NextResponse.json({ error: "Issue not found" }, { status: 404 });
            }
            return NextResponse.json({ issue });
        }

        const eventId = resolveEventId(searchParams.get("eventId"));
        const result = await getIssuesPage(supabase, {
            eventId,
            repositoryId: searchParams.get("repositoryId") ?? undefined,
            claimableOnly: searchParams.get("claimableOnly") === "true",
            page: Number(searchParams.get("page") ?? "1"),
            pageSize: Number(searchParams.get("pageSize") ?? "20"),
        });
        return NextResponse.json(result);
    } catch (err) {
        return errorResponse(err);
    }
}

// Admins may only toggle `available`. Points / difficulty / title / description
// are GitHub-owned and cannot be changed here.
export async function PATCH(request: NextRequest) {
    try {
        const { supabase } = await requireAdmin();

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const parsed = setIssueAvailabilitySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? "Invalid request" },
                { status: 422 },
            );
        }

        const issue = await setIssueAvailability(
            supabase,
            parsed.data.issueId,
            parsed.data.available,
        );
        return NextResponse.json({ issue });
    } catch (err) {
        return errorResponse(err);
    }
}
