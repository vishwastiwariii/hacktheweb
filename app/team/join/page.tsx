import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getUserTeam } from "@/app/lib/services/team.service";
import JoinTeamForm from "@/app/components/team/join-team-form";

export default async function JoinTeamPage() {
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

      <h1 className="mt-4 text-2xl font-semibold">Join a team</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Enter the six-character code a teammate gave you.
      </p>

      <JoinTeamForm />
    </div>
  );
}
