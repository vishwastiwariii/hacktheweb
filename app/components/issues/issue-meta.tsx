import { labelNames, type RawLabel } from "@/app/lib/github/labels";

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  hard: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
};

export function DifficultyBadge({ difficulty }: { difficulty: string | null }) {
  if (!difficulty) {
    return (
      <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        no difficulty
      </span>
    );
  }
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
        DIFFICULTY_STYLES[difficulty] ?? DIFFICULTY_STYLES.medium
      }`}
    >
      {difficulty}
    </span>
  );
}

export function LabelChips({ labels }: { labels: unknown }) {
  const names = labelNames((Array.isArray(labels) ? labels : []) as RawLabel[]);
  if (names.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {names.map((name) => (
        <span
          key={name}
          className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        >
          {name}
        </span>
      ))}
    </div>
  );
}
