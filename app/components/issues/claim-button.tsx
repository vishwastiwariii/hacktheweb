"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { claimIssueAction } from "@/app/issues/actions";

const PILL =
  "inline-flex h-9 shrink-0 items-center justify-center border px-3 text-xs font-bold uppercase tracking-widest";

// The claim control. Which state it renders is decided server-side and passed
// in; the actual claim goes through `claimIssueAction`, which re-checks
// everything (team membership, issue still open, not solved, team under its
// limit) before inserting. The DB has the final say: unique(issue_id) and the
// solved-issue trigger from 20260909_issue_solved_on_merge.sql.
export default function ClaimButton({
  issueId,
  claimed = false,
  claimedByMyTeam = false,
  solved = false,
  canClaim = false,
}: {
  issueId: string;
  claimed?: boolean;
  claimedByMyTeam?: boolean;
  solved?: boolean;
  canClaim?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Flip to "Claimed" the instant the claim succeeds, without waiting on the
  // page to refetch (the durable update still comes from router.refresh()).
  const [claimedLocally, setClaimedLocally] = useState(false);

  if (solved) {
    return (
      <span className={`${PILL} border-emerald-800/60 bg-emerald-950/40 text-emerald-400`}>
        Solved
      </span>
    );
  }

  // Once anyone claims it, every viewer sees "Claimed". The owning team gets the
  // accent tint and a "· your team" hint so they know they hold it.
  if (claimedByMyTeam || claimedLocally) {
    return (
      <span className={`${PILL} border-accent/50 bg-accent/15 text-accent`}>
        Claimed · your team
      </span>
    );
  }

  if (claimed) {
    return (
      <span className={`${PILL} border-zinc-800 text-zinc-500`}>Claimed</span>
    );
  }

  if (!canClaim) {
    return (
      <Link
        href="/dashboard"
        className={`${PILL} border-zinc-700 text-zinc-300 transition-colors hover:bg-zinc-900`}
      >
        Join a team
      </Link>
    );
  }

  return (
    <div className="flex flex-col items-stretch gap-1">
      <button
        type="button"
        disabled={pending}
        data-issue-id={issueId}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await claimIssueAction({ issueId });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            // Optimistic flip, then refetch the RSC for the durable state (and
            // so other rows / counts update too).
            setClaimedLocally(true);
            router.refresh();
          });
        }}
        className="inline-flex h-9 shrink-0 items-center justify-center bg-accent px-3 text-sm font-bold text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Claiming…" : "Claim issue"}
      </button>
      {error && (
        <p className="border border-red-900/50 bg-red-950/40 p-1.5 text-right text-xs leading-tight text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
