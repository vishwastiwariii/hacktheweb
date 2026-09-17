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
    <div className="flex flex-1 flex-col bg-background text-zinc-100">
      <div className="mx-auto w-full max-w-2xl px-6 py-12">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-accent transition-opacity hover:opacity-80"
        >
          ← Back to dashboard
        </Link>

        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Join a team
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-zinc-300">
          Got a code from a friend? Paste it below. Codes are six characters and
          not case-sensitive.
        </p>

        <JoinTeamForm />
      </div>
    </div>
  );
}
