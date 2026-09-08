import type { SupabaseClient } from "@supabase/supabase-js";
import type { Difficulty } from "@/app/lib/github/labels";

export type TeamContributionStatus =
  | "OPEN"
  | "MERGED"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "UNMATCHED"
  | "NEEDS_ISSUE_MAPPING";

export type TeamContributionIssue = {
  id: string;
  title: string;
  number: number;
  points: number;
  difficulty: Difficulty | null;
  htmlUrl: string | null;
  solved: boolean;
  repoFullName: string;
};

export type TeamContribution = {
  id: string;
  prNumber: number;
  prTitle: string | null;
  prUrl: string | null;
  status: TeamContributionStatus;
  merged: boolean;
  pointsAwarded: boolean;
  updatedAt: string | null;
  issue: TeamContributionIssue | null;
};

type RawRepo = { owner: string; name: string };
type RawIssue = {
  id: string;
  title: string;
  github_issue_number: number;
  points: number | null;
  difficulty: Difficulty | null;
  html_url: string | null;
  solved: boolean | null;
  repositories: RawRepo | RawRepo[] | null;
};
type RawContribution = {
  id: string;
  github_pr_number: number;
  pr_title: string | null;
  pr_url: string | null;
  status: TeamContributionStatus;
  merged: boolean;
  points_awarded: boolean;
  updated_at: string | null;
  hackathon_issues: RawIssue | RawIssue[] | null;
};

function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function shape(raw: RawContribution): TeamContribution {
  const issueRow = first(raw.hackathon_issues);
  const repo = issueRow ? first(issueRow.repositories) : null;

  return {
    id: raw.id,
    prNumber: raw.github_pr_number,
    prTitle: raw.pr_title,
    prUrl: raw.pr_url,
    status: raw.status,
    merged: raw.merged,
    pointsAwarded: raw.points_awarded,
    updatedAt: raw.updated_at,
    issue: issueRow
      ? {
          id: issueRow.id,
          title: issueRow.title,
          number: issueRow.github_issue_number,
          points: issueRow.points ?? 0,
          difficulty: issueRow.difficulty ?? null,
          htmlUrl: issueRow.html_url,
          solved: issueRow.solved ?? false,
          repoFullName: repo ? `${repo.owner}/${repo.name}` : "unknown",
        }
      : null,
  };
}

// An issue counts as solved for the team once its resolving PR has merged
// (issue.solved) or an admin has approved the contribution.
export function isSolvedForTeam(contribution: TeamContribution): boolean {
  return contribution.status === "APPROVED" || contribution.issue?.solved === true;
}

// Every pull request the platform is tracking for this team, newest activity
// first. Readable under RLS by any member of the team (contributions_team_read).
// Best-effort at the call site: collapse errors to [].
export async function getTeamContributions(
  supabase: SupabaseClient,
  teamId: string,
): Promise<TeamContribution[]> {
  const { data, error } = await supabase
    .from("contributions")
    .select(
      `id, github_pr_number, pr_title, pr_url, status, merged, points_awarded, updated_at,
       hackathon_issues (
         id, title, github_issue_number, points, difficulty, html_url, solved,
         repositories ( owner, name )
       )`,
    )
    .eq("team_id", teamId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => shape(row as unknown as RawContribution));
}
