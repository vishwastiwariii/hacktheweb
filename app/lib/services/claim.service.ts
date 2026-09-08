import type { SupabaseClient } from "@supabase/supabase-js";
import type { Difficulty } from "@/app/lib/github/labels";
import { getUserTeam } from "./team.service";

// Generous cap so one team can't sit on the whole board. Claims are permanent
// until the issue is solved, so this is a soft guardrail, not a queue.
export const MAX_ACTIVE_CLAIMS_PER_TEAM = 5;

export type ClaimResult = { ok: true } | { ok: false; error: string };

// Claims an issue for the caller's team. Every check is re-run here server-side
// — never trust that the button was only shown when it was allowed.
export async function claimIssue(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
  issueId: string,
): Promise<ClaimResult> {
  // 1. The claimer must be on a team for the active event.
  const membership = await getUserTeam(supabase, userId, eventId);
  if (!membership) {
    return { ok: false, error: "Join a team before claiming an issue." };
  }
  const teamId = membership.team.id;

  // 2. The issue must belong to this event and still be claimable.
  const { data: issue, error: issueError } = await supabase
    .from("hackathon_issues")
    .select("id, available, metadata_valid, solved, repositories!inner ( event_id )")
    .eq("id", issueId)
    .eq("repositories.event_id", eventId)
    .maybeSingle();

  if (issueError) {
    return { ok: false, error: "Could not load that issue. Try again." };
  }
  if (!issue) {
    return { ok: false, error: "That issue isn't part of this hackathon." };
  }
  if (!issue.available || !issue.metadata_valid) {
    return { ok: false, error: "That issue isn't open for claiming." };
  }
  if (issue.solved) {
    return { ok: false, error: "That issue is already solved." };
  }

  // 3. Not already claimed. The unique constraint is the real guard; this is
  //    just for a friendly message.
  const { data: existing } = await supabase
    .from("issue_claims")
    .select("id, team_id")
    .eq("issue_id", issueId)
    .maybeSingle();
  if (existing) {
    return {
      ok: false,
      error:
        existing.team_id === teamId
          ? "Your team has already claimed this issue."
          : "Another team has already claimed this issue.",
    };
  }

  // 4. Team claim limit.
  const { count } = await supabase
    .from("issue_claims")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId);
  if ((count ?? 0) >= MAX_ACTIVE_CLAIMS_PER_TEAM) {
    return {
      ok: false,
      error: `Your team is at the ${MAX_ACTIVE_CLAIMS_PER_TEAM}-claim limit. Finish one first.`,
    };
  }

  // 5. Insert. unique (issue_id) + the solved-issue trigger are the last line
  //    of defence against a race.
  const { error: insertError } = await supabase.from("issue_claims").insert({
    issue_id: issueId,
    team_id: teamId,
    claimed_by: userId,
  });

  if (insertError) {
    const code = (insertError as { code?: string }).code;
    if (code === "23505") {
      return { ok: false, error: "Another team just claimed this issue." };
    }
    if (code === "23514") {
      return { ok: false, error: "That issue is already solved." };
    }
    // Surface the real reason (missing column / RLS / etc.) instead of hiding it
    // behind a vague retry message.
    console.error("[claimIssue] insert failed:", insertError);
    return {
      ok: false,
      error:
        (insertError as { message?: string }).message ??
        "Could not claim the issue. Try again.",
    };
  }

  return { ok: true };
}

export type TeamClaim = {
  issueId: string;
  title: string;
  number: number;
  points: number;
  difficulty: Difficulty | null;
  htmlUrl: string | null;
  solved: boolean;
  repoFullName: string;
  claimedAt: string | null;
};

type RawClaimRepo = { owner: string; name: string };
type RawClaimIssue = {
  id: string;
  title: string;
  github_issue_number: number;
  points: number | null;
  difficulty: Difficulty | null;
  html_url: string | null;
  solved: boolean | null;
  repositories: RawClaimRepo | RawClaimRepo[] | null;
};

// Issues this team currently holds a claim on, newest first. Used by the team
// dashboard to show claimed work that hasn't turned into a PR yet.
export async function getTeamClaims(
  supabase: SupabaseClient,
  teamId: string,
): Promise<TeamClaim[]> {
  const { data, error } = await supabase
    .from("issue_claims")
    .select(
      `created_at,
       hackathon_issues!inner (
         id, title, github_issue_number, points, difficulty, html_url, solved,
         repositories ( owner, name )
       )`,
    )
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const raw = row as unknown as {
      created_at: string | null;
      hackathon_issues: RawClaimIssue | RawClaimIssue[] | null;
    };
    const issue = Array.isArray(raw.hackathon_issues)
      ? raw.hackathon_issues[0] ?? null
      : raw.hackathon_issues;
    const repo = issue
      ? Array.isArray(issue.repositories)
        ? issue.repositories[0] ?? null
        : issue.repositories
      : null;

    return {
      issueId: issue?.id ?? "",
      title: issue?.title ?? "Untitled issue",
      number: issue?.github_issue_number ?? 0,
      points: issue?.points ?? 0,
      difficulty: issue?.difficulty ?? null,
      htmlUrl: issue?.html_url ?? null,
      solved: issue?.solved ?? false,
      repoFullName: repo ? `${repo.owner}/${repo.name}` : "unknown",
      claimedAt: raw.created_at,
    };
  });
}
