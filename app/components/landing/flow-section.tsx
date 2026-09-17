"use client";

import { useEffect, useRef, useState } from "react";
import Reveal from "./reveal";
import { useInView } from "./hooks";

// How the hackathon works, as five nodes on a wire. The active node cycles
// on its own and follows the cursor when hovered.
const STEPS = [
  { code: "FIND", text: "Pick an open issue on a target. Its label sets the points." },
  { code: "FORK", text: "Fork the repository and claim the issue for your team." },
  { code: "FIX", text: "Solve it properly. Maintainers review it like any PR." },
  { code: "PR", text: "Open a pull request that says Fixes #issue." },
  { code: "CRACK", text: "Merged and approved. Points land on your team's ledger." },
];

export default function FlowSection() {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { threshold: 0.3 });
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    if (!inView || hovered !== null) return;
    const id = setInterval(() => setActive((a) => (a + 1) % STEPS.length), 1700);
    return () => clearInterval(id);
  }, [inView, hovered]);

  const current = hovered ?? active;

  return (
    <section className="relative mx-auto w-full max-w-6xl px-6 py-24 sm:px-10 sm:py-32">
      <Reveal>
        <p className="htw-label">Act 05 — Protocol</p>
      </Reveal>
      <Reveal delay={80}>
        <h2 className="mt-6 text-4xl font-black uppercase leading-[0.95] tracking-[-0.03em] text-[var(--htw-fg)] sm:text-6xl lg:text-7xl">
          Five steps
          <br />
          <span className="text-[var(--htw-muted)]">to crack an issue.</span>
        </h2>
      </Reveal>

      <div ref={ref} className="relative mt-20">
        {/* wire */}
        <div className="absolute left-[15px] top-4 h-[calc(100%-2rem)] w-px bg-[var(--htw-line)] md:left-0 md:top-[15px] md:h-px md:w-full">
          <span className="htw-travel-y absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[var(--htw-green)] shadow-[0_0_8px_var(--htw-green)] md:hidden" />
          <span className="htw-travel absolute top-1/2 hidden h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[var(--htw-green)] shadow-[0_0_8px_var(--htw-green)] md:block" />
        </div>

        <ol className="relative grid grid-cols-1 gap-10 md:grid-cols-5 md:gap-6">
          {STEPS.map((step, i) => {
            const on = current === i;
            return (
              <li
                key={step.code}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                className="flex gap-5 md:flex-col md:gap-6"
                data-cursor="hover"
              >
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center bg-[var(--htw-bg)]">
                  <span
                    className={`absolute h-8 w-8 rounded-full border transition-colors duration-300 ${
                      on ? "border-[var(--htw-green)]" : "border-[var(--htw-line)]"
                    }`}
                  />
                  {on && (
                    <span className="htw-pulse-ring absolute h-8 w-8 rounded-full border border-[var(--htw-green)]" />
                  )}
                  <span
                    className={`htw-mono relative text-[11px] font-bold transition-colors duration-300 ${
                      on ? "text-[var(--htw-green)]" : "text-[var(--htw-muted)]"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </span>
                <div>
                  <div
                    className={`text-2xl font-black uppercase tracking-tight transition-colors duration-300 sm:text-3xl ${
                      on ? "text-[var(--htw-green)]" : "text-[var(--htw-fg)]"
                    }`}
                  >
                    {step.code}
                  </div>
                  <p
                    className={`mt-2 max-w-xs text-sm leading-relaxed transition-opacity duration-300 ${
                      on ? "opacity-100 text-[var(--htw-fg)]" : "opacity-70 text-[var(--htw-muted)]"
                    }`}
                  >
                    {step.text}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
