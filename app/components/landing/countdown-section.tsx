"use client";

import { useEffect, useRef, useState } from "react";
import Reveal from "./reveal";
import { useLanding } from "./landing-context";
import {
  HACKATHON_SECONDS,
  formatHms,
  useEventClock,
  useInView,
} from "./hooks";
import type { LandingEvent } from "./types";

// ACT 6 — THE COUNTDOWN. A ring that drains over the 12 hours. Live when the
// event has dates; otherwise the scrubber lets a visitor preview how the
// network heats up as the clock runs out (the last hour turns orange, the
// last ten minutes red).

const RADIUS = 140;
const CIRC = 2 * Math.PI * RADIUS;

function intensityFor(remaining: number): number {
  const base = 0.15 + 0.45 * (1 - remaining / HACKATHON_SECONDS);
  const lastHour = remaining < 3600 ? 0.25 * (1 - remaining / 3600) : 0;
  const finalPush = remaining < 600 ? 0.15 : 0;
  return Math.min(1, base + lastHour + finalPush);
}

export default function CountdownSection({ event }: { event: LandingEvent | null }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { threshold: 0.35 });
  const { setNetwork } = useLanding();
  const clock = useEventClock(event);

  const [scrub, setScrub] = useState<number | null>(null);
  const simulating = scrub !== null;

  const remaining = simulating
    ? scrub
    : clock.phase === "live"
      ? clock.seconds
      : HACKATHON_SECONDS;
  const fraction = Math.min(1, Math.max(0, remaining / HACKATHON_SECONDS));
  const intensity = intensityFor(remaining);

  const finalPush = remaining < 600;
  const finalHour = remaining < 3600;
  const tone = finalPush
    ? "var(--htw-red)"
    : finalHour
      ? "var(--htw-orange)"
      : "var(--htw-green)";

  // The network only heats up while this section is on screen.
  useEffect(() => {
    setNetwork({ intensity: inView ? intensity : 0 });
  }, [setNetwork, inView, intensity]);
  useEffect(() => () => setNetwork({ intensity: 0 }), [setNetwork]);

  const phaseLabel = simulating
    ? "SIMULATION"
    : clock.phase === "live"
      ? "LIVE"
      : clock.phase === "upcoming"
        ? "STANDBY"
        : clock.phase === "ended"
          ? "ARCHIVED"
          : "STANDBY";

  return (
    <section
      ref={ref}
      className="relative mx-auto w-full max-w-6xl px-6 py-24 sm:px-10 sm:py-32"
    >
      <div className="grid items-center gap-16 lg:grid-cols-2">
        <div>
          <Reveal>
            <p className="htw-label">Act 06 — The countdown</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-6 text-[clamp(4rem,14vw,11rem)] font-black uppercase leading-[0.85] tracking-[-0.05em] text-[var(--htw-fg)]">
              12
              <br />
              <span
                className="transition-colors duration-500"
                style={{ color: tone }}
              >
                Hours
              </span>
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-8 max-w-md text-base leading-relaxed text-[var(--htw-muted)] sm:text-lg">
              Twelve hours from the first commit to the last merge. The
              network gets louder as the clock drains. The final hour is a
              different sport.
            </p>
          </Reveal>

          <Reveal delay={240} className="mt-10 max-w-md">
            <div className="flex items-center justify-between">
              <label htmlFor="htw-scrub" className="htw-label">
                {simulating ? "Scrubbing the clock" : "Simulate the clock"}
              </label>
              {simulating && (
                <button
                  type="button"
                  onClick={() => setScrub(null)}
                  className="htw-label text-[var(--htw-green)] hover:underline"
                >
                  back to live
                </button>
              )}
            </div>
            <input
              id="htw-scrub"
              type="range"
              min={0}
              max={HACKATHON_SECONDS}
              step={60}
              value={remaining}
              onChange={(e) => setScrub(Number(e.target.value))}
              className="htw-range mt-2"
              aria-label="Preview the countdown at any point in the 12 hours"
            />
            <div className="htw-label mt-1 flex justify-between">
              <span>00:00:00</span>
              <span>12:00:00</span>
            </div>
          </Reveal>
        </div>

        <Reveal delay={120} className="flex justify-center">
          <div
            className={`relative ${finalPush && inView ? "htw-shake" : ""}`}
            style={{ width: RADIUS * 2 + 40, height: RADIUS * 2 + 40 }}
          >
            <svg
              viewBox={`0 0 ${RADIUS * 2 + 40} ${RADIUS * 2 + 40}`}
              className="h-full w-full -rotate-90"
              aria-hidden="true"
            >
              <circle
                cx={RADIUS + 20}
                cy={RADIUS + 20}
                r={RADIUS}
                fill="none"
                stroke="var(--htw-line)"
                strokeWidth="1"
              />
              {/* hour ticks */}
              {Array.from({ length: 12 }, (_, i) => {
                const a = (i / 12) * Math.PI * 2;
                // Rounded so server and client emit identical attributes.
                const x1 = (RADIUS + 20 + Math.cos(a) * (RADIUS - 10)).toFixed(2);
                const y1 = (RADIUS + 20 + Math.sin(a) * (RADIUS - 10)).toFixed(2);
                const x2 = (RADIUS + 20 + Math.cos(a) * (RADIUS - 4)).toFixed(2);
                const y2 = (RADIUS + 20 + Math.sin(a) * (RADIUS - 4)).toFixed(2);
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="var(--htw-muted)"
                    strokeWidth="1"
                  />
                );
              })}
              <circle
                cx={RADIUS + 20}
                cy={RADIUS + 20}
                r={RADIUS}
                fill="none"
                stroke={tone}
                strokeWidth="3"
                strokeLinecap="butt"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - fraction)}
                style={{
                  transition: simulating
                    ? "stroke-dashoffset 120ms linear, stroke 400ms"
                    : "stroke-dashoffset 900ms ease-out, stroke 400ms",
                  filter: `drop-shadow(0 0 ${6 + intensity * 14}px ${tone})`,
                }}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="htw-label" style={{ color: tone }}>
                {phaseLabel}
              </span>
              <span
                className="htw-mono mt-3 text-4xl font-bold tabular-nums text-[var(--htw-fg)] sm:text-5xl"
                style={{ color: finalPush ? tone : undefined }}
              >
                {formatHms(remaining)}
              </span>
              <span className="htw-label mt-3">
                network load{" "}
                <span className="text-[var(--htw-fg)]">
                  {Math.round(intensity * 100)}%
                </span>
              </span>
              {finalHour && (
                <span
                  className={`htw-label mt-2 ${finalPush ? "htw-blink" : ""}`}
                  style={{ color: tone }}
                >
                  {finalPush ? "Final push" : "Final hour"}
                </span>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
