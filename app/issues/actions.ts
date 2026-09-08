"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/lib/supabase/server";
import { claimIssue, type ClaimResult } from "@/app/lib/services/claim.service";
import { claimIssueSchema } from "@/app/lib/validation/issue";

export async function claimIssueAction(input: unknown): Promise<ClaimResult> {
  // Re-validate on the server; never trust what the client sent.
  const parsed = claimIssueSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid issue." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sign in to claim an issue." };
  }

  const eventId = process.env.ACTIVE_EVENT_ID;
  if (!eventId) {
    return { ok: false, error: "No active event is configured." };
  }

  const result = await claimIssue(
    supabase,
    user.id,
    eventId,
    parsed.data.issueId,
  );

  if (result.ok) {
    revalidatePath("/issues");
    revalidatePath("/repositories");
    revalidatePath("/dashboard/team");
  }

  return result;
}
