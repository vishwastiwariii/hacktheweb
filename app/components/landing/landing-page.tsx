"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import "./landing.css";
import { LandingProvider, useLanding } from "./landing-context";
import { useFinePointer, useReducedMotion } from "./hooks";
import NetworkCanvas from "./network-canvas";
import BootSequence from "./boot-sequence";
import CustomCursor from "./custom-cursor";
import LandingNav from "./landing-nav";
import HeroSection from "./hero-section";
import DiscoverSection from "./discover-section";
import BrokenSection from "./broken-section";
import TargetsSection from "./targets-section";
import FlowSection from "./flow-section";
import CountdownSection from "./countdown-section";
import BattleSection from "./battle-section";
import RulesSection from "./rules-section";
import FinalSection from "./final-section";
import type { LandingData } from "./types";

const BOOT_FLAG = "htw:booted";

// Whether this browser session has already watched the boot (or asked for
// reduced motion). Read through useSyncExternalStore so the server render
// (null = unknown) and the first client render agree.
const noopSubscribe = () => () => {};
function readBootSeen(): boolean {
  let seen = false;
  try {
    seen = sessionStorage.getItem(BOOT_FLAG) === "1";
  } catch {
    seen = false;
  }
  return seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function LandingPage({ data }: { data: LandingData }) {
  return (
    <LandingProvider>
      <Shell data={data} />
    </LandingProvider>
  );
}

function Shell({ data }: { data: LandingData }) {
  const { setReady, jacking } = useLanding();
  const reduced = useReducedMotion();
  const finePointer = useFinePointer();
  const bootSeen = useSyncExternalStore(
    noopSubscribe,
    readBootSeen,
    () => null,
  );
  const [bootDone, setBootDone] = useState(false);
  const showBoot = bootSeen === false && !bootDone;

  const jackHref = data.signedIn ? "/dashboard" : "/login";

  useEffect(() => {
    if (bootSeen) setReady(true);
  }, [bootSeen, setReady]);

  const onBootDone = useCallback(() => {
    try {
      sessionStorage.setItem(BOOT_FLAG, "1");
    } catch {
      // private mode — the boot just plays again next time
    }
    setBootDone(true);
    setReady(true);
  }, [setReady]);

  // Anchor links glide instead of jumping. Restored on unmount so the
  // signed-in app keeps its own behaviour.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = reduced ? "auto" : "smooth";
    return () => {
      root.style.scrollBehavior = previous;
    };
  }, [reduced]);

  return (
    <div
      className={`htw relative min-h-screen overflow-x-clip ${
        finePointer ? "htw-custom-cursor" : ""
      } ${jacking ? "htw-jacking" : ""}`}
    >
      <NetworkCanvas />
      {finePointer && <CustomCursor />}
      {showBoot && (
        <BootSequence
          repoCount={data.repos.length}
          issueCount={data.issueCount}
          onDone={onBootDone}
        />
      )}

      <LandingNav jackHref={jackHref} />

      {/* Hand-off status: the content has faded out by now, so this is the
          only thing on screen besides the converging network. */}
      <div
        aria-live="polite"
        className={`htw-label pointer-events-none fixed inset-x-0 bottom-16 z-30 flex justify-center transition-opacity duration-700 ${
          jacking ? "opacity-100" : "opacity-0"
        }`}
        style={{ transitionDelay: jacking ? "600ms" : "0ms" }}
      >
        <span className="htw-caret text-[var(--htw-green)]">
          establishing session · {jackHref}
        </span>
      </div>

      <main className="htw-content relative z-10">
        <HeroSection
          event={data.event}
          repoCount={data.repos.length}
          issueCount={data.issueCount}
          jackHref={jackHref}
        />
        <DiscoverSection
          repoCount={data.repos.length}
          issueCount={data.issueCount}
          solvedCount={data.solvedCount}
        />
        <BrokenSection />
        <TargetsSection repos={data.repos} />
        <FlowSection />
        <CountdownSection event={data.event} />
        <BattleSection leaderboard={data.leaderboard} signedIn={data.signedIn} />
        <RulesSection />
        <FinalSection jackHref={jackHref} />
      </main>
    </div>
  );
}
