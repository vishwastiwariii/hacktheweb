// Shared difficulty pill. Weight rises with difficulty — tinted, filled, then
// solid accent. The unlabelled case is dashed so it reads as missing data, not
// a fourth level.
const STYLES: Record<string, string> = {
  easy: "bg-zinc-700 text-zinc-100",
  medium: "bg-accent/15 text-accent",
  hard: "bg-accent text-accent-foreground",
};

export default function DifficultyBadge({
  difficulty,
}: {
  difficulty: string | null;
}) {
  if (!difficulty) {
    return (
      <span className="border border-dashed border-zinc-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
        no difficulty
      </span>
    );
  }
  return (
    <span
      className={`px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
        STYLES[difficulty] ?? STYLES.medium
      }`}
    >
      {difficulty}
    </span>
  );
}
