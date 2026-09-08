import type { SupabaseClient } from "@supabase/supabase-js";
import type { Difficulty } from "@/app/lib/github/labels";
import type { TeamContributionStatus } from "@/app/lib/services/contribution.service";

// The buckets the review screen offers. "NEEDS_ATTENTION" folds the two side
// states an admin resolves by hand.
export type ReviewFilter =
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "NEEDS_ATTENTION"
  | "ALL";

const FILTER_STATUSES: Record<
  Exclude<ReviewFilter, "ALL">,
  TeamContributionStatus[]
> = {
  PENDING_REVIEW: ["PENDING_REVIEW"],
  APPROVED: ["APPROVED"],
  REJECTED: ["REJECTED"],
  NEEDS_ATTENTION: ["UNMATCHED", "NEEDS_ISSUE_MAPPING"],
};

export type ReviewItem = {
  id: string;
  prNumber: number;
  prTitle: string | null;
  prUrl: string | null;
  prAuthorLogin: string;
  status: TeamContributionStatus;
  merged: boolean;
  pointsAwarded: boolean;
  reviewNote: string | null;
  reviewedAt: string | null;
  updatedAt: string | null;
  team: { id: string; name: string } | null;
  issue: {
    id: string;
    title: string;
    number: number;
    points: number;
    difficulty: Difficulty | null;
    htmlUrl: string | null;
    repoFullName: string;
  } | null;
  // The point value that would be awarded on approve — straight from the issue
  // label, shown so the admin sees it before clicking.
  awardablePoints: number;
};

export type ReviewQueue = {
  items: ReviewItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type RawRepo = { owner: string; name: string };
type RawIssue = {
  id: string;
  title: string;
  github_issue_number: number;
  points: number | null;
  difficulty: Difficulty | null;
  html_url: string | null;
  repositories: RawRepo | RawRepo[] | null;
};
type RawTeam = { id: string; name: string };
type RawRow = {
  id: string;
  github_pr_number: number;
  pr_title: string | null;
  pr_url: string | null;
  pr_author_login: string;
  status: TeamContributionStatus;
  merged: boolean;
  points_awarded: boolean;
  review_note: string | null;
  reviewed_at: string | null;
  updated_at: string | null;
  teams: RawTeam | RawTeam[] | null;
  hackathon_issues: RawIssue | RawIssue[] | null;
};

function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function shape(raw: RawRow): ReviewItem {
  const issueRow = first(raw.hackathon_issues);
  const repo = issueRow ? first(issueRow.repositories) : null;
  const team = first(raw.teams);
  const points = issueRow?.points ?? 0;

  return {
    id: raw.id,
    prNumber: raw.github_pr_number,
    prTitle: raw.pr_title,
    prUrl: raw.pr_url,
    prAuthorLogin: raw.pr_author_login,
    status: raw.status,
    merged: raw.merged,
    pointsAwarded: raw.points_awarded,
    reviewNote: raw.review_note,
    reviewedAt: raw.reviewed_at,
    updatedAt: raw.updated_at,
    team: team ? { id: team.id, name: team.name } : null,
    issue: issueRow
      ? {
          id: issueRow.id,
          title: issueRow.title,
          number: issueRow.github_issue_number,
          points,
          difficulty: issueRow.difficulty ?? null,
          htmlUrl: issueRow.html_url,
          repoFullName: repo ? `${repo.owner}/${repo.name}` : "unknown",
        }
      : null,
    awardablePoints: points,
  };
}

const SELECT = `
  id, github_pr_number, pr_title, pr_url, pr_author_login, status, merged,
  points_awarded, review_note, reviewed_at, updated_at,
  teams ( id, name ),
  hackathon_issues (
    id, title, github_issue_number, points, difficulty, html_url,
    repositories ( owner, name )
  )
`;

export async function getReviewQueue(
  supabase: SupabaseClient,
  eventId: string,
  opts: { filter?: ReviewFilter; page?: number; pageSize?: number } = {},
): Promise<ReviewQueue> {
  const filter = opts.filter ?? "PENDING_REVIEW";
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("contributions")
    .select(SELECT, { count: "exact" })
    .eq("event_id", eventId)
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (filter !== "ALL") {
    query = query.in("status", FILTER_STATUSES[filter]);
  }

  const { data, error, count } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const total = count ?? 0;
  return {
    items: (data ?? []).map((row) => shape(row as unknown as RawRow)),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export type ReviewActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

// Runs the one-transaction award in Postgres (approve_contribution). The
// function re-checks merged / issue / points_awarded and reads the point value
// from the GitHub label itself.
export async function approveContribution(
  supabase: SupabaseClient,
  contributionId: string,
): Promise<ReviewActionResult> {
  const { data, error } = await supabase.rpc("approve_contribution", {
    p_contribution_id: contributionId,
  });

  if (error) {
    return { ok: false, error: error.message || "Could not approve." };
  }

  const points =
    data && typeof data === "object" && "points_awarded" in data
      ? Number((data as { points_awarded: unknown }).points_awarded)
      : null;

  return {
    ok: true,
    message:
      points != null
        ? `Approved — ${points} ${points === 1 ? "point" : "points"} added to the team.`
        : "Approved.",
  };
}

export async function rejectContribution(
  supabase: SupabaseClient,
  contributionId: string,
  note?: string,
): Promise<ReviewActionResult> {
  const { error } = await supabase.rpc("reject_contribution", {
    p_contribution_id: contributionId,
    p_note: note ?? null,
  });

  if (error) {
    return { ok: false, error: error.message || "Could not reject." };
  }

  return { ok: true, message: "Rejected — no points awarded." };
}
