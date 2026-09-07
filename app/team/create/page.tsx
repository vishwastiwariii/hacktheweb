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
    <div className="flex flex-1 flex-col bg-[#0e0f12] text-zinc-100">
      <div className="mx-auto w-full max-w-2xl px-6 py-12">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-accent transition-opacity hover:opacity-80"
        >
          ← Back to dashboard
        </Link>

        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Create a team
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-zinc-300">
          Pick a name your team will be proud of on the leaderboard. You&apos;ll
          get a six-character join code to share with up to three friends.
        </p>

        <CreateTeamForm />
      </div>
    </div>
  );
}
