"use client";

import { useEffect, useRef } from "react";
import { useLanding } from "./landing-context";
import { useScrollProgress } from "./hooks";

// ACT 3 + 4 — THE WEB IS BROKEN / HACK IT BACK. A tall sticky stage: as the
// user scrolls, the network behind them breaks (red nodes, dropped links),
// the messages land one by one, then the network repairs itself in green.

type Beat = {
  text: string;
  from: number;
  to: number;
  tone: "fg" | "red" | "green";
  meta: string;
};

const BEATS: Beat[] = [
  { text: "THE WEB IS BROKEN.", from: 0.04, to: 0.3, tone: "red", meta: "ERR 502 · nodes unreachable" },
  { text: "SOMEONE HAS TO FIX IT.", from: 0.32, to: 0.5, tone: "fg", meta: "awaiting operator" },
  { text: "THAT'S YOU.", from: 0.52, to: 0.66, tone: "fg", meta: "operator identified" },
  { text: "HACK IT BACK.", from: 0.7, to: 1.01, tone: "green", meta: "repair in progress" },
];

function smooth(x: number) {
  return x * x * (3 - 2 * x);
}

export default function BrokenSection() {
  const ref = useRef<HTMLDivElement | null>(null);
  const progress = useScrollProgress(ref);
  const { setNetwork } = useLanding();

  // Break over the first third, hold, repair over the last third.
  const broken = smooth(Math.min(1, progress / 0.28));
  const repaired = smooth(Math.min(1, Math.max(0, (progress - 0.7) / 0.28)));

  useEffect(() => {
    setNetwork({ broken, repaired });
  }, [setNetwork, broken, repaired]);

  useEffect(
    () => () => setNetwork({ broken: 0, repaired: 0 }),
    [setNetwork],
  );

  const lost = Math.round(broken * 37);
  const fixed = Math.round(repaired * 100);
  const shaking = broken > 0.5 && repaired < 0.2;

  return (
    <div ref={ref} className="relative h-[420vh]">
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden px-6">
        <div className="htw-label absolute left-6 top-24 hidden md:block sm:left-10">
          Act 03 — The web is broken
        </div>
        <div className="htw-label absolute right-6 top-24 hidden text-right md:block sm:right-10">
          {repaired > 0 ? (
            <span className="text-[var(--htw-green)]">REPAIRED: {fixed}%</span>
          ) : (
            <span className={broken > 0.1 ? "text-[var(--htw-red)]" : ""}>
              CONNECTIONS LOST: {lost}%
            </span>
          )}
        </div>

        <div className="relative flex h-64 w-full max-w-6xl items-center justify-center">
          {BEATS.map((beat) => {
            const inWindow = progress >= beat.from && progress < beat.to;
            const entering = Math.min(1, Math.max(0, (progress - beat.from) / 0.05));
            const color =
              beat.tone === "red"
                ? "text-[var(--htw-red)]"
                : beat.tone === "green"
                  ? "text-[var(--htw-green)]"
                  : "text-[var(--htw-fg)]";
            return (
              <div
                key={beat.text}
                aria-hidden={!inWindow}
                className={`absolute inset-x-0 flex flex-col items-center text-center transition-[opacity,transform,filter] duration-500 ease-out ${
                  inWindow ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                style={{
                  transform: inWindow
                    ? `translateY(${(1 - entering) * 24}px)`
                    : "translateY(-24px)",
                  filter: inWindow ? "blur(0)" : "blur(6px)",
                }}
              >
                <h2
                  className={`htw-glitch text-[clamp(2.4rem,8vw,7.5rem)] font-black uppercase leading-[0.95] tracking-[-0.04em] ${color} ${
                    shaking && beat.tone === "red" ? "htw-shake" : ""
                  }`}
                  data-text={beat.text}
                >
                  {beat.text}
                </h2>
                <p className="htw-label mt-6">{beat.meta}</p>
              </div>
            );
          })}
        </div>

        {/* scrub bar */}
        <div className="absolute bottom-10 left-1/2 w-56 -translate-x-1/2">
          <div className="h-px w-full bg-[var(--htw-line)]">
            <div
              className="h-full transition-[width] duration-150"
              style={{
                width: `${progress * 100}%`,
                background:
                  repaired > 0 ? "var(--htw-green)" : broken > 0.2 ? "var(--htw-red)" : "var(--htw-fg)",
              }}
            />
          </div>
          <div className="htw-label mt-3 flex justify-between">
            <span>break</span>
            <span>repair</span>
          </div>
        </div>
      </div>
    </div>
  );
}
