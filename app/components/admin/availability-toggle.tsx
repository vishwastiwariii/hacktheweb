"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// Optimistic switch for an issue's `available` flag. Three resting states:
// Available, Off, and Disabled (labels are broken, so it can never be claimable).
export default function AvailabilityToggle({
  issueId,
  available,
  metadataValid,
}: {
  issueId: string;
  available: boolean;
  metadataValid: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(available);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const locked = !metadataValid;
  const shown = locked ? false : value;

  async function toggle() {
    if (locked) return;
    const next = !value;
    setError(null);
    setValue(next); // optimistic
    const res = await fetch("/api/admin/issue", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issueId, available: next }),
    });
    if (!res.ok) {
      setValue(!next); // revert
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Couldn't save — reverted. Try again.");
      return;
    }
    startTransition(() => router.refresh());
  }

  const helper = error
    ? "Couldn't save — reverted. Try again."
    : locked
      ? "Locked until the labels are fixed"
      : "Optimistic — flips instantly";

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={shown}
          aria-label="Available for claiming"
          onClick={toggle}
          disabled={pending || locked}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed ${
            shown ? "bg-accent" : "bg-zinc-700"
          } ${locked ? "opacity-50" : ""}`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full transition-transform ${
              shown
                ? "translate-x-5 bg-accent-foreground"
                : "translate-x-0.5 bg-zinc-400"
            }`}
          />
        </button>
        <span className="text-sm font-bold text-white">
          {shown ? "Available" : "Off"}
        </span>
      </div>
      <span className={`text-xs ${error ? "text-red-400" : "text-zinc-500"}`}>
        {helper}
      </span>
    </div>
  );
}
