"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// Approve / reject controls for one contribution. Approve is two-step (click,
// then "Confirm +N") so a merged PR can't be scored by a stray click. Reject
// opens a note field. Both hit the admin endpoints, which run the real checks;
// this only reflects the outcome and refreshes.
export default function ReviewActions({
  contributionId,
  status,
  canApprove,
  blockedReason,
  awardablePoints,
}: {
  contributionId: string;
  status: string;
  canApprove: boolean;
  blockedReason?: string | null;
  awardablePoints: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"idle" | "confirmApprove" | "reject">("idle");
  const [note, setNote] = useState("");

  if (status === "APPROVED" || status === "REJECTED") {
    return (
      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
        {status === "APPROVED" ? "Approved" : "Rejected"}
      </p>
    );
  }

  async function post(path: string, body: Record<string, unknown>) {
    setError(null);
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as
      | { error?: string }
      | null;
    if (!res.ok) {
      setError(json?.error ?? "Something went wrong. Try again.");
      return;
    }
    setMode("idle");
    setNote("");
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:w-64">
      {mode !== "reject" && (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending || !canApprove}
            title={
              !canApprove ? blockedReason ?? "Can't approve yet" : undefined
            }
            onClick={() => {
              if (mode === "confirmApprove") {
                post("/api/admin/contributions/approve", { contributionId });
              } else {
                setError(null);
                setMode("confirmApprove");
              }
            }}
            className="inline-flex h-9 flex-1 items-center justify-center bg-accent px-3 text-sm font-bold text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {mode === "confirmApprove"
              ? `Confirm +${awardablePoints}`
              : "Approve"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              setMode(mode === "confirmApprove" ? "idle" : "reject");
            }}
            className="inline-flex h-9 items-center justify-center border border-zinc-700 px-3 text-sm font-bold text-zinc-200 transition-colors hover:bg-zinc-900 disabled:opacity-40"
          >
            {mode === "confirmApprove" ? "Cancel" : "Reject"}
          </button>
        </div>
      )}

      {mode === "reject" && (
        <div className="flex flex-col gap-2">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Why is this rejected? (optional, shown to the team)"
            className="w-full resize-none border border-zinc-700 bg-transparent p-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                post("/api/admin/contributions/reject", {
                  contributionId,
                  note: note.trim() || undefined,
                })
              }
              className="inline-flex h-9 flex-1 items-center justify-center bg-red-600 px-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Confirm reject
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setMode("idle");
                setNote("");
              }}
              className="inline-flex h-9 items-center justify-center border border-zinc-700 px-3 text-sm font-bold text-zinc-200 transition-colors hover:bg-zinc-900 disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs leading-tight text-red-400">{error}</p>}
    </div>
  );
}
