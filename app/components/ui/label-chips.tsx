import { labelNames, type RawLabel } from "@/app/lib/github/labels";

// Arbitrary GitHub label names, so chips never truncate mid-word — the list is
// capped and the overflow collapses into a "+N more" count. Platform labels
// (difficulty:* / points:*) tint with the accent so they stand out from the
// repo's own labels.
const PLATFORM = /^(difficulty|points)\s*:/i;

export default function LabelChips({
  labels,
  max = 6,
}: {
  labels: unknown;
  max?: number;
}) {
  const names = labelNames((Array.isArray(labels) ? labels : []) as RawLabel[]);
  if (names.length === 0) return null;

  const shown = names.slice(0, max);
  const overflow = names.length - shown.length;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {shown.map((name) => (
        <span
          key={name}
          className={`px-2 py-0.5 text-[11px] ${
            PLATFORM.test(name)
              ? "bg-accent/15 text-accent"
              : "bg-zinc-800 text-zinc-400"
          }`}
        >
          {name}
        </span>
      ))}
      {overflow > 0 && (
        <span className="px-2 py-0.5 text-[11px] text-zinc-500">
          +{overflow} more
        </span>
      )}
    </div>
  );
}
