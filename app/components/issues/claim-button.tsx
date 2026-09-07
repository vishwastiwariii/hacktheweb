"use client";

// Inert today. The disabled button keeps the exact footprint of the live one so
// rows don't jump when claiming ships.
//
// TODO: wire claim logic. A `claimIssue` server action should insert an
// `issue_claims` row and re-check server-side: the participant is on a team for
// the active event, the issue is still `available` + `metadata_valid` +
// unclaimed, and the team is under its claim limit.
export default function ClaimButton({
  issueId,
  claimed = false,
}: {
  issueId: string;
  claimed?: boolean;
}) {
  if (claimed) {
    return (
      <span className="inline-flex h-9 shrink-0 items-center justify-center border border-zinc-800 px-3 text-xs font-bold uppercase tracking-widest text-zinc-500">
        Claimed
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled
      data-issue-id={issueId}
      title="Claiming isn't available yet"
      className="inline-flex h-9 shrink-0 cursor-not-allowed items-center justify-center bg-accent px-3 text-sm font-bold text-accent-foreground opacity-90"
    >
      Claim issue
    </button>
  );
}
