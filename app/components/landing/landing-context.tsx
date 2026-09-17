"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useRouter } from "next/navigation";

// Mutable state shared between the DOM sections and the WebGL-less canvas
// network. Sections write into it from scroll/hover handlers; the canvas reads
// it every frame. It lives in a ref on purpose — updating it never re-renders
// React, which is what keeps the scroll-driven parts smooth.
export type Pulse = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  start: number;
  duration: number;
};

export type NetworkState = {
  // Boot sequence finished — the network fades in once this flips.
  ready: boolean;
  // 0..1 — how much of the network is broken (red nodes, dropped links).
  broken: number;
  // 0..1 — how much of the broken part has been repaired (green nodes).
  repaired: number;
  // 0..1 — activity level, driven by the countdown.
  intensity: number;
  // Spotlight for a hovered target; everything else dims.
  focus: { x: number; y: number; r: number } | null;
  // 0..1 — JACK IN transition, everything converges to the centre.
  converge: number;
  // One-off particles travelling across the screen (leaderboard deliveries).
  pulses: Pulse[];
};

function createNetworkState(): NetworkState {
  return {
    ready: false,
    broken: 0,
    repaired: 0,
    intensity: 0,
    focus: null,
    converge: 0,
    pulses: [],
  };
}

type LandingContextValue = {
  // Read-only for consumers: the canvas reads it every frame.
  net: RefObject<NetworkState>;
  // Sections write through these instead of touching the ref.
  setNetwork: (patch: Partial<NetworkState>) => void;
  pushPulse: (pulse: Pulse) => void;
  ready: boolean;
  setReady: (value: boolean) => void;
  jacking: boolean;
  // Runs the converge transition, then navigates.
  jackIn: (href: string) => void;
};

const LandingContext = createContext<LandingContextValue | null>(null);

const JACK_IN_MS = 900;
// If the client router hasn't left the page this long after the transition,
// fall back to a full navigation so the click always lands on sign-in.
const NAVIGATE_FALLBACK_MS = 1500;

export function LandingProvider({
  children,
  initial,
}: {
  children: ReactNode;
  // Starting network state, e.g. { ready: true, converge: 1 } on the page the
  // JACK IN transition lands on so it picks up exactly where the landing left off.
  initial?: Partial<NetworkState>;
}) {
  const net = useRef<NetworkState>({ ...createNetworkState(), ...initial });
  const [ready, setReadyState] = useState(Boolean(initial?.ready));
  const [jacking, setJacking] = useState(false);
  const router = useRouter();

  const setReady = useCallback((value: boolean) => {
    net.current.ready = value;
    setReadyState(value);
  }, []);

  const setNetwork = useCallback((patch: Partial<NetworkState>) => {
    Object.assign(net.current, patch);
  }, []);

  const pushPulse = useCallback((pulse: Pulse) => {
    net.current.pulses.push(pulse);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      const from = window.location.pathname;
      router.push(href);
      window.setTimeout(() => {
        if (window.location.pathname === from) {
          window.location.assign(href);
        }
      }, NAVIGATE_FALLBACK_MS);
    },
    [router],
  );

  const jackIn = useCallback(
    (href: string) => {
      // A second click while the transition is running goes straight through.
      if (jacking) {
        navigate(href);
        return;
      }
      setJacking(true);
      router.prefetch(href);

      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduced) {
        navigate(href);
        return;
      }

      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / JACK_IN_MS);
        net.current.converge = t;
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          navigate(href);
        }
      };
      requestAnimationFrame(step);
    },
    [jacking, navigate, router],
  );

  return (
    <LandingContext.Provider
      value={{ net, setNetwork, pushPulse, ready, setReady, jacking, jackIn }}
    >
      {children}
    </LandingContext.Provider>
  );
}

export function useLanding(): LandingContextValue {
  const ctx = useContext(LandingContext);
  if (!ctx) {
    throw new Error("useLanding must be used inside <LandingProvider>");
  }
  return ctx;
}
