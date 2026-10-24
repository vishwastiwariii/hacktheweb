import { NextRequest, NextResponse } from "next/server";
import { adminErrorResponse, requireAdmin } from "@/app/lib/auth/admin";
import { adjustTeamPoints } from "@/app/lib/services/points.service";
import { adjustTeamPointsSchema } from "@/app/lib/validation/points";

// POST /api/admin/teams/points  { teamId, amount, reason }
// Manual adjustment: writes an ADJUSTMENT ledger row and moves the team score
// in one transaction (adjust_team_points), which re-checks admin itself.
export async function POST(request: NextRequest) {
  try {
    const { supabase } = await requireAdmin();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = adjustTeamPointsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 422 },
      );
    }

    const result = await adjustTeamPoints(supabase, parsed.data);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json({ ok: true, message: result.message, score: result.score });
  } catch (err) {
    const { message, status } = adminErrorResponse(err);
    return NextResponse.json({ error: message }, { status });
  }
}
