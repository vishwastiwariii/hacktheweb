"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanding } from "./landing-context";

// The one CTA on the page. Clicking runs the converge transition on the
// network, then hands off to sign-in (or the dashboard when already signed in).
export default function JackInButton({
  href,
  size = "md",
  className = "",
}: {
  href: string;
  size?: "md" | "lg" | "sm";
  className?: string;
}) {
  const { jackIn, jacking } = useLanding();
  const router = useRouter();

  useEffect(() => {
    router.prefetch(href);
  }, [router, href]);

  const sizing =
    size === "lg"
      ? "h-16 px-10 text-lg"
      : size === "sm"
        ? "h-9 px-4 text-xs"
        : "h-12 px-7 text-sm";

  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        jackIn(href);
      }}
      aria-disabled={jacking}
      className={`htw-btn htw-mono group inline-flex items-center gap-3 border border-[var(--htw-green)] bg-[var(--htw-green)] font-bold uppercase tracking-[0.2em] text-[#060607] transition-[background-color,color,box-shadow] duration-200 hover:bg-transparent hover:text-[var(--htw-green)] hover:shadow-[0_0_32px_var(--htw-green-dim)] ${sizing} ${className}`}
    >
      <span>{jacking ? "Jacking in" : "Jack in"}</span>
      <span
        aria-hidden="true"
        className="inline-block transition-transform duration-200 group-hover:translate-x-1"
      >
        →
      </span>
    </a>
  );
}
