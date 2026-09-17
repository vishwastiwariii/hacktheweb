"use client";

import { useEffect, useRef, useState } from "react";
import Reveal from "./reveal";
import { useLanding } from "./landing-context";
import { useCountUp, useInView } from "./hooks";
import type { LandingTeam } from "./types";

// ACT 7 — THE BATTLE. Teams as energy bars. With real standings it renders
// the live board; without them it runs a simulation so the page still feels
// alive: every few seconds a team "cracks" an issue, a particle flies in
// from the network, and the bar grows.

const DEMO: LandingTeam[] = [
  { teamId: "d1", name: "NULL_POINTERS", score: 47, memberCount: 4, rank: 1 },
  { teamId: "d2", name: "SEGFAULT", score: 43, memberCount: 3, rank: 2 },
  { teamId: "d3", name: "MERGE_CONFLICT", score: 38, memberCount: 4, rank: 3 },
  { teamId: "d4", name: "RACE_CONDITION", score: 31, memberCount: 2, rank: 4 },
  { teamId: "d5", name: "OFF_BY_ONE", score: 24, memberCount: 4, rank: 5 },
];

const POINT_VALUES = [3, 5, 8, 13];

function Row({
  team,
  max,
  active,
  flash,
  barRef,
}: {
  team: LandingTeam;
  max: number;
  active: boolean;
  flash: boolean;
  barRef: (el: HTMLDivElement | null) => void;
}) {
  const shown = useCountUp(team.score, active, 900);
  const width = max > 0 ? Math.max(4, (shown / max) * 100) : 0;
  const top = team.rank === 1;

  return (
    <li
      className={`grid grid-cols-[2.5rem_1fr_4rem] items-center gap-4 border-b border-[var(--htw-line)] py-5 sm:grid-cols-[3rem_12rem_1fr_5rem] ${
        flash ? "htw-flash" : ""
      }`}
    >
      <span
        className={`htw-mono text-2xl font-bold tabular-nums ${
          top ? "text-[var(--htw-green)]" : "text-[var(--htw-muted)]"
        }`}
      >
        {String(team.rank).padStart(2, "0")}
      </span>
      <span className="htw-mono truncate text-sm font-bold uppercase tracking-wider text-[var(--htw-fg)] sm:text-base">
        {team.name}
      </span>
      <div className="col-span-3 sm:col-span-1" ref={barRef}>
        <div className="relative h-3 w-full">
          <div className="htw-bar absolute inset-0 text-[rgba(236,236,232,0.08)]" />
          <div
            className={`htw-bar absolute inset-y-0 left-0 transition-[width] duration-700 ease-out ${
              top ? "text-[var(--htw-green)]" : "text-[var(--htw-fg)]"
            }`}
            style={{ width: `${width}%` }}
          />
        </div>
      </div>
      <span className="htw-mono text-right text-2xl font-bold tabular-nums text-[var(--htw-fg)]">
        {shown}
      </span>
    </li>
  );
}

export default function BattleSection({
  leaderboard,
  signedIn,
}: {
  leaderboard: LandingTeam[];
  signedIn: boolean;
}) {
  const ref = useRef<HTMLOListElement | null>(null);
  const inView = useInView(ref, { threshold: 0.3 });
  const { pushPulse } = useLanding();

  const live = leaderboard.length > 0;
  const [teams, setTeams] = useState<LandingTeam[]>(live ? leaderboard : DEMO);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const barRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Simulation: random team scores, particle flies from the top of the
  // network to the end of its bar.
  useEffect(() => {
    if (live || !inView) return;
    const id = setInterval(() => {
      setTeams((prev) => {
        const i = Math.floor(Math.random() * prev.length);
        const gain = POINT_VALUES[Math.floor(Math.random() * POINT_VALUES.length)];
        const next = prev.map((t, k) => (k === i ? { ...t, score: t.score + gain } : t));
        const sorted = [...next].sort((a, b) => b.score - a.score);
        let rank = 0;
        let prevScore: number | null = null;
        const ranked = sorted.map((t, idx) => {
          if (prevScore === null || t.score < prevScore) rank = idx + 1;
          prevScore = t.score;
          return { ...t, rank };
        });

        const winner = next[i];
        const bar = barRefs.current[winner.teamId];
        if (bar) {
          const rect = bar.getBoundingClientRect();
          const max = ranked[0].score;
          pushPulse({
            x0: window.innerWidth * (0.15 + Math.random() * 0.7),
            y0: -20,
            x1: rect.left + rect.width * Math.min(1, winner.score / max),
            y1: rect.top + rect.height / 2,
            start: performance.now(),
            duration: 1100,
          });
        }
        setFlashId(null);
        setTimeout(() => setFlashId(winner.teamId), 20);
        setLastEvent(`${winner.name} cracked an issue · +${gain}`);
        return ranked;
      });
    }, 2600);
    return () => clearInterval(id);
  }, [live, inView, pushPulse]);

  const max = Math.max(1, ...teams.map((t) => t.score));

  return (
    <section
      id="battle"
      className="relative mx-auto w-full max-w-6xl px-6 py-24 sm:px-10 sm:py-32"
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Reveal>
            <p className="htw-label">Act 07 — The battle</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-6 text-4xl font-black uppercase leading-[0.95] tracking-[-0.03em] text-[var(--htw-fg)] sm:text-6xl lg:text-7xl">
              Teams race.
              <br />
              <span className="text-[var(--htw-muted)]">The board keeps score.</span>
            </h2>
          </Reveal>
        </div>
        <Reveal delay={160}>
          <div className="htw-label flex items-center gap-3 border border-[var(--htw-line)] px-3 py-2">
            <span
              className={`htw-blink inline-block h-1.5 w-1.5 ${
                live ? "bg-[var(--htw-green)]" : "bg-[var(--htw-orange)]"
              }`}
            />
            {live ? "Live standings" : "Simulation · live once the event starts"}
          </div>
        </Reveal>
      </div>

      <Reveal delay={200} className="mt-14">
        <ol ref={ref} className="border-t border-[var(--htw-line)]">
          {teams.slice(0, 6).map((team) => (
            <Row
              key={team.teamId}
              team={team}
              max={max}
              active={inView}
              flash={flashId === team.teamId}
              barRef={(el) => {
                barRefs.current[team.teamId] = el;
              }}
            />
          ))}
        </ol>
      </Reveal>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <p className="htw-label h-4">
          {lastEvent ? (
            <span className="text-[var(--htw-green)]">{lastEvent}</span>
          ) : live ? (
            "Updates the moment an organiser approves a merged PR."
          ) : (
            "Every merged, approved PR moves a bar."
          )}
        </p>
        {signedIn && (
          <a
            href="/leaderboard"
            className="htw-label text-[var(--htw-fg)] transition-colors hover:text-[var(--htw-green)]"
          >
            Open the full board →
          </a>
        )}
      </div>
    </section>
  );
}
