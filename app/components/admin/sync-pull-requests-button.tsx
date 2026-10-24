"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type SyncResponse = {
  ok?: boolean;
  error?: string;
  repositories?: number;
  pullRequests?: number;
  failed?: number;
  errors?: string[];
};

// Replays every PR from GitHub through the webhook handler. For merges the
// webhook never delivered; safe to press more than once.
export default function SyncPullRequestsButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SyncResponse | null>(null);

  async function onSync() {
    setBusy(true);
    setResult(null);
    const res = await fetch("/api/admin/contributions/sync", { method: "POST" });
    const json = ((await res.json().catch(() => null)) ?? {
      error: "Sync failed",
    }) as SyncResponse;
    setBusy(false);
    setResult(res.ok ? json : { error: json.error ?? "Sync failed" });
    if (res.ok) startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={onSync}
        disabled={busy || pending}
        className="inline-flex h-10 items-center justify-center border border-zinc-700 px-4 text-sm font-bold text-zinc-200 transition-colors hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Syncing PRs…" : "Sync PRs from GitHub"}
      </button>
      {result?.error && <p className="text-xs text-red-400">{result.error}</p>}
      {result?.ok && (
        <p className="text-xs text-zinc-400">
          Synced {result.pullRequests} PR{result.pullRequests === 1 ? "" : "s"}{" "}
          across {result.repositories} repo{result.repositories === 1 ? "" : "s"}
          {result.failed ? ` · ${result.failed} failed` : ""}.
        </p>
      )}
      {result?.errors && result.errors.length > 0 && (
        <ul className="max-w-xl list-disc pl-4 text-xs text-red-400">
          {result.errors.slice(0, 10).map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
