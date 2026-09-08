import DifficultyBadge from "@/app/components/ui/difficulty-badge";
import {
  isSolvedForTeam,
  type TeamContribution,
} from "@/app/lib/services/contribution.service";
import type { TeamClaim } from "@/app/lib/services/claim.service";

type Tone = "solved" | "review" | "open" | "rejected" | "attention";

const TONE_CLASS: Record<Tone, string> = {
  solved: "border-emerald-800/60 bg-emerald-950/40 text-emerald-400",
  review: "border-amber-800/60 bg-amber-950/40 text-amber-400",
  open: "border-zinc-700 bg-zinc-900 text-zinc-300",
  rejected: "border-red-900/60 bg-red-950/40 text-red-400",
  attention: "border-amber-800/60 bg-amber-950/40 text-amber-400",
};

function statusView(c: TeamContribution): { label: string; tone: Tone } {
  if (c.status === "APPROVED") {
    return { label: "Solved · points awarded", tone: "solved" };
  }
  if (c.issue?.solved) {
    return {
      label:
        c.status === "PENDING_REVIEW" ? "Solved · awaiting review" : "Solved",
      tone: "solved",
    };
  }
  if (c.status === "REJECTED") return { label: "Rejected", tone: "rejected" };
  if (c.status === "OPEN") return { label: "PR open", tone: "open" };
  if (c.status === "PENDING_REVIEW") {
    return { label: "Awaiting review", tone: "review" };
  }
  // UNMATCHED / NEEDS_ISSUE_MAPPING / MERGED — an admin has to step in.
  return { label: "Being sorted out", tone: "attention" };
}

function Row({
  title,
  reference,
  difficulty,
  points,
  badge,
  links,
}: {
  title: string;
  reference: string;
  difficulty: Parameters<typeof DifficultyBadge>[0]["difficulty"];
  points: number;
  badge: { label: string; tone: Tone };
  links: { href: string; label: string; muted?: boolean }[];
}) {
  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <DifficultyBadge difficulty={difficulty} />
          <span
            className={`inline-flex items-center border px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest ${TONE_CLASS[badge.tone]}`}
          >
            {badge.label}
          </span>
        </div>

        <p className="mt-1 font-mono text-xs text-zinc-500">{reference}</p>

        {links.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className={`font-medium hover:underline ${
                  link.muted ? "text-zinc-400" : "text-accent"
                }`}
              >
                {link.label} ↗
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="w-12 shrink-0 text-right">
        <p className="text-2xl font-extrabold leading-none text-white">
          {points ? points : "—"}
        </p>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-zinc-500">
          pts
        </p>
      </div>
    </li>
  );
}

// The team's issue work, solved ones surfaced first: every tracked pull request,
// plus claims that don't have a PR yet. Lives on /dashboard/team. Server
// component — no interactivity.
export default function TeamIssuesPanel({
  contributions,
  pendingClaims = [],
}: {
  contributions: TeamContribution[];
  // Claims with no contribution yet — the page filters these so they don't
  // duplicate a row already shown from `contributions`.
  pendingClaims?: TeamClaim[];
}) {
  const solvedCount = contributions.filter(isSolvedForTeam).length;
  const total = contributions.length + pendingClaims.length;

  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-lg font-extrabold text-white">
          Your team&apos;s issues{" "}
          <span className="text-accent">{solvedCount} solved</span>
        </h2>
        <span className="text-sm text-zinc-500">
          {total} issue{total === 1 ? "" : "s"} in play
        </span>
      </div>

      {total === 0 ? (
        <p className="mt-4 border-t border-zinc-800 pt-4 text-sm text-zinc-500">
          Nothing yet. Claim an issue, open a PR whose description says{" "}
          <code className="font-mono text-zinc-400">Fixes #n</code>, and it shows
          up here — as solved once it merges.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-800 border-t border-zinc-800">
          {contributions.map((c) => {
            const links: { href: string; label: string; muted?: boolean }[] = [];
            if (c.prUrl)
              links.push({ href: c.prUrl, label: `PR #${c.prNumber} on GitHub` });
            if (c.issue?.htmlUrl)
              links.push({
                href: c.issue.htmlUrl,
                label: `Issue #${c.issue.number}`,
                muted: true,
              });

            return (
              <Row
                key={`c-${c.id}`}
                title={c.issue?.title ?? c.prTitle ?? `PR #${c.prNumber}`}
                reference={
                  c.issue
                    ? `${c.issue.repoFullName} · #${c.issue.number}`
                    : `PR #${c.prNumber}`
                }
                difficulty={c.issue?.difficulty ?? null}
                points={c.issue?.points ?? 0}
                badge={statusView(c)}
                links={links}
              />
            );
          })}

          {pendingClaims.map((claim) => (
            <Row
              key={`claim-${claim.issueId}`}
              title={claim.title}
              reference={`${claim.repoFullName} · #${claim.number}`}
              difficulty={claim.difficulty}
              points={claim.points}
              badge={{ label: "Claimed · no PR yet", tone: "open" }}
              links={
                claim.htmlUrl
                  ? [
                      {
                        href: claim.htmlUrl,
                        label: `Issue #${claim.number}`,
                        muted: true,
                      },
                    ]
                  : []
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}
