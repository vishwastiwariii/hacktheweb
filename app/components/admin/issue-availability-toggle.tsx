"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function IssueAvailabilityToggle({
  issueId,
  available,
}: {
  issueId: string;
  available: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(available);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function toggle() {
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
      setError(body?.error ?? "Failed");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={toggle}
        disabled={pending}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
          value ? "bg-emerald-600" : "bg-zinc-300 dark:bg-zinc-700"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
            value ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
      {error && (
        <span className="text-[11px] text-red-600 dark:text-red-400">{error}</span>
      )}
    </div>
  );
}
