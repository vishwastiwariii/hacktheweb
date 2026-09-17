"use client";

import { useEffect, useState } from "react";
import { useLanding } from "./landing-context";

const LINKS = [
  { href: "#about", label: "About" },
  { href: "#targets", label: "Targets" },
  { href: "#rules", label: "Rules" },
  { href: "#battle", label: "Battle" },
];

// Full-width bar at the top of the page; collapses into a small floating
// pill once the user starts travelling into the network.
export default function LandingNav({ jackHref }: { jackHref: string }) {
  const [compact, setCompact] = useState(false);
  const { ready, jackIn } = useLanding();

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="pointer-events-none fixed left-0 right-0 top-0 z-40 flex justify-center transition-opacity duration-700"
      style={{ opacity: ready ? 1 : 0 }}
    >
      <nav
        aria-label="Primary"
        className={`pointer-events-auto flex items-center justify-between gap-6 transition-all duration-500 ease-out ${
          compact
            ? "mt-4 w-auto rounded-full border border-[var(--htw-line)] bg-[rgba(6,6,7,0.7)] px-5 py-2 backdrop-blur-md"
            : "mt-0 w-full border-b border-transparent px-6 py-5 sm:px-8"
        }`}
      >
        <a
          href="#top"
          className={`htw-mono flex items-center gap-2 font-bold uppercase tracking-[0.25em] text-[var(--htw-fg)] ${
            compact ? "text-[11px]" : "text-xs"
          }`}
        >
          <span className="htw-blink inline-block h-1.5 w-1.5 bg-[var(--htw-green)]" />
          {compact ? "HTW" : "Hack The Web"}
        </a>

        <div className="hidden items-center gap-6 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="htw-label transition-colors hover:text-[var(--htw-green)]"
            >
              {link.label}
            </a>
          ))}
          <a
            href={jackHref}
            onClick={(e) => {
              e.preventDefault();
              jackIn(jackHref);
            }}
            className="htw-label border border-[var(--htw-line)] px-3 py-1.5 text-[var(--htw-fg)] transition-colors hover:border-[var(--htw-green)] hover:text-[var(--htw-green)]"
          >
            Jack in →
          </a>
        </div>

        <a
          href={jackHref}
          onClick={(e) => {
            e.preventDefault();
            jackIn(jackHref);
          }}
          className="htw-label text-[var(--htw-green)] md:hidden"
        >
          Jack in →
        </a>
      </nav>
    </header>
  );
}
