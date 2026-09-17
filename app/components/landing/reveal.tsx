"use client";

import { useRef, type ReactNode } from "react";
import { useInView } from "./hooks";

// Fades and lifts children in the first time they scroll into view.
export default function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { threshold: 0.15, once: true });
  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-700 ease-out ${className}`}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "none" : "translateY(18px)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
