"use client";

import Reveal from "./reveal";

// Rules of engagement. Facts here mirror the platform's actual constraints
// (team size, claims, label-driven points, review before points).
const RULES = [
  {
    title: "Teams of up to four.",
    text: "One GitHub account, one team. Your GitHub identity is who you are on the board.",
  },
  {
    title: "Claim before you work.",
    text: "Claim an issue so no other team burns time on it. One team per issue, up to five active claims per team.",
  },
  {
    title: "Labels set the points.",
    text: "points:* and difficulty:* labels on the issue are the source of truth. Nobody on the platform can edit them.",
  },
  {
    title: "Reference the issue.",
    text: "Your pull request must say Fixes #42 (or Closes / Resolves). No reference, no mapping, no points.",
  },
  {
    title: "Merged, then approved.",
    text: "A merged PR enters review. An organiser approves it and the points hit your team's ledger.",
  },
  {
    title: "Solved is solved.",
    text: "Once a merged PR closes an issue it leaves the board. Nobody can claim it again.",
  },
  {
    title: "Twelve hours.",
    text: "When the clock hits zero, only what is merged and approved counts.",
  },
];

export default function RulesSection() {
  return (
    <section
      id="rules"
      className="htw-grid relative mx-auto w-full max-w-6xl px-6 py-24 sm:px-10 sm:py-32"
    >
      <Reveal>
        <p className="htw-label">Act 08 — Rules of engagement</p>
      </Reveal>
      <Reveal delay={80}>
        <h2 className="mt-6 text-4xl font-black uppercase leading-[0.95] tracking-[-0.03em] text-[var(--htw-fg)] sm:text-6xl lg:text-7xl">
          Play fair.
          <br />
          <span className="text-[var(--htw-muted)]">Ship real fixes.</span>
        </h2>
      </Reveal>

      <ol className="mt-16 grid grid-cols-1 gap-x-12 gap-y-10 md:grid-cols-2">
        {RULES.map((rule, i) => (
          <Reveal key={rule.title} delay={i * 60}>
            <li className="flex gap-5 border-t border-[var(--htw-line)] pt-5">
              <span className="htw-mono shrink-0 text-sm font-bold text-[var(--htw-green)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-lg font-bold text-[var(--htw-fg)]">
                  {rule.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--htw-muted)]">
                  {rule.text}
                </p>
              </div>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
