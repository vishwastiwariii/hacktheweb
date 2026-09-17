"use client";

import { useEffect, useRef, useState } from "react";

// Crosshair cursor for fine pointers. Follows the mouse with a little lag and
// turns into corner brackets over anything interactive.
const HOVER_SELECTOR =
  'a, button, input, label, [role="button"], [data-cursor="hover"]';

export default function CustomCursor() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState(false);
  const [down, setDown] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let cx = x;
    let cy = y;
    let frame = 0;

    const tick = () => {
      cx += (x - cx) * 0.35;
      cy += (y - cy) * 0.35;
      el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      setVisible(true);
      const target = e.target as Element | null;
      setHover(Boolean(target?.closest?.(HOVER_SELECTOR)));
    };
    const onDown = () => setDown(true);
    const onUp = () => setDown(false);
    const onLeave = () => setVisible(false);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.addEventListener("mouseleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const scale = down ? 0.8 : hover ? 1.7 : 1;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[100] mix-blend-difference"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms" }}
    >
      <div
        className="relative -ml-3 -mt-3 h-6 w-6 transition-transform duration-200 ease-out"
        style={{ transform: `scale(${scale})` }}
      >
        {/* crosshair */}
        <span
          className="absolute left-1/2 top-0 h-1.5 w-px -translate-x-1/2 bg-white transition-opacity duration-200"
          style={{ opacity: hover ? 0 : 1 }}
        />
        <span
          className="absolute bottom-0 left-1/2 h-1.5 w-px -translate-x-1/2 bg-white transition-opacity duration-200"
          style={{ opacity: hover ? 0 : 1 }}
        />
        <span
          className="absolute left-0 top-1/2 h-px w-1.5 -translate-y-1/2 bg-white transition-opacity duration-200"
          style={{ opacity: hover ? 0 : 1 }}
        />
        <span
          className="absolute right-0 top-1/2 h-px w-1.5 -translate-y-1/2 bg-white transition-opacity duration-200"
          style={{ opacity: hover ? 0 : 1 }}
        />
        <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 bg-white" />
        {/* brackets */}
        <span
          className="absolute left-0 top-0 h-2 w-2 border-l border-t border-white transition-opacity duration-200"
          style={{ opacity: hover ? 1 : 0 }}
        />
        <span
          className="absolute right-0 top-0 h-2 w-2 border-r border-t border-white transition-opacity duration-200"
          style={{ opacity: hover ? 1 : 0 }}
        />
        <span
          className="absolute bottom-0 left-0 h-2 w-2 border-b border-l border-white transition-opacity duration-200"
          style={{ opacity: hover ? 1 : 0 }}
        />
        <span
          className="absolute bottom-0 right-0 h-2 w-2 border-b border-r border-white transition-opacity duration-200"
          style={{ opacity: hover ? 1 : 0 }}
        />
      </div>
    </div>
  );
}
