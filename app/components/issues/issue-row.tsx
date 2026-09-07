import type { IssueRecord } from "@/app/lib/services/issue.service";
import ClaimButton from "@/app/components/issues/claim-button";
import DifficultyBadge from "@/app/components/ui/difficulty-badge";
import LabelChips from "@/app/components/ui/label-chips";

// One issue in the claimable list. Used by /issues (with repo name) and
// /repositories (repo is implied by the selected filter, so `showRepo={false}`).
export default function IssueRow({
  issue,
  showRepo = true,
}: {
  issue: IssueRecord;
  showRepo?: boolean;
}) {
  return (
    <li className="flex flex-col gap-4 py-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="text-base font-bold text-white">{issue.title}</h3>
          <DifficultyBadge difficulty={issue.difficulty} />
        </div>
        <p className="mt-1 font-mono text-xs text-zinc-500">
          {showRepo && `${issue.repo_full_name} · `}#{issue.github_issue_number}
        </p>
        <LabelChips labels={issue.labels} />
      </div>

      <div className="flex shrink-0 items-start gap-6">
        <div className="w-12 text-right">
          <p className="text-3xl font-extrabold leading-none text-white">
            {issue.points ? issue.points : "—"}
          </p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
            pts
          </p>
        </div>

        <div className="flex w-40 flex-col gap-2">
          <a
            href={issue.html_url ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center justify-center gap-1.5 border border-zinc-700 px-3 text-sm font-bold text-zinc-100 transition-colors hover:bg-zinc-900"
          >
            <ExternalIcon />
            View on GitHub
          </a>
          <ClaimButton issueId={issue.id} claimed={issue.claimed} />
        </div>
      </div>
    </li>
  );
}

function ExternalIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
