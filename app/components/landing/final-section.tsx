"use client";

import Reveal from "./reveal";
import JackInButton from "./jack-in-button";

// ACT 9 — JACK IN. The network is fully active; the last word is the CTA.
export default function FinalSection({ jackHref }: { jackHref: string }) {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 py-32 text-center sm:px-10">
      <Reveal>
        <p className="htw-label">Act 09 — Jack in</p>
      </Reveal>
      <Reveal delay={80}>
        <h2 className="mt-8 text-[clamp(3rem,11vw,9.5rem)] font-black uppercase leading-[0.86] tracking-[-0.05em] text-[var(--htw-fg)]">
          The web
          <br />
          <span className="htw-glitch" data-text="is waiting.">
            is waiting.
          </span>
        </h2>
      </Reveal>
      <Reveal delay={180}>
        <p className="htw-label mt-12 leading-8 text-[var(--htw-fg)]">
          12 hours.
          <br />
          Real repositories.
          <br />
          Real contributions.
        </p>
      </Reveal>
      <Reveal delay={260}>
        <p className="mt-10 text-xl font-bold uppercase tracking-tight text-[var(--htw-green)] sm:text-2xl">
          Are you ready to hack it?
        </p>
      </Reveal>
      <Reveal delay={340} className="mt-10">
        <JackInButton href={jackHref} size="lg" />
      </Reveal>

      <footer className="htw-label absolute bottom-6 left-0 right-0 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 px-6">
        <span>Hack The Web</span>
        <span>The web is broken. Hack it back.</span>
        <span className="flex items-center gap-2">
          <span className="htw-blink inline-block h-1.5 w-1.5 bg-[var(--htw-green)]" />
          connection stable
        </span>
      </footer>
    </section>
  );
}
