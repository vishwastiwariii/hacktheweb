import { NextRequest, NextResponse } from "next/server";
import { adminErrorResponse, requireAdmin } from "@/app/lib/auth/admin";
import { getReviewQueue, type ReviewFilter } from "@/app/lib/services/review.service";

const FILTERS: ReviewFilter[] = [
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "NEEDS_ATTENTION",
  "ALL",
];

function resolveEventId(explicit?: string | null): string {
  const eventId = explicit || process.env.ACTIVE_EVENT_ID;
  if (!eventId) {
    throw new Error("No event id provided and ACTIVE_EVENT_ID is not configured");
  }
  return eventId;
}

// GET /api/admin/contributions?filter=PENDING_REVIEW&page=1 — the review queue.
export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAdmin();
    const { searchParams } = request.nextUrl;

    const rawFilter = searchParams.get("filter");
    const filter = FILTERS.includes(rawFilter as ReviewFilter)
      ? (rawFilter as ReviewFilter)
      : "PENDING_REVIEW";

    const queue = await getReviewQueue(supabase, resolveEventId(searchParams.get("eventId")), {
      filter,
      page: Number(searchParams.get("page") ?? "1"),
      pageSize: Number(searchParams.get("pageSize") ?? "20"),
    });

    return NextResponse.json(queue);
  } catch (err) {
    const { message, status } = adminErrorResponse(err);
    return NextResponse.json({ error: message }, { status });
  }
}
