import { NextRequest, NextResponse } from "next/server";
import { adminErrorResponse, requireAdmin } from "@/app/lib/auth/admin";
import { approveContribution } from "@/app/lib/services/review.service";
import { approveContributionSchema } from "@/app/lib/validation/contribution";

// POST /api/admin/contributions/approve  { contributionId }
// Runs the one-transaction award. Points come from the issue's GitHub label,
// re-read inside the DB function — nothing here is trusted from the client.
export async function POST(request: NextRequest) {
  try {
    const { supabase } = await requireAdmin();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = approveContributionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 422 },
      );
    }

    const result = await approveContribution(supabase, parsed.data.contributionId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json({ ok: true, message: result.message });
  } catch (err) {
    const { message, status } = adminErrorResponse(err);
    return NextResponse.json({ error: message }, { status });
  }
}
