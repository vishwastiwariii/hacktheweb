"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adjustTeamPointsSchema } from "@/app/lib/validation/points";

// Add or remove points for one team by hand. Two-step like approve: fill in,
// then "Confirm +N" so a typo can't change a score on a single click. The
// server re-validates and writes the ledger row; this only reflects the result.
export default function AdjustPointsForm({
  teamId,
  teamName,
}: {
  teamId: string;
  teamName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const parsed = adjustTeamPointsSchema.safeParse({
    teamId,
    amount: amount.trim() === "" ? Number.NaN : Number(amount),
    reason,
  });

  function reset() {
    setOpen(false);
    setConfirming(false);
    setAmount("");
    setReason("");
    setError(null);
  }

  async function submit() {
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form");
      setConfirming(false);
      return;
    }
    setError(null);
    const res = await fetch("/api/admin/teams/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    const json = (await res.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null;
    if (!res.ok) {
      setError(json?.error ?? "Something went wrong. Try again.");
      setConfirming(false);
      return;
    }
    reset();
    setMessage(json?.message ?? "Saved.");
    startTransition(() => router.refresh());
  }

  if (!open) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => {
            setMessage(null);
            setOpen(true);
          }}
          className="inline-flex h-9 items-center justify-center border border-zinc-700 px-3 text-sm font-bold text-zinc-200 transition-colors hover:bg-zinc-900"
        >
          Adjust points
        </button>
        {message && <p className="text-xs text-accent">{message}</p>}
      </div>
    );
  }

  const signed =
    parsed.success && parsed.data.amount > 0
      ? `+${parsed.data.amount}`
      : parsed.success
        ? String(parsed.data.amount)
        : "";

  return (
    <div className="flex w-full flex-col gap-2 sm:w-72">
      <input
        type="number"
        inputMode="numeric"
        step={1}
        value={amount}
        onChange={(event) => {
          setAmount(event.target.value);
          setConfirming(false);
        }}
        placeholder="Points, e.g. 50 or -20"
        aria-label={`Points to add to ${teamName}`}
        className="h-9 w-full border border-zinc-700 bg-transparent px-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent focus:outline-none"
      />
      <input
        type="text"
        value={reason}
        maxLength={200}
        onChange={(event) => {
          setReason(event.target.value);
          setConfirming(false);
        }}
        placeholder="Reason (shown in the team's history)"
        aria-label="Reason"
        className="h-9 w-full border border-zinc-700 bg-transparent px-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-accent focus:outline-none"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending || !parsed.success}
          onClick={() => {
            if (confirming) {
              submit();
            } else {
              setError(null);
              setConfirming(true);
            }
          }}
          className="inline-flex h-9 flex-1 items-center justify-center bg-accent px-3 text-sm font-bold text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {confirming ? `Confirm ${signed} for ${teamName}` : "Apply"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={reset}
          className="inline-flex h-9 items-center justify-center border border-zinc-700 px-3 text-sm font-bold text-zinc-200 transition-colors hover:bg-zinc-900 disabled:opacity-40"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs leading-tight text-red-400">{error}</p>}
    </div>
  );
}
