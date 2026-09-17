"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./hooks";

// The title is a real <h1> for accessibility and SEO. On first reveal it is
// invisible while a canvas overlay rasterises the same text, samples it into
// points, and flies particles in from the edges to form the letters. Once
// they've settled the real text cross-fades in and the canvas is removed.

type Particle = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  delay: number;
  green: boolean;
};

const FORM_MS = 1900;
const CROSSFADE_MS = 600;

export default function ParticleTitle({
  lines,
  start,
  onFormed,
  className,
}: {
  lines: string[];
  start: boolean;
  onFormed?: () => void;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lineRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const reduced = useReducedMotion();
  const [formedState, setFormed] = useState(false);
  const [canvasGoneState, setCanvasGone] = useState(false);
  const formedRef = useRef(false);
  // Reduced motion: no particles, the text is simply there.
  const formed = formedState || reduced;
  const canvasGone = canvasGoneState || reduced;

  useEffect(() => {
    if (!start || formedRef.current) return;
    if (reduced) {
      formedRef.current = true;
      onFormed?.();
      return;
    }

    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let cancelled = false;

    const run = async () => {
      await document.fonts.ready;
      if (cancelled) return;

      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Rasterise each line exactly where its inline <span> sits (the span
      // hugs the glyphs, so its box gives us the text's left edge and line
      // box), then sample the pixels.
      const sampler = document.createElement("canvas");
      sampler.width = Math.max(1, Math.round(rect.width));
      sampler.height = Math.max(1, Math.round(rect.height));
      const sctx = sampler.getContext("2d", { willReadFrequently: true });
      if (!sctx) return;

      let fontSize = 64;
      lineRefs.current.forEach((span, i) => {
        if (!span) return;
        const cs = getComputedStyle(span);
        fontSize = parseFloat(cs.fontSize);
        sctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        sctx.textBaseline = "alphabetic";
        sctx.textAlign = "left";
        sctx.fillStyle = "#fff";
        const r = span.getBoundingClientRect();
        // CSS centres the font's content area (ascent + descent) inside the
        // line box, so the baseline is the centred content-area top + ascent.
        const metrics = sctx.measureText(lines[i]);
        const ascent = metrics.fontBoundingBoxAscent || fontSize * 0.9;
        const descent = metrics.fontBoundingBoxDescent || fontSize * 0.25;
        const contentTop = r.top - rect.top + (r.height - (ascent + descent)) / 2;
        sctx.fillText(lines[i], r.left - rect.left, contentTop + ascent);
      });

      const step = Math.max(3, Math.round(fontSize / 24));
      const { data } = sctx.getImageData(0, 0, sampler.width, sampler.height);
      const targets: { x: number; y: number }[] = [];
      for (let y = 0; y < sampler.height; y += step) {
        for (let x = 0; x < sampler.width; x += step) {
          if (data[(y * sampler.width + x) * 4 + 3] > 128) {
            targets.push({ x, y });
          }
        }
      }

      const maxParticles = 2600;
      const stride = Math.max(1, Math.ceil(targets.length / maxParticles));
      const particles: Particle[] = [];
      for (let i = 0; i < targets.length; i += stride) {
        const target = targets[i];
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.max(rect.width, rect.height) * (0.6 + Math.random() * 0.9);
        particles.push({
          x: rect.width / 2 + Math.cos(angle) * radius,
          y: rect.height / 2 + Math.sin(angle) * radius,
          tx: target.x,
          ty: target.y,
          delay: Math.random() * 0.35,
          green: Math.random() < 0.14,
        });
      }

      const startTime = performance.now();
      const dotR = Math.max(1, step * 0.38);

      const draw = (now: number) => {
        if (cancelled) return;
        const elapsed = (now - startTime) / FORM_MS;
        ctx.clearRect(0, 0, rect.width, rect.height);
        for (const p of particles) {
          const local = Math.min(1, Math.max(0, (elapsed - p.delay) / (1 - p.delay)));
          const e = 1 - Math.pow(1 - local, 4);
          const x = p.x + (p.tx - p.x) * e;
          const y = p.y + (p.ty - p.y) * e;
          ctx.fillStyle = p.green
            ? `rgba(182,255,46,${0.5 + local * 0.5})`
            : `rgba(236,236,232,${0.35 + local * 0.6})`;
          ctx.beginPath();
          ctx.arc(x, y, dotR, 0, Math.PI * 2);
          ctx.fill();
        }
        if (elapsed < 1.05) {
          frame = requestAnimationFrame(draw);
        } else {
          formedRef.current = true;
          setFormed(true);
          onFormed?.();
          setTimeout(() => {
            if (!cancelled) setCanvasGone(true);
          }, CROSSFADE_MS);
        }
      };
      frame = requestAnimationFrame(draw);
    };

    run();
    return () => {
      cancelled = true;
      if (frame) cancelAnimationFrame(frame);
    };
  }, [start, reduced, lines, onFormed]);

  return (
    <div ref={wrapRef} className="relative">
      <h1
        className={`${className ?? ""} transition-opacity ease-out`}
        style={{
          opacity: formed ? 1 : 0,
          transitionDuration: `${CROSSFADE_MS}ms`,
        }}
      >
        {lines.map((line, i) => (
          <span key={line} className="block">
            <span
              ref={(el) => {
                lineRefs.current[i] = el;
              }}
              className="htw-glitch"
              data-text={line}
            >
              {line}
            </span>
          </span>
        ))}
      </h1>
      {!canvasGone && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-opacity ease-out"
          style={{
            opacity: formed ? 0 : 1,
            transitionDuration: `${CROSSFADE_MS}ms`,
          }}
        />
      )}
    </div>
  );
}
