import type { Metadata } from "next";
import { createClient } from "@/app/lib/supabase/server";
import { getRepositories } from "@/app/lib/services/repository.service";
import { getIssuesPage } from "@/app/lib/services/issue.service";
import { getLeaderboard } from "@/app/lib/services/leaderboard.service";
import LandingPage from "@/app/components/landing/landing-page";
import type {
  LandingData,
  LandingEvent,
} from "@/app/components/landing/types";

export const metadata: Metadata = {
  title: "Hack The Web — The web is broken. Hack it back.",
  description:
    "A 12-hour open-source hackathon. Real repositories, real issues, real contributions. Find the issues. Fix the system. Hack it back.",
};

// Public landing page. Every read is best-effort: the page must render for a
// signed-out visitor with no event configured, so each fetch falls back to an
// empty value and the sections switch to their "sealed" / simulation modes.
export default async function Home() {
  const supabase = await createClient();
  const eventId = process.env.ACTIVE_EVENT_ID?.trim();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let event: LandingEvent | null = null;
  let repos: LandingData["repos"] = [];
  let issueCount = 0;
  let solvedCount = 0;
  let leaderboard: LandingData["leaderboard"] = [];

  if (eventId) {
    const [eventRes, repoRows, issuePage, solvedRes, standings] =
      await Promise.all([
        supabase
          .from("events")
          .select("name, starts_at, ends_at, registration_open")
          .eq("id", eventId)
          .maybeSingle(),
        getRepositories(supabase, eventId).catch(() => []),
        getIssuesPage(supabase, {
          eventId,
          claimableOnly: true,
          page: 1,
          pageSize: 1,
        }).catch(() => null),
        supabase
          .from("hackathon_issues")
          .select("id, repositories!inner ( event_id )", {
            count: "exact",
            head: true,
          })
          .eq("repositories.event_id", eventId)
          .eq("solved", true),
        getLeaderboard(supabase, eventId).catch(() => []),
      ]);

    if (eventRes.data) {
      event = {
        name: (eventRes.data.name as string | null) ?? "Hack The Web",
        startsAt: (eventRes.data.starts_at as string | null) ?? null,
        endsAt: (eventRes.data.ends_at as string | null) ?? null,
        registrationOpen: Boolean(eventRes.data.registration_open),
      };
    }
    repos = repoRows.map((repo) => ({
      id: repo.id,
      owner: repo.owner,
      name: repo.name,
      fullName: repo.full_name,
      htmlUrl: repo.html_url,
      issueCount: repo.issue_count,
    }));
    issueCount = issuePage?.total ?? 0;
    solvedCount = solvedRes.count ?? 0;
    leaderboard = standings.map((row) => ({
      teamId: row.team_id,
      name: row.name,
      score: row.score,
      memberCount: row.member_count,
      rank: row.rank,
    }));
  }

  const data: LandingData = {
    signedIn: Boolean(user),
    event,
    repos,
    issueCount,
    solvedCount,
    leaderboard,
  };

  return <LandingPage data={data} />;
}
