import { NextResponse } from "next/server";
import { adminErrorResponse, requireAdmin } from "@/app/lib/auth/admin";
import { syncPullRequests } from "@/app/lib/github/sync-pull-requests";
import { createServiceClient } from "@/app/lib/supabase/service";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/admin/contributions/sync
// Re-reads every PR of the event's imported repos from GitHub and replays it
// through the webhook's PR handler — recovers merges the webhook missed.
//
// Admin is checked with the caller's session; the replay itself needs the
// service-role client, exactly like the webhook: it must read other users'
// profiles and team memberships, which RLS hides from an admin session.
export async function POST() {
  try {
    await requireAdmin();

    const eventId = process.env.ACTIVE_EVENT_ID?.trim();
    if (!eventId) {
      return NextResponse.json(
        { error: "ACTIVE_EVENT_ID is not configured" },
        { status: 500 },
      );
    }

    const summary = await syncPullRequests(createServiceClient(), eventId);
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    const status = (err as { status?: unknown })?.status;
    if (typeof status === "number") {
      return NextResponse.json(
        { error: "GitHub request failed — check GITHUB_TOKEN" },
        { status: 502 },
      );
    }
    const { message, status: code } = adminErrorResponse(err);
    return NextResponse.json({ error: message }, { status: code });
  }
}
