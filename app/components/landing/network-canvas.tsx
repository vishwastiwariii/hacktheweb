"use client";

import { useEffect, useRef } from "react";
import { useLanding } from "./landing-context";
import { useReducedMotion } from "./hooks";

// The Web. A fixed, full-viewport Canvas 2D network that sits behind every
// section: repositories are the large nodes, issues orbit them, dust drifts
// between. Scrolling moves a parallax camera through it, the cursor pushes
// dust away and lights up nearby nodes, and the sections drive its mood
// (broken → repaired, intensity, focus, converge) through NetworkState.

type Issue = {
  angle: number;
  dist: number;
  speed: number;
  // Stable 0..1 per issue — decides when it breaks / gets repaired.
  hash: number;
  sx: number;
  sy: number;
  glow: number;
};

type Repo = {
  x: number;
  y: number;
  z: number;
  r: number;
  seed: number;
  glow: number;
  issues: Issue[];
  links: number[];
  sx: number;
  sy: number;
  visible: boolean;
};

type Dust = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  r: number;
  sx: number;
  sy: number;
};

const GREEN = "182,255,46";
const RED = "255,61,46";
const ORANGE = "255,138,31";
const FG = "236,236,232";
const BG = "6,6,7";

const MARGIN = 80;

function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export default function NetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { net } = useLanding();
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let worldH = 0;
    let repos: Repo[] = [];
    let dust: Dust[] = [];

    let scrollProgress = 0;
    let pointerX = -9999;
    let pointerY = -9999;
    let pointerActive = false;
    let smoothPX = 0;
    let smoothPY = 0;

    // Pages that mount already "ready" (login) show the network at once.
    let reveal = net.current.ready ? 1 : 0;
    let intensity = 0;
    let focusAlpha = 0;
    let lastFocus: { x: number; y: number; r: number } | null = null;

    let t = 0;
    let last = performance.now();
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let running = true;

    // ---- world -----------------------------------------------------------

    function build() {
      width = window.innerWidth;
      height = window.innerHeight;
      worldH = height * 1.8;

      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const small = width < 768;
      const repoCount = Math.max(
        small ? 8 : 14,
        Math.min(22, Math.round((width * height) / 60000)),
      );
      const dustCount = small
        ? 90
        : Math.max(140, Math.min(300, Math.round((width * height) / 5500)));

      let issueIndex = 0;
      repos = [];
      for (let i = 0; i < repoCount; i++) {
        let x = 0;
        let y = 0;
        // Keep repos apart from each other.
        for (let attempt = 0; attempt < 30; attempt++) {
          x = -0.1 * width + Math.random() * width * 1.2;
          y = Math.random() * worldH;
          const ok = repos.every((r) => {
            const dy = Math.min(
              Math.abs(r.y - y),
              worldH - Math.abs(r.y - y),
            );
            return Math.hypot(r.x - x, dy) > (small ? 120 : 170);
          });
          if (ok) break;
        }
        const issues: Issue[] = [];
        const n = 3 + Math.floor(Math.random() * 5);
        for (let k = 0; k < n; k++) {
          issues.push({
            angle: Math.random() * Math.PI * 2,
            dist: 34 + Math.random() * (small ? 40 : 60),
            speed:
              (0.05 + Math.random() * 0.12) * (Math.random() < 0.5 ? -1 : 1),
            hash: hash01(issueIndex++ + 1),
            sx: 0,
            sy: 0,
            glow: 0,
          });
        }
        repos.push({
          x,
          y,
          z: 0.55 + Math.random() * 0.45,
          r: 3.5 + Math.random() * 3,
          seed: Math.random() * 1000,
          glow: 0,
          issues,
          links: [],
          sx: 0,
          sy: 0,
          visible: false,
        });
      }

      // Each repo links to its two nearest neighbours (stored one way).
      repos.forEach((repo, i) => {
        const near = repos
          .map((other, j) => {
            if (i === j) return null;
            const dy = Math.min(
              Math.abs(other.y - repo.y),
              worldH - Math.abs(other.y - repo.y),
            );
            return { j, d: Math.hypot(other.x - repo.x, dy) };
          })
          .filter((v): v is { j: number; d: number } => v !== null)
          .sort((a, b) => a.d - b.d)
          .slice(0, 2);
        near.forEach(({ j }) => {
          if (!repo.links.includes(j) && !repos[j].links.includes(i)) {
            repo.links.push(j);
          }
        });
      });

      dust = [];
      for (let i = 0; i < dustCount; i++) {
        dust.push({
          x: -0.1 * width + Math.random() * width * 1.2,
          y: Math.random() * worldH,
          z: 0.3 + Math.random() * 0.7,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          r: 0.6 + Math.random() * 1.1,
          sx: 0,
          sy: 0,
        });
      }
    }

    // ---- input -----------------------------------------------------------

    function onScroll() {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      scrollProgress = Math.min(1, Math.max(0, window.scrollY / max));
    }
    function onPointerMove(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      pointerX = e.clientX;
      pointerY = e.clientY;
      pointerActive = true;
    }
    function onPointerLeave() {
      pointerActive = false;
    }
    function onVisibility() {
      if (document.hidden) {
        running = false;
        if (frame) cancelAnimationFrame(frame);
        if (timer) clearTimeout(timer);
        frame = 0;
      } else if (!running) {
        running = true;
        last = performance.now();
        schedule();
      }
    }

    // ---- drawing ---------------------------------------------------------

    function drawFrame(now: number) {
      const state = net.current;
      const dt = reduced ? 0 : Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;

      reveal += ((state.ready ? 1 : 0) - reveal) * Math.min(1, dt * 1.6);
      if (reduced) reveal = state.ready ? 1 : 0;
      intensity += (state.intensity - intensity) * Math.min(1, dt * 2.5);
      if (reduced) intensity = state.intensity;
      const speedMul = 1 + intensity * 2.5;

      if (pointerActive) {
        smoothPX += (pointerX - smoothPX) * 0.12;
        smoothPY += (pointerY - smoothPY) * 0.12;
      }
      const camX = pointerActive ? (smoothPX / width - 0.5) * -34 : 0;
      const camY = scrollProgress * height * 1.5;

      const converge = Math.pow(state.converge, 1.4);
      const cx = width / 2;
      const cy = height / 2;

      ctx!.clearRect(0, 0, width, height);
      if (reveal <= 0.01) return;

      // -- positions
      for (const repo of repos) {
        const wx = repo.x + Math.cos(t * 0.17 + repo.seed) * 6 + camX * repo.z;
        const wy = repo.y + Math.sin(t * 0.2 + repo.seed) * 6;
        let sx = wx;
        let sy = mod(wy - camY * repo.z, worldH) - MARGIN;
        sx = lerp(sx, cx, converge);
        sy = lerp(sy, cy, converge);
        repo.sx = sx;
        repo.sy = sy;
        repo.visible =
          sx > -MARGIN && sx < width + MARGIN && sy > -MARGIN && sy < height + MARGIN;

        const d = pointerActive ? Math.hypot(sx - smoothPX, sy - smoothPY) : 1e9;
        const target = d < 220 ? 1 - d / 220 : 0;
        repo.glow += (target - repo.glow) * (reduced ? 1 : 0.12);

        for (const issue of repo.issues) {
          issue.angle += issue.speed * dt * speedMul;
          const dist = issue.dist * (1 - converge * 0.8);
          issue.sx = sx + Math.cos(issue.angle) * dist;
          issue.sy = sy + Math.sin(issue.angle) * dist;
          const di = pointerActive
            ? Math.hypot(issue.sx - smoothPX, issue.sy - smoothPY)
            : 1e9;
          const ti = di < 140 ? 1 - di / 140 : 0;
          issue.glow += (ti - issue.glow) * (reduced ? 1 : 0.15);
        }
      }

      for (const p of dust) {
        p.x += p.vx * speedMul * 60 * dt;
        p.y += p.vy * speedMul * 60 * dt;
        if (p.x < -0.1 * width) p.x += width * 1.2;
        if (p.x > 1.1 * width) p.x -= width * 1.2;
        p.y = mod(p.y, worldH);

        let sx = p.x + camX * p.z;
        let sy = mod(p.y - camY * p.z, worldH) - MARGIN;
        if (pointerActive) {
          const dx = sx - smoothPX;
          const dy = sy - smoothPY;
          const d = Math.hypot(dx, dy);
          if (d < 130 && d > 0.01) {
            const f = (1 - d / 130) * 9 * dt;
            p.vx += (dx / d) * f;
            p.vy += (dy / d) * f;
          }
        }
        p.vx *= 0.985;
        p.vy *= 0.985;
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > 1.4) {
          p.vx = (p.vx / sp) * 1.4;
          p.vy = (p.vy / sp) * 1.4;
        }
        sx = lerp(sx, cx, converge);
        sy = lerp(sy, cy, converge);
        p.sx = sx;
        p.sy = sy;
      }

      ctx!.globalAlpha = reveal;
      ctx!.lineWidth = 1;

      // -- dust links: mostly invisible, revealed near the cursor
      for (let i = 0; i < dust.length; i++) {
        const a = dust[i];
        if (a.sx < -20 || a.sx > width + 20 || a.sy < -20 || a.sy > height + 20)
          continue;
        const da = pointerActive
          ? Math.hypot(a.sx - smoothPX, a.sy - smoothPY)
          : 1e9;
        for (let j = i + 1; j < dust.length; j++) {
          const b = dust[j];
          const dx = a.sx - b.sx;
          if (dx > 90 || dx < -90) continue;
          const dy = a.sy - b.sy;
          if (dy > 90 || dy < -90) continue;
          const d = Math.hypot(dx, dy);
          if (d > 90) continue;
          const db = pointerActive
            ? Math.hypot(b.sx - smoothPX, b.sy - smoothPY)
            : 1e9;
          const prox = Math.max(0, 1 - Math.min(da, db) / 220);
          const alpha = (0.07 + 0.4 * prox + intensity * 0.06) * (1 - d / 90);
          if (alpha < 0.02) continue;
          ctx!.strokeStyle = `rgba(${prox > 0.5 ? GREEN : FG},${alpha})`;
          ctx!.beginPath();
          ctx!.moveTo(a.sx, a.sy);
          ctx!.lineTo(b.sx, b.sy);
          ctx!.stroke();
        }
      }

      // -- dust
      for (const p of dust) {
        if (p.sx < -5 || p.sx > width + 5 || p.sy < -5 || p.sy > height + 5)
          continue;
        const d = pointerActive
          ? Math.hypot(p.sx - smoothPX, p.sy - smoothPY)
          : 1e9;
        const prox = d < 160 ? 1 - d / 160 : 0;
        ctx!.fillStyle = `rgba(${prox > 0.4 ? GREEN : FG},${
          0.25 + 0.4 * p.z + prox * 0.35
        })`;
        ctx!.beginPath();
        ctx!.arc(p.sx, p.sy, p.r + prox * 0.8, 0, Math.PI * 2);
        ctx!.fill();
      }

      // -- repo ↔ repo links
      const brokenLinks = state.broken * 0.6;
      const fixedLinks = state.repaired * 0.6;
      repos.forEach((repo, i) => {
        for (const j of repo.links) {
          const other = repos[j];
          if (!repo.visible && !other.visible) continue;
          // Don't draw links across the wrap seam.
          if (Math.abs(repo.sy - other.sy) > height) continue;
          const lh = hash01(i * 31 + j * 7 + 3);
          const wasBroken = lh < brokenLinks;
          const isFixed = wasBroken && lh < fixedLinks;
          if (wasBroken && !isFixed) {
            if (!reduced && Math.random() < 0.05) {
              ctx!.strokeStyle = `rgba(${RED},0.35)`;
              ctx!.setLineDash([3, 6]);
              ctx!.beginPath();
              ctx!.moveTo(repo.sx, repo.sy);
              ctx!.lineTo(other.sx, other.sy);
              ctx!.stroke();
              ctx!.setLineDash([]);
            }
            continue;
          }
          const glow = Math.max(repo.glow, other.glow);
          const alpha = 0.1 + 0.3 * glow + (isFixed ? 0.2 : 0);
          ctx!.strokeStyle = `rgba(${isFixed ? GREEN : FG},${alpha})`;
          ctx!.beginPath();
          ctx!.moveTo(repo.sx, repo.sy);
          ctx!.lineTo(other.sx, other.sy);
          ctx!.stroke();

          // Traveller running along the link.
          const ph = (t * (0.08 + intensity * 0.2) + lh) % 1;
          const tx = lerp(repo.sx, other.sx, ph);
          const ty = lerp(repo.sy, other.sy, ph);
          ctx!.fillStyle = `rgba(${isFixed || glow > 0.3 ? GREEN : FG},${
            0.35 + glow * 0.4
          })`;
          ctx!.beginPath();
          ctx!.arc(tx, ty, 1.4, 0, Math.PI * 2);
          ctx!.fill();
        }
      });

      // -- repo ↔ issue links and issue nodes
      const brokenIssues = state.broken * 0.75;
      const fixedIssues = state.repaired * 0.75;
      for (const repo of repos) {
        if (!repo.visible) continue;
        for (const issue of repo.issues) {
          const wasBroken = issue.hash < brokenIssues;
          const isFixed = wasBroken && issue.hash < fixedIssues;
          const isBroken = wasBroken && !isFixed;

          let ix = issue.sx;
          let iy = issue.sy;
          if (isBroken && !reduced) {
            ix += (Math.random() - 0.5) * 5;
            iy += (Math.random() - 0.5) * 5;
          }

          const glow = Math.max(repo.glow, issue.glow);
          if (isBroken) {
            ctx!.strokeStyle = `rgba(${RED},${
              0.2 + (reduced ? 0.2 : Math.random() * 0.35)
            })`;
            ctx!.setLineDash([2, 5]);
          } else {
            ctx!.strokeStyle = `rgba(${isFixed ? GREEN : FG},${
              isFixed ? 0.4 : 0.12 + 0.3 * glow
            })`;
          }
          ctx!.beginPath();
          ctx!.moveTo(repo.sx, repo.sy);
          ctx!.lineTo(ix, iy);
          ctx!.stroke();
          ctx!.setLineDash([]);

          if (!isBroken) {
            const ph = (t * (0.12 + intensity * 0.35) + issue.hash) % 1;
            ctx!.fillStyle = `rgba(${GREEN},${0.3 + glow * 0.5})`;
            ctx!.beginPath();
            ctx!.arc(
              lerp(repo.sx, ix, ph),
              lerp(repo.sy, iy, ph),
              1.2,
              0,
              Math.PI * 2,
            );
            ctx!.fill();
          }

          const pulse = isFixed ? 0.5 + 0.5 * Math.sin(t * 3 + issue.hash * 10) : 0;
          if (isFixed) {
            ctx!.fillStyle = `rgba(${GREEN},${0.12 + pulse * 0.15})`;
            ctx!.beginPath();
            ctx!.arc(ix, iy, 6 + pulse * 3, 0, Math.PI * 2);
            ctx!.fill();
          }
          ctx!.fillStyle = isBroken
            ? `rgba(${RED},0.95)`
            : isFixed
              ? `rgba(${GREEN},0.95)`
              : `rgba(${FG},${0.5 + glow * 0.45})`;
          ctx!.beginPath();
          ctx!.arc(ix, iy, 1.7 + glow * 1.2 + pulse * 0.5, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      // -- repo nodes
      const hot = intensity > 0.85;
      for (const repo of repos) {
        if (!repo.visible) continue;
        const { sx, sy, glow, r } = repo;
        const glowR = 18 + glow * 24 + intensity * 12;
        const grad = ctx!.createRadialGradient(sx, sy, 0, sx, sy, glowR);
        const tint = hot ? ORANGE : GREEN;
        grad.addColorStop(0, `rgba(${tint},${0.14 + glow * 0.3 + intensity * 0.12})`);
        grad.addColorStop(1, `rgba(${tint},0)`);
        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.arc(sx, sy, glowR, 0, Math.PI * 2);
        ctx!.fill();

        if (intensity > 0.35) {
          const ph = (t * (0.25 + intensity) + repo.seed) % 1;
          ctx!.strokeStyle = `rgba(${hot ? RED : GREEN},${
            (1 - ph) * 0.35 * intensity
          })`;
          ctx!.beginPath();
          ctx!.arc(sx, sy, r + 4 + ph * 34, 0, Math.PI * 2);
          ctx!.stroke();
        }

        ctx!.strokeStyle = `rgba(${glow > 0.05 ? GREEN : FG},${0.3 + glow * 0.5})`;
        ctx!.beginPath();
        ctx!.arc(sx, sy, r + 4, 0, Math.PI * 2);
        ctx!.stroke();

        ctx!.fillStyle = `rgba(${FG},${0.85 + glow * 0.15})`;
        ctx!.beginPath();
        ctx!.arc(sx, sy, r + glow * 2, 0, Math.PI * 2);
        ctx!.fill();
      }

      // -- glitch slices while the web is broken
      const instability = state.broken - state.repaired;
      if (!reduced && instability > 0.15 && Math.random() < 0.08 * instability) {
        const n = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          const y = Math.random() * height;
          const h = 1 + Math.random() * 3;
          ctx!.fillStyle = `rgba(${RED},${0.08 + Math.random() * 0.12})`;
          ctx!.fillRect(0, y, width, h);
          ctx!.fillStyle = `rgba(${FG},0.05)`;
          ctx!.fillRect(Math.random() * width * 0.5, y + h, width * 0.5, 1);
        }
      }

      // -- hot network: red flickers in the final push
      if (!reduced && intensity > 0.92 && Math.random() < 0.05) {
        ctx!.fillStyle = `rgba(${RED},0.05)`;
        ctx!.fillRect(0, 0, width, height);
      }

      // -- cursor scan radius
      if (pointerActive) {
        ctx!.strokeStyle = `rgba(${FG},0.06)`;
        ctx!.beginPath();
        ctx!.arc(smoothPX, smoothPY, 130, 0, Math.PI * 2);
        ctx!.stroke();
      }

      // -- focus spotlight (hovered target)
      if (state.focus) lastFocus = state.focus;
      focusAlpha += ((state.focus ? 1 : 0) - focusAlpha) * (reduced ? 1 : 0.1);
      if (focusAlpha > 0.01 && lastFocus) {
        const { x, y, r } = lastFocus;
        const grad = ctx!.createRadialGradient(x, y, r * 0.6, x, y, r * 1.8);
        grad.addColorStop(0, `rgba(${BG},0)`);
        grad.addColorStop(1, `rgba(${BG},${0.75 * focusAlpha})`);
        ctx!.fillStyle = grad;
        ctx!.fillRect(0, 0, width, height);
      }

      // -- pulses (score deliveries)
      if (state.pulses.length) {
        const keep: typeof state.pulses = [];
        for (const pulse of state.pulses) {
          const p = (now - pulse.start) / pulse.duration;
          if (p >= 1) continue;
          keep.push(pulse);
          const mx = (pulse.x0 + pulse.x1) / 2;
          const my = (pulse.y0 + pulse.y1) / 2;
          const dx = pulse.x1 - pulse.x0;
          const dy = pulse.y1 - pulse.y0;
          const len = Math.hypot(dx, dy) || 1;
          const ctrlX = mx - (dy / len) * 140;
          const ctrlY = my + (dx / len) * 140;
          for (let k = 0; k < 8; k++) {
            const q = Math.max(0, p - k * 0.025);
            const bx =
              (1 - q) * (1 - q) * pulse.x0 + 2 * (1 - q) * q * ctrlX + q * q * pulse.x1;
            const by =
              (1 - q) * (1 - q) * pulse.y0 + 2 * (1 - q) * q * ctrlY + q * q * pulse.y1;
            ctx!.fillStyle = `rgba(${GREEN},${(1 - k / 8) * 0.9})`;
            ctx!.beginPath();
            ctx!.arc(bx, by, k === 0 ? 3 : 2 - k * 0.15, 0, Math.PI * 2);
            ctx!.fill();
          }
        }
        state.pulses = keep;
      }

      // -- converge (JACK IN)
      if (state.converge > 0) {
        const c = state.converge;
        const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, 60 + c * 260);
        grad.addColorStop(0, `rgba(${GREEN},${0.55 * c})`);
        grad.addColorStop(1, `rgba(${GREEN},0)`);
        ctx!.fillStyle = grad;
        ctx!.fillRect(0, 0, width, height);
        ctx!.strokeStyle = `rgba(${GREEN},${0.6 * c})`;
        ctx!.lineWidth = 1 + c * 2;
        ctx!.beginPath();
        ctx!.arc(cx, cy, (1 - c) * Math.max(width, height) * 0.7 + 8, 0, Math.PI * 2);
        ctx!.stroke();
        ctx!.lineWidth = 1;
      }

      ctx!.globalAlpha = 1;
    }

    function schedule() {
      if (!running) return;
      if (reduced) {
        // No motion: repaint slowly so mood changes (broken/repaired) still show.
        timer = setTimeout(() => {
          drawFrame(performance.now());
          schedule();
        }, 120);
      } else {
        frame = requestAnimationFrame((now) => {
          drawFrame(now);
          schedule();
        });
      }
    }

    build();
    onScroll();
    schedule();

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        build();
        onScroll();
      }, 150);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      if (frame) cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
      clearTimeout(resizeTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [net, reduced]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
