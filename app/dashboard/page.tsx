import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import LogoutButton from "@/app/components/auth/logout-button";
import { getUserTeam } from "@/app/lib/services/team.service";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  const eventId = process.env.ACTIVE_EVENT_ID;
  if (!eventId) {
    throw new Error("ACTIVE_EVENT_ID is not configured");
  }

  // Supabase stores the GitHub profile details it got at login here.
  const metadata = data.user.user_metadata;
  const name = metadata.full_name ?? metadata.name ?? "Unnamed";
  const githubUsername = metadata.user_name ?? metadata.preferred_username;
  const avatarUrl = metadata.avatar_url;

  const membership = await getUserTeam(supabase, data.user.id, eventId);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <LogoutButton />
      </div>

      <section className="mt-8 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Your account
        </h2>

        <div className="mt-4 flex items-center gap-4">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={`${name}'s GitHub avatar`}
              width={56}
              height={56}
              className="h-14 w-14 rounded-full"
            />
          ) : (
            // Fall back to the first letter if GitHub gave us no avatar.
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-200 text-lg font-medium dark:bg-zinc-800">
              {name.charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <p className="text-lg font-medium">{name}</p>
            {githubUsername && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                @{githubUsername} on GitHub
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Your team
        </h2>

        {membership ? (
          <div className="mt-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-lg font-medium">{membership.team.name}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                You joined as {membership.role}.
              </p>
            </div>
            <Link
              href="/dashboard/team"
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-zinc-300 px-4 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              View team
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              You are not in a team yet. Create one, or join an existing team
              with its join code.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/team/create"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Create a team
              </Link>
              <Link
                href="/team/join"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 px-5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                Join a team
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
