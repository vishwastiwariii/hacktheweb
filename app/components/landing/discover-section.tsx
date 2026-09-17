"use client";

import { useRef } from "react";
import Reveal from "./reveal";
import { formatCount, useCountUp, useInView } from "./hooks";

function Stat({
  label,
  value,
  active,
  tone = "fg",
}: {
  label: string;
  value: number;
  active: boolean;
  tone?: "fg" | "green";
}) {
  const shown = useCountUp(value, active, 1400);
  return (
    <div className="border-l border-[var(--htw-line)] pl-5">
      <div
        className={`htw-mono text-5xl font-bold tabular-nums sm:text-6xl ${
          tone === "green" ? "text-[var(--htw-green)]" : "text-[var(--htw-fg)]"
        }`}
      >
        {formatCount(shown)}
      </div>
      <div className="htw-label mt-2">{label}</div>
    </div>
  );
}

// ACT 2 — DISCOVER. Explains what the nodes on screen are.
export default function DiscoverSection({
  repoCount,
  issueCount,
  solvedCount,
}: {
  repoCount: number;
  issueCount: number;
  solvedCount: number;
}) {
  const statsRef = useRef<HTMLDivElement | null>(null);
  const statsInView = useInView(statsRef, { threshold: 0.4, once: true });

  return (
    <section
      id="about"
      className="relative mx-auto w-full max-w-6xl px-6 py-24 sm:px-10 sm:py-32"
    >
      <Reveal>
        <p className="htw-label">Act 02 — Discover</p>
      </Reveal>
      <Reveal delay={80}>
        <h2 className="mt-6 max-w-4xl text-4xl font-black uppercase leading-[0.95] tracking-[-0.03em] text-[var(--htw-fg)] sm:text-6xl lg:text-7xl">
          Every node is a repository.
          <br />
          <span className="text-[var(--htw-muted)]">Every spark is an open issue.</span>
        </h2>
      </Reveal>
      <Reveal delay={160}>
        <p className="mt-8 max-w-xl text-base leading-relaxed text-[var(--htw-muted)] sm:text-lg">
          You are inside the Web. Real open-source projects, imported straight
          from GitHub, with their real open issues. Each issue carries a point
          value set by its maintainers. Fix it, get it merged, and the points
          are yours.
        </p>
      </Reveal>

      <div
        ref={statsRef}
        className="mt-16 grid grid-cols-1 gap-10 sm:grid-cols-3"
      >
        <Reveal delay={0}>
          <Stat label="Targets online" value={repoCount} active={statsInView} />
        </Reveal>
        <Reveal delay={100}>
          <Stat label="Issues indexed" value={issueCount} active={statsInView} />
        </Reveal>
        <Reveal delay={200}>
          <Stat
            label="Issues cracked"
            value={solvedCount}
            active={statsInView}
            tone="green"
          />
        </Reveal>
      </div>

      <Reveal delay={240} className="mt-16">
        <ul className="htw-label flex flex-wrap gap-x-8 gap-y-3">
          <li className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-[var(--htw-fg)]" />
            Repository
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--htw-fg)]" />
            Open issue
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--htw-red)]" />
            Broken
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--htw-green)]" />
            Fixed
          </li>
        </ul>
      </Reveal>
    </section>
  );
}
