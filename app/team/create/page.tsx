import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getUserTeam } from "@/app/lib/services/team.service";
import CreateTeamForm from "@/app/components/team/create-team-form";

export default async function CreateTeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const eventId = process.env.ACTIVE_EVENT_ID;
  if (!eventId) {
    throw new Error("ACTIVE_EVENT_ID is not configured");
  }

  // A GitHub account maps to at most one team per event.
  const membership = await getUserTeam(supabase, user.id, eventId);
  if (membership) {
    redirect("/dashboard/team");
  }

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-12">
      <Link
        href="/dashboard"
        className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        ← Back to dashboard
      </Link>

      <h1 className="mt-4 text-2xl font-semibold">Create a team</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Start a new team and share the join code with up to three teammates.
      </p>

      <CreateTeamForm />
    </div>
  );
}
