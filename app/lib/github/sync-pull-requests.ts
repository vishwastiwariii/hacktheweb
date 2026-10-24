import type { SupabaseClient } from "@supabase/supabase-js";
import { githubClient } from "./client";
import { handlePullRequestEvent } from "./handle-pull-request";

export type SyncSummary = {
  repositories: number;
  pullRequests: number;
  failed: number;
  errors: string[];
};

// How many PRs are pushed through the handler at once. Each one is a handful of
// small queries; this keeps a few hundred PRs well inside a function timeout
// without flooding PostgREST.
const CONCURRENCY = 6;

// Backfill for deliveries the webhook never saw: PRs merged before the webhook
// was installed, or while the deployment was down / misconfigured. Lists every
// PR of every repo imported for the event over REST and replays it through the
// SAME handler the webhook uses, so status rules, admin-ruling protection and
// the solved flag behave identically. Safe to run repeatedly — the handler
// upserts on (event_id, github_pr_id).
export async function syncPullRequests(
  supabase: SupabaseClient,
  eventId: string,
): Promise<SyncSummary> {
  const { data: repositories, error } = await supabase
    .from("repositories")
    .select("owner, name, github_repo_id")
    .eq("event_id", eventId);

  if (error) {
    throw new Error(`repository lookup failed: ${error.message}`);
  }

  const gh = githubClient();
  const summary: SyncSummary = {
    repositories: 0,
    pullRequests: 0,
    failed: 0,
    errors: [],
  };

  for (const repo of repositories ?? []) {
    const fullName = `${repo.owner}/${repo.name}`;

    let pulls;
    try {
      pulls = await gh.paginate(gh.rest.pulls.list, {
        owner: repo.owner as string,
        repo: repo.name as string,
        state: "all",
        per_page: 100,
      });
    } catch (err) {
      const status = (err as { status?: number }).status;
      summary.errors.push(
        `${fullName}: GitHub returned ${status ?? "an error"} (repo deleted, renamed or not readable by GITHUB_TOKEN?)`,
      );
      continue;
    }

    summary.repositories++;

    for (let i = 0; i < pulls.length; i += CONCURRENCY) {
      const batch = pulls.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map((pr) =>
          handlePullRequestEvent(supabase, {
            // The list endpoint has no `merged` boolean; merged_at is the signal.
            action: pr.state === "closed" ? "closed" : "opened",
            pull_request: {
              id: pr.id,
              number: pr.number,
              title: pr.title,
              body: pr.body,
              html_url: pr.html_url,
              merged: pr.merged_at !== null,
              merged_at: pr.merged_at,
              user: { login: pr.user?.login ?? null },
            },
            repository: {
              id: repo.github_repo_id as number,
              full_name: fullName,
            },
          }),
        ),
      );

      results.forEach((result, index) => {
        summary.pullRequests++;
        if (result.status === "rejected") {
          summary.failed++;
          const reason =
            result.reason instanceof Error ? result.reason.message : "unknown error";
          summary.errors.push(`${fullName}#${batch[index].number}: ${reason}`);
        }
      });
    }
  }

  return summary;
}
