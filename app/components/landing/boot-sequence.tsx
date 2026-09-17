"use client";

import { useEffect, useState } from "react";
import { formatCount } from "./hooks";

// Cinematic boot: four monospace lines typed onto a black screen, then the
// overlay fades and the network takes over. ~3s end to end, skippable with
// any key or click, and never shown twice in one browser session.

type Line = { text: string; suffix?: string };

const TYPE_MS = 16;
const GAP_MS = 240;
const HOLD_MS = 520;
const FADE_MS = 600;

export default function BootSequence({
  repoCount,
  issueCount,
  onDone,
}: {
  repoCount: number;
  issueCount: number;
  onDone: () => void;
}) {
  const [typed, setTyped] = useState<string[]>([]);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const lines: Line[] = [
      { text: "establishing connection…" },
      {
        text: "scanning repositories…",
        suffix: repoCount > 0 ? `${repoCount} targets` : "targets sealed",
      },
      {
        text: "indexing issues…",
        suffix: issueCount > 0 ? `${formatCount(issueCount)} open` : "pending",
      },
      { text: "connection established." },
    ];

    const timers: ReturnType<typeof setTimeout>[] = [];
    let finished = false;
    let delay = 260;

    const finish = () => {
      if (finished) return;
      finished = true;
      setFading(true);
      timers.push(setTimeout(onDone, FADE_MS));
    };

    lines.forEach((line, lineIndex) => {
      for (let c = 1; c <= line.text.length; c++) {
        const slice = line.text.slice(0, c);
        timers.push(
          setTimeout(() => {
            setTyped((prev) => {
              const next = prev.slice(0, lineIndex);
              next[lineIndex] = slice;
              return next;
            });
          }, delay),
        );
        delay += TYPE_MS;
      }
      if (line.suffix) {
        const full = `${line.text}  → ${line.suffix}`;
        delay += 140;
        timers.push(
          setTimeout(() => {
            setTyped((prev) => {
              const next = prev.slice(0, lineIndex);
              next[lineIndex] = full;
              return next;
            });
          }, delay),
        );
      }
      delay += GAP_MS;
    });

    timers.push(setTimeout(finish, delay + HOLD_MS));

    const skip = () => finish();
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [repoCount, issueCount, onDone]);

  const progress = Math.min(1, typed.length / 4);

  return (
    <div
      className="htw fixed inset-0 z-[90] flex items-center justify-center transition-opacity ease-out"
      style={{
        transitionDuration: `${FADE_MS}ms`,
        opacity: fading ? 0 : 1,
      }}
      role="status"
      aria-live="polite"
    >
      <div className="htw-label absolute left-6 top-5">HTW://BOOT</div>
      <div className="htw-label absolute right-6 top-5">
        <span className="htw-blink mr-2 inline-block h-1.5 w-1.5 bg-[var(--htw-green)] align-middle" />
        v12.0.0
      </div>

      <div className="htw-mono w-full max-w-md px-8 text-[13px] leading-7 text-[var(--htw-fg)]">
        {typed.map((line, i) => {
          const isLast = i === typed.length - 1;
          const [main, suffix] = line.split("  → ");
          return (
            <div key={i} className={isLast && !fading ? "htw-caret" : ""}>
              <span className="mr-3 text-[var(--htw-muted)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{main}</span>
              {suffix && (
                <span className="text-[var(--htw-green)]"> → {suffix}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-0 left-0 h-px w-full bg-[var(--htw-line)]">
        <div
          className="h-full bg-[var(--htw-green)] transition-[width] duration-500"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="htw-label absolute bottom-5 right-6">
        press any key to skip
      </div>
    </div>
  );
}
