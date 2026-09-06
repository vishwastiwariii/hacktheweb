"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { createTeam, joinTeam } from "@/app/lib/services/team.service";
import { createTeamSchema, joinTeamSchema } from "@/app/lib/validation/team";

type ActionResult = { error: string };

function activeEventId(): string {
  const eventId = process.env.ACTIVE_EVENT_ID;
  if (!eventId) {
    throw new Error("ACTIVE_EVENT_ID is not configured");
  }
  return eventId;
}

export async function createTeamAction(
  input: unknown,
): Promise<ActionResult | undefined> {
  // Re-validate on the server; never trust what the client sent.
  const parsed = createTeamSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid team name" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in to create a team" };
  }

  try {
    await createTeam(supabase, user.id, activeEventId(), parsed.data.name);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to create team",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/team");
  redirect("/dashboard/team");
}

export async function joinTeamAction(
  input: unknown,
): Promise<ActionResult | undefined> {
  const parsed = joinTeamSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid join code" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in to join a team" };
  }

  try {
    await joinTeam(supabase, user.id, activeEventId(), parsed.data.joinCode);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to join team",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/team");
  redirect("/dashboard/team");
}
