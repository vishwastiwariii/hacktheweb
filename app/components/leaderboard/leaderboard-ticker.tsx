"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Re-pull the standings every two minutes. No websockets — the server component
// just re-runs on router.refresh().
const REFRESH_MS = 120_000;

export default function LeaderboardTicker() {
  const router = useRouter();

  useEffect(() => {
    const refresh = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(refresh);
  }, [router]);

  return (
    <span className="inline-flex items-center gap-2 border border-zinc-700 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-400">
      <span className="h-2 w-2 bg-accent" aria-hidden />
      Live
    </span>
  );
}
