import Image from "next/image";

// One avatar for every surface. Falls back to the first initial on a tinted
// square; with no src *and* no name it renders a dashed frame, meaning "no
// identity at all" (the "Teammate" rows on the team page).
export default function UserAvatar({
  src,
  name,
  size = 40,
  className = "",
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const box = { width: size, height: size };

  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        style={box}
        className={`shrink-0 rounded-sm object-cover ${className}`}
      />
    );
  }

  const initial = name?.trim()?.charAt(0)?.toUpperCase() ?? "";

  if (!initial) {
    return (
      <span
        style={box}
        className={`flex shrink-0 items-center justify-center border border-dashed border-zinc-700 text-zinc-600 ${className}`}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: size * 0.5, height: size * 0.5 }}
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </span>
    );
  }

  return (
    <span
      style={{ ...box, fontSize: Math.round(size * 0.42) }}
      className={`flex shrink-0 items-center justify-center rounded-sm bg-accent/10 font-extrabold text-accent ${className}`}
    >
      {initial}
    </span>
  );
}
