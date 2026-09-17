import type { Metadata } from "next";
import { createClient } from "@/app/lib/supabase/server";
import { getRepositories } from "@/app/lib/services/repository.service";
import { getIssuesPage } from "@/app/lib/services/issue.service";
import LoginScreen from "@/app/components/auth/login-screen";

export const metadata: Metadata = { title: "Jack in" };

// Formats the event window as e.g. "Mar 14 – 15" / "Mar 30 – Apr 2".
function formatEventWindow(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
): string | null {
  if (!startsAt) return null;
  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : null;
  const month = (d: Date) =>
    d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  if (!end) return `${month(start)} ${start.getUTCDate()}`;
  if (start.getUTCMonth() === end.getUTCMonth()) {
    return `${month(start)} ${start.getUTCDate()} – ${end.getUTCDate()}`;
  }
  return `${month(start)} ${start.getUTCDate()} – ${month(end)} ${end.getUTCDate()}`;
}

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const authError = searchParams.error === "auth";

  const supabase = await createClient();
  const eventId = process.env.ACTIVE_EVENT_ID?.trim();

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
    <LoginScreen data={{ repoCount, issueCount, eventWindow, authError }} />
  );
}
