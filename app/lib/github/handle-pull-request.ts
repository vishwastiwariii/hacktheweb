import type { SupabaseClient } from "@supabase/supabase-js";
import { extractGithubIssueNumber } from "./issue-mapper";

// Actions that move a contribution forward. Everything else on `pull_request`
// (edited, labeled, assigned, review_requested, …) is stored but not processed.
const HANDLED_ACTIONS = new Set(["opened", "reopened", "synchronize", "closed"]);

// Once an admin has ruled on a contribution, later webhooks refresh the
// GitHub-derived fields but must not move `status` back.
const ADMIN_OWNED_STATUS = new Set(["APPROVED", "REJECTED"]);

export type HandlePullRequestResult =
  | { processed: false; reason: string }
  | { processed: true; contributionId: string; status: string };

type PullRequestPayload = {
  action?: string;
  pull_request?: {
    id?: number;
    number?: number;
    title?: string | null;
    body?: string | null;
    html_url?: string | null;
    merged?: boolean;
    merged_at?: string | null;
    user?: { login?: string | null } | null;
  } | null;
  repository?: {
    id?: number;
    full_name?: string | null;
  } | null;
};

// OPEN -> (merged) -> PENDING_REVIEW. A merged PR skips straight to review;
// `MERGED` stays in the enum for hand adjustments but isn't produced here.
// A PR with no registered author is UNMATCHED; one we can't tie to an imported
// issue is NEEDS_ISSUE_MAPPING. Neither earns points until an admin resolves it.
function deriveStatus(args: {
  merged: boolean;
  hasParticipant: boolean;
  hasIssue: boolean;
}): string {
  if (!args.hasParticipant) return "UNMATCHED";
  if (!args.hasIssue) return "NEEDS_ISSUE_MAPPING";
  return args.merged ? "PENDING_REVIEW" : "OPEN";
}

// Turns a `pull_request` webhook payload into a contribution row. Idempotent:
// upserts on (event_id, github_pr_id), so redeliveries and the
// opened/synchronize/closed lifecycle of one PR all land on the same row.
export async function handlePullRequestEvent(
  supabase: SupabaseClient,
  payload: PullRequestPayload,
): Promise<HandlePullRequestResult> {
  const action = payload.action ?? "";
  if (!HANDLED_ACTIONS.has(action)) {
    return { processed: false, reason: `ignored pull_request action "${action}"` };
  }

  const pr = payload.pull_request;
  const githubRepoId = payload.repository?.id;
  const repoFullName = payload.repository?.full_name ?? "";

  if (!pr?.id || !pr.number || !githubRepoId) {
    return { processed: false, reason: "incomplete pull_request payload" };
  }

  // The PR must belong to a repository imported for an event.
  const { data: repository, error: repoError } = await supabase
    .from("repositories")
    .select("id, event_id")
    .eq("github_repo_id", githubRepoId)
    .maybeSingle();

  if (repoError) {
    throw new Error(`repository lookup failed: ${repoError.message}`);
  }
  if (!repository) {
    return {
      processed: false,
      reason: `repository ${repoFullName || githubRepoId} is not imported`,
    };
  }

  const merged = pr.merged === true;
  const authorLogin = pr.user?.login ?? "";

  // Identify the participant by GitHub login (case-insensitive).
  let profileId: string | null = null;
  if (authorLogin) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .ilike("github_username", authorLogin)
      .maybeSingle();
    profileId = (profile?.id as string | undefined) ?? null;
  }

  // Their team — one membership per user for the single active event.
  let teamId: string | null = null;
  if (profileId) {
    const { data: membership } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", profileId)
      .maybeSingle();
    teamId = (membership?.team_id as string | undefined) ?? null;
  }

  // Map the PR to an imported issue via "Fixes #n" in the title/body.
  const [issueNumber] = extractGithubIssueNumber(pr.title ?? "", pr.body ?? null);
  let issueId: string | null = null;
  if (typeof issueNumber === "number") {
    const { data: issue } = await supabase
      .from("hackathon_issues")
      .select("id")
      .eq("repository_id", repository.id)
      .eq("github_issue_number", issueNumber)
      .maybeSingle();
    issueId = (issue?.id as string | undefined) ?? null;
  }

  const computedStatus = deriveStatus({
    merged,
    hasParticipant: Boolean(profileId && teamId),
    hasIssue: Boolean(issueId),
  });

  // Preserve an admin ruling if one already exists on this PR.
  const { data: existing } = await supabase
    .from("contributions")
    .select("status")
    .eq("event_id", repository.event_id)
    .eq("github_pr_id", pr.id)
    .maybeSingle();

  const status =
    existing && ADMIN_OWNED_STATUS.has(existing.status as string)
      ? (existing.status as string)
      : computedStatus;

  const row = {
    event_id: repository.event_id,
    repository_id: repository.id,
    issue_id: issueId,
    issue_number: typeof issueNumber === "number" ? issueNumber : null,
    team_id: teamId,
    profile_id: profileId,
    github_pr_id: pr.id,
    github_pr_number: pr.number,
    repo_full_name: repoFullName,
    pr_author_login: authorLogin,
    pr_title: pr.title ?? null,
    pr_url: pr.html_url ?? null,
    merged,
    merged_at: pr.merged_at ?? null,
    status,
    updated_at: new Date().toISOString(),
    // `points_awarded` is deliberately omitted: a webhook never resets it.
  };

  const { data: saved, error: upsertError } = await supabase
    .from("contributions")
    .upsert(row, { onConflict: "event_id,github_pr_id" })
    .select("id, status")
    .single();

  if (upsertError || !saved) {
    throw new Error(upsertError?.message ?? "failed to upsert contribution");
  }

  // A merged "Fixes #n" PR marks the issue solved -> no other team can claim it.
  if (issueId) {
    await syncIssueSolvedState(supabase, issueId);
  }

  return {
    processed: true,
    contributionId: saved.id as string,
    status: saved.status as string,
  };
}

// `hackathon_issues.solved` is recomputed from contributions (not just set), so
// a later rejection or an un-merge clears it and the issue is claimable again.
// The database also blocks new claims on a solved issue (issue_claims trigger).
async function syncIssueSolvedState(
  supabase: SupabaseClient,
  issueId: string,
): Promise<void> {
  const { data: solvers } = await supabase
    .from("contributions")
    .select("id")
    .eq("issue_id", issueId)
    .eq("merged", true)
    .neq("status", "REJECTED")
    .limit(1);

  const solved = (solvers?.length ?? 0) > 0;

  if (solved) {
    // Stamp solved_at only the first time it flips.
    await supabase
      .from("hackathon_issues")
      .update({ solved: true, solved_at: new Date().toISOString() })
      .eq("id", issueId)
      .eq("solved", false);
  } else {
    await supabase
      .from("hackathon_issues")
      .update({ solved: false, solved_at: null })
      .eq("id", issueId)
      .eq("solved", true);
  }
}
