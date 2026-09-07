import { createClient } from "@/app/lib/supabase/server";
import { getRepositories } from "@/app/lib/services/repository.service";
import { getIssuesPage } from "@/app/lib/services/issue.service";
import SignInPanel from "./sign-in-panel";

// Turns two ISO timestamps into a compact banner like "MAR 2–5" (same month) or
// "MAR 30 – APR 2". Returns null if either date is missing/unreadable so the
// stat row can simply drop the slot.
function formatEventWindow(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
): string | null {
  if (!startsAt || !endsAt) return null;
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const month = (d: Date) =>
    d
      .toLocaleString("en-US", { month: "short", timeZone: "UTC" })
      .toUpperCase();

  if (month(start) === month(end)) {
    return `${month(start)} ${start.getUTCDate()}–${end.getUTCDate()}`;
  }
  return `${month(start)} ${start.getUTCDate()} – ${month(end)} ${end.getUTCDate()}`;
}

export default async function LoginPage() {
  const supabase = await createClient();
  const eventId = process.env.ACTIVE_EVENT_ID;

  // Repos and issues are public reads; the events row may be gated by RLS for
  // signed-out visitors, so the date slot degrades gracefully.
  let repoCount = 0;
  let issueCount = 0;
  let eventWindow: string | null = null;

  if (eventId) {
    const [repos, issues, eventRes] = await Promise.all([
      getRepositories(supabase, eventId).catch(() => []),
      getIssuesPage(supabase, {
        eventId,
        claimableOnly: true,
        page: 1,
        pageSize: 1,
      }).catch(() => null),
      supabase
        .from("events")
        .select("starts_at, ends_at")
        .eq("id", eventId)
        .maybeSingle(),
    ]);

    repoCount = repos.length;
    issueCount = issues?.total ?? 0;
    eventWindow = formatEventWindow(
      eventRes.data?.starts_at,
      eventRes.data?.ends_at,
    );
  }

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      {/* Marketing panel */}
      <div className="flex flex-col justify-between gap-16 bg-accent px-8 py-12 text-[#0a0a0a] lg:min-h-screen lg:w-1/2 lg:px-16 lg:py-16">
        <p className="text-sm font-bold uppercase tracking-[0.2em]">
          Hack The Web
        </p>

        <div className="max-w-xl">
          <h1 className="text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
            Fix a real issue. Score for your team.
          </h1>
          <div className="mt-8 h-px w-40 bg-[#0a0a0a]" />
          <p className="mt-6 max-w-md text-lg font-medium">
            Four days, real repositories, real maintainers. Bring three friends
            or find them here.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-10 gap-y-2 text-sm font-bold uppercase tracking-widest">
          <span>
            {repoCount} repo{repoCount === 1 ? "" : "s"}
          </span>
          <span>
            {issueCount} issue{issueCount === 1 ? "" : "s"}
          </span>
          {eventWindow && <span>{eventWindow}</span>}
        </div>
      </div>

      {/* Sign-in panel */}
      <div className="flex flex-1 items-start bg-[#0e0f12] px-8 py-16 lg:min-h-screen lg:px-16 lg:pt-[22vh]">
        <SignInPanel />
      </div>
    </div>
  );
}
