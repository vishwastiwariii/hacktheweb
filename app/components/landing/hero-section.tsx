"use client";

import { useCallback, useState } from "react";
import ParticleTitle from "./particle-title";
import JackInButton from "./jack-in-button";
import { useLanding } from "./landing-context";
import { formatCount, formatHms, useCountUp, useEventClock } from "./hooks";
import type { LandingEvent } from "./types";

const TITLE = ["HACK", "THE", "WEB"];

export default function HeroSection({
  event,
  repoCount,
  issueCount,
  jackHref,
}: {
  event: LandingEvent | null;
  repoCount: number;
  issueCount: number;
  jackHref: string;
}) {
  const { ready } = useLanding();
  const [formed, setFormed] = useState(false);
  const onFormed = useCallback(() => setFormed(true), []);
  const clock = useEventClock(event);
  const targets = useCountUp(repoCount, formed);
  const issues = useCountUp(issueCount, formed);

  const clockLabel =
    clock.phase === "upcoming"
      ? "T_MINUS"
      : clock.phase === "ended"
        ? "TIME_REMAINING"
        : "TIME_REMAINING";
  const status =
    clock.phase === "live"
      ? "LIVE"
      : clock.phase === "ended"
        ? "ARCHIVED"
        : "ACTIVE";

  const after = `transition-[opacity,transform] duration-700 ease-out ${
    formed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
  }`;

  return (
    <section
      id="top"
      className="relative flex min-h-screen flex-col justify-center px-6 pb-24 pt-28 sm:px-10"
    >
      {/* corner readouts */}
      <div
        className={`htw-label pointer-events-none absolute left-6 top-24 hidden flex-col gap-1 sm:left-10 md:flex ${after}`}
        style={{ transitionDelay: "150ms" }}
      >
        <span>
          SYSTEM_STATUS:{" "}
          <span className="text-[var(--htw-green)]">{status}</span>
        </span>
        <span>
          TARGETS: <span className="text-[var(--htw-fg)]">{formatCount(targets)}</span>
        </span>
        <span>
          ISSUES: <span className="text-[var(--htw-fg)]">{formatCount(issues)}</span>
        </span>
      </div>
      <div
        className={`htw-label pointer-events-none absolute right-6 top-24 hidden flex-col items-end gap-1 sm:right-10 md:flex ${after}`}
        style={{ transitionDelay: "250ms" }}
      >
        <span>
          {clockLabel}:{" "}
          <span className="text-[var(--htw-fg)] tabular-nums">
            {formatHms(clock.seconds)}
          </span>
        </span>
        <span>
          NODE: <span className="text-[var(--htw-fg)]">YOU</span>
        </span>
        <span>
          ACCESS: <span className="text-[var(--htw-fg)]">GITHUB_OAUTH</span>
        </span>
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center text-center">
        <ParticleTitle
          lines={TITLE}
          start={ready}
          onFormed={onFormed}
          className="select-none text-[clamp(4rem,min(17vw,21vh),13.5rem)] font-black uppercase leading-[0.86] tracking-[-0.04em] text-[var(--htw-fg)]"
        />

        <p
          className={`htw-label mt-8 text-[var(--htw-fg)] ${after}`}
          style={{ transitionDelay: "100ms" }}
        >
          12 hours&nbsp;&nbsp;·&nbsp;&nbsp;Open source&nbsp;&nbsp;·&nbsp;&nbsp;Real issues
        </p>

        <div className={`mt-8 ${after}`} style={{ transitionDelay: "250ms" }}>
          <JackInButton href={jackHref} size="lg" />
        </div>

        {/* compact readouts for small screens */}
        <div
          className={`htw-label mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 md:hidden ${after}`}
          style={{ transitionDelay: "350ms" }}
        >
          <span>
            STATUS <span className="text-[var(--htw-green)]">{status}</span>
          </span>
          <span>
            TARGETS <span className="text-[var(--htw-fg)]">{formatCount(targets)}</span>
          </span>
          <span>
            ISSUES <span className="text-[var(--htw-fg)]">{formatCount(issues)}</span>
          </span>
          <span className="tabular-nums">
            T <span className="text-[var(--htw-fg)]">{formatHms(clock.seconds)}</span>
          </span>
        </div>
      </div>

      <div
        className={`htw-label absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 [@media(max-height:760px)]:hidden ${after}`}
        style={{ transitionDelay: "600ms" }}
      >
        <span>Scroll to enter</span>
        <span className="block h-10 w-px overflow-hidden bg-[var(--htw-line)]">
          <span className="htw-scroll-hint block h-full w-full bg-[var(--htw-green)]" />
        </span>
      </div>
    </section>
  );
}
