"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { LandingEvent } from "./types";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function useFinePointer(): boolean {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    const update = () => setFine(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return fine;
}

// True while (or once, with `once`) the element is inside the viewport.
export function useInView<T extends Element>(
  ref: RefObject<T | null>,
  { threshold = 0.2, once = false } = {},
): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, threshold, once]);
  return inView;
}

// 0..1 progress of a tall "sticky stage" section: 0 when its top reaches the
// top of the viewport, 1 when its bottom reaches the bottom of the viewport.
export function useScrollProgress<T extends HTMLElement>(
  ref: RefObject<T | null>,
): number {
  const [progress, setProgress] = useState(0);
  const last = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const raw = travel <= 0 ? 0 : -rect.top / travel;
      const next = Math.min(1, Math.max(0, raw));
      // Only re-render when the value moved a visible amount.
      if (Math.abs(next - last.current) > 0.004 || next === 0 || next === 1) {
        last.current = next;
        setProgress(next);
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ref]);

  return progress;
}

// Smoothly animates a number towards `target` whenever it changes.
export function useCountUp(target: number, active = true, duration = 1200) {
  const [value, setValue] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const startValue = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(startValue + (target - startValue) * eased);
      setValue(next);
      from.current = next;
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, active, duration]);

  return value;
}

export const HACKATHON_SECONDS = 12 * 60 * 60;

export type EventClock = {
  // What the number on screen means.
  phase: "upcoming" | "live" | "ended" | "unscheduled";
  // Seconds left in the current phase (to start when upcoming, to end when live).
  seconds: number;
  // 0..1 share of the 12 hours that has elapsed (0 unless live).
  elapsed: number;
};

// Ticks once a second against the event's real dates. With no dates it sits
// on a full 12:00:00 so the page still reads as "12 hours".
export function useEventClock(event: LandingEvent | null): EventClock {
  const compute = (): EventClock => {
    const now = Date.now();
    const starts = event?.startsAt ? Date.parse(event.startsAt) : NaN;
    const ends = event?.endsAt ? Date.parse(event.endsAt) : NaN;

    if (!Number.isNaN(starts) && now < starts) {
      return {
        phase: "upcoming",
        seconds: Math.floor((starts - now) / 1000),
        elapsed: 0,
      };
    }
    if (!Number.isNaN(ends) && now < ends) {
      const total = !Number.isNaN(starts)
        ? Math.max(1, (ends - starts) / 1000)
        : HACKATHON_SECONDS;
      const seconds = Math.floor((ends - now) / 1000);
      return {
        phase: "live",
        seconds,
        elapsed: Math.min(1, Math.max(0, 1 - seconds / total)),
      };
    }
    if (!Number.isNaN(ends)) {
      return { phase: "ended", seconds: 0, elapsed: 1 };
    }
    return { phase: "unscheduled", seconds: HACKATHON_SECONDS, elapsed: 0 };
  };

  const [clock, setClock] = useState<EventClock>(() => ({
    phase: "unscheduled",
    seconds: HACKATHON_SECONDS,
    elapsed: 0,
  }));

  useEffect(() => {
    // First tick is deferred so server and client render the same initial
    // value (avoids a hydration mismatch on the clock digits).
    const first = setTimeout(() => setClock(compute()), 0);
    const id = setInterval(() => setClock(compute()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.startsAt, event?.endsAt]);

  return clock;
}

export function formatHms(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}
