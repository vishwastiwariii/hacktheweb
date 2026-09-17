"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import "@/app/components/landing/landing.css";
import {
  LandingProvider,
  useLanding,
} from "@/app/components/landing/landing-context";
import NetworkCanvas from "@/app/components/landing/network-canvas";
import CustomCursor from "@/app/components/landing/custom-cursor";
import {
  useFinePointer,
  useReducedMotion,
} from "@/app/components/landing/hooks";
import SignInPanel from "@/app/(auth)/login/sign-in-panel";

// The sign-in screen is the other half of the JACK IN transition. The landing
// page converges its network into the centre and hands off here; this page
// mounts with the network already converged and lets it expand back out
// while the sign-in panel fades in, so the two pages read as one motion.

export type LoginScreenData = {
  repoCount: number;
  issueCount: number;
  eventWindow: string | null;
  authError: boolean;
};

const ARRIVE_MS = 1100;

export default function LoginScreen({ data }: { data: LoginScreenData }) {
  return (
    <LandingProvider initial={{ ready: true, converge: 1 }}>
      <Screen data={data} />
    </LandingProvider>
  );
}

function Screen({ data }: { data: LoginScreenData }) {
  const { setNetwork } = useLanding();
  const reduced = useReducedMotion();
  const finePointer = useFinePointer();
  const [arrived, setArrived] = useState(false);

  // Expand the network from the centre, then let the content in.
  useEffect(() => {
    if (reduced) {
      setNetwork({ converge: 0 });
      const id = setTimeout(() => setArrived(true), 0);
      return () => clearTimeout(id);
    }
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ARRIVE_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      setNetwork({ converge: 1 - eased });
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    const reveal = setTimeout(() => setArrived(true), 250);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(reveal);
    };
  }, [reduced, setNetwork]);

  const enter = (delay: number) =>
    ({
      opacity: arrived ? 1 : 0,
      transform: arrived ? "none" : "translateY(14px)",
      transition: `opacity 700ms ease ${delay}ms, transform 800ms cubic-bezier(0.2,0.8,0.2,1) ${delay}ms`,
    }) as const;

  return (
    <div
      className={`htw relative flex min-h-screen flex-1 flex-col overflow-x-clip ${
        finePointer ? "htw-custom-cursor" : ""
      }`}
    >
      <NetworkCanvas />
      {finePointer && <CustomCursor />}

      <header
        className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-8"
        style={enter(0)}
      >
        <Link
          href="/"
          className="htw-mono flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[var(--htw-fg)] transition-colors hover:text-[var(--htw-green)]"
        >
          <span className="htw-blink inline-block h-1.5 w-1.5 bg-[var(--htw-green)]" />
          Hack The Web
        </Link>
        <Link
          href="/"
          className="htw-label transition-colors hover:text-[var(--htw-green)]"
        >
          ← back to the web
        </Link>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-14 px-6 pb-20 pt-8 sm:px-8 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
        <div>
          <p className="htw-label" style={enter(100)}>
            HTW://AUTH&nbsp;&nbsp;·&nbsp;&nbsp;
            <span className="text-[var(--htw-green)]">session established</span>
          </p>
          <h1
            className="mt-6 text-[clamp(3.5rem,11vw,9rem)] font-black uppercase leading-[0.86] tracking-[-0.05em] text-[var(--htw-fg)]"
            style={enter(180)}
          >
            Jack
            <br />
            <span className="text-[var(--htw-green)]">in.</span>
          </h1>
          <p
            className="mt-8 max-w-md text-base leading-relaxed text-[var(--htw-muted)] sm:text-lg"
            style={enter(260)}
          >
            Twelve hours. Real repositories, real issues, real points. Sign in
            with GitHub, join a team, and start cracking.
          </p>

          <dl
            className="htw-label mt-10 flex flex-wrap gap-x-10 gap-y-3"
            style={enter(340)}
          >
            <div className="flex gap-2">
              <dt>Targets</dt>
              <dd className="text-[var(--htw-fg)]">{data.repoCount}</dd>
            </div>
            <div className="flex gap-2">
              <dt>Issues</dt>
              <dd className="text-[var(--htw-fg)]">{data.issueCount}</dd>
            </div>
            {data.eventWindow && (
              <div className="flex gap-2">
                <dt>Window</dt>
                <dd className="text-[var(--htw-fg)]">{data.eventWindow}</dd>
              </div>
            )}
          </dl>
        </div>

        <div
          className="relative border border-[var(--htw-line)] bg-[rgba(6,6,7,0.72)] p-7 backdrop-blur-sm sm:p-9"
          style={enter(300)}
        >
          {/* corner brackets */}
          <span className="pointer-events-none absolute -left-px -top-px h-3 w-3 border-l border-t border-[var(--htw-green)]" />
          <span className="pointer-events-none absolute -right-px -top-px h-3 w-3 border-r border-t border-[var(--htw-green)]" />
          <span className="pointer-events-none absolute -bottom-px -left-px h-3 w-3 border-b border-l border-[var(--htw-green)]" />
          <span className="pointer-events-none absolute -bottom-px -right-px h-3 w-3 border-b border-r border-[var(--htw-green)]" />
          <SignInPanel authError={data.authError} />
        </div>
      </main>

      <footer
        className="htw-label relative z-10 flex flex-wrap items-center justify-between gap-3 px-6 pb-6 sm:px-8"
        style={enter(500)}
      >
        <span>The web is broken. Hack it back.</span>
        <span className="flex items-center gap-2">
          <span className="htw-blink inline-block h-1.5 w-1.5 bg-[var(--htw-green)]" />
          connection stable
        </span>
      </footer>
    </div>
  );
}
