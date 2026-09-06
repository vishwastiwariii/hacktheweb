"use client";

export default function ClaimIssueButton({ issueId }: { issueId: string }) {
  // TODO: wire claim logic. A `claimIssue` server action / endpoint should
  // insert an `issue_claims` row and re-check server-side: the participant is on
  // a team for the active event, the issue is still `available` + `metadata_valid`
  // + unclaimed, and the team is under its claim limit. Inert until then.
  return (
    <button
      type="button"
      disabled
      data-issue-id={issueId}
      title="Claiming isn't available yet"
      className="h-9 shrink-0 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white opacity-60 dark:bg-white dark:text-zinc-900"
    >
      Claim
    </button>
  );
}
