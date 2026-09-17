"use client";

import { useRef, useState, type MouseEvent } from "react";
import Reveal from "./reveal";
import { useLanding } from "./landing-context";
import type { LandingRepo } from "./types";

// ACT 3b — TARGETS. Repositories shown as nodes the hacker has discovered.
// Hovering one spotlights it: the card tilts toward the cursor, issue nodes
// orbit it, the rest of the grid and the network behind dim.

const PLACEHOLDERS = Array.from({ length: 6 }, (_, i) => i);

function TargetCard({
  repo,
  index,
  active,
  dimmed,
  onActivate,
  onDeactivate,
}: {
  repo: LandingRepo;
  index: number;
  active: boolean;
  dimmed: boolean;
  onActivate: (el: HTMLElement) => void;
  onDeactivate: () => void;
}) {
  const ref = useRef<HTMLAnchorElement | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const onMove = (e: MouseEvent<HTMLAnchorElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -py * 8, y: px * 10 });
  };

  const orbit = Math.min(8, Math.max(3, repo.issueCount));
  const code = `TARGET_${String(index + 1).padStart(2, "0")}`;

  return (
    <a
      ref={ref}
      href={repo.htmlUrl ?? "#targets"}
      target={repo.htmlUrl ? "_blank" : undefined}
      rel={repo.htmlUrl ? "noopener noreferrer" : undefined}
      onMouseEnter={() => ref.current && onActivate(ref.current)}
      onMouseMove={onMove}
      onMouseLeave={() => {
        setTilt({ x: 0, y: 0 });
        onDeactivate();
      }}
      onFocus={() => ref.current && onActivate(ref.current)}
      onBlur={onDeactivate}
      className={`group relative block border p-6 transition-[transform,opacity,border-color,background-color] duration-300 ease-out ${
        active
          ? "z-10 border-[var(--htw-green)] bg-[rgba(6,6,7,0.85)]"
          : "border-[var(--htw-line)] bg-[rgba(6,6,7,0.55)]"
      } ${dimmed ? "opacity-40" : "opacity-100"}`}
      style={{
        transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${active ? 1.04 : 1})`,
      }}
    >
      {/* orbiting issue nodes */}
      <div
        aria-hidden="true"
        className={`htw-orbit pointer-events-none absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 ${
          active ? "opacity-100" : "opacity-0"
        }`}
      >
        {Array.from({ length: orbit }, (_, i) => {
          const angle = (i / orbit) * Math.PI * 2;
          return (
            <span
              key={i}
              className="absolute h-1.5 w-1.5 rounded-full bg-[var(--htw-green)] shadow-[0_0_10px_var(--htw-green)]"
              // Rounded so server and client emit identical strings.
              style={{
                left: `${(50 + Math.cos(angle) * 50).toFixed(2)}%`,
                top: `${(50 + Math.sin(angle) * 50).toFixed(2)}%`,
              }}
            />
          );
        })}
      </div>

      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="htw-label text-[var(--htw-green)]">{code}</span>
          <span className="htw-label flex items-center gap-2">
            <span className="htw-blink inline-block h-1.5 w-1.5 bg-[var(--htw-green)]" />
            Active
          </span>
        </div>
        <div className="mt-6 flex items-center gap-3">
          <span className="relative flex h-3 w-3 items-center justify-center">
            <span className="absolute h-3 w-3 rounded-full border border-[var(--htw-fg)]" />
            <span className="h-1 w-1 rounded-full bg-[var(--htw-fg)]" />
            {active && (
              <span className="htw-pulse-ring absolute h-3 w-3 rounded-full border border-[var(--htw-green)]" />
            )}
          </span>
          <span className="htw-mono truncate text-base font-bold text-[var(--htw-fg)]">
            {repo.owner}
            <span className="text-[var(--htw-muted)]">/</span>
            {repo.name}
          </span>
        </div>
        <div className="htw-label mt-8 flex flex-wrap gap-x-6 gap-y-1">
          <span>
            <span className="text-[var(--htw-fg)]">{repo.issueCount}</span> issues
          </span>
          <span className="opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            open on github ↗
          </span>
        </div>
      </div>
    </a>
  );
}

export default function TargetsSection({ repos }: { repos: LandingRepo[] }) {
  const { setNetwork } = useLanding();
  const [activeId, setActiveId] = useState<string | null>(null);

  const activate = (id: string) => (el: HTMLElement) => {
    setActiveId(id);
    const rect = el.getBoundingClientRect();
    setNetwork({
      focus: {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        r: Math.max(rect.width, rect.height) * 0.8,
      },
    });
  };
  const deactivate = () => {
    setActiveId(null);
    setNetwork({ focus: null });
  };

  return (
    <section
      id="targets"
      className="relative mx-auto w-full max-w-6xl px-6 py-24 sm:px-10 sm:py-32"
    >
      <Reveal>
        <p className="htw-label">Act 04 — Targets</p>
      </Reveal>
      <Reveal delay={80}>
        <h2 className="mt-6 text-4xl font-black uppercase leading-[0.95] tracking-[-0.03em] text-[var(--htw-fg)] sm:text-6xl lg:text-7xl">
          Repositories
          <br />
          <span className="text-[var(--htw-muted)]">are targets.</span>
        </h2>
      </Reveal>
      <Reveal delay={160}>
        <p className="mt-8 max-w-xl text-base leading-relaxed text-[var(--htw-muted)] sm:text-lg">
          {repos.length > 0
            ? "These are the projects on the board. Hover a target to see it light up in the network; open it to read its issues."
            : "Targets are revealed when the organisers open the event. Until then the network is sealed."}
        </p>
      </Reveal>

      <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {repos.length > 0
          ? repos.map((repo, i) => (
              <Reveal key={repo.id} delay={Math.min(i, 8) * 60}>
                <TargetCard
                  repo={repo}
                  index={i}
                  active={activeId === repo.id}
                  dimmed={activeId !== null && activeId !== repo.id}
                  onActivate={activate(repo.id)}
                  onDeactivate={deactivate}
                />
              </Reveal>
            ))
          : PLACEHOLDERS.map((i) => (
              <Reveal key={i} delay={i * 60}>
                <div className="border border-dashed border-[var(--htw-line)] p-6">
                  <div className="flex items-center justify-between">
                    <span className="htw-label">TARGET_??</span>
                    <span className="htw-label flex items-center gap-2">
                      <span className="inline-block h-1.5 w-1.5 bg-[var(--htw-muted)]" />
                      Sealed
                    </span>
                  </div>
                  <div className="htw-mono mt-6 text-base font-bold text-[var(--htw-muted)]">
                    ████████<span className="opacity-40">/</span>██████
                  </div>
                  <div className="htw-label mt-8">awaiting import</div>
                </div>
              </Reveal>
            ))}
      </div>
    </section>
  );
}
