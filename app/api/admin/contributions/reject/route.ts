import { NextRequest, NextResponse } from "next/server";
import { adminErrorResponse, requireAdmin } from "@/app/lib/auth/admin";
import { rejectContribution } from "@/app/lib/services/review.service";
import { rejectContributionSchema } from "@/app/lib/validation/contribution";

// POST /api/admin/contributions/reject  { contributionId, note? }
// Writes no ledger row and awards nothing; recomputes the issue's solved flag.
export async function POST(request: NextRequest) {
  try {
    const { supabase } = await requireAdmin();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = rejectContributionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 422 },
      );
    }

    const result = await rejectContribution(
      supabase,
      parsed.data.contributionId,
      parsed.data.note,
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json({ ok: true, message: result.message });
  } catch (err) {
    const { message, status } = adminErrorResponse(err);
    return NextResponse.json({ error: message }, { status });
  }
}
